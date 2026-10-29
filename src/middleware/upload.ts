import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Dangerous extensions blacklist
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.js', '.mjs', '.vbs',
  '.html', '.htm', '.xhtml', '.svg', '.jar', '.msi', '.dll', '.scr', '.ps1'
]);

// Allowed MIME types
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const ALLOWED_MEDIA_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
]);

function createDiskStorage(subfolder: string) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const isImage = file.mimetype.startsWith('image/');
      const targetFolder = subfolder === 'auto' ? (isImage ? 'images' : 'documents') : subfolder;
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', targetFolder);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      cb(null, `cs_${uniqueSuffix}_${safeName}${ext}`);
    }
  });
}

// 1. Avatar Upload (Strictly JPG/PNG/WEBP, Max 2 MB)
export const avatarUpload = multer({
  storage: createDiskStorage('images'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error('Format berkas berbahaya tidak diizinkan'));
    }
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Avatar hanya mendukung format JPG, PNG, atau WEBP'));
    }
    cb(null, true);
  }
});

// 2. Ticket Media Upload (Images & Documents, Max 15 MB)
export const mediaUpload = multer({
  storage: createDiskStorage('auto'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error(`Tipe berkas (${ext}) berpotensi berbahaya dan ditolak oleh sistem keamanan`));
    }
    if (!ALLOWED_MEDIA_MIMES.has(file.mimetype)) {
      return cb(new Error('Tipe berkas tidak didukung. Harap unggah gambar atau dokumen standar (PDF, Word, Excel, Txt)'));
    }
    cb(null, true);
  }
});
