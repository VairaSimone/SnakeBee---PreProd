// src/pages/Shop.js
import React, { useState, useEffect, useCallback } from 'react';
import { getPublicReptiles } from '../services/api';
import ReptileCardPublic from '../components/ReptileCardPublic';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
// NUOVO: Importa più icone per la UI
import {
  Store, // Per il titolo dello shop
  SlidersHorizontal, // Per il titolo dei filtri
  Filter, // Per il pulsante "Filtra"
  X, // Per il pulsante "Azzera"
  Tag, // Per l'input "Species" e "Morph"
  MapPin, // Per l'input "Zona"
  // Loader2 rimosso perché non utilizzato
  AlertTriangle, // Per l'errore
  SearchX, // Per "Nessun risultato"
  ChevronLeft, // Paginazione
  ChevronRight, // Paginazione
  ArrowRight, // Per il link "Vedi allevatori"
  ChevronDown, // Per il toggle dei filtri mobile
} from 'lucide-react';



const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-2xl shadow-lg animate-pulse">
    <div className="w-full h-48 bg-stone-200 rounded-xl mb-4"></div>
    <div className="h-6 bg-stone-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-stone-200 rounded w-1/2 mb-3"></div>
    <div className="h-4 bg-stone-200 rounded w-1/4"></div>
  </div>
);

const Shop = () => {
  const [reptiles, setReptiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ species: '', morph: '', zona: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // NUOVO: Stato per gestire l'apertura/chiusura dei filtri
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const { t } = useTranslation();

  const fetchReptiles = useCallback(async (currentPage, currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      // Filtra via i valori vuoti dai filtri prima di inviarli
      const activeFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, v]) => v !== '')
      );
      const params = { ...activeFilters, page: currentPage, perPage: 20 };
      const { data } = await getPublicReptiles(params);
      setReptiles(data.dati || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError(t('shop.error', 'Impossibile caricare i rettili.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchReptiles(page, filters);
  }, [page, fetchReptiles]); // Rimosso 'filters' da qui, la ricerca si attiva solo con 'handleFilterSubmit'

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReptiles(1, filters);
  };

  // NUOVO: Funzione per azzerare i filtri e ricaricare
  const handleClearFilters = () => {
    const clearedFilters = { species: '', morph: '', zona: '' };
    setFilters(clearedFilters);
    setPage(1);
    fetchReptiles(1, clearedFilters);
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* --- HEADER RIDISEGNATO --- */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-10 gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-stone-800 flex items-center gap-3">
            <Store className="w-9 h-9 text-amber-600" />
            {t('shop.title', 'Reptile Shop')}
          </h1>
          {/* Sostituito Link con <a> per il mock */}
          <a 
            href="/shop/breeders"
            onClick={(e) => e.preventDefault()} // Previeni navigazione nel mock
            className="text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors duration-200 group flex items-center"
          >
            {t('shop.breederList', 'Vedi tutti gli allevatori')}
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* --- NUOVO LAYOUT: FILTRI (Sidebar) + CONTENUTO (Grid) --- */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          
          {/* --- COLONNA FILTRI (Sidebar) --- */}
          <aside className="lg:col-span-1">
            {/* Pulsante Toggle per Mobile */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full flex lg:hidden justify-between items-center text-lg font-semibold text-stone-800 bg-white p-4 rounded-2xl shadow-lg"
            >
              <span className='flex items-center gap-2'>
                <SlidersHorizontal className="w-6 h-6 text-amber-600" />
                {t('shop.filterTitle', 'Filtri di Ricerca')}
              </span>
              <ChevronDown 
                className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : 'rotate-0'}`} 
              />
            </button>

            {/* Contenitore Filtri (Sticky su Desktop, Collassabile su Mobile) */}
            {/* --- RIMOSSO: AnimatePresence --- */}
            <> 
              {(isFilterOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && ( // Aggiunto check per 'window'
                // --- RIMOSSO: motion.div, sostituito con div ---
                <div
                  key="filter-panel"
                  // --- RIMOSSO: variants, initial, animate, exit ---
                  className={`
                    bg-white p-6 rounded-2xl shadow-lg 
                    lg:sticky lg:top-24 
                    ${isFilterOpen ? 'block' : 'hidden'} lg:block 
                    ${(isFilterOpen && (typeof window !== 'undefined' && window.innerWidth < 1024)) ? 'mt-4' : 'mt-0'} lg:mt-0
                    transition-all duration-300 ease-in-out ${isFilterOpen ? 'opacity-100 max-h-screen' : 'opacity-0 max-h-0'} lg:opacity-100 lg:max-h-full overflow-hidden
                  `} // Sostituita animazione con classi 'transition' e 'max-h' (sebbene 'hidden' già lo gestisca)
                >
                  <h2 className="text-xl font-semibold text-stone-800 mb-5 flex items-center gap-2 hidden lg:flex">
                    <SlidersHorizontal className="w-6 h-6 text-amber-600" />
                    {t('shop.filterTitle', 'Filtri di Ricerca')}
                  </h2>

                  <form onSubmit={handleFilterSubmit} className="space-y-5">
                    {/* Input Species */}
                    <div>
                      <label htmlFor="species" className="block text-sm font-medium text-stone-600 mb-1">
                        {t('shop.filterSpeciesLabel', 'Specie')}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                          <Tag className="w-5 h-5" />
                        </span>
                        <input
                          type="text" name="species" id="species" value={filters.species} onChange={handleFilterChange}
                          placeholder={t('shop.filterSpecies', 'es. Python regius')}
                          className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-150"
                        />
                      </div>
                    </div>
                    
                    {/* Input Morph */}
                    <div>
                      <label htmlFor="morph" className="block text-sm font-medium text-stone-600 mb-1">
                        {t('shop.filterMorphLabel', 'Morph')}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                          <Tag className="w-5 h-5" />
                        </span>
                        <input
                          type="text" name="morph" id="morph" value={filters.morph} onChange={handleFilterChange}
                          placeholder={t('shop.filterMorph', 'es. Piebald')}
                          className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-150"
                        />
                      </div>
                    </div>

                    {/* Input Zona */}
                    <div>
                      <label htmlFor="zona" className="block text-sm font-medium text-stone-600 mb-1">
                        {t('shop.filterZoneLabel', 'Zona')}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                          <MapPin className="w-5 h-5" />
                        </span>
                        <input
                          type="text" name="zona" id="zona" value={filters.zona} onChange={handleFilterChange}
                          placeholder={t('shop.filterZone', 'es. Milano')}
                          className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-150"
                        />
                      </div>
                    </div>

                    {/* Pulsanti Azione */}
                    <div className="flex flex-col gap-3 pt-3">
                      <button 
                        type="submit" 
                        className="w-full bg-amber-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-amber-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <Filter className="w-5 h-5" />
                        {t('shop.filterButton', 'Filtra')}
                      </button>
                      <button 
                        type="button" 
                        onClick={handleClearFilters}
                        className="w-full bg-stone-200 text-stone-700 py-2.5 px-4 rounded-lg font-semibold hover:bg-stone-300 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        {t('shop.clearFilters', 'Azzera')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
            {/* --- RIMOSSO: AnimatePresence --- */}
          </aside>

          {/* --- COLONNA CONTENUTO (Griglia) --- */}
          <main className="lg:col-span-3 mt-8 lg:mt-0">
            
            {/* --- STATO DI CARICAMENTO (Skeleton Grid) --- */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* --- STATO DI ERRORE --- */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-6 rounded-2xl shadow-lg shadow-red-100/50" role="alert">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-3 text-red-600" />
                  <p className="font-semibold text-lg">{error}</p>
                </div>
              </div>
            )}

            {/* --- STATO "NESSUN RISULTATO" --- */}
            {!loading && !error && reptiles.length === 0 && (
              <div className="text-center bg-white p-12 rounded-2xl shadow-lg text-stone-500">
                <SearchX className="w-16 h-16 mx-auto mb-5 text-stone-400" />
                <h3 className="text-2xl font-semibold text-stone-700 mb-2">
                  {t('shop.noResultsTitle', 'Nessun risultato')}
                </h3>
                <p>{t('shop.noResults', 'Nessun rettile trovato. Prova a modificare i filtri.')}</p>
              </div>
            )}

            {/* --- GRIGLIA RISULTATI --- */}
            {!loading && !error && reptiles.length > 0 && (
              // --- RIMOSSO: motion.div ---
              <div 
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                // --- RIMOSSO: variants, initial, animate ---
              >
                {reptiles.map(reptile => (
                  // --- RIMOSSO: motion.div ---
                  <div key={reptile._id} /* variants={cardVariants} */>
                    <ReptileCardPublic reptile={reptile} />
                  </div>
                ))}
              </div>
            )}

            {/* --- PAGINAZIONE --- */}
            {totalPages > 1 && !loading && !error && (
              <nav className="flex flex-col sm:flex-row justify-between items-center mt-12 border-t border-stone-200 pt-8 gap-4">
                <button 
                  onClick={() => setPage(p => p - 1)} 
                  disabled={page === 1}
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-stone-300 text-sm font-semibold rounded-lg text-stone-700 bg-white hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  {t('shop.prev', 'Precedente')}
                </button>
                <span className="text-sm font-medium text-stone-600">
                  {t('shop.page', { defaultValue: 'Pagina {{page}} di {{totalPages}}', page, totalPages })}
                </span>
                <button 
                  onClick={() => setPage(p => p + 1)} 
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-stone-300 text-sm font-semibold rounded-lg text-stone-700 bg-white hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {t('shop.next', 'Successiva')}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </nav>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default Shop;