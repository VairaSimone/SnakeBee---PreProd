import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api'; // Assicurati che il percorso sia corretto
import { useSelector } from 'react-redux'; // Importato per leggere lo stato dell'utente
import { selectUser } from '../features/userSlice'; 
import { 
  FaChartPie, FaPlus, FaTrash, FaArrowUp, FaArrowDown, 
  FaWallet, FaSearchDollar, FaListUl, FaExclamationTriangle,
  FaInfoCircle, FaStethoscope, FaAppleAlt, FaExchangeAlt,
  FaLock
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
const formatCurrency = (amount, currency = 'EUR') => {
  if (amount === undefined || amount === null) return '€ 0.00';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(amount);
};

const FinancePage = () => {
  const { t } = useTranslation();
const user = useSelector(selectUser);
  // Stati per Overview e Transazioni Globali
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stato per la gestione del modale di eliminazione controllata
  const [txToDelete, setTxToDelete] = useState(null);

  // Stati per form nuova transazione
  const [formData, setFormData] = useState({
    type: 'expense',
    category: 'Attrezzatura',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Stati per Analisi Singolo Rettile
  const [reptiles, setReptiles] = useState([]);
  const [selectedReptileId, setSelectedReptileId] = useState('');
  const [reptileStats, setReptileStats] = useState(null);
  const [isReptileLoading, setIsReptileLoading] = useState(false);

  // 1. Caricamento dati globali all'avvio
useEffect(() => {
    if (user && user.subscription?.plan === 'BREEDER') {
      fetchGlobalData();
      fetchReptiles();
    }
  }, [user]);

  const fetchGlobalData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, txRes] = await Promise.all([
        api.get('/finance/summary'),
        api.get('/finance/transactions')
      ]);
      setSummary(summaryRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      setError('Errore nel caricamento dei dati finanziari.');
      console.error(err);
    }
    setIsLoading(false);
  };

  const fetchReptiles = async () => {
    try {
      const res = await api.get('/reptile/user/AllReptileUser');// Endpoint standard per ottenere i propri rettili
      setReptiles(res.data.dati || res.data);
    } catch (err) {
      console.error('Errore caricamento rettili:', err);
    }
  };

  // 2. Caricamento dati specifici del rettile selezionato
  useEffect(() => {
    if (!selectedReptileId) {
      setReptileStats(null);
      return;
    }

    const fetchSpecificReptileStats = async () => {
      setIsReptileLoading(true);
      try {
        const [costRes, valRes] = await Promise.all([
          api.get(`/feedings/${selectedReptileId}/cost`), // API: Costo del cibo
          api.get(`/reptile/valuation/${selectedReptileId}`) // API: Valutazione / Investimento
        ]);
        
        setReptileStats({
          food: costRes.data,
          valuation: valRes.data
        });
      } catch (err) {
        console.error('Errore caricamento statistiche rettile', err);
      }
      setIsReptileLoading(false);
    };

    fetchSpecificReptileStats();
  }, [selectedReptileId]);

  // 3. Gestione Form Transazioni Manuali
  const handleTxSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/transactions', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      // Reset form e ricarica dati
      setFormData({ ...formData, amount: '', description: '' });
      fetchGlobalData();
    } catch (err) {
      console.error('Errore salvataggio transazione', err);
    }
  };

  // Conferma ed effettiva eliminazione dal modale custom
  const confirmTxDelete = async () => {
    if (!txToDelete) return;
    try {
      await api.delete(`/finance/transactions/${txToDelete}`);
      setTxToDelete(null); // Chiude il modale liberando lo stato
      fetchGlobalData();
    } catch (err) {
      console.error('Errore eliminazione transazione', err);
    }
  };
// Se Redux sta ancora caricando l'utente, mostra lo spinner di caricamento
  if (!user && isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500"></div>
      </div>
    );
  }

  // Se l'utente non ha il piano BREEDER, blocca la visualizzazione e mostra il Paywall
  if (!user || user.subscription?.plan !== 'BREEDER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full mx-4 space-y-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-500">
            <FaLock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Funzionalità Premium</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              La sezione <strong>Finance</strong> è uno strumento avanzato dedicato esclusivamente agli utenti con un abbonamento <strong>Allevatore (BREEDER)</strong> attivo.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link 
              to="/pricing" 
              className="w-full inline-block bg-emerald-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
            >
              Scopri i Piani di Abbonamento
            </Link>
            <Link 
              to="/dashboard" 
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Se passa i controlli, mostra il resto della pagina originale...
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
            <FaChartPie className="text-emerald-600" />
            Dashboard Finanziaria
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Monitora i costi, i ricavi e l'investimento totale del tuo allevamento.</p>
        </header>

        {/* --- NUOVO PARAGRAFO / BOX INFORMATIVO GUIDA AUTOMATIZZAZIONI --- */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
            <FaInfoCircle className="text-emerald-600 text-xl flex-shrink-0" />
            <span>Guida al funzionamento dei bilanci automatizzati</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Questa dashboard integra e calcola in tempo reale i dati provenienti da diverse sezioni dell'applicazione. Per far sì che i valori non manuali si aggiornino correttamente, segui queste indicazioni:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
            <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                <FaExchangeAlt /> Compravendita Animali
              </span>
              <p className="text-slate-500">
                Se vendi un animale registrato sulla piattaforma, recati nella dashboard principale, clicca su modifica ed inserisci il <strong>Prezzo di Acquisto Iniziale</strong> e il <strong>Prezzo di Rivendita (Target)</strong>. Cambia poi lo stato dell'animale in <strong>Ceduto</strong>: il ricavo e la spesa d'acquisto verranno conteggiati immediatamente qui.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="font-bold text-blue-700 uppercase flex items-center gap-1">
                <FaAppleAlt /> Cibo e Alimentazione
              </span>
              <p className="text-slate-500">
                Gli elementi inseriti nell'inventario dei feed possiedono un campo prezzo dedicato. Ogni volta che registri un pasto per uno dei tuoi animali, la piattaforma calcolerà automaticamente il valore e aggiornerà la somma del <strong>Cibo Consumato</strong>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="font-bold text-red-700 uppercase flex items-center gap-1">
                <FaStethoscope /> Spese Veterinarie
              </span>
              <p className="text-slate-500">
                I costi dei controlli medici non vanno messi tra le transazioni manuali. Utilizza l'apposito modulo nella scheda del rettile creando un nuovo <strong>Evento</strong>, seleziona la tipologia <strong>Veterinario</strong> e compila l'importo economico della visita.
              </p>
            </div>
          </div>
        </div>

        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        {/* --- SEZIONE 1: OVERVIEW GLOBALE --- */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-emerald-500">
              <h3 className="text-slate-500 text-sm font-bold uppercase">Entrate Totali</h3>
              <p className="text-3xl font-black text-slate-800 mt-2 flex items-center gap-2">
                <FaArrowUp className="text-emerald-500 text-xl" />
                {formatCurrency(summary.overview.totalIncome)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
              <h3 className="text-slate-500 text-sm font-bold uppercase">Uscite Totali</h3>
              <p className="text-3xl font-black text-slate-800 mt-2 flex items-center gap-2">
                <FaArrowDown className="text-red-500 text-xl" />
                {formatCurrency(summary.overview.totalExpense)}
              </p>
            </div>
            <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${summary.overview.netProfit >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
              <h3 className="text-slate-500 text-sm font-bold uppercase">Profitto Netto</h3>
              <p className={`text-3xl font-black mt-2 flex items-center gap-2 ${summary.overview.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                <FaWallet className="text-xl" />
                {formatCurrency(summary.overview.netProfit)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- SEZIONE 2: BREAKDOWN & TRANSAZIONI MANUALI --- */}
          <div className="space-y-8">
            
            {/* Breakdown Card */}
            {summary && (
              <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <FaListUl className="text-emerald-500" /> Dettaglio Voci
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-emerald-600 font-bold mb-2">Entrate</h4>
                    <ul className="text-sm space-y-2 text-slate-600">
                      <li className="flex justify-between"><span>Vendita Animali:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.incomes.animalsSold)}</span></li>
                      <li className="flex justify-between"><span>Altre Entrate:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.incomes.custom)}</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-red-600 font-bold mb-2">Uscite</h4>
                    <ul className="text-sm space-y-2 text-slate-600">
                      <li className="flex justify-between"><span>Acquisto Animali:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.expenses.animalsBought)}</span></li>
                      <li className="flex justify-between"><span>Cibo Consumato:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.expenses.foodConsumed)}</span></li>
                      <li className="flex justify-between"><span>Spese Veterinarie:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.expenses.veterinary)}</span></li>
                      <li className="flex justify-between"><span>Altre Spese:</span> <span className="font-mono font-bold text-slate-800">{formatCurrency(summary.breakdown.expenses.custom)}</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Form Aggiungi Transazione */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Aggiungi Transazione Manuale</h2>
              <form onSubmit={handleTxSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-2 border rounded bg-slate-50 text-black">
                      <option value="expense">Uscita (Spesa)</option>
                      <option value="income">Entrata (Ricavo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded bg-slate-50 text-black">
                      <option value="Attrezzatura">Attrezzatura (Terrari, Rack)</option>
                      <option value="Materiali">Materiali (Substrato, Accessori)</option>
                      <option value="Fiere">Fiere / Expo</option>
                      <option value="Animali Esterni">Animali (Non in Piattaforma)</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-black">Importo (€)</label>
                    <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border rounded bg-slate-50 text-black" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded bg-slate-50 text-black" />
                  </div>
                  <div className="col-span-2 text-black">
                    <label className="block text-sm font-medium  text-black mb-1">Descrizione</label>
                    <input type="text" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded bg-slate-50" placeholder="Es. Acquisto terrario in PVC" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                  <FaPlus /> Aggiungi
                </button>
              </form>

              {/* Lista Transazioni */}
              <div className="mt-6 max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Descrizione</th>
                      <th className="p-2 text-right">Importo</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map(tx => (
                      <tr key={tx._id} className="hover:bg-slate-50 text-black">
                        <td className="p-2">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="p-2">{tx.description} <span className="text-xs text-slate-400 block">{tx.category}</span></td>
                        <td className={`p-2 text-right font-mono font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => setTxToDelete(tx._id)} className="text-red-400 hover:text-red-600"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan="4" className="text-center p-4 text-slate-400">Nessuna transazione registrata</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- SEZIONE 3: ANALISI SINGOLO ANIMALE --- */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <FaSearchDollar className="text-blue-500" /> Analisi Investimento Animale
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Seleziona un animale per vedere quanto ti è costato fino ad oggi:</label>
              <select 
                value={selectedReptileId} 
                value={selectedReptileId}
                onChange={(e) => setSelectedReptileId(e.target.value)} 
                className="w-full p-3 border border-blue-200 rounded-lg bg-blue-50 font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleziona Animale --</option>
                {reptiles.map(r => (
                  <option key={r._id} value={r._id}>{r.name ? `${r.name} (${r.species})` : `${r.morph || 'Sconosciuto'} (${r.species})`}</option>
                ))}
              </select>
            </div>

            {isReptileLoading ? (
               <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>
            ) : reptileStats && reptileStats.valuation ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* Dati Generali Valutazione */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Costo d'Acquisto Iniziale</p>
                    <p className="text-xl font-mono text-slate-800 font-bold">{formatCurrency(reptileStats.valuation.initialPrice?.amount, reptileStats.valuation.initialPrice?.currency)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Valore di Vendita Stimato</p>
                    <p className="text-xl font-mono text-blue-600 font-bold">{formatCurrency(reptileStats.valuation.resalePrice?.amount, reptileStats.valuation.resalePrice?.currency)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-red-600 uppercase font-bold">Totale Investito ad Oggi (Acquisto + Vet)</p>
                      <p className="text-xs text-slate-500 mt-1">*Escluso il costo del cibo</p>
                    </div>
                    <p className="text-2xl font-mono text-red-700 font-black">{formatCurrency(reptileStats.valuation.currentEstimatedValue?.amount, reptileStats.valuation.currentEstimatedValue?.currency)}</p>
                  </div>
                </div>

                {/* Dati Cibo */}
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex justify-between items-center">
                  <div>
                     <p className="text-xs text-emerald-700 uppercase font-bold">Costo Totale Cibo Consumato</p>
                     <p className="text-sm text-slate-600 mt-1">Pasti registrati: <span className="font-bold">{reptileStats.food.totalMeals}</span></p>
                     {reptileStats.food.estimatedMealsCount > 0 && (
                       <p className="text-xs text-orange-600 italic mt-1">*{reptileStats.food.estimatedMealsCount} pasti stimati sui prezzi attuali</p>
                     )}
                  </div>
                  <p className="text-2xl font-mono text-emerald-700 font-black">{formatCurrency(reptileStats.food.totalCost)}</p>
                </div>

                {/* Cronologia Eventi Finanziari Animale */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Cronologia Spese Animale</h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 sticky top-0 text-black">
                        <tr>
                          <th className="p-2">Data</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2 text-right">Costo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reptileStats.valuation.history.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-slate-500">{new Date(h.date).toLocaleDateString()}</td>
                            <td className="p-2 font-medium text-slate-700">{h.description}</td>
                            <td className="p-2 text-right font-mono text-red-600">+{formatCurrency(h.addedValue, h.currency)}</td>
                          </tr>
                        ))}
                        {reptileStats.valuation.history.length === 0 && (
                          <tr><td colSpan="3" className="text-center p-4 text-slate-400">Nessuna storia finanziaria</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                Seleziona un rettile dal menu a tendina per analizzare i suoi costi.
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* --- MODALE DI CONFERMA CANCELLAZIONE --- */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform scale-100 transition-all">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">Conferma Eliminazione</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Sei sicuro di voler eliminare definitivamente questa transazione? L'operazione ricalcolerà istantaneamente il bilancio e non potrà essere annullata.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => setTxToDelete(null)} 
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Annulla
              </button>
              <button 
                onClick={confirmTxDelete} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md shadow-red-200 transition"
              >
                Sì, elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;