import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Mappa stati Stripe a traduzioni italiane
const paymentStatusMap = {
  paid: 'Pagato',
  unpaid: 'Non pagato',
  no_payment_required: 'Nessun pagamento richiesto',
  pending: 'In attesa',
  failed: 'Fallito',
  canceled: 'Annullato',
  incomplete: 'Incompleto',
  past_due: 'Scaduto',
  succeeded: 'Riuscito',
};

const SuccessPage = () => {
  const query = useQuery();
  const sessionId = query.get('session_id');
  const [sessionDetails, setSessionDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      setError('Sessione di pagamento mancante.');
      return;
    }

    api.get(`/stripe/session/${sessionId}`)
      .then(res => setSessionDetails(res.data))
      .catch(err => {
        setError('Impossibile recuperare i dettagli della sessione.');
        console.error(err);
      });
  }, [sessionId]);

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  if (error) return (
    <div style={styles.outerContainer}>
      <div style={styles.container}>
        <h2 style={{ color: 'black' }}>Errore</h2>
        <p style={{ color: 'black' }}>{error}</p>
        <button onClick={handleDashboardClick} style={styles.button}>
          Torna alla Dashboard
        </button>
      </div>
    </div>
  );

  if (!sessionDetails) return (
    <div style={styles.outerContainer}>
      <div style={styles.container}>
        <p style={{ color: 'black' }}>Caricamento in corso...</p>
      </div>
    </div>
  );

  const paymentStatusTranslated = paymentStatusMap[sessionDetails.payment_status] || 'Sconosciuto';

  return (
    <div style={styles.outerContainer}>
      <div style={styles.container}>
        <h1 style={styles.title}>Pagamento Completato! <span style={{ color: 'green' }}>✅</span></h1>
        <div style={styles.card}>
          <p><strong>Piano attivato:</strong> {sessionDetails.planName || 'N/A'}</p>
          <p><strong>Importo pagato:</strong> €{(sessionDetails.amount_total / 100).toFixed(2)}</p>
          <p><strong>Stato pagamento:</strong> {paymentStatusTranslated}</p>
        </div>
        <p style={{ color: 'black' }}>Grazie per il supporto! 🎉</p>
        <button onClick={handleDashboardClick} style={styles.button}>
          Vai alla Dashboard
        </button>
      </div>
    </div>
  );
};

const styles = {
  outerContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '1rem',
  },
  container: {
    maxWidth: 480,
    width: '100%',
    padding: '2rem',
    textAlign: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    color: 'black', // testo nero fisso
  },
  title: {
    marginBottom: '1.5rem',
    fontWeight: '700',
    fontSize: '1.8rem',
    color: 'black',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: '1rem 1.5rem',
    borderRadius: 8,
    marginBottom: '1.5rem',
    textAlign: 'left',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.05)',
    fontSize: '1rem',
    color: 'black',
  },
  button: {
    cursor: 'pointer',
    backgroundColor: '#007bff',
    border: 'none',
    color: '#fff',
    padding: '0.6rem 1.2rem',
    borderRadius: 6,
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.25s ease',
    marginTop: '1rem',
  }
};

export default SuccessPage;
