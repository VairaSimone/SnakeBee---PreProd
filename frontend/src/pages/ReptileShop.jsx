import React, { useEffect, useState } from 'react';

import api from '../services/api';
import { useCart } from '../components/CartContext';

const ReptileShop = () => {
  const [products, setProducts] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const { cart, addToCart, removeFromCart, cartTotal } = useCart();
  const [loading, setLoading] = useState(false);
const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/shop/orders').then(res => setOrders(res.data));
  }, []);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const res = await api.get('/shop/prodotti');
        setProducts(res.data.products);
        setSuggested(res.data.suggested);
      } catch (err) { console.error("Errore fetch dati store"); }
    };
    fetchShopData();
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await api.post('/stripe/create-shop-checkout', {
        cartItems: cart.map(c => ({ productId: c._id, quantity: c.quantity }))
      });
      window.location.href = res.data.url; // Redirige a Stripe
    } catch (err) {
      alert(err.response?.data?.error || "Errore durante il checkout");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:flex gap-6 relative">
      <div className="flex-1">
        {/* Suggerimenti Smart */}
        {suggested.length > 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-8 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-yellow-800">✨ Consigliati per i tuoi Rettili</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggested.map(p => (
                <ProductCard key={p._id} product={p} addToCart={addToCart} isSuggested />
              ))}
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6">Tutti i Prodotti</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
             <ProductCard key={p._id} product={p} addToCart={addToCart} />
          ))}
        </div>
      </div>

      {/* Carrello Spesa UI */}
      <div className="w-full md:w-1/3 mt-8 md:mt-0 bg-white p-6 rounded-xl shadow-lg h-fit sticky top-20">
        <h2 className="text-2xl font-bold mb-4">Carrello</h2>
        {cart.length === 0 ? (
          <p className="text-gray-500">Il tuo carrello è vuoto.</p>
        ) : (
          <>
            <ul className="space-y-4 mb-6">
              {cart.map((item) => (
                <li key={item._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">Q.tà: {item.quantity} x €{item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(item._id)} className="text-red-500 text-sm">Rimuovi</button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Totale:</span>
              <span>€{cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all"
            >
              {loading ? 'Elaborazione...' : 'Procedi al Pagamento'}
            </button>
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h3 className="text-xl font-bold mb-4">I Miei Ordini</h3>
      {orders.length === 0 ? <p>Nessun ordine trovato.</p> : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="border p-4 rounded bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-500">Ordine #{order._id.slice(-6)} del {new Date(order.createdAt).toLocaleDateString()}</p>
                <p className="font-bold text-lg mt-1">Stato: <span className={`text-${order.status === 'Spedito' ? 'green' : 'blue'}-600`}>{order.status}</span></p>
                {order.trackingNumber && <p className="text-sm mt-1 font-mono">Tracking: {order.trackingNumber}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">Totale: €{order.totalAmount.toFixed(2)}</p>
                {order.receiptUrl && (
                  <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    Scarica Ricevuta
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

// Componente Singolo Prodotto
const ProductCard = ({ product, addToCart, isSuggested }) => (
  <div className={`border rounded-lg p-4 bg-white shadow-sm transition-transform hover:-translate-y-1 ${isSuggested ? 'border-yellow-400' : ''}`}>
    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-md mb-4" />
    <h3 className="font-bold text-lg">{product.name}</h3>
    <p className="text-xl font-semibold mt-2">€{product.price}</p>
    
    {/* Contatore Stock */}
    <p className={`text-sm mt-1 font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
      {product.stock > 0 ? `Disponibile: ${product.stock} pezzi` : 'Esaurito'}
    </p>

    <button 
      onClick={() => addToCart(product)}
      disabled={product.stock <= 0}
      className={`mt-4 w-full py-2 rounded-lg font-semibold transition-colors ${
        product.stock > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
      }`}
    >
      {product.stock > 0 ? 'Aggiungi al Carrello' : 'Pre-Ordina (Contattaci)'}
    </button>
  </div>
);

export default ReptileShop;