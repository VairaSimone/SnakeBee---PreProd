import Stripe from 'stripe';
import User from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.userid;

    if (!['basic', 'premium'].includes(plan)) {
      return res.status(400).json({ message: 'Piano non valido' });
    }
if (!process.env.STRIPE_PRICE_ID_BASIC || !process.env.STRIPE_PRICE_ID_PREMIUM) {
  throw new Error('Missing Stripe Price IDs in environment variables');
}

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });

    // Crea customer Stripe solo se non esiste
    if (!user.subscription?.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      });

      user.subscription = {
        ...user.subscription,
        stripeCustomerId: customer.id
      };
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: user.subscription.stripeCustomerId,
      line_items: [
        {
          price: plan === 'basic' ? process.env.STRIPE_PRICE_ID_BASIC : process.env.STRIPE_PRICE_ID_PREMIUM,
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Errore creazione checkout session:', error);
    res.status(500).json({ message: 'Errore creazione sessione Stripe' });
  }
};


 const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items.data.price.product']
    });

    if (!session) return res.status(404).json({ message: 'Sessione non trovata' });

    const planName = session.line_items.data[0].price.product.name || 'N/A';

    res.json({
      id: session.id,
      status: session.payment_status,
      amount_total: session.amount_total,
      planName,
      customer_email: session.customer_details.email,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    console.error('Errore getSessionDetails:', error);
    res.status(500).json({ message: 'Errore nel recupero sessione Stripe' });
  }
};

export default { createCheckoutSession, getSessionDetails };
