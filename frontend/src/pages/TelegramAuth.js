import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { selectUser } from "../features/userSlice";

const TelegramAuth = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser); // prendi l'utente dal Redux store

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      alert("Link Telegram mancante ❌");
      navigate("/");
      return;
    }

    if (!user || !user._id) {
      alert("Devi essere loggato per collegare Telegram ❌");
      navigate("/login");
      return;
    }

    // POST con token e userId nel body
    api.post('/telegram/connect', { token, userId: user._id })
      .then(() => {
        alert("Account Telegram collegato con successo ✅");
        navigate("/dashboard");
      })
      .catch((err) => {
        console.error(err.response?.data || err);
        if (err.response?.status === 401) {
          alert("Token non valido o scaduto ❌");
        } else if (err.response?.status === 404) {
          alert("Utente non trovato ❌");
        } else {
          alert("Errore nel collegamento a Telegram ❌");
        }
        navigate("/");
      });

  }, [navigate, user]);

  return null;
};

export default TelegramAuth;
