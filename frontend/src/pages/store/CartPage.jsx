import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/userSlice';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { toast } from 'react-toastify';

const BACKEND = process.env.REACT_APP_BACKEND_URL_IMAGE || '';
const FREE_SHIPPING_THRESHOLD = 60;
const SHIPPING_COST = 5.99;

const CartPage = () => {
  const { cart, cartLoading, updateItem, removeItem, emptyCart, fetchCart } = useCart();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuantityChange = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return handleRemove(item._id);
    try {
      setUpdatingId(item._id);
      await updateItem(item._id, newQty);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Errore aggiornamento quantità');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      setUpdatingId(itemId);
      await removeItem(itemId);
      toast.info('Prodotto rimosso dal carrello');
    } catch {
      toast.error('Errore nella rimozione');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Svuotare il carrello?')) return;
    await emptyCart();
    toast.info('Carrello svuotato');
  };

  const subtotal = cart.subtotal || 0;
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shippingCost;

  if (cartLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FAF3E0]">
        <div className="animate-spin h-12 w-12 border-4 border-[#228B22] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3E0] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#2B2B2B] mb-2 flex items-center gap-3">
          <ShoppingCart size={32} className="text-[#228B22]" /> Il tuo carrello
        </h1>
        <Link to="/store" className="text-sm text-[#2B2B2B]/50 hover:text-[#228B22] transition mb-8 inline-block">
          ← Continua lo shopping
        </Link>

        {cart.items?.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm mt-8">
            <Package size={56} className="text-[#228B22]/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#2B2B2B]/50">Il carrello è vuoto</h3>
            <Link
              to="/store"
              className="mt-6 inline-flex items-center gap-2 bg-[#228B22] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#556B2F] transition"
            >
              Scopri i kit <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Lista items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const imgSrc = item.kit?.images?.[0]
                  ? `${BACKEND}${item.kit.images[0]}`
                  : 'https://placehold.co/120x90/EDE7D6/556B2F?text=Kit';
                const isUpdating = updatingId === item._id;

                return (
                  <div
                    key={item._id}
                    className={`bg-white rounded-2xl shadow-sm p-4 flex gap-4 items-center transition-opacity ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    <Link to={`/store/kits/${item.kit?._id}`} className="flex-shrink-0">
                      <img
                        src={imgSrc}
                        alt={item.kit?.name}
                        onError={(e) => { e.target.src = 'https://placehold.co/120x90/EDE7D6/556B2F?text=Kit'; }}
                        className="w-24 h-20 object-cover rounded-xl"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/store/kits/${item.kit?._id}`} className="no-underline">
                        <h4 className="font-bold text-[#2B2B2B] truncate hover:text-[#228B22] transition">
                          {item.kit?.name || 'Kit'}
                        </h4>
                      </Link>
                      <p className="text-sm text-[#2B2B2B]/50 mt-0.5">
                        €{item.priceSnapshot.toFixed(2)} / pz
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        {/* Stepper quantità */}
                        <div className="flex items-center rounded-lg border border-[#EDE7D6] overflow-hidden bg-[#FAF3E0]">
                          <button
                            onClick={() => handleQuantityChange(item, -1)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 hover:bg-[#EDE7D6] transition text-[#2B2B2B]"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-3 py-1.5 font-semibold text-[#2B2B2B] text-sm min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, 1)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 hover:bg-[#EDE7D6] transition text-[#2B2B2B]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemove(item._id)}
                          disabled={isUpdating}
                          className="text-red-400 hover:text-red-600 transition p-1"
                          title="Rimuovi"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-[#228B22] text-lg">
                        €{item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleClear}
                className="text-sm text-red-400 hover:text-red-600 transition mt-2"
              >
                Svuota carrello
              </button>
            </div>

            {/* Riepilogo */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-xl text-[#2B2B2B] mb-5">Riepilogo ordine</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[#2B2B2B]/70">
                    <span>Subtotale</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#2B2B2B]/70">
                    <span>Spedizione</span>
                    <span className={shippingCost === 0 ? 'text-[#228B22] font-semibold' : ''}>
                      {shippingCost === 0 ? 'Gratuita 🎉' : `€${shippingCost.toFixed(2)}`}
                    </span>
                  </div>

                  {shippingCost > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-black">
                      Aggiungi <strong>€{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)}</strong> per la spedizione gratuita!
                    </div>
                  )}

                  <div className="border-t border-[#EDE7D6] pt-3 flex justify-between font-extrabold text-[#2B2B2B] text-lg">
                    <span>Totale</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[#2B2B2B]/40"></p>
                </div>

                {user ? (
                  <button
                    onClick={() => navigate('/store/checkout')}
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-[#228B22] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#556B2F] transition"
                  >
                    Procedi al pagamento <ArrowRight size={20} />
                  </button>
                ) : (
                  <div className="mt-6 space-y-3">
                    <Link
                      to={`/login?redirect=/store/checkout`}
                      className="block w-full text-center bg-[#228B22] text-white py-3.5 rounded-xl font-bold hover:bg-[#556B2F] transition"
                    >
                      Accedi e paga
                    </Link>
                    <button
                      onClick={() => navigate('/store/checkout')}
                      className="w-full text-center border-2 border-[#228B22] text-[#228B22] py-3 rounded-xl font-semibold hover:bg-[#228B22]/5 transition text-sm"
                    >
                      Continua come ospite
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;