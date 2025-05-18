import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import { loginSchema, registerSchema } from '../validation/joiValidation';

class AuthController {
  async register(req: Request, res: Response) {
    const { error } = registerSchema.validate(req.body);
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
    const { error } = loginSchema.validate(req.body);
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
      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error });
    }
  }
}

export default new AuthController();