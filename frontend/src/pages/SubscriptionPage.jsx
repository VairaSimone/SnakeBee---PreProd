import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    createStripeCheckout,
    manageStripeSubscription,
    cancelStripeSubscription,
    createStripePortalSession
} from '../services/api.js'; // Assicurati che il percorso sia corretto
import { selectUser } from '../features/userSlice.jsx';

// Componente Card del Piano (leggermente modificato per maggiore flessibilità)
const PlanCard = ({ title, price, features, planKey, onAction, isLoading, buttonText, isDisabled }) => {
    return (
        <div className={`border rounded-lg p-6 shadow-lg text-center flex flex-col ${isDisabled ? 'bg-gray-50 border-green-500' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-4xl font-extrabold my-4 text-gray-900">{price}<span className="text-base font-medium text-gray-500">/mese</span></p>
            <ul className="text-left my-6 space-y-2 flex-grow">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-black">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {feature}
                    </li>
                ))}
            </ul>
            <button
                onClick={() => onAction(planKey)}
                disabled={isLoading || isDisabled}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                    isDisabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isLoading ? 'Caricamento...' : buttonText}
            </button>
        </div>
    );
};


// Componente Principale della Pagina
const SubscriptionPage = () => {
    const [loadingAction, setLoadingAction] = useState(null); // Traccia l'azione in corso: 'basic', 'premium', 'cancel', 'portal'
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const user = useSelector(selectUser);

    // Gestore generico per le risposte API
    const handleApiResponse = (action) => {
        return {
            onSuccess: (message) => {
                setSuccess(message);
                // Dopo un'azione riuscita, ricarichiamo la pagina per mostrare lo stato aggiornato.
                // Un approccio più avanzato potrebbe aggiornare lo stato Redux senza ricaricare.
                setTimeout(() => window.location.reload(), 3000);
            },
            onError: (err) => {
                setError(err.response?.data?.error || "Si è verificato un errore. Riprova più tardi.");
            },
            onFinally: () => {
                setLoadingAction(null);
            }
        };
    };

    // Gestisce la sottoscrizione o il cambio di piano
    const handlePlanAction = async (planKey) => {
        if (!user || !user._id) {
            setError("Utente non trovato. Effettua il login.");
            return;
        }

        setLoadingAction(planKey);
        setError(null);
        setSuccess(null);
        const { onSuccess, onError, onFinally } = handleApiResponse();

        try {
            // Se l'utente ha un abbonamento attivo e sta cambiando piano
            if (user.subscription?.status === 'active' && user.subscription.plan !== planKey) {
                await manageStripeSubscription(planKey, user._id);
                onSuccess('Il tuo piano è stato modificato con successo! La pagina si ricaricherà a breve.');
            } else { // Altrimenti, è una nuova sottoscrizione
                const response = await createStripeCheckout(planKey, user._id);
                const { url } = response.data;
                if (url) {
                    window.location.href = url; // Reindirizza a Stripe
                } else {
                    throw new Error("URL di checkout non ricevuto.");
                }
            }
        } catch (err) {
            onError(err);
            onFinally(); // Assicurati di resettare il loading anche in caso di errore di reindirizzamento
        }
    };

    // Gestisce la cancellazione dell'abbonamento
    const handleCancelSubscription = async () => {
        if (!window.confirm("Sei sicuro di voler annullare il tuo abbonamento? Potrai continuare ad usare i benefici fino alla fine del periodo di fatturazione.")) {
            return;
        }

        setLoadingAction('cancel');
        setError(null);
        setSuccess(null);
        const { onSuccess, onError, onFinally } = handleApiResponse();

        try {
            await cancelStripeSubscription(user._id);
            onSuccess("La cancellazione del tuo abbonamento è stata programmata. La pagina si ricaricherà a breve.");
        } catch (err) {
            onError(err);
        } finally {
            onFinally();
        }
    };

    // Reindirizza l'utente al portale clienti di Stripe
    const handlePortalRedirect = async () => {
        setLoadingAction('portal');
        setError(null);
        setSuccess(null);
        const { onError, onFinally } = handleApiResponse();

        try {
            const response = await createStripePortalSession(user._id);
            const { url } = response.data;
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("URL del portale non ricevuto.");
            }
        } catch (err) {
            onError(err);
            onFinally();
        }
    };

    const subscriptionStatus = user?.subscription?.status;
    const currentPlan = user?.subscription?.plan;
    const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'pending_cancellation';

    // Determina il testo del pulsante per ogni card
    const getButtonText = (planKey) => {
        if (!isSubscribed) return 'Abbonati Ora';
        if (currentPlan === planKey) return 'Piano Attuale';
        if (currentPlan === 'basic' && planKey === 'premium') return "Fai l'Upgrade";
        if (currentPlan === 'premium' && planKey === 'basic') return "Fai il Downgrade";
        return 'Cambia Piano';
    };

    // Formatta la data di rinnovo
    const renewalDate = useMemo(() => {
        if (user?.subscription?.currentPeriodEnd) {
            return new Date(user.subscription.currentPeriodEnd).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        }
        return null;
    }, [user]);

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Scegli il Tuo Piano</h1>
                <p className="text-center text-gray-600 mb-10">Sblocca nuove funzionalità e supporta la community.</p>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
                {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{success}</div>}
                
                {isSubscribed && (
                    <div className="bg-white border-l-4 border-blue-500 text-gray-800 p-6 shadow-md mb-8 rounded-r-lg">
                        <h3 className="text-xl font-bold mb-2">Gestione Abbonamento</h3>
                        {subscriptionStatus === 'pending_cancellation' ? (
                             <p className="font-semibold text-yellow-600">
                                Il tuo abbonamento al piano '{currentPlan}' è stato annullato e terminerà il <strong>{renewalDate}</strong>.
                             </p>
                        ) : (
                             <p>
                                Hai un abbonamento attivo al piano <strong className="capitalize">{currentPlan}</strong>.
                                Si rinnoverà il <strong>{renewalDate}</strong>.
                             </p>
                        )}
                       
                        <div className="mt-4 flex flex-wrap gap-4">
                            <button
                                onClick={handlePortalRedirect}
                                disabled={loadingAction === 'portal'}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-blue-300"
                            >
                                {loadingAction === 'portal' ? 'Caricamento...' : 'Gestisci Fatturazione'}
                            </button>
                            {subscriptionStatus !== 'pending_cancellation' && (
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={loadingAction === 'cancel'}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-red-300"
                                >
                                    {loadingAction === 'cancel' ? 'Annullamento...' : 'Annulla Abbonamento'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    <PlanCard
                        title="Basic"
                        price="€4.99"
                        features={['Max 20 rettili', '3 immagini per rettile', 'PDF dettagli animale', 'riproduzione', ]}
                        planKey="basic"
                        onAction={handlePlanAction}
                        isLoading={loadingAction === 'basic'}
                        buttonText={getButtonText('basic')}
                        isDisabled={isSubscribed && currentPlan === 'basic'}
                    />
                    <PlanCard
                        title="Premium"
                        price="€9.99"
                        features={['Tutto del piano Basic', 'Max 100 rettili', '5 immagini per rettile', 'Notifiche email', 'Automazioni cibo avanzate',]}
                        planKey="premium"
                        onAction={handlePlanAction}
                        isLoading={loadingAction === 'premium'}
                        buttonText={getButtonText('premium')}
                        isDisabled={isSubscribed && currentPlan === 'premium'}
                    />
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
