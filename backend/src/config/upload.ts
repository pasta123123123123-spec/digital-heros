import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from './env';
import { AppError } from '../utils/AppError';

// Detect serverless environments (Vercel/AWS)
let isVercel = !!process.env.VERCEL || !!process.env.AWS_REGION;

let uploadDir = '';
if (!isVercel) {
  try {
    uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'winner-proofs');
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    // If the filesystem is read-only (which happens on Vercel), fall back to memory
    isVercel = true;
  }
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
