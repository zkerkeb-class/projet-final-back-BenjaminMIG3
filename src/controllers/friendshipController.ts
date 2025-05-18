import { Request, Response } from 'express';
import Friendship from '../models/friendshipModel';
import jwt from 'jsonwebtoken';

class FriendshipController {
  async sendFriendRequest(req: Request, res: Response) {
    const { senderId, receiverId } = req.body;// Assuming user ID is stored in the request after authentication

    try {
      const newFriendship = new Friendship({
        sender: senderId,
        receiver: receiverId,
        status: 'pending',
      });

      await newFriendship.save();
      res.status(201).json({ message: 'Friend request sent successfully', data: newFriendship });
    } catch (error) {
      res.status(500).json({ message: 'Error sending friend request', error });
    }
  }

  async acceptFriendRequest(req: Request, res: Response) {
    const { receiverId, senderId } = req.body; // Assuming user ID is stored in the request after authentication

    try {
      const friendship = await Friendship.findOne({ user1: senderId, user2: receiverId });
      if (!friendship) {
        return res.status(404).json({ message: 'Friendship not found' });
      }

      if (friendship.user2.toString() !== receiverId) {
        return res.status(403).json({ message: 'You are not authorized to accept this friend request' });
      }

      friendship.status = 'accepted';
      await friendship.save();

      res.status(200).json({ message: 'Friend request accepted', data: friendship });
    } catch (error) {
      res.status(500).json({ message: 'Error accepting friend request', error });
    }
  }
  async rejectFriendRequest(req: Request, res: Response) {
    const { friendshipId } = req.body;
    const userId = (req as any).user.id; // Assuming user ID is stored in the request after authentication

    try {
      const friendship = await Friendship.findById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: 'Friendship not found' });
      }

      if (friendship.user2.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to reject this friend request' });
      }

      await Friendship.deleteOne({ _id: friendshipId });

      res.status(200).json({ message: 'Friend request rejected' });
    } catch (error) {
      res.status(500).json({ message: 'Error rejecting friend request', error });
    }
  }
  async getFriendRequests(req: Request, res: Response) {
    const userId = (req as any).user.id; // Assuming user ID is stored in the request after authentication

    try {
      const friendRequests = await Friendship.find({
        receiver: userId,
        status: 'pending',
      }).populate('sender', 'username email');

      res.status(200).json({ friendRequests });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friend requests', error });
    }
  }
  async getFriends(req: Request, res: Response) {
    const { userId } = req.params; // Assuming user ID is stored in the request after authentication

    try {
      const friends = await Friendship.find({
        $or: [
          { sender: userId, status: 'accepted' },
          { receiver: userId, status: 'accepted' },
        ],
      }).populate('sender receiver', 'username email');

      res.status(200).json({ friends });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friends', error });
    }
  }
  async removeFriend(req: Request, res: Response) {
    const { friendId } = req.params; // Récupère depuis l'URL
    const userId = (req as any).user.id; // ID de l'utilisateur authentifié

    try {
      const friendship = await Friendship.findOne({
        $or: [
          { sender: userId, receiver: friendId },
          { sender: friendId, receiver: userId },
        ],
      });

      if (!friendship) {
        return res.status(404).json({ message: 'Friendship not found' });
      }

      await Friendship.deleteOne({ _id: friendship._id });

      res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing friend', error });
    }
  }
  async getFriendshipStatus(req: Request, res: Response) {
    const { userId } = req.params; // Assuming userId is passed as a URL parameter
    const currentUserId = (req as any).user.id; // Assuming user ID is stored in the request after authentication

    try {
      const friendship = await Friendship.findOne({
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId },
        ],
      });

      if (!friendship) {
        return res.status(200).json({ status: 'not_friends' });
      }

      res.status(200).json({ status: friendship.status });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friendship status', error });
    }
  }
}
export default new FriendshipController();