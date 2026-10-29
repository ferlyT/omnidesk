import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// 1. Auth Rate Limiter (Brute-Force Protection)
// 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk. Demi keamanan, silakan coba lagi setelah 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});

// 2. File Upload Rate Limiter (Disk Exhaustion Protection)
// 30 uploads per 5 minutes
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Terlalu banyak unggahan berkas dalam waktu singkat. Silakan tunggu beberapa saat.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});

// 3. Global API Rate Limiter (DoS & Scraping Protection)
// 200 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Laju permintaan API melebihi batas (Rate limit exceeded). Silakan kurangi frekuensi permintaan.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});
