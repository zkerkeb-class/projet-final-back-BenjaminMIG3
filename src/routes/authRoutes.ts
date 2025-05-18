import { Router } from 'express';
import AuthController from '../controllers/authController';

const authRouter = Router();
const authController = AuthController;

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);

export default authRouter;