import express from 'express';
import { createServer } from 'http';
import connectDB from './config/db';
import mainRoutes from './routes/mainRoutes';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import messageRouter from './routes/messageRoutes';
import conversationRouter from './routes/conversationRoutes';
import friendshipRouter from './routes/friendshipRoutes';
import { Server } from 'socket.io';

require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT;

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

if(io) {
  console.log('Socket.IO server is running');
}

io.on('connection', (socket) => {
  console.log('Un client est connecté :', socket.id);

  // Écouter un événement personnalisé envoyé par le client
  socket.on('message', (data) => {
    console.log('Message reçu :', data);

    // Diffuser le message à tous les clients connectés
    io.emit('message', data);
  });

  // Gérer la déconnexion
  socket.on('disconnect', () => {
    console.log('Client déconnecté :', socket.id);
  });
});

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
});