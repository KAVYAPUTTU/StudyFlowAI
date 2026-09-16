import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

const SALT_ROUNDS = 10;

// Never expose the password hash to clients.
function toPublicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export async function register(req, res) {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'This email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ user: toPublicUser(user), token: signToken(user) });
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));

  // Same message for "no such user" and "wrong password" — do not reveal
  // which emails exist.
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json({ user: toPublicUser(user), token: signToken(user) });
}

export async function me(req, res) {
  res.json({ user: toPublicUser(req.user) });
}