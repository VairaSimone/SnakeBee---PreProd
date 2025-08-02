import Stripe from 'stripe';
import User from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpointSecret) {
  // Fallire subito all’avvio se manca la secret, così te ne accorgi subito
  throw new Error('⚠️ STRIPE_WEBHOOK_SECRET non definita in env!');
}
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
       subscriptionId: session.subscription.id
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
    // Se la raw body non è esattamente quella inviata da Stripe, scatta l’errore
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;
  const type = event.type;

  // Helper per aggiornare lo stato sul DB
  const updateSubscription = async ({ customerId, status, periodEnd, plan }) => {
    const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
    if (!user) {
      console.warn(`Utente non trovato per customer ${customerId}`); // potrebbe succedere se migrano dati fuori sync
      return;
    }
    user.subscription.status = status;
    if (periodEnd) user.subscription.currentPeriodEnd = new Date(periodEnd * 1000);
    if (plan) user.subscription.plan = plan;
    await user.save();
  };

  try {
    switch (type) {
      case 'checkout.session.completed':
        // Abbonamento iniziato
        if (data.mode === 'subscription') {
          await updateSubscription({
            customerId: data.customer,
            status: 'active',
            periodEnd: data.subscription.current_period_end,
            plan: data.metadata.plan || null,
          });
        }
        break;

      case 'invoice.payment_succeeded':
        // Pagamento ricorrente OK: mantieni attivo
        await updateSubscription({
          customerId: data.customer,
          status: 'active',
          periodEnd: data.lines.data[0].period.end,
        });
        break;

      case 'invoice.payment_failed':
        // Fallimento pagamento: potresti inviare email o sospendere
        await updateSubscription({
          customerId: data.customer,
          status: 'past_due',
        });
        // TODO: invia email di sollecito
        break;

      case 'customer.subscription.updated':
        // Aggiornamento abbonamento (es. cambio piano, riattivo, cancellazioni)
        await updateSubscription({
          customerId: data.customer,
          status: data.status,
          periodEnd: data.current_period_end,
          plan: data.items.data[0].price.nickname || null,
        });
        break;

      case 'customer.subscription.deleted':
        // Cancellazione definitiva
        await updateSubscription({
          customerId: data.customer,
          status: 'canceled',
        });
        break;

      default:
        // Eventi non gestiti esplicitamente: loggarli per debug
        console.log(`⚡ Evento Stripe ricevuto ma ignorato: ${type}`);
    }

    // Risposta 2xx a Stripe per non ripetere
    res.json({ received: true });
  } catch (err) {
    console.error('❌ Errore interno nel webhook handler:', err);
    // Status 500 fa sì che Stripe riprovi dopo qualche ora (fino a 3 giorni)
    res.status(500).send('Internal Server Error');
  }
};

export default { createCheckoutSession, getSessionDetails, handleStripeWebhook };
