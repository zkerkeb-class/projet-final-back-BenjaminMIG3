import mongoose, { Document, Model } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Schema.Types.ObjectId;
  sender: mongoose.Schema.Types.ObjectId;
  content: string;
  timestamp: Date;
  readBy: Array<{
    user: mongoose.Schema.Types.ObjectId;
    readAt: Date;
  }>;
  messageType: 'text' | 'image' | 'file' | 'system';
  edited: boolean;
  editedAt?: Date;
  
  // Méthodes personnalisées
  markAsReadBy(userId: mongoose.Schema.Types.ObjectId): Promise<IMessage>;
  isReadBy(userId: mongoose.Schema.Types.ObjectId): boolean;
  getReadStats(): { totalReaders: number; readers: Array<{ userId: mongoose.Schema.Types.ObjectId; readAt: Date }> };
  getUnreadUsers(conversationId: mongoose.Schema.Types.ObjectId): Promise<Array<mongoose.Schema.Types.ObjectId>>;
}

const messageSchema = new mongoose.Schema<IMessage>({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
});

// Index pour optimiser les requêtes
messageSchema.index({ conversation: 1, timestamp: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });

// Validation du contenu selon le type
messageSchema.pre('validate', function(next) {
  if (this.messageType === 'text' && (!this.content || this.content.trim().length === 0)) {
    next(new Error('Le contenu du message text ne peut pas être vide'));
  }
  next();
});

// Middleware pour mettre à jour lastMessage et lastActivity de la conversation
messageSchema.post('save', async function() {
  const Conversation = mongoose.model('Conversation');
  await Conversation.findByIdAndUpdate(
    this.conversation,
    { 
      lastMessage: this._id, 
      updatedAt: new Date(),
      lastActivity: new Date()
    }
  );
});

// Méthode pour marquer un message comme lu par un utilisateur (Optimisée)
messageSchema.methods.markAsReadBy = function(userId: mongoose.Schema.Types.ObjectId) {
  // Validation de l'entrée
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new Error('ID utilisateur invalide');
  }

  const userIdString = userId.toString();
  
  // Utilisation d'un Map pour une recherche O(1) au lieu de O(n)
  const readByMap = new Map();
  this.readBy.forEach((read: any) => {
    readByMap.set(read.user.toString(), read);
  });
  
  // Vérifier si l'utilisateur a déjà lu le message
  if (!readByMap.has(userIdString)) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // Marquer le document comme modifié pour déclencher la sauvegarde
    this.markModified('readBy');
  }
  
  return this.save();
};

// Méthode pour vérifier si un message a été lu par un utilisateur (Optimisée)
messageSchema.methods.isReadBy = function(userId: mongoose.Schema.Types.ObjectId): boolean {
  // Validation de l'entrée
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return false;
  }

  const userIdString = userId.toString();
  
  // Utilisation d'un Map pour une recherche O(1) au lieu de O(n)
  const readByMap = new Map();
  this.readBy.forEach((read: any) => {
    readByMap.set(read.user.toString(), true);
  });
  
  return readByMap.has(userIdString);
};

// Méthode utilitaire pour obtenir les statistiques de lecture
messageSchema.methods.getReadStats = function() {
  return {
    totalReaders: this.readBy.length,
    readers: this.readBy.map((read: any) => ({
      userId: read.user,
      readAt: read.readAt
    }))
  };
};

// Méthode pour obtenir les utilisateurs qui n'ont pas encore lu le message
messageSchema.methods.getUnreadUsers = async function(conversationId: mongoose.Schema.Types.ObjectId) {
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(conversationId).populate('participants');
  
  if (!conversation) {
    throw new Error('Conversation non trouvée');
  }

  const readUserIds = new Set(this.readBy.map((read: any) => read.user.toString()));
  
  return conversation.participants.filter((participant: any) => 
    !readUserIds.has(participant._id.toString()) && 
    participant._id.toString() !== this.sender.toString() // Exclure l'expéditeur
  ).map((participant: any) => participant._id);
};

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;

