// src/pages/SubscriptionPage.jsx
import React, { useState } from 'react';
import api from '../services/api.js';

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

  return (
    <div className="subscription-page" style={{ padding: '2rem' }}>
      <h1>Abbonamenti SnakeBee 🐍</h1>
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
              disabled={loading}
              onClick={() => handleSubscribe(plan.value)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Reindirizzamento...' : 'Abbonati'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;
