import crypto from 'crypto';
import { serialize } from 'php-serialize';
export const verifyPaddleWebhook = (body, publicKey) => {
  const signature = body.p_signature;
  delete body.p_signature;

  // Ordina alfabeticamente
  const sorted = Object.keys(body)
    .sort()
    .reduce((acc, key) => {
      acc[key] = body[key];
      return acc;
    }, {});

  // Serializza in formato PHP
  const serialized = serialize(sorted);

  // Decodifica la firma
  const decodedSignature = Buffer.from(signature, 'base64');

  // Verifica la firma con la chiave pubblica
  const verifier = crypto.createVerify('sha1');
  verifier.update(serialized);
  verifier.end();

  const isVerified = verifier.verify(publicKey, decodedSignature);
  return isVerified;
};

export const paddleWebhookHandler = async (req, res) => {
  const body = req.body;

  const publicKey = process.env.PADDLE_PUBLIC_KEY; // Inserisci la tua chiave pubblica qui
  const valid = verifyPaddleWebhook(body, publicKey);

  if (!valid) {
    console.warn('Webhook non verificato');
    return res.status(403).send('Invalid signature');
  }

  const alertType = body.alert_name;

  switch (alertType) {
    case 'subscription_created':
      console.log(`Nuovo abbonamento per email: ${body.email}`);
      break;
    case 'subscription_cancelled':
      console.log(`Abbonamento cancellato per ${body.email}`);
      break;
    case 'subscription_payment_succeeded':
      console.log(`Pagamento ricevuto da ${body.email}`);
      break;
    default:
      console.log(`Evento ignorato: ${alertType}`);
  }

  res.sendStatus(200);
};
