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

      api.post(`/telegram/connect?token=${token}`)
        .then(() => {
          alert("Account Telegram collegato con successo ✅");
          navigate("/dashboard");
        })
        .catch(() => {
          alert("Errore nel collegamento a Telegram ❌");
          navigate("/");
        });
    }
  }, [navigate]);

  return null;
};

export default TelegramAuth;
