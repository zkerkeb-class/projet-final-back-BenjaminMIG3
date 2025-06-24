import { Request, Response } from "express";
import Conversation from "../models/conversationModel";
import Message from "../models/messageModel";
import { Types } from "mongoose";
import mongoose from "mongoose";

class ConversationController {
  // Créer une nouvelle conversation
  async createConversation(req: Request, res: Response) {
    const { participants, createdBy, isGroup, groupName } = req.body; // Extraire tous les champs nécessaires
    
    try {
      // Vérifier si une conversation existe déjà entre ces participants EXACTEMENT
      // $all vérifie que tous les participants sont présents
      // $size vérifie que le nombre de participants correspond exactement
      const existingConversation = await Conversation.findOne({
        participants: { 
          $all: participants.map((id: string) => Types.ObjectId.createFromHexString(id)),
          $size: participants.length 
        }
      });
  
      if (existingConversation) {
        return res.status(200).json({ 
          message: "Conversation existante trouvée", 
          conversation: existingConversation 
        });
      }
  
      if(participants.length < 2) {
        return res.status(400).json({ message: "Une conversation doit avoir au moins 2 participants" });
      }
  
      if(participants.length > 50) {
        return res.status(400).json({ message: "Une conversation ne peut pas avoir plus de 50 participants" });
      }
  
      // Validation du champ createdBy
      if (!createdBy) {
        return res.status(400).json({ message: "Le champ createdBy est requis" });
      }
  
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
      res.status(201).json({ 
        message: "Conversation créée avec succès", 
        conversation: newConversation 
      });
    } catch (error) {
      console.error("Erreur lors de la création de la conversation:", error);
      res.status(500).json({ message: "Erreur lors de la création de la conversation", error });
    }
  }

  async addParticipantToConversation(req: Request, res: Response) {
    const { conversationId, participantId } = req.body;
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      if (conversation.participants.includes(participantId)) {
        return res.status(400).json({ message: "Le participant est déjà dans la conversation" });
      }

      conversation.participants.push(participantId);
      await conversation.save();
      res.status(200).json({ message: "Participant ajouté à la conversation avec succès" });
    } catch (error) {
      console.error(`[addParticipantToConversation] Erreur lors de l'ajout du participant ${participantId} à la conversation ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors de l'ajout du participant à la conversation", error });
    }
  }

  async removeParticipantFromConversation(req: Request, res: Response) {
    const { conversationId, participantId } = req.body;
    
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }
      
      if (!conversation.participants.includes(participantId)) {
        return res.status(400).json({ message: "Le participant n'est pas dans la conversation" });
      }

      conversation.participants = conversation.participants.filter((id) => id.toString() !== participantId);
      await conversation.save();  
      res.status(200).json({ message: "Participant retiré de la conversation avec succès" });
    } catch (error) {
      console.error(`[removeParticipantFromConversation] Erreur lors du retrait du participant ${participantId} de la conversation ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors du retrait du participant de la conversation", error });
    }
  }

  // Obtenir toutes les conversations d'un utilisateur
  async getUserConversations(req: Request, res: Response) {
    const userId = req.params.userId;
    
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID utilisateur invalide" });
      }

      const userObjectId = Types.ObjectId.createFromHexString(userId);
      
      const conversations = await Conversation.find({
        participants: userObjectId
      })
      .populate('participants', 'username email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

      res.status(200).json({ conversations });
    } catch (error) {
      console.error(`[getUserConversations] Erreur lors de la récupération des conversations pour l'utilisateur ${userId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération des conversations", error });
    }
  }

  // Obtenir une conversation spécifique avec ses messages
  async getConversation(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    
    try {
      if (!Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "ID conversation invalide" });
      }

      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'username email')
        .populate('lastMessage');

      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'username email')
        .sort({ timestamp: 1 });

      res.status(200).json({ conversation, messages });
    } catch (error) {
      console.error(`[getConversation] Erreur lors de la récupération de la conversation ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération de la conversation", error });
    }
  }

  async getMessageReadStats(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    const userId = (req as any).user.id;
    
    try {
      // Validation des IDs
      if (!mongoose.isValidObjectId(conversationId)) {
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      // Vérifier si la conversation existe et si l'utilisateur en fait partie
      const conversation = await Conversation.findById(conversationId)
        .select('participants isGroup groupName'); // Sélectionner uniquement les champs nécessaires

      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      // Vérifier si l'utilisateur est participant de la conversation
      const isParticipant = conversation.participants.some(
        (participant) => participant.toString() === userId
      );
      if (!isParticipant) {
        return res.status(403).json({ message: "Vous n'êtes pas participant de cette conversation" });
      }

      // Requête optimisée pour compter les messages non lus
      const unreadMessagesCount = await Message.countDocuments({
        conversation: conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      });

      res.status(200).json({
        unreadCount: unreadMessagesCount,
        conversationId: conversationId,
        isGroup: conversation.isGroup,
        groupName: conversation.groupName,
        lastUpdate: new Date()
      });

    } catch (error) { 
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