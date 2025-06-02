import mongoose from "mongoose";

export interface IFriendship extends mongoose.Document {
  sender: mongoose.Schema.Types.ObjectId;
  receiver: mongoose.Schema.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const friendshipSchema = new mongoose.Schema<IFriendship>({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index composé pour optimiser les requêtes de recherche de friendship
friendshipSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Index pour les requêtes par status
friendshipSchema.index({ status: 1 });

// Index pour récupérer toutes les relations d'un utilisateur
friendshipSchema.index({ sender: 1, status: 1 });
friendshipSchema.index({ receiver: 1, status: 1 });

const Friendship = mongoose.model<IFriendship>("Friendship", friendshipSchema);
export default Friendship;