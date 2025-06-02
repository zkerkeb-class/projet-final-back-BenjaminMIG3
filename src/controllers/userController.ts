import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import { deleteUserSchema, getUserSchema, loginUserSchema, registerUserSchema, registerMultipleUsersSchema } from '../validation/joiValidation';
import Message from '../models/messageModel';
import Friendship from '../models/friendshipModel';

class UserController {
  async register(req: Request, res: Response) {
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    try {
      const { username, email, password } = req.body;
      const newUser = new User({ username, email, password: password });
      await newUser.save();

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const { error } = loginUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid Password' });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
      res.status(200).json({ token: token, user: user });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error });
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
  }

  async deleteUser(req: Request, res: Response) {
    const { error } = deleteUserSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    const { userId } = req.params;
    
    // Optimisation : supprimer tous les messages en une seule opération
    await Message.deleteMany({ sender: userId });
    
    // Supprimer toutes les amitiés où l'utilisateur est soit sender soit receiver
    await Friendship.deleteMany({ 
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  }

  async getUser(req: Request, res: Response) {
    const { error } = getUserSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details });
    }
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  }

  async getUserByEmail(req: Request, res: Response) {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  }

  async registerMultiple(req: Request, res: Response) {
    const { error } = registerMultipleUsersSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details });
    }

    try {
      const users = req.body;
      const createdUsers = [];
      const errors = [];

      for (const userData of users) {
        try {
          const newUser = new User(userData);
          await newUser.save();
          createdUsers.push({ username: newUser.username, email: newUser.email });
        } catch (err: any) {
          errors.push({
            user: userData.username,
            error: err.message || 'Unknown error occurred'
          });
        }
      }

      if (createdUsers.length === 0) {
        return res.status(400).json({ 
          message: 'No users were created', 
          errors 
        });
      }

      res.status(201).json({ 
        message: `${createdUsers.length} user(s) registered successfully`,
        createdUsers,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(500).json({ message: 'Error registering users', error });
    }
  }

  async getUserByUsername(req: Request, res: Response) {
    const { username } = req.params;
    const idUser = (req as any).user.id; // Récupérer l'ID depuis le token JWT
    
    try {
      console.log("Recherche pour username:", username, "par l'utilisateur:", idUser);
      
      // Récupérer les amitiés acceptées de l'utilisateur
      const friendships = await Friendship.find({
        $or: [
          { sender: idUser },
          { receiver: idUser }
        ],
        status: 'accepted'
      });

      console.log("Friendships", friendships);

      // Créer un ensemble des IDs des amis
      const friendIds = new Set(
        friendships.map(friendship => 
          friendship.sender.toString() === idUser 
            ? friendship.receiver.toString() 
            : friendship.sender.toString()
        )
      );

      // Ajouter l'ID de l'utilisateur lui-même à exclure
      friendIds.add(idUser);

      // Rechercher les utilisateurs qui correspondent au nom d'utilisateur
      // et qui ne sont pas dans la liste des amis
      const users = await User.find({
        username: { $regex: `^${username}`, $options: 'i' },
        _id: { $nin: Array.from(friendIds) }
      }).select('username email');
      
      if (!users || users.length === 0) {
        return res.status(404).json({ message: 'Aucun utilisateur trouvé' });
      }

      res.status(200).json({ 
        message: `${users.length} utilisateur(s) trouvé(s)`,
        users
      });
    } catch (error) {
      console.error("Erreur dans getUserByUsername:", error);
      res.status(500).json({ 
        message: 'Erreur lors de la recherche des utilisateurs',
        error 
      });
    }
  }
}

export default new UserController();