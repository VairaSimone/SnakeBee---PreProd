import React, { useState } from 'react';
import { snakebeeKits } from '../utils/marketData';

const ReptileShop = () => {
  const [loadingId, setLoadingId] = useState(null);

  const handleCheckout = async (kit) => {
    setLoadingId(kit.id);
    try {        
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api'}/stripe/create-shop-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Decommenta se l'accesso è riservato solo agli utenti loggati
        },
        body: JSON.stringify({
          items: [{
            name: kit.name,
            description: kit.description,
            price: kit.price,
            quantity: 1
          }]
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Stripe reindirizzerà in automatico il cliente al suo portale sicuro di check-out
        window.location.href = data.url; 
      } else {
        alert(data.error || 'Errore durante la creazione del pagamento.');
      }
    } catch (error) {
      console.error('Errore Checkout:', error);
      alert('Impossibile connettersi al server per il pagamento.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-800">SnakeBee Market</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Scopri i nostri Kit Pre-Assemblati! Risparmia tempo e denaro: tutto il necessario per i tuoi amati rettili in un'unica spedizione veloce.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {snakebeeKits.map((kit) => (
          <div key={kit.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col justify-between transform transition duration-300 hover:scale-105 hover:shadow-xl">
            
            {/* Box Placeholder Immagine (Puoi sostituirlo con <img src={kit.image} /> in futuro) */}
            <div className="h-48 bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold opacity-80">{kit.name}</span>
            </div>

            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{kit.name}</h2>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{kit.description}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 text-sm font-medium">Prezzo KIT (Scontato)</span>
                  <span className="text-2xl font-black text-green-600">€{kit.price.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <button 
                  onClick={() => handleCheckout(kit)} 
                  disabled={loadingId === kit.id}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all flex justify-center items-center ${
                    loadingId === kit.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {loadingId === kit.id ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  ) : (
                    "Acquista Ora"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReptileShop;