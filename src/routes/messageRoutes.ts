import { Router } from "express";
import MessageController from "../controllers/messageController";
import { authenticateToken } from "../middlewares/sessionMiddleware";

const messageRouter = Router();

messageRouter.post("/", authenticateToken, MessageController.sendMessage);
messageRouter.get("/:conversationId", authenticateToken, MessageController.getMessages);
messageRouter.delete("/:id", authenticateToken, MessageController.deleteMessage);
messageRouter.put("/:id", authenticateToken, MessageController.updateMessage);
messageRouter.patch("/:id/read", authenticateToken, MessageController.markMessageAsRead);
messageRouter.get("/:id/read-stats", authenticateToken, MessageController.getMessageReadStats);

export default messageRouter;