import stripe from 'stripe';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendStripeNotificationEmail } from '../config/mailer.config.js';

// Inizializza Stripe con la tua chiave segreta
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// ID dei tuoi piani di abbonamento su Stripe.
const subscriptionPlans = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
};
 function parsePeriodEnd(obj) {
  const ts1 = obj.current_period_end;
  const ts2 = obj.items?.data[0]?.current_period_end;
  const ts = ts1 ?? ts2;
  if (!ts || typeof ts !== 'number') return null;
  return new Date(ts * 1000);
}
/**
 * Trova il nome del piano ('basic', 'premium') dato un Price ID di Stripe.
 * @param {string} priceId - L'ID del prezzo di Stripe.
 * @returns {string|null} - Il nome del piano o null se non trovato.
 */
const getPlanNameByPriceId = (priceId) => {
  return Object.keys(subscriptionPlans).find(key => subscriptionPlans[key] === priceId) || null;
}

/**
 * Crea una sessione di checkout di Stripe per un nuovo abbonamento.
 */
export const createCheckoutSession = async (req, res) => {
  const { plan } = req.body;    

const userId = req.user.userid;
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

    // Se l'utente ha già un abbonamento attivo, reindirizzalo al portale clienti.
    if (user.subscription && user.subscription.stripeSubscriptionId && user.subscription.status === 'active') {
      return createCustomerPortalSession(req, res);
    }

    let stripeCustomerId = user.subscription?.stripeCustomerId;

    // Se l'utente non ha un Customer ID di Stripe, crealo.
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
 * Modifica (upgrade/downgrade) un abbonamento esistente.
 */
export const manageSubscription = async (req, res) => {
  const { newPlan } = req.body;
const userId = req.user.userid;

  if (!userId || !newPlan) {
    return res.status(400).json({ error: 'ID utente e nuovo piano sono richiesti.' });
  }

  if (!subscriptionPlans[newPlan]) {
    return res.status(400).json({ error: 'Piano non valido.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Utente o abbonamento non trovato.' });
    }
    // --- NUOVA LOGICA: peso dei piani per identificare downgrade ---
    const planWeights = { basic: 1, premium: 2 };
    const currentPlan = user.subscription.plan;
    if (!planWeights[currentPlan]) {
      console.warn(`Piano corrente sconosciuto: ${currentPlan}`);
    }
    // Se il peso del nuovo piano è inferiore, è un downgrade → errore
    if (planWeights[newPlan] < planWeights[currentPlan]) {
      return res.status(400).json({
        error: `Downgrade non supportato in automatico. ` +
               `Cancella l'abbonamento corrente e sottoscrivi di nuovo il piano "${newPlan}".`
      });
    }

    // Se siamo qui, o è un upgrade o lo stesso piano
    if (newPlan === currentPlan) {
      return res.status(400).json({ error: 'Selezionato lo stesso piano. Nessuna modifica effettuata.' });
    }

    const subscriptionId = user.subscription.stripeSubscriptionId;
    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

    // Prende l'item corrente dell'abbonamento per sostituirlo.
    const currentItemId = subscription.items.data[0].id;

    const updatedSubscription = await stripeClient.subscriptions.update(subscriptionId, {
      items: [{
        id: currentItemId,
        price: subscriptionPlans[newPlan],
      }],
      // --- MODIFICA CHIAVE ---
      // 'always_invoice' crea immediatamente una fattura per il cambio.
      // - Per un UPGRADE: addebita subito la differenza proporzionale.
      // - Per un DOWNGRADE: crea subito un credito per il cliente.
      // Questo comportamento è trasparente e previene abusi, ma non resetta
      // il ciclo di fatturazione.
      proration_behavior: 'always_invoice',
      // Per addebitare immediatamente l'intero importo e resettare il ciclo,
      // si dovrebbe usare `proration_behavior: 'none'` e creare una nuova fattura manualmente,
      // ma 'always_invoice' è un'ottima via di mezzo.
    });

    // Aggiorna il piano nel DB locale. Il webhook `customer.subscription.updated` farà il resto.
    user.subscription.plan = newPlan;
    await user.save();

    res.status(200).json({ success: true, message: 'Abbonamento aggiornato con successo.', subscription: updatedSubscription });

  } catch (error) {
    console.error("Errore durante la modifica dell'abbonamento:", error);
    res.status(500).json({ error: "Errore del server durante l'aggiornamento dell'abbonamento." });
  }
};

/**
 * Annulla un abbonamento alla fine del periodo di fatturazione corrente.
 */
export const cancelSubscription = async (req, res) => {
const userId = req.user.userid;

  if (!userId) {
    return res.status(400).json({ error: 'ID utente non fornito.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Utente o abbonamento non trovato.' });
    }

    const subscriptionId = user.subscription.stripeSubscriptionId;
    // Annulla l'abbonamento alla fine del ciclo di fatturazione.
    const canceledSubscription = await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Lo status verrà aggiornato a 'canceled' dal webhook `customer.subscription.updated`.
    // Possiamo anticipare l'aggiornamento qui se necessario.
    user.subscription.status = 'pending_cancellation'; // Status personalizzato per indicare la cancellazione imminente
    await user.save();

    res.status(200).json({ success: true, message: 'La cancellazione dell\'abbonamento è stata programmata.', subscription: canceledSubscription });

  } catch (error) {
    console.error("Errore durante l'annullamento dell'abbonamento:", error);
    res.status(500).json({ error: "Errore del server durante l'annullamento dell'abbonamento." });
  }
};

/**
 * Crea una sessione del portale clienti di Stripe.
 */
export const createCustomerPortalSession = async (req, res) => {
const userId = req.user.userid;

  try {
    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeCustomerId) {
      return res.status(404).json({ error: 'Cliente Stripe non trovato per questo utente.' });
    }

    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/profile`, // URL a cui l'utente torna dopo aver gestito l'abbonamento.
    });

    res.status(200).json({ url: portalSession.url });

  } catch (error) {
    console.error("Errore durante la creazione della sessione del portale clienti:", error);
    res.status(500).json({ error: 'Errore del server durante la creazione della sessione del portale.' });
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
    // Usa il raw body per la verifica
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
          // Lo stato iniziale è 'incomplete' finché il pagamento non va a buon fine.
          if (dataObject.payment_status === 'paid') {
            user.subscription.status = 'active';
            user.subscription.stripeSubscriptionId = dataObject.subscription;
            // Aggiungi qui anche la logica per l'invio dell'email e della notifica se preferisci gestire tutto qui
            console.log(`✅ Utente ${userId} ha completato il checkout e il pagamento è andato a buon fine.`);
          } else {
            // Se non è pagato (caso raro, ma possibile)
            user.subscription.status = 'incomplete';
            console.log(`Utente ${userId} ha completato il checkout, ma il pagamento è in stato '${dataObject.payment_status}'.`);
          }
          await user.save();
          console.log(`Utente ${userId} ha completato il checkout per il piano ${plan}. In attesa della conferma di pagamento.`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const stripeCustomerId = dataObject.customer;
        const stripeSubscriptionId = dataObject.subscription;
        const user = await User.findOne({ 'subscription.stripeCustomerId': stripeCustomerId });

        if (user) {
          const periodEnd = new Date(dataObject.period_end * 1000);
const line = dataObject.lines.data[0];
const priceId = line?.pricing?.price_details?.price;
          const planName = getPlanNameByPriceId(priceId);

          user.subscription.status = 'active';
          user.subscription.currentPeriodEnd = periodEnd;
          if (planName) user.subscription.plan = planName;

          await user.save();
          console.log(`✅ Abbonamento ${stripeSubscriptionId} attivato/rinnovato per l'utente ${user._id}.`);

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
        } else {updated 
          console.error(`❌ Abbonamento ${stripeSubscriptionId} non trovato nel DB, non posso aggiornare lo stato.`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.subscription });
        if (user) {
          user.subscription.status = 'past_due';
          await user.save();

          await sendStripeNotificationEmail(
            user.email,
            '⚠️ Problema con il pagamento del tuo abbonamento',
            `<h1>Ciao ${user.name},</h1><p>Non siamo riusciti ad elaborare il pagamento per il rinnovo del tuo abbonamento. Ti preghiamo di aggiornare le tue informazioni di pagamento nel tuo profilo.</p>`
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.id });
        if (user) {
          const newPlanId = dataObject.items.data[0].price.id;
          const newPlanName = getPlanNameByPriceId(newPlanId);

          user.subscription.status = dataObject.status;
          if (newPlanName) user.subscription.plan = newPlanName;

  const periodEndDate = parsePeriodEnd(dataObject);
  if (periodEndDate) {
    user.subscription.currentPeriodEnd = periodEndDate;
  } else {
    console.warn(`⚠️ Impossibile parsare currentPeriodEnd per ${dataObject.id}`);
  }

          // Se la cancellazione è stata programmata
          if (dataObject.cancel_at_period_end) {
            user.subscription.status = 'pending_cancellation';
            console.log(`La cancellazione per l'abbonamento ${dataObject.id} è stata programmata.`);
          }

          await user.save();

          const subject = 'Il tuo abbonamento è stato aggiornato';
          const body = `<h1>Ciao ${user.name},</h1><p>Il tuo abbonamento è stato aggiornato con successo al piano <strong>${newPlanName}</strong>.</p>`;
          await sendStripeNotificationEmail(user.email, subject, body);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Questo evento scatta quando l'abbonamento è effettivamente terminato.
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': dataObject.id });
        if (user) {
          user.subscription.status = 'canceled';
          user.subscription.plan = 'free'; // o null, a seconda della logica
          user.subscription.stripeSubscriptionId = null;
          user.subscription.currentPeriodEnd = null;
          await user.save();

          const subject = 'Il tuo abbonamento è stato cancellato';
          const body = `<h1>Ciao ${user.name},</h1><p>Come da tua richiesta, il tuo abbonamento è stato cancellato. Ci dispiace vederti andare via!</p>`;
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
