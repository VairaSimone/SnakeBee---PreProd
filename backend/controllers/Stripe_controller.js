import Stripe from 'stripe';
import User from '../models/User.js';
import GhostCustomer from '../models/GhostCustomer.js';
import StripeCustomer from '../models/StripeCustomer.js';
import { sendStripeNotificationEmail } from '../config/mailer.config.js'; // path corretto al tuo modulo
import Notification from '../models/Notification.js';
const PRICE_ID_TO_PLAN = {
  [process.env.STRIPE_PRICE_ID_BASIC]: 'basic',
  [process.env.STRIPE_PRICE_ID_PREMIUM]: 'premium',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpointSecret) {
  // Fallire subito all’avvio se manca la secret, così te ne accorgi subito
  throw new Error('⚠️ STRIPE_WEBHOOK_SECRET non definita in env!');
}

const createBillingNotification = async (userId, message) => {
  try {
    await Notification.create({
      user: userId,
      type: 'billing',
      message,
      date: new Date(),
      status: 'sent',
      read: false,
      reptile: [],
    });
    console.log(`🔔 Notifica Stripe salvata per utente ${userId}`);
  } catch (err) {
    console.error('Errore nel salvare la notifica Stripe:', err);
  }
};
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
    if (user.subscription?.status === 'active' || user.subscription?.status === 'trialing') {
      return res.status(400).json({ message: 'Hai già un abbonamento attivo' });
    }

    // Crea customer Stripe solo se non esiste
    if (!user.subscription?.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      });
      await StripeCustomer.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          customerId: customer.id,
          email: user.email,
          updatedAt: new Date()

        },
        { upsert: true, new: true }
      );
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
      metadata: {
        plan,
      },
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

const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userid;
    const user = await User.findById(userId);

    if (!user || !user.subscription?.stripeCustomerId || !user.subscription?.status === 'active') {
      return res.status(400).json({ message: 'Nessun abbonamento attivo da cancellare' });
    }

    // Recupera la subscription ID da Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.subscription.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
      return res.status(404).json({ message: 'Abbonamento non trovato su Stripe' });
    }

    // Cancella l’abbonamento alla fine del periodo
    await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });

    res.json({ message: 'Abbonamento annullato: resterà attivo fino alla scadenza.' });
  } catch (error) {
    console.error('Errore nella cancellazione abbonamento:', error);
    res.status(500).json({ message: 'Errore durante la cancellazione dell’abbonamento' });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.userid;
    const user = await User.findById(userId);

    if (!user || !user.subscription) {
      return res.status(404).json({ message: 'Abbonamento non trovato' });
    }

    res.json({
      plan: user.subscription.plan || 'free',
      status: user.subscription.status || 'none',
      nextBillingDate: user.subscription.currentPeriodEnd || null,
    });
  } catch (error) {
    console.error('Errore nel recupero abbonamento:', error);
    res.status(500).json({ message: 'Errore interno' });
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
  const updateSubscription = async ({ customerId, status, periodEnd, plan, eventType, rawEvent }) => {
    const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
    if (!user) {
      console.warn(`Utente non trovato per customer ${customerId}`); // potrebbe succedere se migrano dati fuori sync
      await GhostCustomer.create({
        stripeCustomerId: customerId,
        eventType,
        rawEvent,

      });
      return;
    }


    user.subscription.status = status;
    if (periodEnd) user.subscription.currentPeriodEnd = new Date(periodEnd * 1000);
    if (plan) user.subscription.plan = plan;
    await user.save();


    const nextBilling = user.subscription.currentPeriodEnd?.toLocaleDateString('it-IT') || 'N/A';
    let subject, body, notifMsg;

    switch (status) {
      case 'active':
        subject = 'Abbonamento attivo - SnakeBee 🐍';
        body = `
        <h2>Grazie per esserti abbonato a SnakeBee!</h2>
        <p>Hai attivato il piano <strong>${plan}</strong>.</p>
        <p>Il prossimo rinnovo sarà il <strong>${nextBilling}</strong>.</p>
      `;
        notifMsg = `Abbonamento attivato (${plan}). Rinnovo il ${nextBilling}`;

        break;

      case 'past_due':
        subject = 'Pagamento fallito - SnakeBee ⚠️';
        body = `
        <h2>Ops, c'è stato un problema con il tuo pagamento.</h2>
        <p>Il tuo abbonamento <strong>${plan}</strong> è in stato <strong>past_due</strong>.</p>
        <p>Ti invitiamo a verificare il metodo di pagamento per evitare l'interruzione del servizio.</p>
      `;
        notifMsg = `Pagamento fallito per il piano ${plan}`;

        break;

      case 'canceled':
        subject = 'Abbonamento cancellato - SnakeBee ❌';
        body = `
        <h2>Hai cancellato il tuo abbonamento.</h2>
        <p>Ci dispiace vederti andare via. Il tuo accesso resterà valido fino al <strong>${nextBilling}</strong>.</p>
      `;
        notifMsg = `Hai cancellato il tuo abbonamento (${plan}).`;

        break;

      default:
        return; // Non notificare per stati non gestiti
    }

    await sendStripeNotificationEmail(user.email, subject, body);
    await createBillingNotification(user._id, notifMsg);

  };

  try {
    switch (type) {
      case 'checkout.session.completed':
        // Abbonamento iniziato
        if (data.mode === 'subscription') {
              const subscription = await stripe.subscriptions.retrieve(data.subscription);

          await updateSubscription({
            customerId: data.customer,
      status: subscription.status,
      periodEnd: subscription.current_period_end,
plan: PRICE_ID_TO_PLAN[data.items.data[0].price.id] || null,
            rawEvent: data,
            eventType: type,
          });

        }
        break;

      case 'invoice.payment_succeeded':
        // Pagamento ricorrente OK: mantieni attivo
        await updateSubscription({
          customerId: data.customer,
          status: 'active',
          periodEnd: data.lines.data[0].period.end,
          rawEvent: data,
          eventType: type,
        });
        break;

      case 'invoice.payment_failed':
        // Fallimento pagamento: potresti inviare email o sospendere
        await updateSubscription({
          customerId: data.customer,
          status: 'past_due',
          rawEvent: data,
          eventType: type,
        });
        // TODO: invia email di sollecito
        break;
      case 'customer.subscription.created':
        await updateSubscription({
          customerId: data.customer,
          status: data.status,
          periodEnd: data.current_period_end,
          plan: data.items.data[0].price.id || null,
          rawEvent: data,
          eventType: type,
        });
        break;

      case 'customer.subscription.updated':
        // Aggiornamento abbonamento (es. cambio piano, riattivo, cancellazioni)
        await updateSubscription({
          customerId: data.customer,
          status: data.status,
          periodEnd: data.current_period_end,
plan: PRICE_ID_TO_PLAN[data.items.data[0].price.id] || null,
          rawEvent: data,
          eventType: type,
        });
        break;

      case 'customer.subscription.deleted':
        // Cancellazione definitiva
        await updateSubscription({
          customerId: data.customer,
          status: 'canceled',
          rawEvent: data,
          eventType: type,
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

const changeSubscriptionPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.userid;

    if (!['basic', 'premium'].includes(plan)) {
      return res.status(400).json({ message: 'Piano non valido' });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeCustomerId || user.subscription?.status !== 'active') {
      return res.status(400).json({ message: 'Nessun abbonamento attivo da modificare' });
    }
    if (user.subscription.plan === plan) {
      return res.status(400).json({ message: 'Hai già questo piano attivo' });
    }

    // Ottieni la subscription Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.subscription.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription non trovata' });
    }

    const newPriceId = plan === 'basic'
      ? process.env.STRIPE_PRICE_ID_BASIC
      : process.env.STRIPE_PRICE_ID_PREMIUM;

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Calcola il costo della differenza
    });

    user.subscription.plan = plan;
    await user.save();

    res.json({ message: `Abbonamento aggiornato al piano ${plan}` });
  } catch (error) {
    console.error('Errore cambio piano:', error);
    res.status(500).json({ message: 'Errore durante il cambio piano' });
  }
};

export default { getSubscriptionStatus, createCheckoutSession, changeSubscriptionPlan, cancelSubscription, getSessionDetails, handleStripeWebhook };
