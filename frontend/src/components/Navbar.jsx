import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, selectUser } from '../features/userSlice';
import api from '../services/api';
import Notifications from './Notifications'; 

const Navbar = () => {
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const avatarMenuRef = useRef();
  const notificationsRef = useRef(); 

  const handleLogout = async () => {
    try {
      await api.post('/v1/logout', null, { withCredentials: true });
      dispatch(logoutUser());
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('token');
      navigate('/login');
    } catch (err) {
      console.error('Errore logout:', err);
    }
  };

  const fetchNotificationsCount = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications/unread/count');
      setNotificationsCount(data.unreadCount);
    } catch (err) {

    }
  };

  useEffect(() => {
    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 30000);
    return () => clearInterval(interval);
  }, [user]);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target) && !e.target.closest('.notification-bell-button')) {
          setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-[#FAF3E0] text-[#2B2B2B] shadow-md fixed w-full z-50 top-0">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* LOGO */}
        <Link to="/" className="text-xl font-bold text-[#228B22] flex items-center gap-2">
          <img src="/icona.png" alt="SnakeBee" className="h-8" />
          SnakeBee
        </Link>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden text-2xl"
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Desktop Menu */}
        <ul className="hidden sm:flex gap-6 items-center font-medium">
          {!user ? (
            <>
              <NavLink to="/login" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Login</NavLink>
              <NavLink to="/register" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Registrati</NavLink>
              <NavLink to="/pricing" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Abbonamento</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Dashboard</NavLink>
              <NavLink to="/breeding" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Riproduzione</NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `hover:text-[#228B22] transition ${isActive ? 'text-[#228B22] underline underline-offset-4 font-semibold' : ''}`}>Inventario</NavLink>
              
              {/* Bell + count */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="relative notification-bell-button" // Classe per il click outside
                >
                  <FaBell className="text-xl hover:text-[#228B22]" />
                  {notificationsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-bold text-white rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#FAF3E0]">
                      {notificationsCount}
                    </span>
                  )}
                </button>
                
                <div
                  ref={notificationsRef}
                  className={`absolute top-full right-0 mt-3 w-80 sm:w-96 bg-[#FDFBF5] border border-gray-200 rounded-lg shadow-xl transition-all duration-300 ease-in-out z-50
                    ${showNotifications ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-10px] pointer-events-none'}`}
                >
                    <Notifications 
                        onNotificationRead={fetchNotificationsCount} 
                        closeDropdown={() => setShowNotifications(false)}
                    />
                </div>
              </div>

              {/* Avatar dropdown */}
              <div className="relative" ref={avatarMenuRef}>
                <button onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}>
                  <img
                    src={user?.avatar?.trim() ? process.env.REACT_APP_BACKEND_URL_IMAGE + user.avatar : '/default-avatar.png'}
                    alt="Avatar"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                    className="w-9 h-9 rounded-full border-2 border-[#228B22] hover:ring-2 ring-offset-2 ring-[#FFD700] transition"
                  />
                </button>
                {avatarMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-50 animate-fade-in-down">
                    <NavLink to="/profile" className="block px-4 py-2 hover:bg-[#F1F1F1]" onClick={() => setAvatarMenuOpen(false)}>Profilo</NavLink>
                    <NavLink to="/pricing" className="block px-4 py-2 hover:bg-[#F1F1F1]" onClick={() => setAvatarMenuOpen(false)}>Abbonamento</NavLink>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-[#F1F1F1]">Logout</button>
                  </div>
                )}
              </div>
            </>
          )}
        </ul>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
         <div className="sm:hidden px-4 py-3 bg-[#EDE7D6] text-base animate-fade-in-down">
            <div className="flex flex-col gap-2">
              {!user ? (
                 <>
                    <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Login</NavLink>
                    <NavLink to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Registrati</NavLink>
                    <NavLink to="/pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Abbonamento</NavLink>
                 </>
              ) : (
                 <>
                    <NavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Dashboard</NavLink>
                    <NavLink to="/breeding" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Riproduzione</NavLink>
                    <NavLink to="/inventory" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Inventario</NavLink>
                    <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded hover:bg-[#E0D8C3] transition">Profilo</NavLink>
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 rounded text-red-600 hover:bg-[#FCEFEF] transition">Logout</button>
                 </>
              )}
            </div>
         </div>
      )}
    </nav>
  );
};

export default Navbar;