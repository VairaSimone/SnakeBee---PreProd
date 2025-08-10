import rateLimit from 'express-rate-limit';

export const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // maximum 5 requests every 5 minutes per IP
  message: { message: "Troppi tentativi di aggiornamento. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 attempts per IP
  message: { message: "Troppi tentativi di login. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { message: "Troppi tentativi di registrazione. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});