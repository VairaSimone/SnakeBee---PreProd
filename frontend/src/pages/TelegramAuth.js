import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TelegramAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      axios.post(`${process.env.REACT_APP_BACKEND_URL}/telegram/connect`, { token }, { withCredentials: true })
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
