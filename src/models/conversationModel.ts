import mongoose, { Document, Model } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Schema.Types.ObjectId[];
  lastMessage?: mongoose.Schema.Types.ObjectId;
  lastActivity: Date;
  isGroup: boolean;
  groupName?: string;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const conversationSchema = new mongoose.Schema<IConversation>({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isGroup: {
    type: Boolean,
    default: function() {
      return this.participants && this.participants.length > 2;
    }
  },
  groupName: {
    type: String,
    required: function() {
      return this.isGroup;
    },
    maxlength: 50
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validation : au moins 2 participants
conversationSchema.pre('validate', function(next) {
  if (this.participants && this.participants.length < 2) {
    next(new Error('Une conversation doit avoir au moins 2 participants'));
  }
  next();
});

// Validation : maximum 50 participants pour les groupes
conversationSchema.pre('validate', function(next) {
  if (this.participants && this.participants.length > 50) {
    next(new Error('Une conversation ne peut pas avoir plus de 50 participants'));
  }
  next();
});

// Index pour optimiser les requêtes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ createdBy: 1 });

// Middleware pour mettre à jour updatedAt et lastActivity
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActivity = new Date();
  next();
});

const Conversation: Model<IConversation> = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation; 