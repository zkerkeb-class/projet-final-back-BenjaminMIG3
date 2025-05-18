import mongoose from "mongoose";

export interface IFriendship extends mongoose.Document {
  user1: mongoose.Schema.Types.ObjectId;
  user2: mongoose.Schema.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}
const friendshipSchema = new mongoose.Schema<IFriendship>({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user2: {
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
const Friendship = mongoose.model<IFriendship>("Friendship", friendshipSchema);
export default Friendship;