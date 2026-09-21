import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from './env';
import { AppError } from '../utils/AppError';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'winner-proofs');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadProofImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      // NOTE: swap this local-disk config out for S3/Cloudinary in
      // production — see ASSUMPTIONS.md and README for the intended seam.
      return cb(new AppError('Only PNG, JPEG or WEBP images are allowed', 400) as unknown as Error);
    }
    cb(null, true);
  },
}).single('proof');
