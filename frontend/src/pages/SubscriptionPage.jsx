import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    createStripeCheckout,
    manageStripeSubscription,
    cancelStripeSubscription,
    createStripePortalSession
} from '../services/api.js';
import { selectUser } from '../features/userSlice.jsx';

const Modal = ({ type = 'info', title, message, onClose, onConfirm }) => {
    const colors = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700'
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className={`rounded-lg shadow-lg p-6 border ${colors[type]} max-w-md w-full`}>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="mb-4">{message}</p>
                <div className="flex justify-end gap-3">
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                        >
                            Conferma
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

const PlanCard = ({ title, price, description, features, planKey, onAction, isLoading, buttonText, isDisabled, hideButton }) => {
    return (
        <div className={`border rounded-lg p-6 shadow-lg text-center flex flex-col ${isDisabled ? 'bg-gray-50 border-green-500' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-4xl font-extrabold my-4 text-gray-900">{price}<span className="text-base font-medium text-gray-500">/mese</span></p>
            <p className="text-gray-600 mb-4">{description}</p>
            <ul className="text-left my-6 space-y-2 flex-grow">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-black">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {feature}
                    </li>
                ))}
            </ul>
            {!hideButton && (
                <button
                    onClick={() => onAction(planKey)}
                    disabled={isLoading || isDisabled}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${isDisabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50'
                        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                    {isLoading ? 'Caricamento...' : buttonText}
                </button>
            )}
        </div>
    );
};

const SubscriptionPage = () => {
    const [loadingAction, setLoadingAction] = useState(null);
    const [modal, setModal] = useState(null);
    const user = useSelector(selectUser);

    const handleApiResponse = () => ({
        onSuccess: (message) => {
            setModal({ type: 'success', title: 'Operazione completata ✅', message, onClose: () => window.location.reload() });
        },
        onError: (err) => {
            setModal({ type: 'error', title: 'Errore', message: err.response?.data?.error || "Si è verificato un errore. Riprova più tardi.", onClose: () => setModal(null) });
        },
        onFinally: () => {
            setLoadingAction(null);
        }
    });

    const handlePlanAction = async (planKey) => {
        if (!user || !user._id) {
            setModal({ type: 'error', title: 'Accesso richiesto', message: "Per sottoscrivere un piano devi prima effettuare il login.", onClose: () => setModal(null) });
            return;
        }

        setLoadingAction(planKey);
        const { onSuccess, onError, onFinally } = handleApiResponse();

        try {
            if (user.subscription?.status === 'active' && user.subscription.plan !== planKey) {
                await manageStripeSubscription(planKey, user._id);
                onSuccess('Il tuo piano è stato aggiornato con successo! 🚀');
            } else {
                const response = await createStripeCheckout(planKey, user._id);
                if (response.data.url) {
                    window.location.href = response.data.url;
                } else {
                    throw new Error("URL di checkout non ricevuto.");
                }
            }
        } catch (err) {
            onError(err);
            onFinally();
        }
    };

    const handleCancelSubscription = () => {
        setModal({
            type: 'warning',
            title: 'Conferma Annullamento',
            message: "Vuoi davvero annullare il tuo abbonamento? Potrai continuare a usarlo fino alla fine del periodo di fatturazione.",
            onClose: () => setModal(null),
            onConfirm: async () => {
                setModal(null);
                setLoadingAction('cancel');
                const { onSuccess, onError, onFinally } = handleApiResponse();
                try {
                    await cancelStripeSubscription(user._id);
                    onSuccess("Cancellazione programmata ✅");
                } catch (err) {
                    onError(err);
                } finally {
                    onFinally();
                }
            }
        });
    };

    const handlePortalRedirect = async () => {
        setLoadingAction('portal');
        const { onError, onFinally } = handleApiResponse();
        try {
            const response = await createStripePortalSession(user._id);
            if (response.data.url) {
                window.location.href = response.data.url;
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

    const getButtonText = (planKey) => {
        if (!isSubscribed) return 'Abbonati Ora';
        if (currentPlan === planKey) return 'Piano Attuale';
        if (currentPlan === 'basic' && planKey === 'premium') return "Fai l'Upgrade";
        if (currentPlan === 'premium' && planKey === 'basic') return "Downgrade non permesso";
        return 'Cambia Piano';
    };

    const renewalDate = useMemo(() => {
        if (user?.subscription?.currentPeriodEnd) {
            return new Date(user.subscription.currentPeriodEnd).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        }
        return null;
    }, [user]);

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Piani di Abbonamento</h1>
                <p className="text-center text-gray-600 mb-10">
                    Scegli il piano che meglio si adatta alle tue esigenze e ottieni il massimo dal tuo allevamento 🐍🐢🐊
                </p>

                {isSubscribed && (
                    <div className="bg-white border-l-4 border-blue-500 text-gray-800 p-6 shadow-md mb-8 rounded-r-lg">
                        <h3 className="text-xl font-bold mb-2">Il tuo abbonamento</h3>
                        {subscriptionStatus === 'pending_cancellation' ? (
                            <p className="font-semibold text-yellow-600">
                                Il tuo piano <strong>{currentPlan}</strong> terminerà il <strong>{renewalDate}</strong>.
                            </p>
                        ) : (
                            <p>
                                Stai usando il piano <strong className="capitalize">{currentPlan}</strong>.
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-4">
                            <button
                                onClick={handlePortalRedirect}
                                disabled={loadingAction === 'portal'}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300"
                            >
                                {loadingAction === 'portal' ? 'Caricamento...' : 'Gestisci Fatturazione'}
                            </button>
                            {subscriptionStatus !== 'pending_cancellation' && (
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={loadingAction === 'cancel'}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-300"
                                >
                                    {loadingAction === 'cancel' ? 'Annullamento...' : 'Annulla Abbonamento'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8">
                    <PlanCard
                        title="Free"
                        price="Gratis"
                        description="Ideale per chi vuole provare la piattaforma o gestire pochi animali."
                        features={[
                            "Max 8 rettili",
                            "1 immagine per rettile",
                            "Download file excel per i propri rettili",
                            "10 eventi per tipo per rettile",
                        ]}
                        hideButton={true} />
                    <PlanCard
                        title="Basic"
                        price="€4.99"
                        description="Per chi ha qualche rettile in più e vuole più comodità."
                        features={[
                            "Tutte le opzioni del piano Free",
                            "Max 20 rettili",
                            "3 immagini per rettile",
                            "Eventi illimitati per rettile",
                            "PDF dettagli animale",
                            "Sezione Riproduzione",
                        ]}
                        planKey="basic"
                        onAction={handlePlanAction}
                        isLoading={loadingAction === 'basic'}
                        buttonText={getButtonText('basic')}
                        isDisabled={isSubscribed && (currentPlan === 'basic' || (currentPlan === 'premium' && 'basic' === 'basic'))}
                        hideButton={!user}
                    />
                    <PlanCard
                        title="Premium"
                        price="€9.99"
                        description="Per allevatori e utenti avanzati che vogliono tutto."
                        features={[
                            "Tutte le opzioni del piano Basic",
                            "Max 100 rettili",
                            "5 immagini per rettile",
                            "Notifiche email",
                            "Automazioni cibo avanzate",
                            "Supporto prioritario",
                        ]}
                        planKey="premium"
                        onAction={handlePlanAction}
                        isLoading={loadingAction === 'premium'}
                        buttonText={getButtonText('premium')}
                        isDisabled={isSubscribed && currentPlan === 'premium'}
                        hideButton={!user}
                    />
                </div>

            </div>
            {modal && <Modal {...modal} />}
            <div className="mt-16 bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    Hai dubbi sul piano giusto per te?
                </h2>
                <p className="text-gray-600 mb-6">
                    Contattaci e ti aiuteremo a scegliere il piano che si adatta meglio alle tue esigenze.
                </p>
                <a
                    href="mailto:info@snakebee.it"
                    target="_self"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    Contattaci all'indirizzo email info@snakebee.it
                </a>
            </div>

        </div>

    );
};

export default SubscriptionPage;
