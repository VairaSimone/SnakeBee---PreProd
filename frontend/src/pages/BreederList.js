// src/pages/BreederList.js
import React, { useState, useEffect } from 'react';
import { getPublicBreeders } from '../services/api';
import BreederCard from '../components/BreederCard';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';

const BreederList = () => {
  const [breeders, setBreeders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchBreeders = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, perPage: 20 };
        const { data } = await getPublicBreeders(params);
        setBreeders(data.dati || []);
        setTotalPages(data.totalPages || 0);
      } catch (err) {
        setError(t('breeders.error', 'Impossibile caricare gli allevatori.'));
      } finally {
        setLoading(false);
      }
    };
    fetchBreeders();
  }, [page, t]);

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2 mb-8">
          <UsersIcon className="w-8 h-8 text-orange-600" />
          {t('breeders.title', 'Allevatori Pubblici')}
        </h1>

        {/* Lista Allevatori */}
        {loading && <p className="text-center text-stone-500">{t('breeders.loading', 'Caricamento...')}</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && breeders.length === 0 && (
          <p className="text-center text-stone-500">{t('breeders.noResults', 'Nessun allevatore pubblico trovato.')}</p>
        )}
        {!loading && breeders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breeders.map(breeder => (
              <BreederCard key={breeder._id} breeder={breeder} />
            ))}
          </div>
        )}

        {/* Paginazione (Semplice) */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setPage(p => p - 1)} 
              disabled={page === 1}
              className="px-4 py-2 mx-1 bg-white border border-stone-300 rounded-md disabled:opacity-50 hover:bg-stone-50"
            >
              &larr; {t('shop.prev', 'Prec.')}
            </button>
            <span className="px-4 py-2 mx-1 text-stone-700">
              {t('shop.page', 'Pagina {{page}} di {{totalPages}}', { page, totalPages })}
            </span>
            <button 
              onClick={() => setPage(p => p + 1)} 
              disabled={page === totalPages}
              className="px-4 py-2 mx-1 bg-white border border-stone-300 rounded-md disabled:opacity-50 hover:bg-stone-50"
            >
              {t('shop.next', 'Succ.')} &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreederList;