// src/pages/BreederProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicBreederProfile } from '../services/api';
import ReptileCardPublic from '../components/ReptileCardPublic'; // Riutilizziamo la card
import { useTranslation } from 'react-i18next';
import { MapPinIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

const BreederProfile = () => {
  const { userId } = useParams();
  const [breeder, setBreeder] = useState(null);
  const [reptiles, setReptiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await getPublicBreederProfile(userId);
        setBreeder(data.breeder);
        // Aggiungiamo le info del breeder a ogni rettile per la card
        const reptilesWithBreeder = data.reptiles.map(r => ({
          ...r,
          user: data.breeder._id,
          breeder: {
            name: data.breeder.name,
            avatar: data.breeder.avatar,
            address: data.breeder.address
          }
        }));
        setReptiles(reptilesWithBreeder);
      } catch (err) {
        setError(t('breederProfile.error', 'Impossibile caricare il profilo.'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, t]);

  if (loading) return <p className="text-center text-stone-500 p-10">{t('breederProfile.loading', 'Caricamento...')}</p>;
  if (error) return <p className="text-center text-red-500 p-10">{error}</p>;
  if (!breeder) return <p className="text-center text-stone-500 p-10">{t('breederProfile.notFound', 'Allevatore non trovato.')}</p>;

  const avatarUrl = breeder.avatar
    ? `${process.env.REACT_APP_BACKEND_URL_IMAGE}${breeder.avatar}`
    : '/default-avatar.png';

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link to="/shop/breeders" className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium">
            <ArrowUturnLeftIcon className="w-4 h-4" />
            {t('breederProfile.back', 'Tutti gli allevatori')}
          </Link>
        </div>

        {/* Info Allevatore */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:flex items-center mb-8">
          <img 
            src={avatarUrl} 
            alt={breeder.name}
            className="h-24 w-24 rounded-full object-cover border-4 border-orange-500 mx-auto md:mx-0"
          />
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <h1 className="text-3xl font-bold text-stone-900">{breeder.name}</h1>
            {breeder.address && (
              <div className="flex items-center justify-center md:justify-start text-md text-stone-500 mt-1">
                <MapPinIcon className="w-5 h-5 mr-1 text-stone-400" />
                <span>{breeder.address}</span>
              </div>
            )}
            <span className="text-sm font-semibold bg-orange-100 text-orange-800 px-3 py-1 rounded-full mt-2 inline-block">
              {breeder.subscription.plan}
            </span>
          </div>
        </div>

        {/* Rettili dell'Allevatore */}
        <h2 className="text-2xl font-semibold text-stone-800 mb-6">
          {t('breederProfile.reptilesTitle', 'Rettili disponibili')}
        </h2>
        {reptiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reptiles.map(reptile => (
              <ReptileCardPublic key={reptile._id} reptile={reptile} />
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-500 bg-white p-6 rounded-lg shadow-sm">
            {t('breederProfile.noReptiles', 'Questo allevatore non ha rettili in vendita al momento.')}
          </p>
        )}
      </div>
    </div>
  );
};

export default BreederProfile;