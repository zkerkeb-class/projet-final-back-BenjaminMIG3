import { Request, Response } from "express";
import Message from "../models/messageModel";
import Conversation from "../models/conversationModel";
import mongoose from "mongoose";
import { deleteMessageSchema, getMessagesSchema, sendMessageSchema, updateMessageSchema } from "../validation/joiValidation";

class MessageController {
  async sendMessage(req: Request, res: Response) {
    const { conversationId, senderId, content } = req.body;
    console.log(`[sendMessage] Tentative d'envoi - Conversation: ${conversationId}, Sender: ${senderId}, Contenu: ${content.substring(0, 30)}...`);
    
    try {
      // Validation des paramètres
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        console.log(`[sendMessage] ID de conversation invalide: ${conversationId}`);
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        console.log(`[sendMessage] ID d'expéditeur invalide: ${senderId}`);
        return res.status(400).json({ message: "ID d'expéditeur invalide" });
      }

      // Vérifier si la conversation existe
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        console.log(`[sendMessage] Conversation non trouvée: ${conversationId}`);
        return res.status(404).json({ message: "Conversation non trouvée" });
      }
      console.log(`[sendMessage] Conversation trouvée: ${conversationId}, Participants: ${conversation.participants.length}`);

      // Créer l'ObjectId correctement
      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      
      // Vérifier si l'expéditeur fait partie de la conversation en comparant les strings
      const isParticipant = conversation.participants.some(participant => 
        participant.toString() === senderId
      );
      
      if (!isParticipant) {
        console.log(`[sendMessage] Accès refusé - Sender ${senderId} n'est pas participant de la conversation ${conversationId}`);
        console.log(`[sendMessage] Participants de la conversation:`, conversation.participants.map(p => p.toString()));
        return res.status(403).json({ message: "Vous n'êtes pas participant de cette conversation" });
      }

      console.log(`[sendMessage] Vérification réussie - Sender ${senderId} est bien participant de la conversation`);

      const newMessage = new Message({
        conversation: conversationId,
        sender: senderObjectId,
        content,
      });

      await newMessage.save();
      console.log(`[sendMessage] Message créé avec succès - ID: ${newMessage._id}, Type: ${newMessage.messageType}`);
      res.status(201).json({ message: "Message envoyé avec succès", data: newMessage });
    } catch (error) {
      console.error(`[sendMessage] Erreur lors de l'envoi du message:`, error);
      res.status(500).json({ message: "Erreur lors de l'envoi du message", error });
    }
  }

  async getMessages(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    console.log(`[getMessages] Récupération des messages pour la conversation: ${conversationId}`);
    
    try {
      // Validation de l'ID de conversation
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        console.log(`[getMessages] ID de conversation invalide: ${conversationId}`);
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate("sender", "username email")
        .sort({ timestamp: 1 });

      console.log(`[getMessages] ${messages.length} messages trouvés pour la conversation ${conversationId}`);
      res.status(200).json({ messages });
    } catch (error) {
      console.error(`[getMessages] Erreur lors de la récupération des messages pour ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération des messages", error });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    const messageId = req.params.id;
    const userId = (req as any).user.id; // Récupérer l'ID depuis le token JWT
    console.log(`[deleteMessage] Tentative de suppression du message ${messageId} par l'utilisateur ${userId}`);
    
    try {
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log(`[deleteMessage] ID de message invalide: ${messageId}`);
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log(`[deleteMessage] ID d'utilisateur invalide: ${userId}`);
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[deleteMessage] Message non trouvé: ${messageId}`);
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Vérifier si l'utilisateur est l'expéditeur du message
      if (message.sender.toString() !== userId) {
        console.log(`[deleteMessage] Accès refusé - L'utilisateur ${userId} n'est pas l'expéditeur du message ${messageId}`);
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce message" });
      }

      await message.deleteOne();
      console.log(`[deleteMessage] Message ${messageId} supprimé avec succès par l'utilisateur ${userId}`);
      res.status(200).json({ message: "Message supprimé avec succès" });
    } catch (error) {
      console.error(`[deleteMessage] Erreur lors de la suppression du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors de la suppression du message", error });
    }
  }

  async updateMessage(req: Request, res: Response) {
    const messageId = req.params.id;
    const { content, userId } = req.body;
    console.log(`[updateMessage] Tentative de modification du message ${messageId} par l'utilisateur ${userId}`);
    
    try {
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log(`[updateMessage] ID de message invalide: ${messageId}`);
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log(`[updateMessage] ID d'utilisateur invalide: ${userId}`);
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[updateMessage] Message non trouvé: ${messageId}`);
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Vérifier si l'utilisateur est l'expéditeur du message
      if (message.sender.toString() !== userId) {
        console.log(`[updateMessage] Accès refusé - L'utilisateur ${userId} n'est pas l'expéditeur du message ${messageId}`);
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce message" });
      }

      // Mettre à jour le contenu et marquer comme édité
      const oldContent = message.content;
      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      
      await message.save();
      console.log(`[updateMessage] Message ${messageId} modifié avec succès - Ancien contenu: "${oldContent.substring(0, 30)}...", Nouveau contenu: "${content.substring(0, 30)}..."`);
      
      res.status(200).json({ message: "Message mis à jour avec succès", data: message });
    } catch (error) {
      console.error(`[updateMessage] Erreur lors de la mise à jour du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du message", error });
    }
  }

  async markMessageAsRead(req: Request, res: Response) {
    const messageId = req.params.id;
    const userId = (req as any).user.id; // Récupérer l'ID depuis le token JWT
    console.log(`[markMessageAsRead] Tentative de marquage comme lu du message ${messageId} par l'utilisateur ${userId}`);
    
    try {
      // Validation des IDs
      if (!mongoose.isValidObjectId(messageId)) {
        console.log(`[markMessageAsRead] ID de message invalide: ${messageId}`);
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.isValidObjectId(userId)) {
        console.log(`[markMessageAsRead] ID d'utilisateur invalide: ${userId}`);
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);

      if (!message) {
        console.log(`[markMessageAsRead] Message non trouvé: ${messageId}`);
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Créer l'ObjectId avec le bon type
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Vérifier si le message est déjà lu par l'utilisateur (méthode optimisée)
      const wasAlreadyRead = message.isReadBy(userObjectId as any);
      if (wasAlreadyRead) {
        console.log(`[markMessageAsRead] Message ${messageId} déjà lu par l'utilisateur ${userId}`);
        return res.status(200).json({ 
          message: "Message déjà marqué comme lu", 
          data: message,
          alreadyRead: true 
        });
      }

      // Utiliser la méthode optimisée du modèle pour marquer comme lu
      await message.markAsReadBy(userObjectId as any);
      console.log(`[markMessageAsRead] Message ${messageId} marqué comme lu avec succès par l'utilisateur ${userId}`);

      res.status(200).json({ 
        message: "Message marqué comme lu", 
        data: message, 
        alreadyRead: false 
      });
    } catch (error) {
      console.error(`[markMessageAsRead] Erreur lors du marquage du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors du marquage du message", error: error instanceof Error ? error.message : error });
    }
  }

  async getMessageReadStats(req: Request, res: Response) {
    const messageId = req.params.id;
    console.log(`[getMessageReadStats] Récupération des statistiques de lecture pour le message ${messageId}`);
    
    try {
      // Validation de l'ID
      if (!mongoose.isValidObjectId(messageId)) {
        console.log(`[getMessageReadStats] ID de message invalide: ${messageId}`);
        return res.status(400).json({ message: "ID de message invalide" });
      }

      const message = await Message.findById(messageId)
        .populate('readBy.user', 'username email')
        .populate('sender', 'username email');

      if (!message) {
        console.log(`[getMessageReadStats] Message non trouvé: ${messageId}`);
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Utiliser la nouvelle méthode pour obtenir les statistiques
      const readStats = message.getReadStats();
      
      console.log(`[getMessageReadStats] Statistiques récupérées pour le message ${messageId}: ${readStats.totalReaders} lecteurs`);
      
      res.status(200).json({ 
        messageId: messageId,
        content: message.content.substring(0, 50) + '...',
        sender: message.sender,
        timestamp: message.timestamp,
        readStats: readStats
      });
    } catch (error) {
      console.error(`[getMessageReadStats] Erreur lors de la récupération des statistiques pour ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques", error: error instanceof Error ? error.message : error });
    }
  }
}

export default new MessageController();