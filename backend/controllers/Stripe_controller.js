import stripe from 'stripe';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendStripeNotificationEmail } from '../config/mailer.config.js'; // Assicurati che il percorso sia corretto

// Inizializza Stripe con la tua chiave segreta
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// ID dei tuoi piani di abbonamento su Stripe.
const subscriptionPlans = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
};

/**
 * Crea una sessione di checkout di Stripe per un nuovo abbonamento.
 */
export const createCheckoutSession = async (req, res) => {
  const { plan, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'ID utente non fornito.' });
  }
  if (!subscriptionPlans[plan]) {
    return res.status(400).json({ error: 'Piano non valido.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    if (user.subscription && user.subscription.stripeSubscriptionId && user.subscription.status === 'active') {
      const portalSession = await stripeClient.billingPortal.sessions.create({
        customer: user.subscription.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/profile`,
      });
      return res.status(200).json({ redirectToPortal: true, url: portalSession.url });
    }

    let stripeCustomerId = user.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      user.subscription.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: subscriptionPlans[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/canceled`,
      metadata: { userId: user._id.toString(), plan: plan }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Errore durante la creazione della sessione di checkout:", error);
    res.status(500).json({ error: 'Errore del server durante la creazione della sessione di pagamento.' });
  }
};

/**
 * Gestisce i webhook in arrivo da Stripe.
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`❌ Errore nella verifica della firma del webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const dataObject = event.data.object;
  console.log(`🔔 Webhook ricevuto: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const { userId, plan } = dataObject.metadata;
        const user = await User.findById(userId);
        if (user) {
          user.subscription.stripeSubscriptionId = dataObject.subscription;
          user.subscription.stripeCustomerId = dataObject.customer;
          user.subscription.plan = plan;
          user.subscription.status = 'incomplete';
          await user.save();
          console.log(`Utente ${userId} ha completato il checkout per il piano ${plan}. In attesa della conferma di pagamento.`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const stripeCustomerId = dataObject.customer;
        let stripeSubscriptionId = dataObject.subscription;

        // --- CORREZIONE FINALE ---
        // Basandoci sul payload fornito, il percorso corretto è questo.
        // Usiamo l'optional chaining (?.) per evitare errori se la struttura dovesse cambiare.
        if (!stripeSubscriptionId) {
            stripeSubscriptionId = dataObject.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;
        }

        const user = await User.findOne({ 'subscription.stripeCustomerId': stripeCustomerId });

        if (user && stripeSubscriptionId) {
          const periodEnd = new Date(dataObject.period_end * 1000);

          if (isNaN(periodEnd.getTime())) {
            console.error(`❌ Data di fine periodo non valida ricevuta da Stripe: ${dataObject.period_end}`);
            return res.status(400).json({ error: 'Invalid period_end date from Stripe.' });
          }

          user.subscription.status = 'active';
          user.subscription.stripeSubscriptionId = stripeSubscriptionId;
          user.subscription.currentPeriodEnd = periodEnd;
          
          if (!user.subscription.plan || user.subscription.plan === 'free') {
             const invoiceLineItem = dataObject.lines.data[0];
             if (invoiceLineItem?.price) {
                const priceId = invoiceLineItem.price.id;
                const planName = Object.keys(subscriptionPlans).find(key => subscriptionPlans[key] === priceId);
                if (planName) user.subscription.plan = planName;
             }
          }
          await user.save();
          console.log(`✅ Abbonamento ${stripeSubscriptionId} attivato per l'utente ${user._id}.`);

          await sendStripeNotificationEmail(
            user.email,
            'Il tuo abbonamento è attivo! 🎉',
            `<h1>Ciao ${user.name},</h1><p>Il tuo pagamento è stato ricevuto e il tuo abbonamento al piano <strong>${user.subscription.plan}</strong> è ora attivo. Grazie per esserti unito a noi!</p>`
          );

          await Notification.create({
            user: user._id,
            type: 'billing',
            message: `Il tuo abbonamento al piano ${user.subscription.plan} è stato attivato con successo.`,
            date: new Date(),
          });
        } else {
            if (!user) console.error(`❌ Utente non trovato con Customer ID: ${stripeCustomerId}`);
            if (!stripeSubscriptionId) console.error(`❌ Subscription ID non trovato nel payload dell'Invoice per il cliente ${stripeCustomerId}.`);
        }
        break;
      }

      // ... altri casi non modificati
      case 'invoice.payment_failed': {
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.subscription });
        if (user) {
          user.subscription.status = 'past_due';
          await user.save();
          
          const subject = '⚠️ Problema con il pagamento del tuo abbonamento';
          const body = `<h1>Ciao ${user.name},</h1><p>Non siamo riusciti ad elaborare il pagamento per il rinnovo del tuo abbonamento. Ti preghiamo di aggiornare le tue informazioni di pagamento.</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.id });
        if (user) {
          const newPlanId = dataObject.items.data[0].price.id;
          const newPlanName = Object.keys(subscriptionPlans).find(key => subscriptionPlans[key] === newPlanId);

          user.subscription.status = dataObject.status;
          user.subscription.plan = newPlanName || user.subscription.plan;
          user.subscription.currentPeriodEnd = new Date(dataObject.current_period_end * 1000);
          await user.save();

          const subject = 'Il tuo abbonamento è stato aggiornato';
          const body = `<h1>Ciao ${user.name},</h1><p>Il tuo abbonamento è stato aggiornato con successo al piano <strong>${newPlanName}</strong>.</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.id });
        if (user) {
          user.subscription.status = 'canceled';
          user.subscription.plan = 'free';
          await user.save();

          const subject = 'Il tuo abbonamento è stato cancellato';
          const body = `<h1>Ciao ${user.name},</h1><p>Il tuo abbonamento è stato cancellato con successo. Ci dispiace vederti andare via!</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);
        }
        break;
      }

      default:
        console.log(`Evento non gestito: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Errore nella gestione del webhook:", error);
    res.status(500).json({ error: 'Errore del server durante l\'elaborazione del webhook.' });
  }
};
