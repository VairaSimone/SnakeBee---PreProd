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
import CalendarModal from '../components/CalendarModal.jsx';
import { FaMars, FaVenus, FaPlus, FaTag, FaPencilAlt, FaDrumstickBite, FaCalendarAlt, FaTrash, FaChartBar, FaPercentage, FaUtensils, FaEgg, FaSyncAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function hasPaidPlan(user) {
  if (!user?.subscription) return false;
  return user.subscription.plan === 'BREEDER';
}

const isDueOrOverdue = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const feedingDate = new Date(date);
  feedingDate.setHours(0, 0, 0, 0);
  return feedingDate <= today;
};

const Dashboard = () => {
  const user = useSelector(selectUser);
  const { t } = useTranslation();

  const [allReptiles, setAllReptiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortKey, setSortKey] = useState('name');
  const [filterMorph, setFilterMorph] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterBreeder, setFilterBreeder] = useState('');
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedingModal, setShowFeedingModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [selectedReptile, setSelectedReptile] = useState(null);
  const [stats, setStats] = useState({
    successRate: null,
    feedingRefusalRate: null,
    averageShedInterval: null,
    incubationBySpecies: []
  });
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ITEMS_PER_PAGE = 12;
  const carouselRefs = useRef({});

  // === FETCH REPTILES ===
  const fetchReptiles = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/reptile/${user._id}/AllReptileUser`);
      setAllReptiles(data.dati || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t('dashboard.errorReptile'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?._id) return;
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
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchReptiles();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && user?._id) fetchReptiles();
    }, 1000 * 60 * 2);
    return () => clearInterval(interval);
  }, [user]);

  // === FILTRI + ORDINAMENTO + PAGINAZIONE ===
  const filteredAndSorted = React.useMemo(() => {
    let result = [...allReptiles];
    if (filterMorph.trim()) result = result.filter(r => r.morph?.toLowerCase().includes(filterMorph.toLowerCase()));
    if (filterSpecies.trim()) result = result.filter(r => r.species?.toLowerCase().includes(filterSpecies.toLowerCase()));
    if (filterSex) result = result.filter(r => r.sex === filterSex);
    if (filterBreeder !== '') result = result.filter(r => r.isBreeder === (filterBreeder === 'true'));

    result.sort((a, b) => {
      if (sortKey === 'nextFeedingDate') {
        const dateA = a.nextFeedingDate ? new Date(a.nextFeedingDate) : new Date(0);
        const dateB = b.nextFeedingDate ? new Date(b.nextFeedingDate) : new Date(0);
        return dateA - dateB;
      }
      return a[sortKey]?.localeCompare(b[sortKey] || '', undefined, { numeric: true });
    });

    return result;
  }, [allReptiles, filterMorph, filterSpecies, filterSex, filterBreeder, sortKey]);

  const totalFilteredPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const currentPageItems = filteredAndSorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // === DELETE ===
  const handleDelete = async (id) => {
    try {
      await api.delete(`/reptile/${id}`);
      setAllReptiles(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // === PAGINATION HELPER ===
  const getPageNumbers = (current, total, delta = 2) => {
    const pages = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const scrollCarousel = (e, direction, reptileId) => {
    e.preventDefault();
    e.stopPropagation();
    const node = carouselRefs.current[reptileId];
    if (node) node.scrollBy({ left: 250 * direction, behavior: 'smooth' });
  };

  // === STAT CARD ===
  const StatCard = ({ icon, title, value, unit, bgColor, children }) => (
    <div className={`flex-1 p-4 rounded-xl shadow-md flex items-start gap-4 ${bgColor}`}>
      <div className="text-2xl text-white bg-white/20 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        {children ? <div className="text-white font-bold">{children}</div> :
          <p className="text-2xl text-white font-bold">{value ?? 'N/A'}<span className="text-base ml-1">{unit}</span></p>}
      </div>
    </div>
  );

  const top3Incubations = React.useMemo(() => {
    if (!stats.incubationBySpecies?.length) return [];
    return [...stats.incubationBySpecies].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [stats.incubationBySpecies]);

  // === RENDER ===
  return (
    <div className="bg-clay min-h-screen font-sans text-charcoal p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-screen-xl mx-auto">

        {hasPaidPlan(user) && (
          <button onClick={() => setCalendarOpen(true)} title={t('dashboard.calendar')} className="fixed bottom-6 right-6 z-30 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110">
            <FaCalendarAlt size={24} />
          </button>
        )}

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-olive">{t('dashboard.title')}</h1>
            <p className="text-charcoal/70 mt-1">{t('dashboard.manageReptiles', { count: allReptiles.length })}</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg font-semibold hover:bg-olive transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            <FaPlus /> {t('dashboard.addReptile')}
          </button>
        </header>

        {/* STATISTICS */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center gap-2"><FaChartBar /> {t('dashboard.quickStats')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FaPercentage />} title={t('dashboard.stats.successRate')} value={stats.successRate} unit="%" bgColor="bg-forest" />
            <StatCard icon={<FaUtensils />} title={t('dashboard.stats.feedingRefusal')} value={stats.feedingRefusalRate} bgColor="bg-amber" />
            <StatCard icon={<FaSyncAlt />} title={t('dashboard.stats.avgShedInterval')} value={typeof stats.averageShedInterval === 'number' ? stats.averageShedInterval.toFixed(1) : '0'} unit={t('dashboard.units.days')} bgColor="bg-blue-500" />
            <StatCard icon={<FaEgg />} title={t('dashboard.stats.incubationBySpecies')} bgColor="bg-purple-500">
              <div className="text-sm space-y-1 mt-1">
                {top3Incubations.length ? top3Incubations.map(s => (
                  <div key={s.species}><span className="font-semibold">{s.species}:</span> {!isNaN(Number(s.averageIncubationDays)) ? Number(s.averageIncubationDays).toFixed(0) : 'N/A'} {t('units.days')}</div>
                )) : <p className="text-base">{t('dashboard.common.noData')}</p>}
              </div>
            </StatCard>
          </div>
        </section>

        {/* FILTERS */}
        <div className="sm:hidden mb-4">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="w-full bg-forest text-white py-2 px-4 rounded-md font-semibold flex justify-between items-center">
            {t('dashboard.filters.toggleFilters')} <span>{filtersOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        <div className={`bg-sand p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 shadow-sm ${!filtersOpen && 'hidden sm:grid'}`}>
          {/* SORT */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">{t('dashboard.filters.sortBy')}</label>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2">
              <option value="name">{t('dashboard.filters.name')}</option>
              <option value="species">{t('dashboard.filters.species')}</option>
              <option value="nextFeedingDate">{t('dashboard.filters.nextMeal')}</option>
            </select>
          </div>

          {/* Morph */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">{t('dashboard.filters.searchMorph')}</label>
            <input type="text" value={filterMorph} onChange={e => setFilterMorph(e.target.value)} placeholder={t('dashboard.filters.morphPlaceholder')} className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2" />
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">{t('dashboard.filters.sex')}</label>
            <select value={filterSex} onChange={e => setFilterSex(e.target.value)} className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2">
              <option value="">{t('dashboard.filters.all')}</option>
              <option value="M">{t('dashboard.filters.male')}</option>
              <option value="F">{t('dashboard.filters.female')}</option>
            </select>
          </div>

          {/* Species */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">{t('dashboard.filters.searchSpecies')}</label>
            <input type="text" value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)} placeholder={t('dashboard.filters.speciesPlaceholder')} className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2" />
          </div>

          {/* Breeder */}
          <div>
            <label className="block text-sm font-bold text-charcoal/80 mb-1">{t('dashboard.filters.breeder')}</label>
            <select value={filterBreeder} onChange={e => setFilterBreeder(e.target.value)} className="w-full h-10 rounded-md border-transparent focus:ring-2 focus:ring-forest bg-white text-charcoal shadow px-2">
              <option value="">{t('dashboard.filters.all')}</option>
              <option value="true">{t('dashboard.filters.isBreeder')}</option>
              <option value="false">{t('dashboard.filters.notBreeder')}</option>
            </select>
          </div>
        </div>

        {/* REPTILES */}
        {loading ? (
          <p>{t('dashboard.loading')}</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : currentPageItems.length === 0 ? (
          <p>{t('dashboard.noReptiles')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPageItems.map(r => (
              <div key={r._id} className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">{r.name}</h3>
                  {r.sex === 'M' ? <FaMars className="text-blue-500" /> : <FaVenus className="text-pink-500" />}
                </div>
                <p className="text-sm text-gray-600">{r.species} - {r.morph}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { setSelectedReptile(r); setShowEditModal(true); }} className="p-2 rounded-md bg-olive text-white"><FaPencilAlt /></button>
                  <button onClick={() => { setPendingDelete(r); setShowDeleteModal(true); }} className="p-2 rounded-md bg-red-500 text-white"><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalFilteredPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button disabled={page === 1} onClick={() => setPage(prev => prev - 1)} className="px-3 py-2 bg-sand rounded-md disabled:text-gray-400">‹</button>
            {getPageNumbers(page, totalFilteredPages).map((p, idx) =>
              p === '...' ? <span key={idx} className="px-3 py-2 text-gray-400">...</span> :
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-2 rounded-md ${p === page ? 'bg-forest text-white' : 'bg-sand text-charcoal'}`}>{p}</button>
            )}
            <button disabled={page === totalFilteredPages} onClick={() => setPage(prev => prev + 1)} className="px-3 py-2 bg-sand rounded-md disabled:text-gray-400">›</button>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showCreateModal && <ReptileCreateModal onClose={() => setShowCreateModal(false)} />}
      {showEditModal && selectedReptile && <ReptileEditModal reptile={selectedReptile} onClose={() => setShowEditModal(false)} />}
      {showDeleteModal && pendingDelete && <ConfirmDeleteModal reptile={pendingDelete} onClose={() => setShowDeleteModal(false)} onConfirm={() => handleDelete(pendingDelete._id)} />}
      {isCalendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
    </div>
  );
};

export default Dashboard;
