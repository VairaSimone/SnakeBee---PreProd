import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice.jsx';
import { Link } from 'react-router-dom';
import ReptileCreateModal from '../components/ReptileCreateModal.jsx';
import ReptileEditModal from '../components/ReptileEditModal.jsx';
import FeedingModal from '../components/FeedingModal.jsx';
import EventModal from '../components/EventModal.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
// MODIFICA: Importate nuove icone per lo stato
import { FaMars, FaVenus, FaPlus, FaTag, FaPencilAlt, FaDrumstickBite, FaCalendarAlt, FaTrash, FaChartBar, FaPercentage, FaUtensils, FaEgg, FaSyncAlt, FaArchive, FaArrowRight, FaCross } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import CalendarModal from '../components/CalendarModal.jsx'

function hasPaidPlan(user) {
  if (!user?.subscription) return false;
  const { plan, status } = user.subscription;
  return (plan === 'BREEDER');
}

const isDueOrOverdue = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // reset ore
  const feedingDate = new Date(date);
  feedingDate.setHours(0, 0, 0, 0);
  return feedingDate <= today;
};
const Dashboard = () => {
  const user = useSelector(selectUser);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [allReptiles, setAllReptiles] = useState([]);
  // const [sortedReptiles, setSortedReptiles] = useState([]); // Non più usato, il backend ordina
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
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // NUOVO: Stati per la vista archivio
  const [view, setView] = useState('active'); // 'active' o 'archived'
  const [filterStatus, setFilterStatus] = useState(''); // '', 'ceded', 'deceased'


  const { t } = useTranslation();
  const [stats, setStats] = useState({
    successRate: null,
    feedingRefusalRate: null,
    averageShedInterval: null,
    incubationBySpecies: []
  });
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const carouselRefs = useRef({});
  const scrollCarousel = (e, direction, reptileId) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollAmount = 250;
    const node = carouselRefs.current[reptileId];
    if (node) {
      node.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
    }
  };

  const fetchStats = async () => {
    // Non fetchare statistiche se non siamo nella vista attiva
    if (view !== 'active') return; 
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

    } catch (err) {
      console.error("Failed to fetch stats: ", err);
    }

  };

  // MODIFICA: Rinominata da fetchReptiles a fetchData e aggiornata la logica
  const fetchData = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      
      let endpoint = '';
      let params = { page, sortKey };

      if (view === 'active') {
        endpoint = `/reptile/${user._id}/AllReptileUser`;
        params.filterMorph = filterMorph;
        params.filterSpecies = filterSpecies;
        params.filterSex = filterSex;
        params.filterBreeder = filterBreeder;
      } else { // 'archived'
        endpoint = `/reptile/user/archived`; // NUOVO ENDPOINT
        params.filterSpecies = filterSpecies; // Riutilizza il filtro specie
        params.filterStatus = filterStatus;   // Aggiunge il filtro stato
        // Nota: l'endpoint archiviato non usa morph, sex, o breeder
      }

      const { data } = await api.get(endpoint, { params });

      setAllReptiles(data.dati || []);
      setTotalPages(data.totalPages || 1);
      setTotalResults(data.totalResults || 0);

      setError(null);
    } catch (err) {
      setError(t('dashboard.errorReptile'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reptile/${id}`);
      fetchData(); // MODIFICA: chiama la funzione rinominata
      setAllReptiles(prev => prev.filter(r => r._id !== id));
      // setSortedReptiles(prev => prev.filter(r => r._id !== id)); // Rimosso
    } catch (err) {
      console.error(err);
    }
  };

// MODIFICA: Aggiunti 'view' e 'filterStatus' alle dipendenze
useEffect(() => {
    if (page !== 1) {
        setPage(1);
    } else {
        fetchData();
    }
  }, [view, sortKey, filterMorph, filterSpecies, filterSex, filterBreeder, filterStatus]); // Aggiunti view e filterStatus

// MODIFICA: Aggiunto 'view' alle dipendenze
  useEffect(() => {
    if (user?._id) {
      fetchData();
      if (view === 'active') { // Carica le statistiche solo per la vista attiva
        fetchStats();
      }
    }
  }, [user, page, view]); // Aggiunto view


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
  // === Funzione helper per il paginatore ===
  const getPageNumbers = (currentPage, totalPages, delta = 2) => {
    const range = [];
    const rangeWithDots = [];
    let lastPage = 0;

    // range contiene: [1 ... totalPages], con "delta" pagine intorno all'attuale
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    // aggiunge "..." quando ci sono salti
    for (let i of range) {
      if (lastPage) {
        if (i - lastPage === 2) {
          rangeWithDots.push(lastPage + 1);
        } else if (i - lastPage > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      lastPage = i;
    }

    return rangeWithDots;
  };

  const top3Incubations = React.useMemo(() => {
    if (!stats.incubationBySpecies || stats.incubationBySpecies.length === 0) return [];

    return [...stats.incubationBySpecies]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [stats.incubationBySpecies]);

  // NUOVO: Funzione per cambiare vista
  const handleViewChange = (newView) => {
    setView(newView);
    setPage(1); // Resetta la pagina
    // Resetta i filtri specifici e l'ordinamento
    if (newView === 'active') {
      setSortKey('name');
      setFilterStatus('');
    } else {
      setSortKey('statusDate'); // Ordinamento di default per archiviati
      setFilterMorph('');
      setFilterSex('');
      setFilterBreeder('');
    }
  }

  return (
    <div className="bg-clay min-h-screen font-sans text-charcoal p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-screen-xl mx-auto">
        {hasPaidPlan(user) && (
          <button
            onClick={() => setCalendarOpen(true)}
            title={t('dashboard.calendar')}
            className="fixed bottom-6 right-6 z-30 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110"
          >
            <FaCalendarAlt size={24} />
          </button>
        )}


        {/* === HEADER === */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-olive">{t('dashboard.title')}</h1>
            <p className="text-charcoal/70 mt-1">
              {t('dashboard.manageReptiles', { count: totalResults })}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg font-semibold hover:bg-olive transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FaPlus />
            {t('dashboard.addReptile')}
          </button>
        </header>

        {/* === STATISTICS SECTION (Solo per vista 'active') === */}
        {view === 'active' && (
          <section className="mb-8">
              <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center gap-2">
                <FaChartBar />{t('dashboard.quickStats')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<FaPercentage />} title={t('dashboard.stats.successRate')} value={stats.successRate} unit="%" bgColor="bg-forest" />
                <StatCard icon={<FaUtensils />} title={t('dashboard.stats.feedingRefusal')} value={stats.feedingRefusalRate} bgColor="bg-amber" />
                <StatCard icon={<FaSyncAlt />} title={t('dashboard.stats.avgShedInterval')} value={typeof stats.averageShedInterval === 'number' ? stats.averageShedInterval.toFixed(1) : '0'} unit={t('dashboard.units.days')} bgColor="bg-blue-500" />
                <StatCard icon={<FaEgg />} title={t('dashboard.stats.incubationBySpecies')} bgColor="bg-purple-500">
                  <div className="text-sm space-y-1 mt-1">
                    {top3Incubations.length > 0 ? top3Incubations.map(s => (
                      <div key={s.species}>
                        <span className="font-semibold">{s.species}:</span>
                        {!isNaN(Number(s.averageIncubationDays)) ? Number(s.averageIncubationDays).toFixed(0) : 'N/A'} {t('units.days')}
                      </div>
                    )) : <p className="text-base">{t('dashboard.common.noData')}</p>}
                  </div>
                </StatCard>
              </div>
          </section>
        )}

      {/* === NUOVO: TABS PER VISTA === */}
      <div className="flex border-b border-sand mb-6">
          <button 
              onClick={() => handleViewChange('active')}
              className={`py-3 px-6 font-semibold text-base sm:text-lg transition-colors duration-200 flex items-center gap-2 ${view === 'active' ? 'border-b-2 border-forest text-forest' : 'text-charcoal/60 hover:text-charcoal'}`}
          >
              <FaSyncAlt size={14} /> {t('dashboard.view.active', 'Attivi')}
          </button>
          <button 
              onClick={() => handleViewChange('archived')}
              className={`py-3 px-6 font-semibold text-base sm:text-lg transition-colors duration-200 flex items-center gap-2 ${view === 'archived' ? 'border-b-2 border-forest text-forest' : 'text-charcoal/60 hover:text-charcoal'}`}
          >
              <FaArchive size={14} /> {t('dashboard.view.archived', 'Archiviati')}
          </button>
      </div>

        {/* === CONTROLS AND FILTERS === */}
        <div className="sm:hidden mb-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full bg-forest text-white py-2 px-4 rounded-md font-semibold flex justify-between items-center"
          >
            {t('dashboard.filters.toggleFilters')}
            <span>{filtersOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        <div
          // MODIFICA: Griglia filtri dinamica
          className={`bg-sand p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${view === 'active' ? 'xl:grid-cols-5' : 'xl:grid-cols-3'} gap-4 mb-8 shadow-sm
    ${!filtersOpen && 'hidden sm:grid'}`}
        >
          {/* Sort */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">
              {t('dashboard.filters.sortBy')}
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
            >
                {/* MODIFICA: Opzioni di ordinamento condizionali */}
                {view === 'active' ? (
                  <>
                    <option value="name">{t('dashboard.filters.name')}</option>
                    <option value="species">{t('dashboard.filters.species')}</option>
                    <option value="nextFeedingDate">{t('dashboard.filters.nextMeal')}</option>
                  </>
                ) : (
                  <>
                    <option value="statusDate">{t('dashboard.filters.statusDate', 'Data Archiviazione')}</option>
                    <option value="species">{t('dashboard.filters.species')}</option>
                    <option value="name">{t('dashboard.filters.name')}</option>
                  </>
                )}
            </select>
          </div>

        {/* Species (sempre visibile) */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">
              {t('dashboard.filters.searchSpecies')}
            </label>
            <input
              type="text"
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              placeholder={t('dashboard.filters.speciesPlaceholder')}
              className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
            />
          </div>

        {/* MODIFICA: Filtri solo per 'active' */}
        {view === 'active' && (
          <>
              {/* Morph */}
                <div>
                  <label className="block text-sm font-bold text-charcoal/80 mb-1">
                    {t('dashboard.filters.searchMorph')}
                  </label>
                  <input
                    type="text"
                    value={filterMorph}
                    onChange={(e) => setFilterMorph(e.target.value)}
                    placeholder={t('dashboard.filters.morphPlaceholder')}
                    className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-sm font-bold text-charcoal/80 mb-1">
                    {t('dashboard.filters.sex')}
                  </label>
                  <select
                    value={filterSex}
                    onChange={(e) => setFilterSex(e.target.value)}
                    className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
                  >
                    <option value="">{t('dashboard.filters.all')}</option>
                    <option value="M">{t('dashboard.filters.male')}</option>
                    <option value="F">{t('dashboard.filters.female')}</option>
                  </select>
                </div>

                {/* Breeder */}
                <div>
                  <label className="block text-sm font-bold text-charcoal/80 mb-1">
                    {t('dashboard.filters.breeder')}
                  </label>
                  <select
                    value={filterBreeder}
                    onChange={(e) => setFilterBreeder(e.target.value)}
                    className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
                  >
                    <option value="">{t('dashboard.filters.all')}</option>
                    <option value="true">{t('dashboard.common.yes')}</option>
                    <option value="false">{t('dashboard.common.no')}</option>
                  </select>
                </div>
          </>
        )}

        {/* NUOVO: Filtro solo per 'archived' */}
        {view === 'archived' && (
            <div>
                <label className="block text-sm font-bold text-charcoal/80 mb-1">
                    {t('dashboard.filters.status', 'Stato')}
                </label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2"
                >
                    <option value="">{t('dashboard.filters.all')}</option>
                    <option value="ceded">{t('dashboard.filters.ceded', 'Ceduti')}</option>
                    <option value="deceased">{t('dashboard.filters.deceased', 'Deceduti')}</option>
                </select>
            </div>
        )}

        </div>
        {/* === REPTILES GRID === */}
        <main>
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-12 w-12 border-4 border-forest border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-charcoal/80 text-lg">{t('dashboard.common.loadingReptiles')}</p>
            </div>
          ) : allReptiles.length === 0 ? (
            <div className="text-center py-20 bg-sand rounded-xl">
              <h3 className="text-2xl font-bold text-olive">{t('dashboard.common.noReptilesFound')}</h3>
              <p className="mt-2 text-charcoal/70">
                {/* MODIFICA: Testo condizionale per "nessun risultato" */}
                {totalResults > 0 ? t('dashboard.common.noReptilesFiltered') : (view === 'active' ? t('dashboard.common.noReptilesRegistered') : t('dashboard.common.noReptilesArchived', 'Nessun rettile in archivio.'))}
              </p>
              {/* Mostra il pulsante "Aggiungi" solo se non ci sono rettili *attivi* */}
              {view === 'active' && totalResults === 0 && (
                  <button onClick={() => setShowCreateModal(true)} className="mt-6 flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg font-semibold  no-underline hover:no-underline hover:bg-olive transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <FaPlus /> {t('dashboard.common.addFirstReptile')}
                  </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allReptiles.map(reptile => {
                // NUOVO: Wrapper condizionale (Link per attivi, div per archiviati)
                const CardWrapper = view === 'active' ? Link : 'div';
                const wrapperProps = view === 'active' ? { to: `/reptiles/${reptile._id}` } : {};
                
                return (
                  <CardWrapper {...wrapperProps} key={reptile._id} className="bg-white rounded-2xl shadow-lg overflow-hidden group transition-all duration-300  no-underline hover:no-underline hover:shadow-2xl hover:-translate-y-1.5 flex flex-col min-h-[460px] max-h-[460px]">
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
                            <img key={idx} src={`${process.env.REACT_APP_BACKEND_URL_IMAGE || ''}${img}`} alt={`${reptile.name}-${idx}`} className="object-cover w-full h-full flex-shrink-0 snap-center transition-transform duration-500  no-underline hover:no-underline group-hover:scale-105" />
                          ))}
                        </div>
                        <button onClick={(e) => scrollCarousel(e, -1, reptile._id)} className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-10 bg-black/20 text-white flex items-center justify-center z-10 opacity-0  no-underline hover:no-underline group-hover:opacity-100 transition-opacity">‹</button>
                        <button onClick={(e) => scrollCarousel(e, 1, reptile._id)} className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-10 bg-black/20 text-white flex items-center justify-center z-10 opacity-0  no-underline hover:no-underline group-hover:opacity-100 transition-opacity">›</button>
                      </div>
                    ) : (
                      <img src={reptile.image?.[0] ? `${process.env.REACT_APP_BACKEND_URL_IMAGE || ''}${reptile.image[0]}` : 'https://res.cloudinary.com/dg2wcqflh/image/upload/v1757791253/Logo_duqbig.png'} alt={reptile.name} className="object-cover w-full h-full transition-transform duration-500  no-underline hover:no-underline group-hover:scale-105" />
                    )}
                  </div>

                  <div className="p-4 h-[300px] flex flex-col justify-between">
                    <div> {/* NUOVO: wrapper per contenuto superiore */}
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-charcoal  no-underline hover:no-underline group-hover:text-forest transition-colors duration-300 truncate">{reptile.name}</h3>
                        <span title={reptile.sex === 'M' ? 'Maschio' : 'Femmina'}>
                          {reptile.sex === 'M' && <FaMars className="text-blue-500 text-xl" />}
                          {reptile.sex === 'F' && <FaVenus className="text-pink-500 text-xl" />}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal/60   no-underline hover:no-underline italic truncate">{reptile.species}</p>
                      <p className="text-sm text-charcoal/80 mt-1  no-underline hover:no-underline font-medium truncate">Morph: {reptile.morph || 'N/A'}</p>
                    </div>

                    {/* MODIFICA: Contenuto inferiore condizionale */}
                    {view === 'active' ? (
                      <>
                        <p className="text-sm text-charcoal/80  no-underline hover:no-underline">
                            {t('feedingCard.nextFeeding')} <span className={`font-semibold  no-underline hover:no-underline ${isDueOrOverdue(reptile.nextFeedingDate)
                                ? 'text-red-600'
                                : 'text-charcoal'
                              }`}>{reptile.nextFeedingDate ? new Date(reptile.nextFeedingDate).toLocaleDateString() : 'N/A'}</span>
                          </p>
      
                          <div className="mt-4 pt-4 border-t border-sand grid grid-cols-4 gap-2 text-center">
                            {[
                              { icon: <FaPencilAlt />, label: t("dashboard.buttons.edit"), color: "blue", action: () => { setSelectedReptile(reptile); setShowEditModal(true); } },
                              { icon: <FaDrumstickBite />, label: t("dashboard.buttons.feeding"), color: "amber", action: () => { setSelectedReptile(reptile); setShowFeedingModal(true); } },
                              { icon: <FaCalendarAlt />, label: t("dashboard.buttons.events"), color: "purple", action: () => { setSelectedReptile(reptile); setShowEventModal(true); } },
                              { icon: <FaTrash />, label: t("dashboard.buttons.delete"), color: "brick", action: () => { setPendingDelete(reptile); setShowDeleteModal(true); } }].map(btn => (
                                <button key={btn.label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); btn.action(); }} title={btn.label} className={`text-${btn.color} p-2 rounded-lg hover:bg-${btn.color}/10 transition-colors duration-200`}>
                                  {btn.icon}
                                </button>
                              ))}
                          </div>
                      </>
                    ) : (
                      // NUOVO: Card per vista 'archived'
                      <div className="mt-4 pt-4 border-t border-sand space-y-2">
                        {reptile.status === 'ceded' && (
                            <div>
                                <p className="font-semibold text-amber-600 flex items-center gap-2"><FaArrowRight /> {t('dashboard.archived.ceded', 'Ceduto')}</p>
                                <p className="text-sm text-charcoal/80 truncate">
                                    {t('dashboard.archived.to', 'A')}: {reptile.cededTo?.name} {reptile.cededTo?.surname || ''}
                                </p>
                                <p className="text-sm text-charcoal/60">
                                    {t('dashboard.archived.on', 'Il')}: {reptile.cededTo?.date ? new Date(reptile.cededTo.date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        )}
                        {reptile.status === 'deceased' && (
                            <div>
                                <p className="font-semibold text-brick flex items-center gap-2"><FaCross /> {t('dashboard.archived.deceased', 'Deceduto')}</p>
                                <p className="text-sm text-charcoal/60">
                                    {t('dashboard.archived.on', 'Il')}: {reptile.deceasedDetails?.date ? new Date(reptile.deceasedDetails.date).toLocaleDateString() : 'N/A'}
                                </p>
                                <p className="text-sm text-charcoal/80 truncate" title={reptile.deceasedDetails?.notes}>
                                    {t('dashboard.archived.notes', 'Note')}: {reptile.deceasedDetails?.notes || 'N/A'}
                                </p>
                            </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardWrapper>
                )
              })}
            </div>
          )}
        </main>

        {/* === PAGINATION === */}
        {totalPages > 1 && (
          <footer className="flex justify-center mt-8 gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-2 rounded-md font-semibold transition-colors ${page === 1 ? 'bg-sand text-gray-400 cursor-not-allowed' : 'bg-sand text-charcoal/80 hover:bg-olive/20'}`}
            >
              ‹
            </button>

            {getPageNumbers(page, totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={idx} className="px-3 py-2 text-charcoal/50">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-md font-semibold transition-colors ${p === page ? 'bg-forest text-white shadow' : 'bg-sand text-charcoal/80 hover:bg-olive/20'}`}
                >
                  {p}
                </button>
              )
            )}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`px-3 py-2 rounded-md font-semibold transition-colors ${page === totalPages ? 'bg-sand text-gray-400 cursor-not-allowed' : 'bg-sand text-charcoal/80 hover:bg-olive/20'}`}
            >
              ›
            </button>
          </footer>
        )}
      </div>
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

      {/* MODIFICA: Passato fetchData a tutti i modal come onSuccess */}
      <ReptileCreateModal show={showCreateModal} handleClose={() => setShowCreateModal(false)} onSuccess={fetchData} setReptiles={setAllReptiles} />
      <ReptileEditModal show={showEditModal} handleClose={() => setShowEditModal(false)} reptile={selectedReptile} onSuccess={fetchData} setReptiles={setAllReptiles} />
      <FeedingModal show={showFeedingModal} handleClose={() => setShowFeedingModal(false)} reptileId={selectedReptile?._id} onSuccess={fetchData} setReptiles={setAllReptiles} />
      <EventModal show={showEventModal} handleClose={() => setShowEventModal(false)} reptileId={selectedReptile?._id} setReptiles={setAllReptiles} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setPendingDelete(null); }} onConfirm={() => { if (pendingDelete?._id) { handleDelete(pendingDelete._id); } setShowDeleteModal(false); setPendingDelete(null); }} reptile={pendingDelete} />
    </div>
  );
};

export default Dashboard;