import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1).max(120),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const REFRESH_COOKIE = 'dh_refresh_token';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const { accessToken, refreshToken } = await authService.signup(email, password, name);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.status(201).json({ accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken } = await authService.login(email, password);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthorized('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
});
