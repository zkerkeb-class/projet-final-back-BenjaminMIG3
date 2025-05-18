import { Router } from "express";
import MessageController from "../controllers/messageController";
import { authenticateToken } from "../middlewares/sessionMiddleware";

const messageRouter = Router();
const messageController = MessageController;
messageRouter.post("/send", authenticateToken, messageController.sendMessage);
messageRouter.get("/get", authenticateToken, messageController.getMessages);
messageRouter.delete("/delete/:id", authenticateToken, messageController.deleteMessage);
messageRouter.put("/update/:id", authenticateToken, messageController.updateMessage);

export default messageRouter;