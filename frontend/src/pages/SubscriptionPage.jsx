import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { createStripeCheckout } from '../services/api.js'; // Assicurati che il percorso sia corretto

// Componente per una singola card di un piano
const PlanCard = ({ title, price, features, planKey, onSubscribe, isLoading, isCurrentPlan }) => {
  return (
    <div className={`border rounded-lg p-6 shadow-lg text-center ${isCurrentPlan ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      <p className="text-4xl font-extrabold my-4 text-gray-900">{price}<span className="text-base font-medium text-gray-500">/mese</span></p>
      <ul className="text-left my-6 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSubscribe(planKey)}
        disabled={isLoading || isCurrentPlan}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
          isCurrentPlan 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isLoading ? 'Caricamento...' : (isCurrentPlan ? 'Piano Attuale' : 'Abbonati Ora')}
      </button>
    </div>
  );
};


// Componente principale della pagina
const SubscriptionPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ottieni i dati dell'utente dal Redux store
  const user = useSelector((state) => state.user.data); // Assumo questa struttura per lo store

  const handleSubscribe = async (plan) => {
    if (!user || !user._id) {
      setError("Utente non trovato. Effettua il login.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createStripeCheckout(plan, user._id);
      const { url, redirectToPortal } = response.data;
      
      if (url) {
        // Reindirizza l'utente alla pagina di checkout di Stripe o al portale clienti
        window.location.href = url;
      } else {
        setError("Non è stato possibile ottenere l'URL di pagamento. Riprova.");
      }

    } catch (err) {
      console.error("Errore durante la creazione della sessione di checkout:", err);
      setError(err.response?.data?.error || "Si è verificato un errore. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };
  
  const isSubscribed = user?.subscription?.status === 'active';
  const currentPlan = user?.subscription?.plan;

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Scegli il Tuo Piano</h1>
        <p className="text-center text-gray-600 mb-10">Sblocca nuove funzionalità e supporta la community.</p>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
        
        {isSubscribed && (
            <div className="bg-blue-100 border-t-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md mb-8" role="alert">
                <div className="flex">
                    <div className="py-1"><svg className="fill-current h-6 w-6 text-blue-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg></div>
                    <div>
                        <p className="font-bold">Stai usando il piano '{currentPlan}'!</p>
                        <p className="text-sm">Puoi gestire il tuo abbonamento, cambiare piano o aggiornare i dati di pagamento dal portale clienti.</p>
                        <button 
                            onClick={() => handleSubscribe(currentPlan)} // La logica backend reindirizzerà al portale
                            disabled={loading}
                            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            {loading ? 'Caricamento...' : 'Gestisci Abbonamento'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <PlanCard
            title="Basic"
            price="€4.99"
            features={['Accesso a tutte le funzionalità base', 'Supporto via email', 'Fino a 5 rettili monitorati']}
            planKey="basic"
            onSubscribe={handleSubscribe}
            isLoading={loading}
            isCurrentPlan={currentPlan === 'basic'}
          />
          <PlanCard
            title="Premium"
            price="€9.99"
            features={['Tutto del piano Basic', 'Notifiche avanzate', 'Rettili illimitati', 'Accesso anticipato a nuove feature']}
            planKey="premium"
            onSubscribe={handleSubscribe}
            isLoading={loading}
            isCurrentPlan={currentPlan === 'premium'}
          />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
