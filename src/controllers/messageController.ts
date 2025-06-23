import { Request, Response } from "express";
import Message from "../models/messageModel";
import Conversation from "../models/conversationModel";
import mongoose from "mongoose";
import { deleteMessageSchema, getMessagesSchema, sendMessageSchema, updateMessageSchema } from "../validation/joiValidation";

class MessageController {
  async sendMessage(req: Request, res: Response) {
    const { conversationId, senderId, content } = req.body;
    
    try {
      // Validation des paramètres
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        return res.status(400).json({ message: "ID d'expéditeur invalide" });
      }

      // Vérifier si la conversation existe
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation non trouvée" });
      }

      // Créer l'ObjectId correctement
      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      
      // Vérifier si l'expéditeur fait partie de la conversation en comparant les strings
      const isParticipant = conversation.participants.some(participant => 
        participant.toString() === senderId
      );
      
      if (!isParticipant) {
        return res.status(403).json({ message: "Vous n'êtes pas participant de cette conversation" });
      }

      const newMessage = new Message({
        conversation: conversationId,
        sender: senderObjectId,
        content,
      });

      await newMessage.save();
      
      res.status(201).json({ message: "Message envoyé avec succès", data: newMessage });
    } catch (error) {
      console.error(`[sendMessage] Erreur lors de l'envoi du message:`, error);
      res.status(500).json({ message: "Erreur lors de l'envoi du message", error });
    }
  }

  async getMessages(req: Request, res: Response) {
    const conversationId = req.params.conversationId;
    
    try {
      // Validation de l'ID de conversation
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "ID de conversation invalide" });
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate("sender", "username email")
        .sort({ timestamp: 1 });

      res.status(200).json({ messages });
    } catch (error) {
      console.error(`[getMessages] Erreur lors de la récupération des messages pour ${conversationId}:`, error);
      res.status(500).json({ message: "Erreur lors de la récupération des messages", error });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    const messageId = req.params.id;
    const userId = (req as any).user.id; // Récupérer l'ID depuis le token JWT
    
    try {
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Vérifier si l'utilisateur est l'expéditeur du message
      if (message.sender.toString() !== userId) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce message" });
      }

      await message.deleteOne();
      res.status(200).json({ message: "Message supprimé avec succès" });
    } catch (error) {
      console.error(`[deleteMessage] Erreur lors de la suppression du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors de la suppression du message", error });
    }
  }

  async updateMessage(req: Request, res: Response) {
    const messageId = req.params.id;
    const { content, userId } = req.body;
    
    try {
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Vérifier si l'utilisateur est l'expéditeur du message
      if (message.sender.toString() !== userId) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce message" });
      }

      // Mettre à jour le contenu et marquer comme édité
      const oldContent = message.content;
      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      
      await message.save();
      
      res.status(200).json({ message: "Message mis à jour avec succès", data: message });
    } catch (error) {
      console.error(`[updateMessage] Erreur lors de la mise à jour du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du message", error });
    }
  }

  async markMessageAsRead(req: Request, res: Response) {
    const messageId = req.params.id;
    const userId = (req as any).user.id; // Récupérer l'ID depuis le token JWT
    
    try {
      // Validation des IDs
      if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ message: "ID de message invalide" });
      }

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "ID d'utilisateur invalide" });
      }

      const message = await Message.findById(messageId);

      if (!message) {   
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Créer l'ObjectId avec le bon type
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Vérifier si le message est déjà lu par l'utilisateur (méthode optimisée)
      const wasAlreadyRead = message.isReadBy(userObjectId as any);
      if (wasAlreadyRead) {
        return res.status(200).json({ 
          message: "Message déjà marqué comme lu", 
          data: message,
          alreadyRead: true 
        });
      }

      // Utiliser la méthode optimisée du modèle pour marquer comme lu
      await message.markAsReadBy(userObjectId as any);

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
    
    try {
      // Validation de l'ID
      if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ message: "ID de message invalide" });
      }

      const message = await Message.findById(messageId)
        .populate('readBy.user', 'username email')
        .populate('sender', 'username email');

      if (!message) {
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Utiliser la nouvelle méthode pour obtenir les statistiques
      const readStats = message.getReadStats();
      
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