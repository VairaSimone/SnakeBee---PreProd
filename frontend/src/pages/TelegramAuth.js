import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { selectUser } from "../features/userSlice";
import React, { useEffect } from "react";

const TelegramAuth = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user || !user.token) {
      alert("Devi essere loggato per collegare Telegram ❌");
      return navigate("/login");
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      alert("Link Telegram mancante ❌");
      return navigate("/");
    }

    const connectTelegram = async () => {
      try {
        await api.post(
          '/telegram/connect',
          { token }, // solo token, userId non serve più
          { headers: { Authorization: `Bearer ${user.token}` } } // JWT per authenticateJWT
        );
        alert("Account Telegram collegato con successo ✅");
        navigate("/dashboard");
      } catch (err) {
        console.error(err.response?.data || err);
        if (err.response?.status === 401) alert("Token non valido o scaduto ❌");
        else if (err.response?.status === 404) alert("Utente non trovato ❌");
        else alert("Errore nel collegamento a Telegram ❌");
        navigate("/");
      }
    };

    connectTelegram();
  }, [user, navigate]);

  return null;
};

export default TelegramAuth;
