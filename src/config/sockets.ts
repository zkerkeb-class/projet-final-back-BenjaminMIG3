import { Server } from "socket.io";

// Configuration du serveur Socket.IO
const socketServer = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

socketServer.on("connection", (socket) => {
  console.log(`Utilisateur connecté dans socket.ts: ${socket.id}`);
  
  // Écouter les événements "message" émis par ce client spécifique
  socket.on("message", (data) => {
    console.log(`Message reçu: ${JSON.stringify(data)} par ${socket.id}`);
    
    // Exemple : retransmettre le message à tous les autres clients
    socket.broadcast.emit("message", {
      senderId: socket.id,
      data: data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Gérer la déconnexion
  socket.on("disconnect", () => {
    console.log(`Utilisateur déconnecté: ${socket.id}`);
  });
});

export default socketServer;