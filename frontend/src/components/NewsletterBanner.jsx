import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useSelector } from "react-redux";
import { selectUser, selectLanguage } from "../features/userSlice";
import { useTranslation } from "react-i18next";

const NewsletterBanner = () => {
  const user = useSelector(selectUser);
  const language = useSelector(selectLanguage);
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) return; // se loggato, non mostrare

    const alreadyDismissed = localStorage.getItem("newsletterDismissed");
    if (alreadyDismissed) return;

    // probabilità del 30%
    if (Math.random() < 0.3) {
      setVisible(true);
    }
  }, [user]);

  const handleSubscribe = async () => {
    try {
      const res = await api.post("/v1/newsletter/subscribe", { email, language });
      setMessage(res.data.message);
      localStorage.setItem("newsletterDismissed", "true");
      setVisible(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg p-4 rounded-xl w-80 border border-gray-300 z-50">
      <h3 className="text-lg font-semibold mb-2">{t("newsletter.title", "Unisciti alla newsletter!")}</h3>
      <p className="text-sm mb-3">
        {t("newsletter.desc", "Ricevi aggiornamenti e novità su SnakeBee.")}
      </p>
      <input
        type="email"
        className="w-full p-2 border rounded mb-2"
        placeholder={t("newsletter.placeholder", "La tua email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSubscribe}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
      >
        {t("newsletter.subscribe", "Iscriviti")}
      </button>
      {message && <p className="text-xs mt-2">{message}</p>}
      <button
        onClick={() => {
          localStorage.setItem("newsletterDismissed", "true");
          setVisible(false);
        }}
        className="absolute top-2 right-3 text-gray-500 hover:text-black"
      >
        ✕
      </button>
    </div>
  );
};

export default NewsletterBanner;
