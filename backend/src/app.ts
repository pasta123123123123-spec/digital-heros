import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env';
import { stripeWebhookHandler } from './webhooks/stripe.webhook';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import scoresRoutes from './routes/scores.routes';
import subscriptionRoutes from './routes/subscription.routes';
import charityRoutes from './routes/charity.routes';
import drawRoutes from './routes/draw.routes';
import winnerRoutes from './routes/winner.routes';
import adminRoutes from './routes/admin.routes';
import donationRoutes from './routes/donation.routes';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // required so the refresh-token cookie is sent
  })
);
app.use(morgan(isProd ? 'combined' : 'dev'));

// General API rate limit — separate, stricter limits are applied to
// /api/auth/* in auth.routes.ts.
app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false })
);

// IMPORTANT: the Stripe webhook needs the RAW request body to verify the
// signature (see webhooks/stripe.webhook.ts), so it's mounted with
// express.raw() BEFORE the global express.json() below. If this route is
// moved after express.json(), signature verification will always fail.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(cookieParser());

// Static serving for locally-stored winner proof uploads (dev/demo only —
// see config/upload.ts for the production S3/Cloudinary swap-in note).
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/winners', winnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/donations', donationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
