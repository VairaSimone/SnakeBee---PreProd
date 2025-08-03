// src/pages/SubscriptionPage.jsx
import React, { useState } from 'react';
import api from '../services/api.js';
import { useEffect } from 'react';

const plans = [
  {
    name: 'Basic',
    description: 'Accesso limitato, perfetto per iniziare',
    price: '5€/mese',
    value: 'basic',
  },
  {
    name: 'Premium',
    description: 'Tutte le funzionalità sbloccate',
    price: '10€/mese',
    value: 'premium',
  },
];

const SubscriptionPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/stripe/status');
        setSubscriptionStatus(res.data);
      } catch (err) {
        console.error('Errore nel recupero abbonamento:', err);
      }
    };
    fetchStatus();
  }, []);
  const handleSubscribe = async (plan) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/stripe/create-checkout-session', { plan });
      window.location.href = res.data.url; // Redirect to Stripe Checkout
    } catch (err) {
      console.error('Errore durante la creazione della sessione:', err);
      setError('Qualcosa è andato storto, riprova.');
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = async () => {
    try {
      await api.post('/stripe/cancel-subscription');
      setSubscriptionStatus(null);
      alert('Abbonamento disdetto! Resterà attivo fino alla scadenza.');
      // eventualmente fai anche un reload o aggiorna lo stato locale
    } catch (err) {
      console.error('Errore nella disdetta:', err);
      setError('Errore nella disdetta, riprova.');
    }
  };
const handleChangePlan = async (plan) => {
  if (subscriptionStatus?.plan === plan) {
    setError('Hai già questo piano attivo.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const res = await api.post('/stripe/change-subscription-plan', { plan });
    alert(`Piano aggiornato a ${plan}. Il cambiamento sarà visibile al prossimo rinnovo o immediatamente, a seconda del piano.`);
    // aggiorna stato per riflettere cambiamento
    setSubscriptionStatus((prev) => ({ ...prev, plan }));
  } catch (err) {
    console.error('Errore nel cambio piano:', err);
    setError('Errore nel cambio piano, riprova.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="subscription-page" style={{ padding: '2rem' }}>
      <h1>Abbonamenti SnakeBee 🐍</h1>
      {subscriptionStatus?.status === 'active' && (
        <p style={{ color: 'green' }}>
          Hai già un piano attivo: {subscriptionStatus.plan}  Prossimo rinnovo: <strong>{new Date(subscriptionStatus.nextBillingDate).toLocaleDateString('it-IT')}</strong>
        </p> 
      )}

      <p>Scegli il piano per sbloccare più funzionalità!</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {plans.map((plan) => (
          <div
            key={plan.value}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '250px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <p><strong>{plan.price}</strong></p>
            <button
              disabled={
                loading ||
                (subscriptionStatus?.status === 'active' &&
                  subscriptionStatus?.plan === plan.value)
              } onClick={() => handleSubscribe(plan.value)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || subscriptionStatus?.status === 'active' ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Reindirizzamento...' : 'Abbonati'}
            </button>
            {subscriptionStatus?.plan === plan.value && (
  <p style={{ color: 'gray', fontSize: '0.9em' }}>
    Questo piano è già attivo.
  </p>
)}

<button
disabled={
  loading ||
  (subscriptionStatus?.status === 'active' && subscriptionStatus?.plan === plan.value)
}  onClick={() => handleChangePlan(plan.value)}
  style={{
    padding: '0.5rem 1rem',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem',
  }}
>
  Cambia piano
</button>
          </div>
        ))}
        <button
          onClick={handleCancel}
          disabled={loading || !subscriptionStatus?.status}
          style={{
            marginTop: '2rem',
            backgroundColor: '#f44336',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Disdici Abbonamento
        </button>


      </div>
    </div>
  );
};

export default SubscriptionPage;
