import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  FaBell, FaBars, FaTimes, FaRegNewspaper, FaBullhorn, FaShoppingBag, 
  FaChartLine, FaWrench, FaBoxOpen, FaDna, FaCalendarAlt, FaFileAlt, 
  FaUser, FaCreditCard, FaBox, FaCogs, FaStore, FaSignOutAlt, FaSignInAlt, FaUserPlus 
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, selectUser } from '../features/userSlice';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { MARKET_URL } from '../utils/marketData';

// --- HELPERS ---
const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 transition-colors duration-200 hover:text-[#228B22] ${
        isActive ? 'text-[#228B22] font-semibold' : 'text-[#2B2B2B]'
      }`
    }
  >
    {Icon && <Icon className="text-lg" />}
    <span>{label}</span>
  </NavLink>
);

const DropdownItem = ({ to, icon: Icon, label, onClick, colorClass = "text-gray-700" }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors ${colorClass}`}
  >
    {Icon && <Icon className="text-base shrink-0" />}
    <span className="text-sm whitespace-nowrap">{label}</span>
  </Link>
);

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [strumentiOpen, setStrumentiOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const avatarMenuRef = useRef();
  const strumentiRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) setAvatarMenuOpen(false);
      if (strumentiRef.current && !strumentiRef.current.contains(e.target)) setStrumentiOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- MECCANISMO COPIATO DALLA VERSIONE 2 ---
  const getAvatarUrl = () => {
    if (!user?.avatar?.trim()) {
      return '/default-avatar.png';
    }
    if (/^https?:\/\//.test(user.avatar)) {
      return user.avatar;
    }
    return process.env.REACT_APP_BACKEND_URL_IMAGE + user.avatar;
  };

  const handleLogout = async () => {
    try {
      await api.post('/v1/logout', null, { withCredentials: true });
      dispatch(logoutUser());
      localStorage.clear();
      setAvatarMenuOpen(false);
      navigate('/login');
    } catch (err) {}
  };

  return (
    <nav className="bg-[#FAF3E0] text-[#2B2B2B] shadow-sm sticky w-full z-50 top-0 border-b border-[#E5DCC3]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/Logo.png" alt="SnakeBee" className="h-9 w-auto" />
          <span className="text-2xl font-bold text-[#4A5D23] font-serif">SnakeBee</span>
        </Link>

        {/* --- DESKTOP NAVIGATION --- */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-4">
          <NavItem to="/blog" icon={FaRegNewspaper} label="Blog" />
          <NavItem to="/shop" icon={FaBullhorn} label="Annunci" />
          <NavItem to="/store" icon={FaShoppingBag} label="Market"/>

          {user ? (
            <>
              <NavItem to="/dashboard" icon={FaChartLine} label="Dashboard" />
              <div className="relative" ref={strumentiRef}>
                <button 
                  onClick={() => setStrumentiOpen(!strumentiOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:text-[#228B22] transition-colors"
                >
                  <FaWrench /> <span>Strumenti</span>
                  <svg className={`w-4 h-4 transition-transform ${strumentiOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {strumentiOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-xl py-2 z-50">
                    <DropdownItem to="/inventory" icon={FaBoxOpen} label="Inventario" onClick={() => setStrumentiOpen(false)} />
                    <DropdownItem to="/breeding" icon={FaDna} label="Riproduzione" onClick={() => setStrumentiOpen(false)} />
                    <DropdownItem to="/calendar" icon={FaCalendarAlt} label="Calendario" onClick={() => setStrumentiOpen(false)} />
                    <DropdownItem to="/cites" icon={FaFileAlt} label="Generazione Cites" onClick={() => setStrumentiOpen(false)} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <NavItem to="/pricing" icon={FaCreditCard} label="Abbonamento" />
          )}
        </div>

        {/* --- USER ACTIONS --- */}
        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <div className="hidden lg:block relative" ref={avatarMenuRef}>
              <button onClick={() => setAvatarMenuOpen(!avatarMenuOpen)} className="flex items-center">
                {/* IMG CON MECCANISMO ONERROR DELLA VERSIONE 2 */}
                <img 
                  src={getAvatarUrl()} 
                  onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm hover:border-[#228B22] transition-all object-cover" 
                  alt="User" 
                />
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {avatarMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-xl py-2 z-50">
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Il tuo Account</div>
                  <DropdownItem to="/profile" icon={FaUser} label="Profilo" onClick={() => setAvatarMenuOpen(false)} />
                  <DropdownItem to="/pricing" icon={FaCreditCard} label="Abbonamento" onClick={() => setAvatarMenuOpen(false)} />
                  <DropdownItem to="/store/orders" icon={FaBox} label="I miei ordini" onClick={() => setAvatarMenuOpen(false)} />
                  
                  {user?.role === 'admin' && (
                    <>
                      <div className="border-t my-2"></div>
                      <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Amministrazione</div>
                      <DropdownItem to="/admin/blog" icon={FaCogs} label="Pannello Admin" colorClass="text-red-700" onClick={() => setAvatarMenuOpen(false)} />
                      <DropdownItem to="/admin/store" icon={FaStore} label="Gestione Negozio" colorClass="text-red-700" onClick={() => setAvatarMenuOpen(false)} />
                    </>
                  )}

                  <div className="border-t my-2"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <FaSignOutAlt className="text-base shrink-0" />
                    <span>Esci</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold hover:text-[#228B22] transition-colors flex items-center gap-2">
                <FaSignInAlt /> Login
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-bold bg-[#228B22] text-white rounded-md hover:bg-[#1a6b1a] transition-colors flex items-center gap-2">
                <FaUserPlus /> Register
              </Link>
            </div>
          )}

          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-2xl">
            <FaBars />
          </button>
        </div>
      </div>

      {/* --- MOBILE MENU --- */}
      <div className={`fixed inset-0 z-[100] transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
        <div className="absolute right-0 top-0 h-full w-[280px] bg-[#FAF3E0] shadow-2xl flex flex-col">
          <div className="p-4 flex justify-between items-center border-b border-[#E5DCC3]">
            {/* AGGIUNTO: Profilo visibile anche in Mobile Header */}
            {user ? (
              <div className="flex items-center gap-3">
                <img 
                  src={getAvatarUrl()} 
                  onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  className="w-10 h-10 rounded-full border border-[#228B22] object-cover" 
                  alt="User" 
                />
                <span className="font-bold text-gray-800 text-sm truncate max-w-[120px]">{user.username || 'Profilo'}</span>
              </div>
            ) : (
              <span className="font-bold text-lg">Menu</span>
            )}
            <button onClick={() => setMobileMenuOpen(false)} className="text-2xl p-1"><FaTimes /></button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <MobileLink to="/blog" icon={FaRegNewspaper} label="Blog" onClick={() => setMobileMenuOpen(false)} />
            <MobileLink to="/shop" icon={FaBullhorn} label="Annunci" onClick={() => setMobileMenuOpen(false)} />
            <MobileLink to="/store" icon={FaShoppingBag} label="Market" onClick={() => setMobileMenuOpen(false)} />

            {user ? (
              <>
                <div className="h-px bg-gray-300 my-4 mx-4"></div>
                <div className="px-6 mb-2 text-xs font-bold text-gray-500 uppercase">Pannello</div>
                <MobileLink to="/dashboard" icon={FaChartLine} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                
                <div className="h-px bg-gray-300 my-4 mx-4"></div>
                <div className="px-6 mb-2 text-xs font-bold text-gray-500 uppercase">Strumenti</div>
                <MobileLink to="/inventory" icon={FaBoxOpen} label="Inventario" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink to="/breeding" icon={FaDna} label="Riproduzione" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink to="/calendar" icon={FaCalendarAlt} label="Calendario" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink to="/cites" icon={FaFileAlt} label="Generazione Cites" onClick={() => setMobileMenuOpen(false)} />

                <div className="h-px bg-gray-300 my-4 mx-4"></div>
                <div className="px-6 mb-2 text-xs font-bold text-gray-500 uppercase">Utente</div>
                <MobileLink to="/profile" icon={FaUser} label="Profilo" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink to="/pricing" icon={FaCreditCard} label="Abbonamento" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink to="/store/orders" icon={FaBox} label="I miei ordini" onClick={() => setMobileMenuOpen(false)} />

                <div className="mt-8 px-4">
                  <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg font-semibold">
                    <FaSignOutAlt /> Esci
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="h-px bg-gray-300 my-4 mx-4"></div>
                <MobileLink to="/pricing" icon={FaCreditCard} label="Abbonamento" onClick={() => setMobileMenuOpen(false)} />
                <div className="mt-8 px-4 flex flex-col gap-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-3 w-full px-4 py-3 border-2 border-[#228B22] text-[#228B22] rounded-lg font-bold">
                    <FaSignInAlt /> Accedi
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#228B22] text-white rounded-lg font-bold">
                    <FaUserPlus /> Registrati
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const MobileLink = ({ to, icon: Icon, label, onClick, colorClass = "text-gray-800" }) => (
  <Link to={to} onClick={onClick} className={`flex items-center gap-4 px-6 py-3 hover:bg-[#E5DCC3] transition-colors ${colorClass}`}>
    {Icon && <Icon className="text-lg shrink-0" />}
    <span className="font-medium">{label}</span>
  </Link>
);

export default Navbar;