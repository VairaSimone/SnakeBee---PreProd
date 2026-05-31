import React, { useState } from 'react';
import { HashLink as Link } from "react-router-hash-link";
import { 
  FaShoppingCart, FaBullhorn, FaRegNewspaper, FaChartLine, 
  FaCreditCard, FaEnvelope, FaQuestionCircle, FaBook, 
  FaInfoCircle, FaFacebookF, FaInstagram, FaYoutube 
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import api from "../services/api";
import { useSelector } from "react-redux";
import { selectUser, selectLanguage } from "../features/userSlice";

const Footer = () => {
  const { t } = useTranslation();
  
  const user = useSelector(selectUser);
  const language = useSelector(selectLanguage);
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await api.post("/newsletter/subscribe", { email, language });
      setMessage(res.data.message);
      if (!user) setEmail(""); 
    } catch (err) {
      setMessage(err.response?.data?.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-[#FAF3E0] text-[#2B2B2B] pt-16 pb-6 border-t border-[#E5DCC3] mt-16">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* 1. BRAND */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-4">
              <img src="/Logo.png" alt="SnakeBee" className="h-10 w-auto" />
              <span className="text-2xl font-bold font-serif">SnakeBee</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 text-center md:text-left">
              La tua piattaforma completa per l'allevamento di rettili. 
              Monitoraggio e valorizzazione professionali.
            </p>
          </div>

          {/* 2. ESPLORA */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="font-bold text-sm uppercase tracking-wider mb-5">Esplora</h5>
            <ul className="space-y-4">
              <FooterLink to="/shop" icon={FaBullhorn} label="Annunci" />
              <FooterLink to="/blog" icon={FaRegNewspaper} label="Blog" />
              <FooterLink to="/dashboard" icon={FaChartLine} label="Dashboard" />
              <FooterLink to="/pricing" icon={FaCreditCard} label="Abbonamento" />
            </ul>
          </div>

          {/* 3. SUPPORTO */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="font-bold text-sm uppercase tracking-wider mb-5">Supporto & Risorse</h5>
            <ul className="space-y-4">
              <FooterLink to="/home#contatti" icon={FaEnvelope} label="Contatti" />
              <FooterLink to="/home#faq" icon={FaQuestionCircle} label="FAQ (Domande Frequenti)" />
              <FooterLink to="/home#chi-siamo" icon={FaInfoCircle} label="Chi Siamo" />
            </ul>
          </div>

          {/* 4. NEWSLETTER (RIMPICCIOLITA) */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="font-bold text-sm uppercase tracking-wider mb-5">Resta Connesso</h5>
            <p className="text-xs mb-3 text-gray-600 text-center md:text-left">
              Iscriviti alla nostra Newsletter per aggiornamenti esclusivi.
            </p>
            
            {/* Input e Button più stretti (max-w-[260px]) */}
            <div className="flex w-full max-w-[260px]"> 
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("newsletter.placeholder", "La tua email")} 
                className="flex-1 bg-white border border-gray-300 px-3 py-1.5 text-xs rounded-l focus:outline-none focus:border-[#228B22] text-black"
              />
              <button 
                onClick={handleSubscribe}
                disabled={loading}
                className="bg-white border border-gray-300 border-l-0 px-3 py-1.5 text-xs font-bold hover:bg-gray-50 transition-colors rounded-r disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? "..." : "Iscriviti"}
              </button>
            </div>
            
            {message && (
              <p className={`text-[10px] mt-2 font-semibold ${message.includes("Errore") ? "text-red-600" : "text-[#228B22]"}`}>
                {message}
              </p>
            )}

            <div className="flex gap-4 mt-6">
              <SocialIcon href="https://www.facebook.com/profile.php?id=61578296802324" icon={FaFacebookF} />
              <SocialIcon href="https://www.instagram.com/snakebeeofficial/" icon={FaInstagram} />
            </div>
          </div>

        </div>

        {/* --- PAYMENTS & LEGAL --- */}
        <div className="border-t border-[#E5DCC3] py-6 flex justify-center lg:justify-end gap-4 opacity-60">
           <img src="/visa.png" alt="Visa" className="h-5" />
           <img src="/mastercard.png" alt="Mastercard" className="h-5" />
           <img src="/paypal.png" alt="Paypal" className="h-5" />
           <img src="/stripe.png" alt="Stripe" className="h-5" />
        </div>

        <div className="border-t border-[#E5DCC3] pt-6 flex flex-col lg:flex-row justify-between items-center text-[11px] text-gray-500 gap-4 text-center lg:text-left">
          <div>
            © 2025 SnakeBee – Simone Vaira | Sede: Via Varaita 10, Torino (TO) | P.IVA: 13308020018 | 
            <a href="mailto:support@snakebee.it" className="ml-1 hover:text-[#228B22]">support@snakebee.it</a>
          </div>
          
          <div className="flex gap-4">
            <Link to="/it/terms" className="hover:underline hover:text-[#228B22]">Termini e condizioni generali</Link>
            <span>|</span>
            <Link to="/it/privacypolicy" className="hover:underline hover:text-[#228B22]">Politica sulla riservatezza</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

// --- HELPERS ---
const FooterLink = ({ to, icon: Icon, label }) => (
  <li>
    <Link to={to} className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#228B22] transition-colors group">
      <Icon className="text-base text-gray-500 group-hover:text-[#228B22] transition-colors" />
      <span>{label}</span>
    </Link>
  </li>
);

const SocialIcon = ({ href, icon: Icon }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:border-[#228B22] hover:text-[#228B22] transition-all"
  >
    <Icon className="text-sm" />
  </a>
);

export default Footer;