// src/components/BreederCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ShieldCheck } from 'lucide-react'; // Icone più moderne

// Creiamo un componente 'MotionLink' per animare il Link di react-router
const MotionLink = motion(Link);

/**
 * Varianti di animazione per Framer Motion.
 * 'rest' è lo stato normale.
 * 'hover' è lo stato in cui il mouse è sopra.
 */
const cardVariants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  hover: {
    scale: 1.03,
    y: -4, // Leggero sollevamento
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

const BreederCard = ({ breeder }) => {
  const avatarUrl = breeder.avatar
    ? `${process.env.REACT_APP_BACKEND_URL_IMAGE}${breeder.avatar}`
    : '/default-avatar.png'; // Assicurati di avere un avatar di default

  // Determiniamo il colore del badge in base al piano
  const getPlanBadgeClasses = (plan) => {
    switch (plan.toLowerCase()) {
      case 'pro':
      case 'premium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'basic':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <MotionLink
      to={`/shop/breeders/${breeder._id}`}
      className="group block" // 'group' è fondamentale per gli hover interni
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      animate="rest"
      layout // Aggiunge animazione se la card cambia posizione in una lista
    >
      {/* Contenitore principale della card */}
      <div className="flex h-full w-full items-start space-x-5 overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-neutral-200/80">
        
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={avatarUrl}
            alt={breeder.name}
            className="h-16 w-16 rounded-full object-cover shadow-md"
          />
          {/* Anello di "glow" sull'avatar in hover */}
          <div className="absolute inset-0 rounded-full ring-2 ring-amber-400 ring-offset-2 ring-offset-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Contenuto Testuale */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          
          {/* Nome Allevatore */}
          <h3 className="truncate text-lg font-semibold text-neutral-800 transition-colors duration-300 group-hover:text-amber-700">
            {breeder.name}
          </h3>

          {/* Indirizzo (se presente) */}
          {breeder.address && (
            <div className="mt-1 flex items-center text-sm text-neutral-500">
              <MapPin className="mr-1.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
              <span className="truncate">{breeder.address}</span>
            </div>
          )}

          {/* Badge Piano di Sottoscrizione */}
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium ${getPlanBadgeClasses(
                breeder.subscription.plan
              )}`}
            >
              <ShieldCheck className="mr-1 h-3.5 w-3.5 opacity-80" />
              {breeder.subscription.plan}
            </span>
          </div>
        </div>
      </div>
    </MotionLink>
  );
};

export default BreederCard;