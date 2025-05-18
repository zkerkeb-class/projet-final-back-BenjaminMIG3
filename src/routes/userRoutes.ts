import { Router } from 'express';
import UserController from '../controllers/userController';

const userRoutes = Router();
const userController = UserController;

userRoutes.post('/register', userController.register);
userRoutes.post('/register-multiple', userController.registerMultiple);
userRoutes.post('/login', userController.login);
userRoutes.delete('/delete/:userId', userController.deleteUser);
userRoutes.get('/getUser/:userId', userController.getUser);

export default userRoutes;