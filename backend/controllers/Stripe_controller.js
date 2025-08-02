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

const handleStripeWebhook = async (req, res) => {

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type, id } = event;

  console.log(`[Stripe] Webhook received: ${type} (${id})`);

  try {
    switch (type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (!session.customer || !session.subscription) {
          console.warn(`[Stripe] Missing customer or subscription in session: ${session.id}`);
          return res.status(400).send('Missing customer or subscription');
        }

        const customerId = session.customer;
        const subscriptionId = session.subscription;

        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) return res.status(404).send('User not found');

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Assicura che il customerId sia salvato
        if (!user.subscription.stripeCustomerId) {
          user.subscription.stripeCustomerId = customerId;
        }
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null; // o throw, a seconda della tua logica

        if (!periodEnd || isNaN(periodEnd.getTime())) {
          console.error('Invalid subscription.current_period_end:', subscription.current_period_end);
          return res.status(500).send('Invalid current_period_end from Stripe');
        }
        user.subscription = {
          ...user.subscription,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: periodEnd,
          plan: subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_PREMIUM ? 'premium' : 'basic'
        };

        await user.save();
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (!invoice.subscription) {
          console.error('[Stripe] Missing subscription ID in invoice.paid event:', invoice.id);
          return res.status(400).send('Missing subscription ID');
        }
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

        const customerId = subscription.customer;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) return res.status(404).send('User not found');
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        if (!periodEnd || isNaN(periodEnd.getTime())) {
          console.warn(`[Stripe] Invalid or missing current_period_end in subscription.${type.split('.').pop()}:`, subscription.id);
        }
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodEnd = periodEnd;
        await user.save();
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) return res.status(404).send('User not found');

        user.subscription.status = 'past_due';
        await user.save();

        console.warn(`[Stripe] Payment failed for user ${user.email}`);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;

        const customerId = subscription.customer;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) return res.status(404).send('User not found');

        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        if (!periodEnd || isNaN(periodEnd.getTime())) {
          console.error('[Stripe] Invalid current_period_end in subscription.created:', subscription.current_period_end);
          return res.status(500).send('Invalid current_period_end');
        }

        user.subscription = {
          ...user.subscription,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: periodEnd,
          plan: subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_PREMIUM ? 'premium' : 'basic'
        };

        await user.save();
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
        if (!user) return res.status(404).send('User not found');
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        if (!periodEnd || isNaN(periodEnd.getTime())) {
          console.error('[Stripe] Invalid current_period_end in invoice.paid:', subscription.current_period_end);
          return res.status(500).send('Invalid current_period_end');
        }
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodEnd = periodEnd;
        await user.save();
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log(`[Stripe] Checkout session expired: ${session.id}`);
        // Qui potresti loggare o notificare l’utente
        break;
      }

      case 'customer.deleted': {
        const customer = event.data.object;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customer.id });
        if (!user) return res.status(404).send('User not found');

        user.subscription = {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          status: null,
          currentPeriodEnd: null,
          plan: null
        };
        await user.save();
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${type}`);
    }

    // ✅ Risposta OK a Stripe
    res.status(200).send('received');
  } catch (error) {
    console.error(`[Stripe] Error handling ${type}:`, error);
    res.status(500).send('Webhook internal error');
  }
};


export default { createCheckoutSession, getSessionDetails, handleStripeWebhook };
