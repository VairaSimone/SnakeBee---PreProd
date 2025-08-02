import { useNavigate } from 'react-router-dom';

const CancelPage = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate('/subscribe'); // o la rotta della pagina di abbonamento
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Pagamento annullato ❌</h1>
      <p>Nessun addebito è stato effettuato. Puoi riprovare quando vuoi.</p>
      <button
        onClick={handleRetry}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Riprova abbonamento
      </button>
    </div>
  );
};

export default CancelPage;
