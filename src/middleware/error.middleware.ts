import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Handle Multer Errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'Ukuran berkas melebihi batas maksimal yang diizinkan'
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: `Kesalahan unggah berkas: ${err.message}`
    });
    return;
  }

  // 2. Custom Validation / Business Logic Errors
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error Handler] [${req.method} ${req.originalUrl}]`, err.message || err);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server',
    ...(isProduction ? {} : { stack: err.stack })
  });
}
