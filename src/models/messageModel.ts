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

// Méthode pour marquer un message comme lu par un utilisateur
messageSchema.methods.markAsReadBy = function(userId: mongoose.Schema.Types.ObjectId) {
  const existingRead = this.readBy.find((read: any) => 
    read.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

// Méthode pour vérifier si un message a été lu par un utilisateur
messageSchema.methods.isReadBy = function(userId: mongoose.Schema.Types.ObjectId): boolean {
  return this.readBy.some((read: any) => 
    read.user.toString() === userId.toString()
  );
};

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;

