import express from 'express';
import connectDB from './config/db';
import mainRoutes from './routes/mainRoutes';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import messageRouter from './routes/messageRoutes';
import friendshipRouter from './routes/friendshipRoutes';

require('dotenv').config();

const app = express();
const port = process.env.PORT;

connectDB();

app.use(express.json());
app.use(cors());
app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRouter);
app.use('/api/friends', friendshipRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});