import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

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
    <div style={styles.container}>
      <h2 style={{ color: 'red' }}>Errore</h2>
      <p>{error}</p>
      <button onClick={handleDashboardClick} style={styles.button}>
        Torna alla Dashboard
      </button>
    </div>
  );

  if (!sessionDetails) return (
    <div style={styles.container}>
      <p>Caricamento in corso...</p>
    </div>
  );

  // Dettagli più chiari e un po' di aria intorno
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pagamento Completato! <span style={{ color: 'green' }}>✅</span></h1>
      <div style={styles.card}>
        <p><strong>Piano attivato:</strong> {sessionDetails.planName || 'N/A'}</p>
        <p><strong>Importo pagato:</strong> €{(sessionDetails.amount_total / 100).toFixed(2)}</p>
        <p><strong>Stato pagamento:</strong> {sessionDetails.payment_status || 'Sconosciuto'}</p>
        <p><strong>ID sessione:</strong> {sessionDetails.sessionId}</p>
      </div>
      <p>Grazie per il supporto! 🎉</p>
      <button onClick={handleDashboardClick} style={styles.button}>
        Vai alla Dashboard
      </button>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: 480,
    margin: '3rem auto',
    padding: '2rem',
    textAlign: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: '1.5rem',
    fontWeight: '700',
    fontSize: '1.8rem',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: '1rem 1.5rem',
    borderRadius: 8,
    marginBottom: '1.5rem',
    textAlign: 'left',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.05)',
    fontSize: '1rem',
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
  }
};

export default SuccessPage;
