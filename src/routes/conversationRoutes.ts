import { Router } from "express";
import ConversationController from "../controllers/conversationController";
import { authenticateToken } from "../middlewares/sessionMiddleware";

const conversationRouter = Router();

conversationRouter.post("/", authenticateToken, ConversationController.createConversation);
conversationRouter.get("/user/:userId", authenticateToken, ConversationController.getUserConversations);
conversationRouter.get("/:conversationId", authenticateToken, ConversationController.getConversation);
conversationRouter.get("/:conversationId/read-stats", authenticateToken, ConversationController.getMessageReadStats);
conversationRouter.delete("/:conversationId", authenticateToken, ConversationController.deleteConversation);

export default conversationRouter; 