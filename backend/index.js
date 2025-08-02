import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRouter from './routes/Auth.router.js';
import passport from 'passport';
import userRouter from './routes/User.router.js';
import reptileRouter from './routes/Reptile.router.js';
import feedingRouter from './routes/Feeding.router.js';
import breedingRouter from './routes/Breeding.router.js';
import './config/FeedingJob.js';
import './config/RemoveTokenJob.js';
import notificationRouter from './routes/Notification.router.js';
import forum from './routes/Forum.router.js';
import googleStrategy from './config/Passport.config.js ';
import './config/RetryFailedEmails.js';
import cloudinaryRouter from './routes/Cloudinary.router.js';
import foodInventoryRoute from './routes/FoodInventory.router.js';
import path from 'path';
import { fileURLToPath } from 'url';
import stripeRouter from './routes/Stripe.router.js';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT
const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL, 
  methods: ['GET', 'POST', 'OPTIONS', "DELETE", "PUT", "PATCH"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.set('trust proxy', 1);

const allowedOrigins = [process.env.FRONTEND_URL,   'http://localhost:3000', // sviluppo
  'http://snakebee.it',    // produzione
  'https://snakebee.it','https://blog-api-ten-flax.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser())

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gestione eventi
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId = session.customer;

      const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
      if (!user) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      user.subscription = {
        ...user.subscription,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_PREMIUM ? 'premium' : 'basic'
      };
      await user.save();
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
      if (!user) break;

      user.subscription.status = subscription.status;
      user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      await user.save();
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});


app.use(express.json({ limit: '10kb' }));
app.use(morgan("dev"))
app.use(helmet())
app.use(helmet.crossOriginResourcePolicy({ policy: 'same-site' })); // o 'same-origin'
app.use(helmet.crossOriginEmbedderPolicy({ policy: 'require-corp' }));
passport.use("google", googleStrategy)
app.use(express.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_STRING)
  .then(() => console.log("Connected database"))
  .catch((err) => console.log(err))
  app.get('/api/ping', (req, res) => {
  res.status(200).send('OK');
});
app.use('/api/stripe', stripeRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/inventory', foodInventoryRoute);
app.use('/api/cloudinary', cloudinaryRouter);
app.use("/api/api/v1/", authRouter)
app.use('/api/user', userRouter);
app.use('/api/reptile', reptileRouter);
app.use('/api/feedings', feedingRouter);
app.use('/api/breeding', breedingRouter);
app.use('/api/notifications', notificationRouter);
//app.use('/api/forum', forum);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on ${process.env.BACKEND_URL}:${process.env.PORT}`);

})