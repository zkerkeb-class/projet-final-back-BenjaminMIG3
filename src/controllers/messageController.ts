import { Request, Response } from "express";
import Message from "../models/messageModel";
import { Types } from "mongoose";
import { deleteMessageSchema, getMessagesSchema, sendMessageSchema, updateMessageSchema } from "../validation/joiValidation";

class MessageController {
  async sendMessage(req: Request, res: Response) {
    const { error } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Validation error", details: error.details });
    }
    const { receiverId, content } = req.body;
    const senderId = (req as any).user.id; // Assuming user ID is stored in the request after authentication
    try {
      const newMessage = new Message({
        sender: Types.ObjectId.createFromHexString(senderId),
        receiver: Types.ObjectId.createFromHexString(receiverId),
        content,
      });

      await newMessage.save();
      res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
      res.status(500).json({ message: "Error sending message", error });
    }
  }

  async getMessages(req: Request, res: Response) {
    const { error } = getMessagesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ message: "Validation error", details: error.details });
    }
    const userId = (req as any).user.id;
    try {
      const messages = await Message.find({
        $or: [
          { sender: Types.ObjectId.createFromHexString(userId) },
          { receiver: Types.ObjectId.createFromHexString(userId) },
        ],
      }).populate("sender receiver", "username email");

      res.status(200).json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages", error });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    const { error } = deleteMessageSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: "Validation error", details: error.details });
    }
    const messageId = req.params.id;
    try {
      const message = await Message.findByIdAndDelete(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting message", error });
    }
  }

  async updateMessage(req: Request, res: Response) {
    const { error } = updateMessageSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: "Validation error", details: error.details });
    }
    const messageId = req.params.id;
    const { content } = req.body;
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { content },
        { new: true }
      );
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.status(200).json({ message: "Message updated successfully", data: message });
    } catch (error) {
      res.status(500).json({ message: "Error updating message", error });
    }
  }
}
export default new MessageController();