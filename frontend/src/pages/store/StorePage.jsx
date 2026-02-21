import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getKits } from '../../services/storeApi';
import { useCart } from '../../context/CartContext';
import { ShoppingCart, Search, Package, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import CartBadge from '../../components/store/CartBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BACKEND = process.env.REACT_APP_BACKEND_URL_IMAGE || '';

const KitCard = ({ kit, onAddToCart, adding }) => {
  const mainImg = kit.images?.[0]
    ? `${BACKEND}${kit.images[0]}`
    : 'https://placehold.co/400x300/EDE7D6/556B2F?text=Kit';

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      {/* Immagine */}
      <Link to={`/store/kits/${kit._id}`} className="block overflow-hidden h-48 bg-[#EDE7D6]">
        <img
          src={mainImg}
          alt={kit.name}
          onError={(e) => { e.target.src = 'https://placehold.co/400x300/EDE7D6/556B2F?text=Kit'; }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      {/* Corpo */}
      <div className="p-5 flex flex-col flex-1">
        {/* Badge disponibilità */}
        <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${
          kit.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
        }`}>
          {kit.quantity > 0 ? `Disponibili: ${kit.quantity}` : 'Esaurito'}
        </span>

        <Link to={`/store/kits/${kit._id}`} className="no-underline">
          <h3 className="font-bold text-[#2B2B2B] text-lg leading-snug mb-2 group-hover:text-[#228B22] transition-colors">
            {kit.name}
          </h3>
        </Link>
        <p className="text-sm text-[#2B2B2B]/60 line-clamp-2 flex-1">{kit.description}</p>

        {/* Prodotti inclusi */}
        {kit.includedProducts?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {kit.includedProducts.slice(0, 3).map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-[#EDE7D6] text-[#556B2F] px-2 py-0.5 rounded-full">
                <Tag size={9} /> {p.length > 24 ? p.slice(0, 22) + '…' : p}
              </span>
            ))}
            {kit.includedProducts.length > 3 && (
              <span className="text-xs text-[#2B2B2B]/40">+{kit.includedProducts.length - 3} altri</span>
            )}
          </div>
        )}

        {/* Prezzo e CTA */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-2xl font-extrabold text-[#228B22]">€{kit.price.toFixed(2)}</p>
            <p className="text-xs text-[#2B2B2B]/40">IVA {kit.vatRate}% inclusa</p>
          </div>
          <button
            onClick={() => onAddToCart(kit._id)}
            disabled={kit.quantity === 0 || adding === kit._id}
            className="flex items-center gap-2 bg-[#228B22] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#556B2F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            {adding === kit._id ? '…' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const StorePage = () => {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adding, setAdding] = useState(null);

  const { addToCart } = useCart();

  // Debounce ricerca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchKits = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (debouncedSearch) params.q = debouncedSearch;
      const { data } = await getKits(params);
      setKits(data.kits || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Errore nel caricamento dei kit');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchKits();
  }, [fetchKits]);

  // Reset pagina quando cambia la ricerca
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleAddToCart = async (kitId) => {
    try {
      setAdding(kitId);
      await addToCart(kitId, 1);
      toast.success('Aggiunto al carrello! 🛒');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Errore nell\'aggiunta al carrello');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="bg-[#FAF3E0] min-h-screen">
      {/* Hero */}
      <CartBadge />
      <div className="bg-gradient-to-br from-[#228B22] to-[#556B2F] text-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-4">
            <Package size={48} className="opacity-80" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Kit per Rettili</h1>
          <p className="text-lg text-white/80">
            Kit completi selezionati per te — tutto ciò che serve per il tuo terrario, in un unico acquisto.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Barra ricerca + contatore */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2B2B2B]/40" />
            <input
              type="text"
              placeholder="Cerca kit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE7D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#228B22] text-[#2B2B2B]"
            />
          </div>
          <p className="text-sm text-[#2B2B2B]/50 shrink-0">
            {loading ? '…' : `${total} kit disponibili`}
          </p>
        </div>

        {/* Griglia */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin h-12 w-12 border-4 border-[#228B22] border-t-transparent rounded-full" />
          </div>
        ) : kits.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm">
            <AlertCircle size={48} className="text-[#228B22]/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#2B2B2B]/60">Nessun kit trovato</h3>
            {search && (
              <button onClick={() => setSearch('')} className="mt-4 text-sm text-[#228B22] underline">
                Rimuovi filtro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {kits.map((kit) => (
              <KitCard key={kit._id} kit={kit} onAddToCart={handleAddToCart} adding={adding} />
            ))}
          </div>
        )}

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg bg-white border border-[#EDE7D6] text-[#2B2B2B]/70 hover:bg-[#EDE7D6] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  p === page
                    ? 'bg-[#228B22] text-white shadow'
                    : 'bg-white border border-[#EDE7D6] text-[#2B2B2B]/70 hover:bg-[#EDE7D6]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg bg-white border border-[#EDE7D6] text-[#2B2B2B]/70 hover:bg-[#EDE7D6] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;