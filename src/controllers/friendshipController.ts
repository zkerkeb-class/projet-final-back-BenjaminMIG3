import { Request, Response } from 'express';
import Friendship from '../models/friendshipModel';
import User from '../models/userModel';
import { Types } from 'mongoose';

class FriendshipController {
  
  async sendFriendRequest(req: Request, res: Response) {
    const { senderId, receiverId } = req.body;

    try {
      // Vérifier si une friendship existe déjà
      const senderObjectId = new Types.ObjectId(senderId);
      const receiverObjectId = new Types.ObjectId(receiverId);

      const existingFriendship = await Friendship.findOne({
        $or: [
          { sender: senderObjectId, receiver: receiverObjectId },
          { sender: receiverObjectId, receiver: senderObjectId }
        ]
      });

      if (existingFriendship) {
        return res.status(400).json({ 
          message: 'Une demande d\'amitié existe déjà entre ces utilisateurs',
          friendship: existingFriendship
        });
      }

      const newFriendship = new Friendship({
        sender: senderObjectId,
        receiver: receiverObjectId,
        status: 'pending',
      });

      await newFriendship.save();
      res.status(201).json({ message: 'Demande d\'amitié envoyée avec succès', data: newFriendship });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de l\'envoi de la demande', error });
    }
  }

  async acceptFriendRequest(req: Request, res: Response) {
    const { receiverId, senderId } = req.body;
    
    try {
      const friendship = await Friendship.findOne({
        sender: senderId, 
        receiver: receiverId,
        status: 'pending'
      });
      
      if (!friendship) {
        console.log('Friendship not found or not pending');
        return res.status(404).json({ message: 'Demande d\'amitié non trouvée ou déjà traitée' });
      }

      // Vérifier que l'utilisateur est bien le destinataire
      if (friendship.receiver.toString() !== receiverId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à accepter cette demande' });
      }

      friendship.status = 'accepted';
      await friendship.save();

      res.status(200).json({ message: 'Demande d\'amitié acceptée', data: friendship });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de l\'acceptation de la demande', error });
    }
  }

  async rejectFriendRequest(req: Request, res: Response) {
    const { receiverId, senderId } = req.body;

    try {
      const friendship = await Friendship.findOne({
        sender: senderId, 
        receiver: receiverId,
        status: 'pending'
      });
      
      if (!friendship) {
        return res.status(404).json({ message: 'Demande d\'amitié non trouvée ou déjà traitée' });
      }

      // Vérifier que l'utilisateur est bien le destinataire
      if (friendship.receiver.toString() !== receiverId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à rejeter cette demande' });
      }

      await Friendship.deleteOne({ _id: friendship._id });

      res.status(200).json({ message: 'Demande d\'amitié rejetée' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors du rejet de la demande', error });
    }
  }

  async getFriendRequests(req: Request, res: Response) {
    const { userId } = req.params;
    try {
      if (!userId) {
        return res.status(400).json({ message: 'userId est requis' });
      }
      
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'userId invalide' });
      }

      const userObjectId = new Types.ObjectId(userId);
      const friendRequests = await Friendship.find({
        receiver: userObjectId,
        status: 'pending',
      }).populate('sender', 'username email');
      res.status(200).json({ friendRequests });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Erreur lors de la récupération des demandes', error });
    }
  }

  async getFriendship(req: Request, res: Response) {
    const { senderId, receiverId } = req.params;
    console.log("Receiver Name", await User.findById(receiverId).select('username'));
    console.log("Sender Name", await User.findById(senderId).select('username'));
    
    try {
      // Validation des paramètres
      if (!senderId || !receiverId) {
        return res.status(400).json({ message: 'senderId et receiverId sont requis' });
      }

      // Vérifier que les IDs sont valides avant de créer les ObjectId
      if (!Types.ObjectId.isValid(senderId)) {
        return res.status(400).json({ message: 'senderId invalide' });
      }
      if (!Types.ObjectId.isValid(receiverId)) {
        return res.status(400).json({ message: 'receiverId invalide' });
      }

      // Conversion des chaînes en ObjectId pour la comparaison MongoDB
      const senderObjectId = new Types.ObjectId(senderId);
      const receiverObjectId = new Types.ObjectId(receiverId);

      // Optimisation : recherche directe dans les deux sens possibles
      const friendship = await Friendship.findOne({
        $or: [
          { sender: senderObjectId, receiver: receiverObjectId },
          { sender: receiverObjectId, receiver: senderObjectId }
        ]
      }).populate('sender receiver', 'username email');

      if (!friendship) {
        return res.status(404).json({ message: 'Aucune relation d\'amitié trouvée entre ces utilisateurs' });
      }

      res.status(200).json({ 
        friendship,
        message: 'Relation d\'amitié récupérée avec succès'
      });
    } catch (error) {
      console.error("Erreur dans getFriendship:", error);
      res.status(500).json({ message: 'Erreur lors de la récupération de la relation', error });
    }
  }

  async getFriends(req: Request, res: Response) {
    const userId = req.params.userId;
    try {
      if (!userId) {
        return res.status(400).json({ message: 'userId est requis' });
      }
      
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'userId invalide' });
      }

      const userObjectId = new Types.ObjectId(userId);
      // Récupérer toutes les amitiés où l'utilisateur est impliqué
      const friendships = await Friendship.find({
        $or: [{ sender: userObjectId }, { receiver: userObjectId }],
        status: 'accepted'
      });

      // Extraire les IDs des amis (l'autre utilisateur dans chaque relation)
      const friendIds = friendships.map(friendship => 
        friendship.sender.toString() === userId ? friendship.receiver : friendship.sender
      );

      // Récupérer les informations des amis
      const friendsData = await User.find(
        { _id: { $in: friendIds } },
        'username' // Sélectionner les champs souhaités
      );

      res.status(200).json({ friends: friendsData });
    } catch (error) {
      console.error('Erreur lors de la récupération des amis:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des amis', error });
    }
  }

  async removeFriendship(req: Request, res: Response) {
    const { friendshipId } = req.params; // Récupère depuis l'URL
    console.log('friendshipId', friendshipId);

    try {
      // Validation du friendshipId
      if (!friendshipId) {
        return res.status(400).json({ message: 'friendshipId est requis' });
      }

      // Vérifier que l'ID est valide avant de créer l'ObjectId
      if (!Types.ObjectId.isValid(friendshipId)) {
        return res.status(400).json({ message: 'friendshipId invalide' });
      }

      const friendshipObjectId = new Types.ObjectId(friendshipId);
      const friendship = await Friendship.findById(friendshipObjectId);

      if (!friendship) {
        console.log('Friendship not found');
        return res.status(404).json({ message: 'Relation d\'amitié non trouvée' });
      }

      await Friendship.deleteOne({ _id: friendship._id });

      res.status(200).json({ message: 'Ami supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression', error });
    }
  }

  async getFriendshipStatus(req: Request, res: Response) {
    const { userId } = req.params; // Assuming userId is passed as a URL parameter
    const currentUserId = (req as any).user.id; // Assuming user ID is stored in the request after authentication

    try {
      const userObjectId = new Types.ObjectId(userId);
      const currentUserObjectId = new Types.ObjectId(currentUserId);

      const friendship = await Friendship.findOne({
        $or: [
          { sender: currentUserObjectId, receiver: userObjectId },
          { sender: userObjectId, receiver: currentUserObjectId },
        ],
      });

      if (!friendship) {
        return res.status(200).json({ status: 'not_friends' });
      }

      res.status(200).json({ status: friendship.status });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la récupération du statut', error });
    }
  }
}
export default new FriendshipController();