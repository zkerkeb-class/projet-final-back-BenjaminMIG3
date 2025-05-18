import express from 'express';
import { authenticateToken } from '../middlewares/sessionMiddleware';

const mainRouter = express.Router();

mainRouter.get('/', authenticateToken, (req, res) => {
  res.send('Hello World!');
});

export default mainRouter;