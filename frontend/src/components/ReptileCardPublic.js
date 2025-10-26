// src/components/ReptileCardPublic.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * ReptileCardPublic - markup + stile ridisegnati.
 * Nota: non tocco la logica esistente (image url, price formatting, link).
 */

const IconMale = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 4h6v6h-2V6.414l-3.293 3.293-1.414-1.414L16.586 5H14V4z" />
    <path d="M11 13a4 4 0 100-8 4 4 0 000 8z" />
  </svg>
);
const IconFemale = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a5 5 0 100 10 5 5 0 000-10zM11 14h2v3h3v2h-3v3h-2v-3H8v-2h3v-3z" />
  </svg>
);
const IconUnknown = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 15h-1.5v-1.5h1.5V17zM13 11.5c0 .83-.67 1.5-1.5 1.5h-.25v1h-.75v-.5c0-.83.67-1.5 1.5-1.5h.25v-.5C11.5 10.67 12.17 10 13 10s1 .67 1 1.5V11.5z" />
  </svg>
);
const ReptileCardPublic = ({ reptile }) => {
  const { t } = useTranslation();

  const imageUrl = reptile.image?.[0]
    ? `${process.env.REACT_APP_BACKEND_URL_IMAGE}${reptile.image[0]}`
    : '/default-reptile.png';

  const getSexIcon = () => {
    if (reptile.sex === 'M')
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <IconMale className="w-4 h-4" />
          <span className="sr-only">{t('shop.male', 'Maschio')}</span>
        </span>
      );
    if (reptile.sex === 'F')
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <IconFemale className="w-4 h-4" />
          <span className="sr-only">{t('shop.female', 'Femmina')}</span>
        </span>
      );
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-neutral-50 text-stone-400 ring-1 ring-neutral-100">
        <IconUnknown className="w-4 h-4" />
        <span className="sr-only">{t('shop.unknown', 'Sconosciuto')}</span>
      </span>
    );
  };

  const formatPrice = (price) => {
    if (!price || !price.amount) return t('shop.priceOnRequest', 'Prezzo su richiesta');
    return new Intl.NumberFormat(t('locale', 'it-IT'), {
      style: 'currency',
      currency: price.currency || 'EUR',
    }).format(price.amount);
  };

  const breederAvatar = reptile.breeder?.avatar
    ? `${process.env.REACT_APP_BACKEND_URL_IMAGE}${reptile.breeder.avatar}`
    : '/default-avatar.png';

  return (
    <article
      className="group relative bg-white rounded-2xl shadow-md overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1"
      aria-labelledby={`reptile-${reptile._id}-title`}
    >
      {/* Top breeder badge (sticky-like, floats above image) */}
<div className="absolute top-4 left-4 z-20">
        <Link
          to={`/shop/breeders/${reptile.user}`}
          className="flex items-center gap-3 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-transparent hover:border-amber-300 hover:bg-white hover:shadow-md transition-all duration-200"
          aria-label={reptile.breeder?.name || t('shop.breeder', 'Allevatore')}
        >
          <img
            src={breederAvatar}
            alt={reptile.breeder?.name || ''}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
            loading="lazy"
          />
          <span className="text-xs font-semibold text-stone-800 leading-none">
            {reptile.breeder?.name}
          </span>
        </Link>
      </div>
      {/* Image area */}
      <Link
        to={`/public/reptile/${reptile._id}`}
        className="block w-full h-56 md:h-64 bg-stone-100 relative"
        aria-hidden={false}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt={reptile.name || reptile.species}
className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"          loading="lazy"
        />

        {/* subtle gradient overlay bottom for text contrast */}
<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />      </Link>

      {/* Content */}
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              id={`reptile-${reptile._id}-title`}
              className="text-lg md:text-xl font-semibold text-stone-900 truncate"
              title={reptile.species}
            >
              {reptile.species}
            </h3>
            <p className="text-sm text-stone-600 mt-1 truncate" title={reptile.morph}>
              {reptile.morph || <span className="italic text-stone-400">{t('shop.noMorph', 'N/A')}</span>}
            </p>

<div className="mt-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-stone-400 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M11.536 21.886a1.5 1.5 0 01-1.072-.439C6.901 18.06 4.5 14.532 4.5 11.25 4.5 7.23 7.73 4 11.75 4s7.25 3.23 7.25 7.25c0 3.282-2.401 6.81-5.964 10.197a1.5 1.5 0 01-1.072.439zm.214-11.636a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  clipRule="evenodd"
                />
              </svg>
                            <p className="text-sm text-stone-500 truncate" title={reptile.breeder?.address}>
                {reptile.breeder?.address || t('shop.noAddress', 'Indirizzo non disponibile')}
              </p>
            </div>
          </div>

          {/* Right column: sex icon + price */}
          <div className="flex flex-col items-end justify-between">
            <div className="mb-3">{getSexIcon()}</div>

            <div className="mt-2">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-1 ring-amber-50 shadow-sm transform transition-all duration-200 group-hover:scale-105"
                aria-label={t('shop.price', 'Prezzo')}
                title={typeof reptile.price === 'object' ? reptile.price?.amount ? t('shop.price', 'Prezzo') : t('shop.priceOnRequest', 'Prezzo su richiesta') : t('shop.price', 'Prezzo')}
              >
                {formatPrice(reptile.price)}
              </span>
            </div>
          </div>
        </div>

        {/* CTA row (subtle, accessible) */}
<Link
            to={`/public/reptile/${reptile._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-md hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-px transition-all duration-200"
            aria-label={t('shop.viewDetails', 'Vedi dettagli')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('shop.view', 'Vedi')}
          </Link>

        </div>
          </article>
  );
};

export default ReptileCardPublic;
