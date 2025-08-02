import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api.js'; // Il tuo axios wrapper

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SuccessPage = () => {
  const query = useQuery();
  const sessionId = query.get('session_id');
  const [sessionDetails, setSessionDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Sessione di pagamento mancante.');
      return;
    }

    // Fai chiamata API al backend per recuperare dettagli sessione da Stripe
    api.get(`/stripe/session/${sessionId}`)
      .then(res => setSessionDetails(res.data))
      .catch(err => {
        setError('Impossibile recuperare i dettagli della sessione.');
        console.error(err);
      });
  }, [sessionId]);

  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!sessionDetails) return <div style={{ padding: '2rem' }}>Caricamento...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Pagamento completato! ✅</h1>
      <p>Abbonamento attivato per il piano: <strong>{sessionDetails.planName}</strong></p>
      <p>Importo: €{(sessionDetails.amount_total / 100).toFixed(2)}</p>
      <p>Grazie per il supporto!</p>
    </div>
  );
};

export default SuccessPage;
