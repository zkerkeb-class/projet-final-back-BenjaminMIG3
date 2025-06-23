import express from 'express';
import { createServer } from 'http';
import connectDB from './config/db';
import mainRoutes from './routes/mainRoutes';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import messageRouter from './routes/messageRoutes';
import conversationRouter from './routes/conversationRoutes';
import friendshipRouter from './routes/friendshipRoutes';
import socketServer from './config/sockets';

require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT;

socketServer.attach(httpServer);

connectDB();

app.use(express.json());
app.use(cors());
app.use('/api', mainRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/friendships', friendshipRouter);

// Utilisation de httpServer au lieu de app.listen
httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket server ready for connections`);
});