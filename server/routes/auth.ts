import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user';

const router = express.Router();
const JWT_SECRET = () => process.env.JWT_SECRET || 'secret';

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET(), { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET(), { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Server error during signin.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ message: 'If this email is registered, a reset code has been sent.' });
      return;
    }
    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    // In production: send via email. Returned in response for dev/demo purposes.
    res.json({ message: 'Reset code generated.', resetToken });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ message: 'Email, reset code and new password are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }
    const user = await User.findOne({
      email,
      resetToken: resetToken.toUpperCase(),
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset code.' });
      return;
    }
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
