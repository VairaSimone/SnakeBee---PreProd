import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { loginUser } from '../features/userSlice';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const GoogleCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');

    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    if (accessToken) {
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/v1/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })
        .then((res) => {
          dispatch(loginUser(res.data));
          toast.success('Login effettuato con successo! 🎉');
          navigate('/dashboard');
        })
        .catch((err) => {
          console.error('Error fetching user data:', err);
          toast.error('Errore durante il recupero dei dati utente.');
        });
    } else {
      console.error('Access token mancante');
      toast.warning('Access token mancante. Riprova ad accedere.');
    }
  }, [navigate, dispatch]);

  return (
    <div className="container">
      <h2>Login in corso...</h2>
    </div>
  );
};

export default GoogleCallback;
