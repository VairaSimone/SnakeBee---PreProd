import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice';
import { FaTimes, FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import { VscEmptyWindow } from 'react-icons/vsc';

const formatDistanceToNow = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} anni fa`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} mesi fa`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} giorni fa`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} ore fa`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} min fa`;
  return 'Poco fa';
};

const Notifications = ({ onNotificationRead, closeDropdown }) => {
  const [notifications, setNotifications] = useState([]);
  const user = useSelector(selectUser);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get(`/notifications/user/${user._id}?limit=10`);
      const all = [...(data.unreadNotifications || []), ...(data.readNotifications || [])]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setNotifications(all);
    } catch (err) {
      console.error('Errore nel recupero delle notifiche:', err);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    }
  }, [user?._id]);

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      onNotificationRead(); 

      await api.put(`/notifications/${notificationId}`, { read: true });
    } catch (err) {
      console.error('Errore nel segnare la notifica come letta:', err);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
      );
      onNotificationRead();
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const NotificationCard = ({ notification }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <li
        className="flex items-start p-3 hover:bg-[#E0D8C3]/50 rounded-lg transition-colors duration-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-shrink-0 mr-3">
          <span className={`text-xl ${notification.read ? 'text-gray-400' : 'text-green-600'}`}>
            {notification.type === 'feeding' ? '🍽️' : '🩺'}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-800">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDistanceToNow(notification.date)}</p>
        </div>
        {!notification.read && (
          <button
            onClick={() => markAsRead(notification._id)}
            className="ml-2 text-gray-400 hover:text-green-600 transition-colors"
            title="Segna come letto"
          >
            {isHovered ? <FaCheckCircle /> : <FaRegCircle />}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200">
        <h3 className="font-semibold text-md text-[#2B2B2B]">Notifiche</h3>
        <button onClick={closeDropdown} className="text-gray-500 hover:text-red-600">
          <FaTimes />
        </button>
      </div>

      <div className="flex-1 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500">
            <VscEmptyWindow className="text-4xl mb-2" />
            <p className="font-semibold">Nessuna notifica</p>
            <p className="text-sm">Sei completamente aggiornato!</p>
          </div>
        ) : (
          <ul>
            {unreadNotifications.length > 0 && (
              <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase bg-gray-50">Non lette</li>
            )}
            {unreadNotifications.map(n => <NotificationCard key={n._id} notification={n} />)}

            {readNotifications.length > 0 && unreadNotifications.length > 0 && <hr className="my-1" />}

            {readNotifications.length > 0 && (
              <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase bg-gray-50">Lette</li>
            )}
            {readNotifications.map(n => <NotificationCard key={n._id} notification={n} />)}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 text-center border-t border-gray-200">
        <button
          onClick={() => { closeDropdown(); }}
          className="text-sm font-semibold text-green-700 hover:underline"
        >
          Vedi tutte le notifiche
        </button>
      </div>
    </div>
  );
};

export default Notifications;