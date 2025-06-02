import express from 'express';
import connectDB from './config/db';
import mainRoutes from './routes/mainRoutes';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import messageRouter from './routes/messageRoutes';
import conversationRouter from './routes/conversationRoutes';
import friendshipRouter from './routes/friendshipRoutes';

require('dotenv').config();

const app = express();
const port = process.env.PORT;

connectDB();

app.use(express.json());
app.use(cors());
app.use('/api', mainRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/friendships', friendshipRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});