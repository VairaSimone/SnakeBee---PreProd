import React from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ReferralBanner = () => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const { t } = useTranslation();

const shouldShowBanner = !user || 
    (!user.subscription?.status || !['active', 'processing'].includes(user.subscription.status));

  if (!shouldShowBanner) return null;

return (
    <div className="bg-gradient-to-r from-yellow-100 via-lime-300 to-green-400 text-green-900 py-3 px-6 shadow-md rounded-md animate-fade-in">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col text-center md:text-left">
          <p className="text-base md:text-lg font-medium">
            🐍 {t('ReferralBanner.text')}
          </p>
          {/* Se l'utente ha già preso il buono, mostriamo il badge */}
          {user?.hasReferred && (
            <span className="text-xs font-bold uppercase tracking-wider bg-green-800 text-white px-2 py-0.5 rounded mt-1 w-fit mx-auto md:mx-0">
              {t('ReferralBanner.couponReceived')}
            </span>
          )}
        </div>

        {user && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                navigate('/profile#referral');
              }}
              className="bg-green-900 text-white font-semibold py-2 px-5 rounded-full shadow hover:bg-green-800 transition-all duration-200"
            >
              {t('ReferralBanner.cta')}
            </button>
            <p className="text-xs font-bold">
              {t('ReferralBanner.invitedCount')} {user.referralCount || 0}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReferralBanner;
