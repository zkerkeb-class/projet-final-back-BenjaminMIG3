import { Request, Response } from 'express';
import Friendship from '../models/friendshipModel';
import jwt from 'jsonwebtoken';

class FriendshipController {
  async sendFriendRequest(req: Request, res: Response) {
    const { senderId, receiverId } = req.body;// Assuming user ID is stored in the request after authentication

    try {
      const newFriendship = new Friendship({
        user1: senderId,
        user2: receiverId,
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
      const friendship = await Friendship.findOne({$or: [{user1: senderId, user2: receiverId}, {user1: receiverId, user2: senderId}]});
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
    const { receiverId, senderId } = req.body;
     // Assuming user ID is stored in the request after authentication

    try {
      const friendship = await Friendship.findOne({$or: [{user1: senderId, user2: receiverId}, {user1: receiverId, user2: senderId}]});
      if (!friendship) {
        return res.status(404).json({ message: 'Friendship not found' });
      }

      if (friendship.user2.toString() !== receiverId) {
        return res.status(403).json({ message: 'You are not authorized to reject this friend request' });
      }

      await Friendship.deleteOne({ _id: friendship._id });

      res.status(200).json({ message: 'Friend request rejected' });
    } catch (error) {
      res.status(500).json({ message: 'Error rejecting friend request', error });
    }
  }

  async getFriendRequests(req: Request, res: Response) {
    const { userId } = req.params;
    console.log(userId);
    try {
      const friendRequests = await Friendship.find({
        user2: userId,
        status: 'pending',
      }).populate('user1', 'username email');
      console.log(friendRequests);
      res.status(200).json({ friendRequests });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Error fetching friend requests', error });
    }
  }

  async getFriendship(req: Request, res: Response) {
    const { senderId, receiverId } = req.params; // Assuming user ID is stored in the request after authentication

    try {
      const friendship = await Friendship.findOne({$or: [{user1: senderId, user2: receiverId}, {user1: receiverId, user2: senderId}]});

      res.status(200).json({ friendship });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friendship', error });
    }
  }

  async getFriends(req: Request, res: Response) {
    const userId = req.params.userId; // Assuming user ID is stored in the request after authentication

    try {
      const friends = await Friendship.find({ $or: [{ user1: userId }, { user2: userId }] });

      res.status(200).json({ friends });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friends', error });
    }
  }

  async removeFriendship(req: Request, res: Response) {
    const { friendshipId } = req.params; // Récupère depuis l'URL

    try {
      const friendship = await Friendship.findById(friendshipId);

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
          { user1: currentUserId, user2: userId },
          { user1: userId, user2: currentUserId },
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