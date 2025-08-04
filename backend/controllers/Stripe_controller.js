import stripe from 'stripe';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendStripeNotificationEmail } from '../config/mailer.config.js';

// Inizializza Stripe con la tua chiave segreta
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// ID dei tuoi piani di abbonamento su Stripe.
// SOSTITUISCI con i veri Price ID dalla tua dashboard Stripe.
const subscriptionPlans = {
  basic: process.env.STRIPE_PRICE_ID_BASIC, // Es: price_1P5X...
  premium: process.env.STRIPE_PRICE_ID_PREMIUM, // Es: price_1P5Y...
};

/**
 * Crea una sessione di checkout di Stripe per un nuovo abbonamento.
 * Reindirizza l'utente alla pagina di pagamento di Stripe.
 */
export const createCheckoutSession = async (req, res) => {
  const { plan, userId } = req.body; // 'plan' può essere 'basic' or 'premium'

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

    // Se l'utente ha già un abbonamento attivo, lo reindirizziamo al portale clienti
    // per gestire l'abbonamento esistente, invece di crearne uno nuovo.
    if (user.subscription && user.subscription.stripeSubscriptionId && user.subscription.status === 'active') {
        const portalSession = await stripeClient.billingPortal.sessions.create({
            customer: user.subscription.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/profile`,
        });
        return res.status(200).json({ redirectToPortal: true, url: portalSession.url });
    }


    let stripeCustomerId = user.subscription?.stripeCustomerId;

    // Se l'utente non ha un ID cliente Stripe, ne creiamo uno nuovo.
    if (!stripeCustomerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      stripeCustomerId = customer.id;
      // Salviamo subito il customerId nel nostro DB
      await User.findByIdAndUpdate(user._id, { 'subscription.stripeCustomerId': stripeCustomerId });
    }

    // Crea la sessione di checkout
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: subscriptionPlans[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-canceled`,
      metadata: {
        userId: user._id.toString(),
        plan: plan,
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Errore durante la creazione della sessione di checkout:", error);
    res.status(500).json({ error: 'Errore del server durante la creazione della sessione di pagamento.' });
  }
};


/**
 * Gestisce i webhook in arrivo da Stripe per sincronizzare lo stato degli abbonamenti.
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
    // Gestisce i diversi tipi di eventi
    switch (event.type) {
      case 'checkout.session.completed': {
        // Questo evento scatta subito dopo un pagamento andato a buon fine.
        // Anche se l'abbonamento non è ancora formalmente "attivo",
        // possiamo già aggiornare lo stato a 'incomplete' e preparare il terreno.
        const { userId, plan } = dataObject.metadata;
        const stripeSubscriptionId = dataObject.subscription;
        const stripeCustomerId = dataObject.customer;

        const user = await User.findById(userId);
        if (user) {
            user.subscription.stripeSubscriptionId = stripeSubscriptionId;
            user.subscription.stripeCustomerId = stripeCustomerId;
            user.subscription.plan = plan;
            // Lo stato diventerà 'active' con l'evento `invoice.payment_succeeded`
            user.subscription.status = 'incomplete';
            await user.save();
            console.log(`Utente ${userId} ha completato il checkout per il piano ${plan}. In attesa della conferma di pagamento.`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Il pagamento è stato confermato, l'abbonamento è ufficialmente attivo.
        const stripeSubscriptionId = dataObject.subscription;
        const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId });

        if (user) {
          user.subscription.status = 'active';
          user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          await user.save();

          // Invia email di conferma
          await sendStripeNotificationEmail(
            user.email,
            'Il tuo abbonamento è attivo! 🎉',
            `<h1>Ciao ${user.name},</h1><p>Il tuo pagamento è stato ricevuto e il tuo abbonamento al piano <strong>${user.subscription.plan}</strong> è ora attivo. Grazie per esserti unito a noi!</p>`
          );

          // Crea una notifica in-app
          await Notification.create({
            user: user._id,
            type: 'billing',
            message: `Il tuo abbonamento al piano ${user.subscription.plan} è stato attivato con successo.`,
            date: new Date(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Il rinnovo automatico o il pagamento iniziale è fallito.
        const stripeSubscriptionId = dataObject.subscription;
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId });

        if (user) {
          user.subscription.status = 'past_due'; // o 'unpaid' a seconda della tua logica
          await user.save();

          // Invia email di notifica
          const subject = '⚠️ Problema con il pagamento del tuo abbonamento';
          const body = `<h1>Ciao ${user.name},</h1><p>Non siamo riusciti ad elaborare il pagamento per il rinnovo del tuo abbonamento. Ti preghiamo di aggiornare le tue informazioni di pagamento per mantenere attivo il servizio.</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);

          // Crea una notifica in-app
          await Notification.create({
            user: user._id,
            type: 'billing',
            message: 'Pagamento fallito. Aggiorna il tuo metodo di pagamento.',
            date: new Date(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        // L'utente ha cambiato piano (upgrade/downgrade) o l'abbonamento è stato modificato.
        const stripeSubscriptionId = dataObject.id;
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId });

        if (user) {
            const newPlanId = dataObject.items.data[0].price.id;
            // Trova il nome del piano corrispondente al nuovo Price ID
            const newPlanName = Object.keys(subscriptionPlans).find(key => subscriptionPlans[key] === newPlanId);

            user.subscription.status = dataObject.status; // es. 'active'
            user.subscription.plan = newPlanName || user.subscription.plan;
            user.subscription.currentPeriodEnd = new Date(dataObject.current_period_end * 1000);
            await user.save();

            const subject = 'Il tuo abbonamento è stato aggiornato';
            const body = `<h1>Ciao ${user.name},</h1><p>Il tuo abbonamento è stato aggiornato con successo al piano <strong>${newPlanName}</strong>.</p>`;
            await sendStripeNotificationEmail(user.email, subject, body);

            await Notification.create({
                user: user._id,
                type: 'billing',
                message: `Il tuo abbonamento è stato aggiornato al piano ${newPlanName}.`,
                date: new Date(),
            });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        // L'abbonamento è stato cancellato (dall'utente o per mancati pagamenti).
        const stripeSubscriptionId = dataObject.id;
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId });

        if (user) {
          user.subscription.status = 'canceled';
          user.subscription.plan = 'free'; // Riporta l'utente al piano gratuito
          // Non cancellare stripeSubscriptionId e stripeCustomerId per la cronologia
          await user.save();

          const subject = 'Il tuo abbonamento è stato cancellato';
          const body = `<h1>Ciao ${user.name},</h1><p>Il tuo abbonamento è stato cancellato con successo. Ci dispiace vederti andare via!</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);

          await Notification.create({
            user: user._id,
            type: 'billing',
            message: 'Il tuo abbonamento è stato cancellato.',
            date: new Date(),
          });
        }
        break;
      }

      default:
        console.log(`Evento non gestito: ${event.type}`);
    }

    // Rispondi a Stripe per confermare la ricezione dell'evento
    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Errore nella gestione del webhook:", error);
    res.status(500).json({ error: 'Errore del server durante l\'elaborazione del webhook.' });
  }
};
