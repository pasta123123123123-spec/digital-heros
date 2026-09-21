import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from './env';
import { AppError } from '../utils/AppError';

// Vercel sets this environment variable automatically
const isVercel = !!process.env.VERCEL;

let uploadDir = '';
if (!isVercel) {
  // Only create the directory if we are running locally (not on Vercel)
  uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'winner-proofs');
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Vercel Serverless Functions have a read-only filesystem.
// Instead of diskStorage, we use memoryStorage and will convert the file
// to a Base64 string in the controller to store directly in the database.
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    });

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
