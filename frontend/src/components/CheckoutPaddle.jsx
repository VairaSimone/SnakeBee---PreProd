// src/components/PaddleCheckoutButton.jsx
import React, { useEffect } from 'react';

const PaddleCheckoutButton = ({ items, environment, token, children }) => {
  useEffect(() => {
    // 1. Aggiungi lo script
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/paddle.js';
    script.async = true;
    script.onload = () => {
      // 2. Configura l’ambiente e inizializza
      window.Paddle.Environment.set(environment);
      window.Paddle.Initialize({ token });
    };
    document.body.appendChild(script);

    // 3. Cleanup allo unmount
    return () => {
      document.body.removeChild(script);
    };
  }, [environment, token]);

  // Funzione che apre il checkout con la lista items
  const openCheckout = () => {
    window.Paddle.Checkout.open({
      items
    });
  };

  return (
    <button onClick={openCheckout}>
      {children || 'Abbonati ora'}
    </button>
  );
};

export default PaddleCheckoutButton;
