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
      // Vérifier si la conversation existe
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        console.log(`[sendMessage] Conversation non trouvée: ${conversationId}`);
        return res.status(404).json({ message: "Conversation non trouvée" });
      }
      console.log(`[sendMessage] Conversation trouvée: ${conversationId}, Participants: ${conversation.participants.length}`);

      const senderObjectId = new mongoose.Schema.Types.ObjectId(senderId);
      // Vérifier si l'expéditeur fait partie de la conversation
      if (!conversation.participants.includes(senderObjectId)) {
        console.log(`[sendMessage] Accès refusé - Sender ${senderId} n'est pas participant de la conversation ${conversationId}`);
        return res.status(403).json({ message: "Vous n'êtes pas participant de cette conversation" });
      }

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
      const message = await Message.findById(messageId);

      if (!message) {
        console.log(`[markMessageAsRead] Message non trouvé: ${messageId}`);
        return res.status(404).json({ message: "Message non trouvé" });
      }

      // Vérifier si le message est déjà lu par l'utilisateur
      const wasAlreadyRead = message.isReadBy(userId);
      if (wasAlreadyRead) {
        console.log(`[markMessageAsRead] Message ${messageId} déjà lu par l'utilisateur ${userId}`);
      }

      // Utiliser la méthode du modèle pour marquer comme lu
      await message.markAsReadBy(userId);
      console.log(`[markMessageAsRead] Message ${messageId} marqué comme lu avec succès par l'utilisateur ${userId}`);

      res.status(200).json({ message: "Message marqué comme lu", data: message });
    } catch (error) {
      console.error(`[markMessageAsRead] Erreur lors du marquage du message ${messageId}:`, error);
      res.status(500).json({ message: "Erreur lors du marquage du message", error });
    }
  }
}

export default new MessageController();