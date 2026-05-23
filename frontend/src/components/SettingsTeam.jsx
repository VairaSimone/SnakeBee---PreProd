import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaUserPlus, FaUserShield } from 'react-icons/fa';
import { getDelegates, addDelegate, removeDelegate } from '../services/api';

const SettingsTeam = () => {
    const { t } = useTranslation();
    const [delegates, setDelegates] = useState([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('editor');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Carica i collaboratori all'avvio
    useEffect(() => {
        fetchDelegates();
    }, []);

    const fetchDelegates = async () => {
        try {
            const res = await getDelegates();
            setDelegates(res.data);
        } catch (err) {
            console.error("Errore nel recupero delegati", err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            await addDelegate(email, role);
            setSuccess('Collaboratore aggiunto con successo!');
            setEmail(''); // Svuota il campo
            fetchDelegates(); // Ricarica la lista
        } catch (err) {
            setError(err.response?.data?.message || 'Errore durante l\'aggiunta del collaboratore.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (delegateId) => {
        if (!window.confirm('Sei sicuro di voler rimuovere questo collaboratore?')) return;
        
        setError('');
        setSuccess('');
        
        try {
            await removeDelegate(delegateId);
            setSuccess('Collaboratore rimosso.');
            setDelegates(delegates.filter(d => d.user._id !== delegateId));
        } catch (err) {
            setError(err.response?.data?.message || 'Errore durante la rimozione.');
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF3E0] p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
                
                {/* Header Pagina */}
                <div>
                    <h1 className="text-3xl font-bold text-[#2B2B2B] flex items-center gap-3">
                        <FaUserShield className="text-[#228B22]" /> 
                        Gestione Team
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Invita altri utenti a gestire il tuo allevamento. I collaboratori dovranno fare il login con il proprio account e selezionare il tuo allevamento dal menu.
                    </p>
                </div>

                {/* Notifiche */}
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md animate-shake">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-100 text-green-800 p-3 rounded-md">
                        {success}
                    </div>
                )}

                {/* Form Aggiunta Collaboratore */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4">Invita un Collaboratore</h2>
                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="email"
                                placeholder="Email dell'utente (es. marco@email.com)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#228B22]"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="w-full md:w-1/4">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#228B22]"
                            >
                                <option value="editor">Editor (Può modificare)</option>
                                <option value="viewer">Viewer (Sola lettura)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className={`px-6 py-2 rounded-md text-white font-medium transition flex items-center justify-center gap-2 ${
                                isLoading || !email ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#228B22] hover:bg-green-700'
                            }`}
                        >
                            {isLoading ? <span className="loader text-sm"></span> : <FaUserPlus />}
                            Invita
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">
                        *L'utente deve già essere registrato su SnakeBee con questa email.
                    </p>
                </div>

                {/* Lista Collaboratori */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4">Membri del Team</h2>
                    
                    {delegates.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Non hai ancora invitato nessun collaboratore.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {delegates.map((delegate) => (
                                <li key={delegate._id} className="py-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">
                                            {delegate.user?.firstName} {delegate.user?.lastName}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {delegate.user?.email}
                                        </span>
                                        <span className="text-xs font-semibold text-[#228B22] bg-green-50 w-fit px-2 py-0.5 rounded-full mt-1 uppercase">
                                            {delegate.role}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(delegate.user._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                                        title="Rimuovi collaboratore"
                                    >
                                        <FaTrash />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
};

export default SettingsTeam;