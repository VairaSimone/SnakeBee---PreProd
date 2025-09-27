import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";

const TelegramAuth = () => {
  const navigate = useNavigate();

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    // Prendi il token di accesso dell'utente loggato dal localStorage (o dove lo salvi)
    const accessToken = localStorage.getItem("token"); // assicurati che sia salvato al login

    if (!accessToken) {
      alert("Devi essere loggato per collegare Telegram ❌");
      navigate("/login");
      return;
    }

    api.post(`/telegram/connect?token=${token}`, null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(() => {
        alert("Account Telegram collegato con successo ✅");
        navigate("/dashboard");
      })
      .catch((err) => {
        console.error(err.response?.data || err);
        alert("Errore nel collegamento a Telegram ❌");
        navigate("/");
      });
  }
}, [navigate]);

  return null;
};

export default TelegramAuth;
