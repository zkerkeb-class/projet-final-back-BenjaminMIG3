import { Router } from "express";
import MessageController from "../controllers/messageController";
import { authenticateToken } from "../middlewares/sessionMiddleware";

const messageRouter = Router();

messageRouter.post("/send", authenticateToken, MessageController.sendMessage);
messageRouter.get("/conversation/:conversationId", authenticateToken, MessageController.getMessages);
messageRouter.delete("/:id", authenticateToken, MessageController.deleteMessage);
messageRouter.put("/:id", authenticateToken, MessageController.updateMessage);
messageRouter.patch("/:id/read", authenticateToken, MessageController.markMessageAsRead);

export default messageRouter;