import express from 'express';
import * as stripeController from '../controllers/Stripe_controller.js';
import { authenticateJWT } from '../middlewares/Auth.js';

const stripeRouter = express.Router();

stripeRouter.post('/create-checkout-session', authenticateJWT, stripeController.createCheckoutSession);

export default stripeRouter;
