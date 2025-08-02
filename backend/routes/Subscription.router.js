// /routes/Subscription.router.js
import express from 'express';
import { generateCheckoutLink, handlePaddleWebhook } from '../controllers/Subscription_controller.js';
import { authenticateJWT } from '../middlewares/Auth.js';
const router = express.Router();

router.post('/create-checkout', authenticateJWT, generateCheckoutLink);

router.post('/paddle/webhook', express.urlencoded({ extended: true }), handlePaddleWebhook);

export default router;

