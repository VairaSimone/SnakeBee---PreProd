import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice.jsx';
import { Link } from 'react-router-dom';

// Componenti Modal (nessuna modifica necessaria qui)
import ReptileCreateModal from '../components/ReptileCreateModal.jsx';
import ReptileEditModal from '../components/ReptileEditModal.jsx';
import FeedingModal from '../components/FeedingModal.jsx';
import EventModal from '../components/EventModal.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';

// Icone per una UI più intuitiva
import { FaMars, FaVenus, FaPlus, FaTag, FaPencilAlt, FaDrumstickBite, FaCalendarAlt, FaTrash, FaChartBar, FaPercentage, FaUtensils, FaEgg, FaSyncAlt } from 'react-icons/fa';

const Dashboard = () => {
  // La logica e gli state rimangono invariati
  const user = useSelector(selectUser);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [allReptiles, setAllReptiles] = useState([]);
  const [sortedReptiles, setSortedReptiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('name');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [filterMorph, setFilterMorph] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterBreeder, setFilterBreeder] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedReptile, setSelectedReptile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedingModal, setShowFeedingModal] = useState(false);
  const [stats, setStats] = useState({
    successRate: null,
    feedingRefusalRate: null,
    averageShedInterval: null,
    incubationBySpecies: []
  });

  const carouselRefs = useRef({});
  // Tutte le funzioni (fetchReptiles, fetchStats, handleDelete, etc.) rimangono le stesse
  const scrollCarousel = (e, direction, reptileId) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollAmount = 250; // Aumentato per uno scroll più deciso
    const node = carouselRefs.current[reptileId];
    if (node) {
      node.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
    }
  };

  const fetchStats = async () => {
    try {
      const [success, refusal, shed, incubation] = await Promise.all([
        api.get('breeding/analytics/success-rate'),
        api.get('feedings/analytics/refused-feedings'),
        api.get('reptile/analytics/shed-interval'),
        api.get('breeding/analytics/incubation')
      ]);
      setStats({
        successRate: success.data.successRate,
        feedingRefusalRate: refusal.data.refusalRate,
averageShedInterval: Number(shed.data.averageIntervalDays),
        incubationBySpecies: incubation.data
      });
      console.log(stats.incubationBySpecies);

    } catch (err) {
      console.error('Errore nel recupero delle statistiche:', err);
    }
    
  };

  const fetchReptiles = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/reptile/${user._id}/allreptile`, { params: { page } });
      const enriched = await Promise.all(
        data.dati.map(async (r) => {
          const feedings = await api.get(`/feedings/${r._id}`).then(res => res.data.dati || []);
          const nextDate = feedings.length
            ? new Date(Math.max(...feedings.map(x => new Date(x.nextFeedingDate))))
            : null;
          return { ...r, nextFeedingDate: nextDate };
        })
      );
      setAllReptiles(enriched);
      setTotalPages(data.totalPages || 1);
      setError(null);
    } catch (err) {
      setError('Impossibile caricare i rettili');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reptile/${id}`);
      fetchReptiles(); // refetch dopo eliminazione
    } catch (err) {
      console.error('Errore eliminazione rettile', err);
    }
  };

  // Tutti gli useEffect rimangono gli stessi
  useEffect(() => {
    let filtered = [...allReptiles];
    if (filterMorph.trim() !== '') {
      filtered = filtered.filter(r => r.morph?.toLowerCase().includes(filterMorph.toLowerCase()));
    }
    if (filterSex) {
      filtered = filtered.filter(r => r.sex === filterSex);
    }
    if (filterBreeder !== '') {
      filtered = filtered.filter(r => r.isBreeder === (filterBreeder === 'true'));
    }
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'nextFeedingDate') {
        const dateA = a.nextFeedingDate ? new Date(a.nextFeedingDate) : new Date(0);
        const dateB = b.nextFeedingDate ? new Date(b.nextFeedingDate) : new Date(0);
        return dateA - dateB;
      }
      return a[sortKey]?.localeCompare(b[sortKey] || '', undefined, { numeric: true });
    });
    setSortedReptiles(sorted);
  }, [sortKey, allReptiles, filterMorph, filterSex, filterBreeder]);

  useEffect(() => {
    if (user?._id) {
      fetchReptiles();
      fetchStats();
    }
  }, [user, page]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && user?._id) {
        fetchReptiles();
      }
    }, 1000 * 60 * 2); // ogni 2 minuti
    return () => clearInterval(interval);
  }, [user]);

  // Card per le statistiche
  const StatCard = ({ icon, title, value, unit, bgColor, children }) => (
    <div className={`flex-1 p-4 rounded-xl shadow-md flex items-start gap-4 ${bgColor}`}>
      <div className="text-2xl text-white bg-white/20 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        {children ? (
          <div className="text-white font-bold">{children}</div>
        ) : (
          <p className="text-2xl text-white font-bold">
            {value ?? 'N/A'}<span className="text-base ml-1">{unit}</span>
          </p>
        )}
      </div>
    </div>
  );
  const top3Incubations = React.useMemo(() => {
  if (!stats.incubationBySpecies || stats.incubationBySpecies.length === 0) return [];

  return [...stats.incubationBySpecies]
    .sort((a, b) => b.count - a.count) // ordina per count decrescente
    .slice(0, 3); // prendi i primi 3
}, [stats.incubationBySpecies]);

  return (
    <div className="bg-clay min-h-screen font-sans text-charcoal p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">

        {/* === HEADER === */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-olive">La Tua Dashboard</h1>
            <p className="text-charcoal/70 mt-1">
              Gestisci i tuoi {allReptiles.length} rettil{allReptiles.length !== 1 ? 'i' : 'e'}.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg font-semibold hover:bg-olive transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FaPlus />
            Aggiungi Rettile
          </button>
        </header>

        {/* === SEZIONE STATISTICHE - NUOVA! === */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center gap-2"><FaChartBar />Statistiche Veloci</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FaPercentage />} title="Successo Riproduttivo" value={stats.successRate} unit="%" bgColor="bg-forest" />
            <StatCard icon={<FaUtensils />} title="Rifiuto Cibo" value={stats.feedingRefusalRate} bgColor="bg-amber" />
            <StatCard icon={<FaSyncAlt />} title="Intervallo Muta Medio" value={typeof stats.averageShedInterval === 'number' ? stats.averageShedInterval.toFixed(1) : 'N/A'} unit="giorni" bgColor="bg-blue-500" />
<StatCard icon={<FaEgg />} title="Incubazione per Specie" bgColor="bg-purple-500">
  <div className="text-sm space-y-1 mt-1">
    {top3Incubations.length > 0 ? top3Incubations.map(s => (
      <div key={s.species}>
        <span className="font-semibold">{s.species}:</span> 
        {!isNaN(Number(s.averageIncubationDays)) ? Number(s.averageIncubationDays).toFixed(0) : 'N/A'} giorni
      </div>
    )) : <p className="text-base">Nessun dato</p>}
  </div>
</StatCard>
          </div>
        </section>

        {/* === CONTROLLI E FILTRI === */}
        <div className="bg-sand p-4 rounded-xl flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-8 shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-charcoal/80 mb-1">Ordina per</label>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="w-full p-2 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow">
              <option value="name">Nome</option>
              <option value="species">Specie</option>
              <option value="nextFeedingDate">Prossimo Pasto</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-charcoal/80 mb-1">Cerca Morph</label>
            <input type="text" value={filterMorph} onChange={(e) => setFilterMorph(e.target.value)} placeholder="Es: 'Pastel'" className="w-full p-2 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-bold text-charcoal/80 mb-1">Sesso</label>
            <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)} className="w-full p-2 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow">
              <option value="">Tutti</option>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
              <option value="Unknown">Sconosciuto</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-bold text-charcoal/80 mb-1">Riproducibili</label>
            <select value={filterBreeder} onChange={(e) => setFilterBreeder(e.target.value)} className="w-full p-2 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow">
              <option value="">Tutti</option>
              <option value="true">Sì</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* === GRIGLIA RETTILI === */}
        <main>
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-12 w-12 border-4 border-forest border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-charcoal/80 text-lg">Caricamento dei tuoi rettili...</p>
            </div>
          ) : sortedReptiles.length === 0 ? (
            <div className="text-center py-20 bg-sand rounded-xl">
              <h3 className="text-2xl font-bold text-olive">Nessun rettile trovato!</h3>
              <p className="mt-2 text-charcoal/70">
                {allReptiles.length > 0 ? "Nessun rettile corrisponde ai filtri." : "Non hai ancora registrato nessun rettile."}
              </p>
              <button onClick={() => setShowCreateModal(true)} className="mt-6 flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg font-semibold hover:bg-olive transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <FaPlus /> Aggiungi il primo rettile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedReptiles.map(reptile => (
                <Link to={`/reptiles/${reptile._id}`} key={reptile._id} className="bg-white rounded-2xl shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 flex flex-col min-h-[460px] max-h-[460px]">
                  <div className="relative h-[160px] w-full overflow-hidden">
                    {reptile.label?.text && (
                      <div
                        className="absolute top-2 left-2 z-20 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
                        style={{ backgroundColor: reptile.label.color || '#228B22' }}
                        title={reptile.label.text}
                      >
                        <FaTag size={10} /> {reptile.label.text}
                      </div>
                    )}
                    {reptile.image?.length > 1 ? (
                      <div className="relative h-full w-full">
                        <div className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar h-full" ref={(el) => (carouselRefs.current[reptile._id] = el)}>
                          {reptile.image.map((img, idx) => (
                            <img key={idx} src={`${process.env.REACT_APP_BACKEND_URL_IMAGE || ''}${img}`} alt={`${reptile.name}-${idx}`} className="object-cover w-full h-full flex-shrink-0 snap-center transition-transform duration-500 group-hover:scale-105" />
                          ))}
                        </div>
                        <button onClick={(e) => scrollCarousel(e, -1, reptile._id)} className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-10 bg-black/20 text-white flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">‹</button>
                        <button onClick={(e) => scrollCarousel(e, 1, reptile._id)} className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-10 bg-black/20 text-white flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">›</button>
                      </div>
                    ) : (
                      <img src={reptile.image?.[0] ? `${process.env.REACT_APP_BACKEND_URL_IMAGE || ''}${reptile.image[0]}` : 'https://res.cloudinary.com/dg2wcqflh/image/upload/v1753088270/sq1upmjw7xgrvpkghotk.png'} alt={reptile.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>

                  <div className="p-4 h-[300px] flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-charcoal group-hover:text-forest transition-colors duration-300 truncate">{reptile.name}</h3>
                      <span title={reptile.sex === 'M' ? 'Maschio' : 'Femmina'}>
                        {reptile.sex === 'M' && <FaMars className="text-blue-500 text-xl" />}
                        {reptile.sex === 'F' && <FaVenus className="text-pink-500 text-xl" />}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal/60 italic truncate">{reptile.species}</p>
                    <p className="text-sm text-charcoal/80 mt-1 font-medium truncate">Morph: {reptile.morph || 'N/A'}</p>
                    <p className="text-sm text-charcoal/80">
                      Prossimo pasto: <span className="font-semibold">{reptile.nextFeedingDate ? new Date(reptile.nextFeedingDate).toLocaleDateString() : 'N/A'}</span>
                    </p>

                    <div className="mt-4 pt-4 border-t border-sand grid grid-cols-4 gap-2 text-center">
                      {[
                        { icon: <FaPencilAlt />, label: "Modifica", color: "blue", action: () => { setSelectedReptile(reptile); setShowEditModal(true); } },
                        { icon: <FaDrumstickBite />, label: "Pasto", color: "amber", action: () => { setSelectedReptile(reptile); setShowFeedingModal(true); } },
                        { icon: <FaCalendarAlt />, label: "Eventi", color: "purple", action: () => { setSelectedReptile(reptile); setShowEventModal(true); } },
                        { icon: <FaTrash />, label: "Elimina", color: "brick", action: () => { setPendingDelete(reptile); setShowDeleteModal(true); } }
                      ].map(btn => (
                        <button key={btn.label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); btn.action(); }} title={btn.label} className={`text-${btn.color} p-2 rounded-lg hover:bg-${btn.color}/10 transition-colors duration-200`}>
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* === PAGINAZIONE === */}
        {totalPages > 1 && (
          <footer className="flex justify-center mt-8 gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-md font-semibold transition-colors ${i + 1 === page ? 'bg-forest text-white shadow' : 'bg-sand text-charcoal/80 hover:bg-olive/20'}`}
              >
                {i + 1}
              </button>
            ))}
          </footer>
        )}
      </div>

      {/* I MODAL rimangono invariati */}
      <ReptileCreateModal show={showCreateModal} handleClose={() => setShowCreateModal(false)} onSuccess={fetchReptiles} setReptiles={setAllReptiles} />
      <ReptileEditModal show={showEditModal} handleClose={() => setShowEditModal(false)} reptile={selectedReptile} onSuccess={fetchReptiles} setReptiles={setAllReptiles} />
      <FeedingModal show={showFeedingModal} handleClose={() => setShowFeedingModal(false)} reptileId={selectedReptile?._id} onSuccess={fetchReptiles} setReptiles={setAllReptiles} />
      <EventModal show={showEventModal} handleClose={() => setShowEventModal(false)} reptileId={selectedReptile?._id} setReptiles={setAllReptiles} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setPendingDelete(null); }} onConfirm={() => { if (pendingDelete?._id) { handleDelete(pendingDelete._id); } setShowDeleteModal(false); setPendingDelete(null); }} reptile={pendingDelete} />
    </div>
  );
};

export default Dashboard;