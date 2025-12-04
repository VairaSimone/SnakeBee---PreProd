import React, { useState } from 'react';
import api from '../services/api';
import { FaCheck, FaArrowRight, FaSnake, FaBell } from 'react-icons/fa';

const OnboardingWizard = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dati del form wizard
  const [formData, setFormData] = useState({
    breedingName: user.name || '', // Step 1: Nome Allevamento
    reptileName: '',               // Step 2: Primo Rettile
    reptileSpecies: '',
    enableReminders: true          // Step 3: Reminder
  });

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      // 1. Aggiorna nome utente/allevamento e preferenze email
      await api.put(`/user/${user._id}`, {
        name: formData.breedingName,
        receiveFeedingEmails: formData.enableReminders
      });

      // 2. Crea il primo rettile (se i campi sono compilati)
      if (formData.reptileName && formData.reptileSpecies) {
        await api.post('/reptile/', {
          name: formData.reptileName,
          species: formData.reptileSpecies,
          sex: 'Unknown', // Default rapido
          status: 'active',
          user: user._id
        });
      }

      // 3. Marca onboarding come completato
      await api.put(`/user/complete-onboarding`, {}); 
      
      onComplete(); // Chiude il modale e ricarica la dashboard
    } catch (error) {
      console.error("Errore onboarding", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Progress Bar */}
        <div className="bg-sand h-2 w-full">
          <div 
            className="bg-forest h-full transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* STEP 1: Nome Allevamento */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl font-bold text-olive">Benvenuto in SnakeBee! 🐝</h2>
              <p className="text-charcoal/70">Iniziamo configurando il tuo spazio. Come si chiama il tuo allevamento?</p>
              <input
                type="text"
                className="w-full p-3 border-2 border-sand rounded-xl focus:border-forest outline-none font-bold text-lg"
                value={formData.breedingName}
                onChange={(e) => setFormData({...formData, breedingName: e.target.value})}
                placeholder="Es. Royal Pythons Italia"
              />
            </div>
          )}

          {/* STEP 2: Aggiungi Rettile */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl font-bold text-olive">Il tuo primo animale 🐍</h2>
              <p className="text-charcoal/70">Aggiungi un rettile velocemente. Potrai aggiungere dettagli e foto dopo.</p>
              <div className="grid gap-4">
                <input
                  type="text"
                  className="w-full p-3 border border-sand rounded-lg"
                  placeholder="Nome (es. Kaa)"
                  value={formData.reptileName}
                  onChange={(e) => setFormData({...formData, reptileName: e.target.value})}
                />
                <input
                  type="text"
                  className="w-full p-3 border border-sand rounded-lg"
                  placeholder="Specie (es. Python Regius)"
                  value={formData.reptileSpecies}
                  onChange={(e) => setFormData({...formData, reptileSpecies: e.target.value})}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Reminder */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl font-bold text-olive">Mai più ritardi ⏰</h2>
              <p className="text-charcoal/70">Vuoi ricevere email quando è ora di alimentare i tuoi animali?</p>
              
              <div 
                onClick={() => setFormData({...formData, enableReminders: !formData.enableReminders})}
                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-4 transition-all ${formData.enableReminders ? 'border-forest bg-forest/10' : 'border-gray-200'}`}
              >
                <div className={`p-3 rounded-full ${formData.enableReminders ? 'bg-forest text-white' : 'bg-gray-200'}`}>
                    <FaBell />
                </div>
                <div>
                    <h4 className="font-bold">Attiva Notifiche Email</h4>
                    <p className="text-xs text-charcoal/60">Ti avviseremo alle 09:00 del giorno del pasto.</p>
                </div>
                {formData.enableReminders && <FaCheck className="ml-auto text-forest"/>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-6 bg-sand/30 flex justify-between items-center">
            {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="text-charcoal/60 hover:text-charcoal font-semibold">
                    Indietro
                </button>
            ) : <div></div>}
            
            <button 
                onClick={handleNext}
                disabled={loading}
                className="bg-forest text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-olive transition-all flex items-center gap-2 transform hover:scale-105"
            >
                {loading ? 'Configurazione...' : step === 3 ? 'Inizia!' : 'Continua'} 
                {!loading && <FaArrowRight />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;