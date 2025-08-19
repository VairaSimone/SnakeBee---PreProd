import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BarChart, LineChart, XAxis, YAxis, Tooltip, Legend, Bar, Line, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PlusIcon, CalendarIcon, PencilIcon, TrashIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/solid';
import api from '../services/api';
import Modal from '../components/BreedingModal.jsx';
import { selectUser } from '../features/userSlice.jsx';
import { useTranslation } from 'react-i18next';

function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    error: 'bg-red-100 text-red-800 border-red-300',
    success: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <div
      className={`fixed top-6 right-6 px-4 py-2 rounded-lg shadow-md border ${colors[type]} transition-opacity`}
    >
      {message}
    </div>
  );
}
const translationMap = (t) => ({
  Mating: t('breedingDashboard.breedingOutcomes.Mating'),
  Ovulation: t('breedingDashboard.breedingOutcomes.Ovulation'),
  'Prelay Shed': t('breedingDashboard.breedingOutcomes.PrelayShed'),
  'Egg Laid': t('breedingDashboard.breedingOutcomes.EggLaid'),
  Birth: t('breedingDashboard.breedingOutcomes.Birth'),
  Hatching: t('breedingDashboard.breedingOutcomes.Hatching'),
  Failed: t('breedingDashboard.breedingOutcomes.Failed'),
  Success: t('breedingDashboard.breedingOutcomes.Success'),
  Partial: t('breedingDashboard.breedingOutcomes.Partial'),
  Unknown: t('breedingDashboard.breedingOutcomes.Unknown'),
});

const translate = (key) => translationMap[key] || key;

function hasPaidPlan(user) {
  if (!user?.subscription) return false;
  const { plan, status } = user.subscription;
  return (plan === 'basic' || plan === 'premium');
}
const formatDate = (date) => new Date(date).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' });

const StatCard = ({ title, children }) => (
  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
    <h3 className="text-lg font-semibold text-charcoal mb-4">{title}</h3>
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

const BreedingCard = ({ breeding, onAddEvent, onUpdateOutcome, onEditEvent, onDeleteEventRequest }) => {
      const { t} = useTranslation();
  
  const outcomeColors = {
    Success: 'bg-green-100 text-green-800',
    Partial: 'bg-amber/20 text-amber',
    Failed: 'bg-red-100 text-red-700',
    Unknown: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      {/* Header card */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-charcoal">
            {breeding.male?.name || 'N/D'} <span className="font-light text-slate-400 mx-1">×</span> {breeding.female?.name || 'N/D'}
          </h3>
          <p className="text-sm text-slate-500">{breeding.species} – <span className="italic">{breeding.morphCombo || ''}</span></p>
        </div>
        <div className={`text-xs font-semibold px-3 py-1 rounded-full ${outcomeColors[breeding.outcome]}`}>
          {translate(breeding.outcome)}
        </div>
      </div>

      {/*  Card */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <h4 className="font-semibold text-slate-700">{t('breedingDashboard.detailsClutch')}</h4>
          <div className="text-sm space-y-2">
            <p><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${breeding.isLiveBirth ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{breeding.isLiveBirth ? t('breedingDashboard.liveBirth') : t('breedingDashboard.oviparous')}</span></p>
            <div className="flex gap-2 pt-2">
              <span className="bg-blue-100 text-blue-800 px-2.5 py-1 text-xs font-bold rounded-full">{t('breedingDashboard.total')} {breeding.clutchSize?.total || 0}</span>
              <span className="bg-green-100 text-green-800 px-2.5 py-1 text-xs font-bold rounded-full">{t('breedingDashboard.fertile')} {breeding.clutchSize?.fertile || 0}</span>
              <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 text-xs font-bold rounded-full">{t('breedingDashboard.hatchedOrBorn')} {breeding.clutchSize?.hatchedOrBorn || 0}</span>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <button onClick={() => onAddEvent(breeding._id)} className="btn btn-sm btn-primary-outline">
              <PlusIcon className="w-4 h-4 mr-1.5" /> {t('breedingDashboard.buttons.addEvent')}
            </button>
            <button onClick={() => onUpdateOutcome(breeding._id)} className="btn btn-sm btn-secondary-outline">
              {t('breedingDashboard.buttons.updateOutcome')}
            </button>
          </div>
        </div>

        {/* Event */}
        <div className="md:col-span-2">
          <h4 className="font-semibold text-slate-700 mb-2">{t('breedingDashboard.eventsRegistered')}</h4>
          {breeding.events?.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {breeding.events.map(event => (
                <li key={event._id} className="flex justify-between items-center p-2 rounded-lg">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-700">{translate(event.type)}</span>
                      {event.notes && <p className="text-xs text-slate-400 italic">"{event.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onEditEvent(breeding._id, event)} className="text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteEventRequest(breeding._id, event._id)} className="text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4 px-2 rounded-lg">
              <p className="text-sm text-slate-500">{t('breedingDashboard.noEvents')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default function BreedingPage() {
  const [reptiles, setReptiles] = useState([]);
  const [breedings, setBreedings] = useState([]);
  const user = useSelector(selectUser);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [selectedBreedingId, setSelectedBreedingId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [eventData, setEventData] = useState({ type: '', date: '', notes: '' });
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
    const { t} = useTranslation();
  const [formData, setFormData] = useState({ male: '', female: '', species: '', morphCombo: '', isLiveBirth: false });
  const [outcomeData, setOutcomeData] = useState({ outcome: '', clutchSize: { total: '', fertile: '', hatchedOrBorn: '' } });
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
  };
  const closeToast = () => setToast({ ...toast, show: false });

  const handleAddEvent = (breedingId) => {
    setSelectedBreedingId(breedingId);
    setEditingEventId(null);
    setEventData({ type: '', date: '', notes: '' });
    setShowEventModal(true);
  };

  const requestDeleteEvent = (bid, eid) => {
    setEventToDelete({ bid, eid });
    setShowConfirmModal(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const { bid, eid } = eventToDelete;
    try {
      await api.delete(`/breeding/${bid}/event/${eid}`);
      setBreedings(prev =>
        prev.map(b => b._id === bid
          ? { ...b, events: b.events.filter(ev => ev._id !== eid) }
          : b
        )
      );
    } catch (error) {
      showToast(t('breedingDashboard.errors.deleteEvent'), 'error');
    } finally {
      setShowConfirmModal(false);
      setEventToDelete(null);
    }
  };

  const handleUpdateOutcome = (breedingId) => {
    const breeding = breedings.find(b => b._id === breedingId);
    setOutcomeData({
      outcome: breeding?.outcome || t('breedingDashboard.outcomes.Unknown'),
      clutchSize: {
        total: breeding?.clutchSize?.total || '',
        fertile: breeding?.clutchSize?.fertile || '',
        hatchedOrBorn: breeding?.clutchSize?.hatchedOrBorn || ''
      }
    });
    setSelectedBreedingId(breedingId);
    setShowOutcomeModal(true);
  };

  const submitOutcome = async () => {
    try {
      const payload = {
        outcome: outcomeData.outcome,
        clutchSize: {
          total: outcomeData.clutchSize.total ? Number(outcomeData.clutchSize.total) : undefined,
          fertile: outcomeData.clutchSize.fertile ? Number(outcomeData.clutchSize.fertile) : undefined,
          hatchedOrBorn: outcomeData.clutchSize.hatchedOrBorn ? Number(outcomeData.clutchSize.hatchedOrBorn) : undefined
        }
      };
      await api.patch(`/breeding/${selectedBreedingId}/outcome`, payload);
      setBreedings(prev =>
        prev.map(b =>
          b._id === selectedBreedingId
            ? { ...b, outcome: payload.outcome || b.outcome, clutchSize: { ...b.clutchSize, ...payload.clutchSize } }
            : b
        )
      );
      setShowOutcomeModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || t('breedingDashboard.errors.updateOutcome'), 'error');
    }
  };

  const submitEvent = async () => {
    if (!eventData.type || !eventData.date) {
      showToast(t('breedingDashboard.errors.missingEventFields'), 'warning');
      return;
    }
    try {
      const res = await api.post(`/breeding/${selectedBreedingId}/event`, eventData);
      const updatedBreeding = res.data;
      setBreedings(prev => prev.map(b => b._id === selectedBreedingId ? updatedBreeding : b));
      setShowEventModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || t('breedingDashboard.errors.createPair'), 'error');
    }
  };

  const openEditEventModal = (bid, ev) => {
    setSelectedBreedingId(bid);
    setEventData({ type: ev.type, date: ev.date.split('T')[0], notes: ev.notes });
    setEditingEventId(ev._id);
    setShowEventModal(true);
  };

  const submitEditEvent = async () => {
    try {
      const res = await api.patch(`/breeding/${selectedBreedingId}/event/${editingEventId}`, eventData);
      const updatedBreeding = res.data;
      setBreedings(prev => prev.map(b => b._id === selectedBreedingId ? updatedBreeding : b));
      setShowEventModal(false);
      setEditingEventId(null);
    } catch (err) {
      showToast(err.response?.data?.error || t('breedingDashboard.errors.updateEvent'), 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.male || !formData.female || !formData.species) {
        showToast(t('breedingDashboard.errors.mandatoryFields'), 'warning');
        return;
      }
      const payload = { ...formData, year: yearFilter };
      const res = await api.post('/breeding', payload);
      setBreedings(prev => [...prev, res.data]);
      setShowModal(false);
      setFormData({ male: '', female: '', species: '', morphCombo: '', isLiveBirth: false });
    } catch (err) {
      showToast(err.response?.data?.error || t('breedingDashboard.errors.missingEventFields'), 'error');
    }
  };

  useEffect(() => {
    api.get(`/reptile/${user._id}/allreptile`)
      .then(res => {
        if (!Array.isArray(res.data.dati)) return;
        const breeders = res.data.dati.filter(r => r.isBreeder);
        setReptiles(breeders);
      })
      .catch(err => console.error('Error', err));
  }, [user._id]);

  useEffect(() => {
    if (!user._id) return;
    api.get(`/breeding?year=${yearFilter}`)
      .then(res => {
        if (!Array.isArray(res.data)) return;
        const sortedBreedings = res.data.map(b => ({
          ...b,
          events: b.events.sort((a, b) => new Date(b.date) - new Date(a.date))
        }));
        setBreedings(sortedBreedings);
      })
      .catch(err => console.error('Error:', err));
  }, [yearFilter, user._id]);

  const monthlyEventsData = useMemo(() => {
    const months = Array(12).fill(0).map((_, i) => ({
      name: new Date(0, i).toLocaleString('it-IT', { month: 'short' }),
      Deposizioni: 0,
      Schiuse: 0,
    }));
    breedings.forEach(b => {
      b.events?.forEach(e => {
        const month = new Date(e.date).getMonth();
        if (e.type === 'Egg Laid' || e.type === 'Birth') {
          months[month].Deposizioni++;
        } else if (e.type === 'Hatching') {
          months[month].Schiuse++;
        }
      });
    });
    return months;
  }, [breedings]);

  const yearlySuccessData = useMemo(() => {
    const map = {};
    breedings.forEach(b => {
      const y = b.year;
      map[y] = map[y] || { year: y, total: 0, success: 0 };
      map[y].total++;
      if (b.outcome === 'Success') map[y].success++;
    });
    return Object.values(map)
      .sort((a, b) => a.year - b.year)
      .map(o => ({
        year: o.year,
        'Tasso di Successo': o.total > 0 ? +(100 * o.success / o.total).toFixed(1) : 0
      }));
  }, [breedings]);


  if (!hasPaidPlan(user)) {
    return (
      <div className="p-6 text-center text-brick bg-sand h-screen flex flex-col justify-center items-center">
        <h1 className="text-4xl font-bold mb-4">{t('breedingDashboard.restrictedAccessTitle')}</h1>
        <p className="text-charcoal max-w-md">{t('breedingDashboard.restrictedAccessDescription')}</p>
        <p className="text-charcoal max-w-md mt-2">{t('breedingDashboard.restrictedAccessUpgrade')}</p>
      </div>
    );
  }

  return (
    <div className="">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{t('breedingDashboard.dashboardTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <StatCard title={t('breedingDashboard.eventsPerMonth', {year: yearFilter})}>
              <BarChart data={monthlyEventsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} fontSize={12} />
                <YAxis tick={{ fill: '#64748b' }} fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                <Bar dataKey="Deposizioni" fill="#3b82f6" name="Deposizioni/Parti" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Schiuse" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </StatCard>
            <StatCard title={t('breedingDashboard.yearlySuccessRate')}>
              <LineChart data={yearlySuccessData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fill: '#64748b' }} fontSize={12} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b' }} fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                <Line type="monotone" dataKey="Tasso di Successo" stroke="#228B22" strokeWidth={3} dot={{ r: 5, fill: '#228B22' }} activeDot={{ r: 8 }} />
              </LineChart>
            </StatCard>
          </div>
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-charcoal">{t('breedingDashboard.breedingOfYear',{year: yearFilter})}</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  className="input-field appearance-none"
                  value={yearFilter}
                  onChange={e => setYearFilter(Number(e.target.value))}
                >
                  {[...Array(10)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
                <ChevronDownIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('breedingDashboard.newPair')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {breedings.length > 0 ? (
              breedings.map(b => (
                <BreedingCard
                  key={b._id}
                  breeding={b}
                  onAddEvent={handleAddEvent}
                  onUpdateOutcome={handleUpdateOutcome}
                  onEditEvent={openEditEventModal}
                  onDeleteEventRequest={requestDeleteEvent}
                />
              ))
            ) : (
              <div className="xl:col-span-2 text-center py-16 px-6 bg-white rounded-2xl shadow-sm border border-slate-200/80">

                <h3 className="text-xl font-semibold text-charcoal">{t('breedingDashboard.noPairsTitle',{year: yearFilter})}</h3>
                <p className="text-slate-500 mt-2">{t('breedingDashboard.noPairsDescription')}</p>
                <button className="btn btn-primary mt-6" onClick={() => setShowModal(true)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                 {t('breedingDashboard.addFirstPair')}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{t('breedingDashboard.createNewPair')}</h2>
          <div className="space-y-4">
            <select className="input-field" value={formData.species} onChange={e => setFormData({ ...formData, species: e.target.value, male: '', female: '' })}>
              <option value="">{t('breedingDashboard.selectSpecies')}</option>
              {[...new Set(reptiles.map(r => r.species?.trim()))].map(species => (
                <option key={species} value={species}>{species}</option>
              ))}
            </select>
            <select className="input-field" value={formData.male} onChange={e => setFormData({ ...formData, male: e.target.value })} disabled={!formData.species}>
              <option value="">{t('breedingDashboard.selectMale')}</option>
              {reptiles.filter(r => r.sex === 'M' && r.species === formData.species).map(r => (
                <option key={r._id} value={r._id}>{r.name || 'Senza nome'} ({r.morph || 'Classic'})</option>
              ))}
            </select>
            <select className="input-field" value={formData.female} onChange={e => setFormData({ ...formData, female: e.target.value })} disabled={!formData.species}>
              <option value="">{t('breedingDashboard.selectFemale')}</option>
              {reptiles.filter(r => r.sex === 'F' && r.species === formData.species).map(r => (
                <option key={r._id} value={r._id}>{r.name || 'Senza nome'} ({r.morph || 'Classic'})</option>
              ))}
            </select>
            <input className="input-field" type="text" placeholder="Morph Combo (es. Pastel x Banana)" value={formData.morphCombo} onChange={e => setFormData({ ...formData, morphCombo: e.target.value })} />
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-forest focus:ring-forest/50" checked={formData.isLiveBirth} onChange={e => setFormData({ ...formData, isLiveBirth: e.target.checked })} />
              <span className="text-slate-700">{t('breedingDashboard.isLiveBirth')}</span>
            </label>
            <button className="btn btn-primary w-full" onClick={handleSubmit}>{t('breedingDashboard.savePair')}</button>
          </div>
        </Modal>
      )}

      {showEventModal && (
        <Modal onClose={() => { setShowEventModal(false); setEditingEventId(null); }}>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{editingEventId ?  t('breedingDashboard.editEvent') : t('breedingDashboard.addEvent')}</h2>
          <div className="space-y-4">
            <select className="input-field" value={eventData.type} onChange={e => setEventData({ ...eventData, type: e.target.value })}>
              <option value="">{t('breedingDashboard.eventType')}</option>
              {['Mating', 'Ovulation', 'Prelay Shed', 'Egg Laid', 'Birth', 'Hatching', 'Failed'].map(type => (
                <option key={type} value={type}>{translate(type)}</option>
              ))}
            </select>
            <input type="date" className="input-field" value={eventData.date} onChange={e => setEventData({ ...eventData, date: e.target.value })} />
            <input type="text" placeholder={t('breedingDashboard.eventNotes')} className="input-field" value={eventData.notes} onChange={e => setEventData({ ...eventData, notes: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={editingEventId ? submitEditEvent : submitEvent}>
              {editingEventId ? t('breedingDashboard.editEvent') : t('breedingDashboard.saveEvent')}
            </button>
          </div>
        </Modal>
      )}

      {showOutcomeModal && (
        <Modal onClose={() => setShowOutcomeModal(false)}>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{t('breedingDashboard.updateOutcome')}</h2>
          <div className="space-y-4">
            <select className="input-field" value={outcomeData.outcome} onChange={e => setOutcomeData({ ...outcomeData, outcome: e.target.value })}>
              <option value="">{t('breedingDashboard.selectOutcome')}</option>
              {['Success', 'Partial', 'Failed', 'Unknown'].map(val => (
                <option key={val} value={val}>{translate(val)}</option>
              ))}
            </select>
            <input className="input-field" type="number" placeholder={t('breedingDashboard.totalClutch')} value={outcomeData.clutchSize.total} onChange={e => setOutcomeData(d => ({ ...d, clutchSize: { ...d.clutchSize, total: e.target.value } }))} />
            <input className="input-field" type="number" placeholder={t('breedingDashboard.fertileClutch')} value={outcomeData.clutchSize.fertile} onChange={e => setOutcomeData(d => ({ ...d, clutchSize: { ...d.clutchSize, fertile: e.target.value } }))} />
            <input className="input-field" type="number" placeholder={t('breedingDashboard.hatchedOrBorn')} value={outcomeData.clutchSize.hatchedOrBorn} onChange={e => setOutcomeData(d => ({ ...d, clutchSize: { ...d.clutchSize, hatchedOrBorn: e.target.value } }))} />
            <button className="btn btn-secondary w-full" onClick={submitOutcome}>{t('breedingDashboard.saveOutcome')}</button>
          </div>
        </Modal>
      )}

      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <h2 className="text-2xl font-bold text-charcoal mb-4">{t('breedingDashboard.confirmDeleteTitle')}</h2>
          <p className="text-slate-600 mb-6">{t('breedingDashboard.confirmDeleteMessage')}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary-outline">{t('breedingDashboard.cancel')}</button>
            <button onClick={confirmDeleteEvent} className="btn btn-danger">{t('breedingDashboard.confirmDelete')}</button>
          </div>
        </Modal>


      )}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

    </div>
  );
}