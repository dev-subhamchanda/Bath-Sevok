import type {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../../models/auth.model.js';

// POST /api/v1/auth/signup
const signUpController = async (req: Request, res: Response) => {
    try {
        const { email, password, name,role,phone } = req.body;
        if (!email || !password || !name || !role || !phone) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            email,
            passwordHash: hashedPassword,
            name,
            role,
            phone
        };
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ message: 'JWT secret is not configured' });
            return;
        }

        const createdUser = await User.create(user);
        const token = jwt.sign(
            { id: createdUser._id.toString(), email: createdUser.email },
            secret,
            { expiresIn: '1h' },
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 1000,
        });
        res.status(201).json({ message: 'User created successfully', token });
    } catch (error) {
        console.error('Error in signUpController:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/v1/auth/signin

const signInContoller = async (req: Request, res: Response) => {
    try {
        const { email, password } = await req.body;
        console.log("DATA RECEIVED : ", email, password);
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findOne({ email }).select('+passwordHash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ message: 'JWT secret is not configured' });
            return;
        }

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            secret,
            { expiresIn: '1h' },
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 1000,
        });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error in signInContoller:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export {signInContoller, signUpController};