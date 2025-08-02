import express from 'express';
import stripeController from '../controllers/Stripe_controller.js';
import { authenticateJWT } from '../middlewares/Auth.js';

const stripeRouter = express.Router();

stripeRouter.post('/create-checkout-session', authenticateJWT, stripeController.createCheckoutSession);
stripeRouter.get('/session/:sessionId', authenticateJWT, getSessionDetails);

export default stripeRouter;
