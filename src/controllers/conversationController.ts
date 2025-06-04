import { Request, Response } from "express";
import Conversation from "../models/conversationModel";
import Message from "../models/messageModel";
import { Types } from "mongoose";
import mongoose from "mongoose";

class ConversationController {
  // Créer une nouvelle conversation
  async createConversation(req: Request, res: Response) {
    const { participants, createdBy, isGroup, groupName } = req.body; // Extraire tous les champs nécessaires
    console.log("Tentative de création de conversation avec les participants:", participants);
    console.log("Données complètes reçues:", req.body); // Log pour déboguer
    
    try {
      // Vérifier si une conversation existe déjà entre ces participants
      console.log("Recherche d'une conversation existante...");
      const existingConversation = await Conversation.findOne({
        participants: { $all: participants }
      });
  
      if (existingConversation) {
        console.log("Conversation existante trouvée avec l'ID:", existingConversation._id);
        return res.status(200).json({ 
          message: "Conversation existante trouvée", 
          conversation: existingConversation 
        });
      }
  
      if(participants.length < 2) {
        console.log("Échec: Nombre insuffisant de participants (", participants.length, ")");
        return res.status(400).json({ message: "Une conversation doit avoir au moins 2 participants" });
      }
  
      if(participants.length > 50) {
        console.log("Échec: Trop de participants (", participants.length, ")");
        return res.status(400).json({ message: "Une conversation ne peut pas avoir plus de 50 participants" });
      }
  
      // Validation du champ createdBy
      if (!createdBy) {
        console.log("Échec: createdBy manquant");
        return res.status(400).json({ message: "Le champ createdBy est requis" });
      }
  
      console.log("Création d'une nouvelle conversation...");
      const conversationData: any = {
        participants: participants.map((id: string) => Types.ObjectId.createFromHexString(id)),
        createdBy: Types.ObjectId.createFromHexString(createdBy),
        isGroup: isGroup || false,
        lastActivity: new Date()
      };
  
      // Ajouter le nom de groupe si fourni et si c'est un groupe
      if (isGroup && groupName) {
        conversationData.groupName = groupName;
      }
  
      const newConversation = new Conversation(conversationData);
  
      await newConversation.save();
      console.log("Nouvelle conversation créée avec succès, ID:", newConversation._id);
      res.status(201).json({ 
        message: "Conversation créée avec succès", 
        conversation: newConversation 
      });
    } catch (error) {
      console.error("Erreur lors de la création de la conversation:", error);
      res.status(500).json({ message: "Erreur lors de la création de la conversation", error });
    }
  }

  // Obtenir toutes les conversations d'un utilisateur
  async getUserConversations(req: Request, res: Response) {
    const userId = req.params.userId;
    console.log(`[getUserConversations] Récupération des conversations pour l'utilisateur: ${userId}`);
    
    try {
      if (!Types.ObjectId.isValid(userId)) {
        console.log(`[getUserConversations] ID utilisateur invalide: ${userId}`);
        return res.status(400).json({ message: "ID utilisateur invalide" });
      }

      const userObjectId = Types.ObjectId.createFromHexString(userId);
      console.log(`[getUserConversations] Recherche des conversations pour l'utilisateur ${userId}...`);
      
      const conversations = await Conversation.find({
        participants: userObjectId
      })
      .populate('participants', 'username email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

      console.log(`[getUserConversations] ${conversations.length} conversations trouvées pour l'utilisateur ${userId}`);
      
      // Log détaillé des conversations trouvées
      conversations.forEach((conv, index) => {
        console.log(`[getUserConversations] Conversation ${index + 1}:`);
        console.log(`  - ID: ${conv._id}`);
        console.log(`  - Type: ${conv.isGroup ? 'Groupe' : 'Privée'}`);
        console.log(`  - Nom: ${conv.isGroup ? conv.groupName : 'Conversation privée'}`);
        console.log(`  - Participants: ${conv.participants.length}`);
        console.log(`  - Dernière activité: ${conv.lastActivity}`);
        console.log(`  - Dernier message: ${conv.lastMessage ? 'Oui' : 'Non'}`);
      });

      res.status(200).json({ conversations });
    } catch (error) {
      console.error(`[getUserConversations] Erreur lors de la récupération des conversations pour l'utilisateur ${userId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération des conversations", error });
    }
  }

  // Obtenir une conversation spécifique avec ses messages
  async getConversation(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    console.log(`[getConversation] Récupération de la conversation: ${conversationId}`);
    
    try {
      if (!Types.ObjectId.isValid(conversationId)) {
        console.log(`[getConversation] ID conversation invalide: ${conversationId}`);
        return res.status(400).json({ message: "ID conversation invalide" });
      }

      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'username email')
        .populate('lastMessage');

      if (!conversation) {
        console.log(`[getConversation] Conversation non trouvée: ${conversationId}`);
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      console.log(`[getConversation] Conversation trouvée: ${conversationId}`);
      console.log(`  - Type: ${conversation.isGroup ? 'Groupe' : 'Privée'}`);
      console.log(`  - Nom: ${conversation.isGroup ? conversation.groupName : 'Conversation privée'}`);
      console.log(`  - Participants: ${conversation.participants.length}`);
      console.log(`  - Dernière activité: ${conversation.lastActivity}`);

      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'username email')
        .sort({ timestamp: 1 });

      console.log(`[getConversation] ${messages.length} messages trouvés pour la conversation ${conversationId}`);

      res.status(200).json({ conversation, messages });
    } catch (error) {
      console.error(`[getConversation] Erreur lors de la récupération de la conversation ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération de la conversation", error });
    }
  }

  async getMessageReadStats(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    const userId = (req as any).user.id;
    console.log(`[getMessageReadStats] Récupération des stats de lecture pour la conversation: ${conversationId} par l'utilisateur: ${userId}`);
    
    try {
      // Validation des IDs
      if (!mongoose.isValidObjectId(conversationId)) {
        console.log(`[getMessageReadStats] ID de conversation invalide: ${conversationId}`);
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      if (!mongoose.isValidObjectId(userId)) {
        console.log(`[getMessageReadStats] ID d'utilisateur invalide: ${userId}`);
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      // Vérifier si la conversation existe et si l'utilisateur en fait partie
      const conversation = await Conversation.findById(conversationId)
        .select('participants isGroup groupName'); // Sélectionner uniquement les champs nécessaires

      if (!conversation) {
        console.log(`[getMessageReadStats] Conversation non trouvée: ${conversationId}`);
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      // Vérifier si l'utilisateur est participant de la conversation
      const isParticipant = conversation.participants.some(
        (participant) => participant.toString() === userId
      );
      if (!isParticipant) {
        console.log(`[getMessageReadStats] Accès refusé - L'utilisateur ${userId} n'est pas participant de la conversation ${conversationId}`);
        return res.status(403).json({ message: "Vous n'êtes pas participant de cette conversation" });
      }

      // Requête optimisée pour compter les messages non lus
      const unreadMessagesCount = await Message.countDocuments({
        conversation: conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      });

      console.log(`[getMessageReadStats] ${unreadMessagesCount} messages non lus trouvés pour la conversation ${conversationId}`);

      res.status(200).json({
        unreadCount: unreadMessagesCount,
        conversationId: conversationId,
        isGroup: conversation.isGroup,
        groupName: conversation.groupName,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error(`[getMessageReadStats] Erreur lors de la récupération des stats pour ${conversationId}:`, error);
      res.status(500).json({
        message: "Erreur lors de la récupération des statistiques de lecture",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      });
    }
  }

  // Supprimer une conversation
  async deleteConversation(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    
    try {
      // Supprimer d'abord tous les messages associés
      await Message.deleteMany({ conversation: conversationId });
      
      // Puis supprimer la conversation
      const conversation = await Conversation.findByIdAndDelete(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      res.status(200).json({ message: "Conversation supprimée avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de la conversation", error });
    }
  }
}

export default new ConversationController(); 