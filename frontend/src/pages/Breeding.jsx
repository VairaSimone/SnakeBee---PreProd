import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import Modal from '../components/BreedingModal.jsx'; // semplice componente modale custom (niente librerie esterne)
import { selectUser } from '../features/userSlice.jsx';
import { useSelector } from 'react-redux';
import { BarChart, LineChart, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts';
import { useMemo } from 'react';


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
  const [formData, setFormData] = useState({
    male: '',
    female: '',
    species: '',
    morphCombo: '',
    isLiveBirth: false
  });

  const handleAddEvent = (breedingId) => {
    setSelectedBreedingId(breedingId);
    setShowEventModal(true);
  };
  const [outcomeData, setOutcomeData] = useState({
    outcome: '',
    clutchSize: { total: '', fertile: '', hatchedOrBorn: '' }
  });
  const requestDeleteEvent = (bid, eid) => {
    setEventToDelete({ bid, eid });
    setShowConfirmModal(true);
  };

  const confirmDeleteEvent = async () => {
    const { bid, eid } = eventToDelete;
    await api.delete(`/breeding/${bid}/event/${eid}`);
    setBreedings(prev =>
      prev.map(b => b._id === bid
        ? { ...b, events: b.events.filter(ev => ev._id !== eid) }
        : b
      )
    );
    setShowConfirmModal(false);
    setEventToDelete(null);
  };
  const handleUpdateOutcome = (breedingId) => {
    const breeding = breedings.find(b => b._id === breedingId);

    setOutcomeData({
      outcome: breeding?.outcome || '',
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

      // Aggiorna in stato locale
      setBreedings(prev =>
        prev.map(b =>
          b._id === selectedBreedingId
            ? {
              ...b,
              outcome: payload.outcome || b.outcome,
              clutchSize: {
                ...b.clutchSize,
                ...payload.clutchSize
              }
            }
            : b
        )
      );

      setShowOutcomeModal(false);
      setOutcomeData({
        outcome: '',
        clutchSize: { total: '', fertile: '', hatchedOrBorn: '' }
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Errore aggiornamento outcome');
    }
  };

  const byMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
    breedings.forEach(b => {
      b.events?.filter(e => ['Egg Laid', 'Hatching'].includes(e.type)).forEach(e => {
        const m = new Date(e.date).getMonth(); // 0-11
        months[m].count++;
      });
    });
    return months;
  }, [breedings]);

  const yearlySuccess = useMemo(() => {
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
        successRate: +(100 * o.success / o.total).toFixed(1)
      }));
  }, [breedings]);

  const submitEvent = async () => {
    if (!eventData.type || !eventData.date) {
      alert('Tipo e data sono obbligatori');
      return;
    }
    try {
      await api.post(`/breeding/${selectedBreedingId}/event`, eventData);
      // Aggiorna la lista accoppiamenti
      setBreedings(prev => prev.map(b =>
        b._id === selectedBreedingId
          ? { ...b, events: [...(b.events || []), eventData] }
          : b
      ));
      setShowEventModal(false);
      setEventData({ type: '', date: '', notes: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Errore evento');
    }
  };
  // 🐍 Carica i rettili disponibili
  useEffect(() => {
    api.get(`/reptile/${user._id}/allreptile`)
      .then(res => {

        if (!Array.isArray(res.data.dati)) {
          console.error('Errore: res.data.dati non è un array, ma:', typeof res.data.dati);
          return;
        }

        const breeders = res.data.dati.filter(r => r.isBreeder);
        setReptiles(breeders);
      })
      .catch(err => console.error('Errore fetch rettili:', err));
  }, []);

  // 🔄 Carica accoppiamenti per anno
  useEffect(() => {
    api.get(`/breeding?year=${yearFilter}`)
      .then(res => {
        if (!Array.isArray(res.data)) {
          console.error('Errore: res.data non è un array nei breeding:', typeof res.data);
          return;
        }
        setBreedings(res.data);
      })
      .catch(err => console.error('Errore fetch breeding:', err));
  }, [yearFilter]);
  const handleDeleteEvent = async (bid, eid) => {
    if (!window.confirm('Sei sicuro?')) return;
    await api.delete(`/breeding/${bid}/event/${eid}`);
    setBreedings(prev => prev.map(b => b._id === bid ? { ...b, events: b.events.filter(ev => ev._id !== eid) } : b));
  };

  const openEditEventModal = (bid, ev) => {
    setSelectedBreedingId(bid);
    setEventData({ ...ev }); // contiene type, date, notes
    setEditingEventId(ev._id);
    setShowEventModal(true);
  };

  const submitEditEvent = async () => {
    try {
      await api.patch(`/breeding/${selectedBreedingId}/event/${editingEventId}`, eventData);
      setBreedings(prev => prev.map(b => {
        if (b._id !== selectedBreedingId) return b;
        return {
          ...b,
          events: b.events.map(ev => ev._id === editingEventId ? { ...ev, ...eventData } : ev)
        };
      }));
      setShowEventModal(false);
      setEventData({ type: '', date: '', notes: '' });
      setEditingEventId(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Errore modifica evento');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.male || !formData.female || !formData.species) {
        alert('Completa tutti i campi obbligatori.');
        return;
      }

      const payload = {
        ...formData,
        year: yearFilter
      };
      console.log(payload)
      const res = await api.post('/breeding', payload);
      setBreedings(prev => [...prev, res.data]);
      setShowModal(false);
      setFormData({
        male: '',
        female: '',
        species: '',
        morphCombo: '',
        isLiveBirth: false
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Errore creazione coppia');
    }
  };

  return (
    <div className="p-6 space-y-8">

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-bold mb-2">Schiuse per Mese</h2>
          <BarChart data={byMonth} width={500} height={250} className="w-full">
            <XAxis
              dataKey="month"
              tickFormatter={(month) => ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][month - 1]}
            />
            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-bold mb-2">Tasso di Successo Annuale</h2>

          <LineChart data={yearlySuccess} width={500} height={250} className="w-full">
            <XAxis dataKey="year" /><YAxis domain={[0, 100]} /><Tooltip />
            <Line
              type="monotone"
              dataKey="successRate"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#16a34a', strokeWidth: 2 }}
            />
          </LineChart>
        </div>
      </div>



    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <h1 className="text-2xl font-bold">Riproduzione {yearFilter}</h1>
      <div className="flex items-center gap-4">
        <select
          className="border p-2 rounded"
          value={yearFilter}
          onChange={e => setYearFilter(Number(e.target.value))}
        >
          {[...Array(10)].map((_, i) => {
            const year = new Date().getFullYear() - i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>
        <button
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow transition"
          onClick={() => setShowModal(true)}
        >
          <span className="text-xl">➕</span> Nuova coppia
        </button>
      </div>
    </div>

      {/* ✅ Lista accoppiamenti */ }
    <div>
      <h2 className="text-xl font-semibold mb-4">Accoppiamenti registrati</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breedings.map(b => (

      <div
        key={b._id}
        className="bg-white border border-gray-100 rounded-lg shadow-md p-5 hover:shadow-xl transition-all duration-300">
        <p className="mt-2 text-sm">
          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
            {b.isLiveBirth ? 'Viviparo' : 'Oviparo'}
          </span>
          {b.outcome && (
            <span className={`ml-2 inline-block px-2 py-0.5 rounded text-white ${b.outcome === 'Success' ? 'bg-green-600' : b.outcome === 'Failed' ? 'bg-red-500' : 'bg-yellow-500'}`}>
              {b.outcome}
            </span>
          )}
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {b.male?.name} × {b.female?.name}
            </h2>
            <p className="text-sm text-gray-600">{b.species} – {b.morphCombo || 'N/A'}</p>
          </div>
          <div className="text-right space-x-1">
            <button
              onClick={() => handleAddEvent(b._id)}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            >
              + Evento
            </button>
            <button
              onClick={() => handleUpdateOutcome(b._id)}
              className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
            >
              Outcome
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm space-y-1">
          <p><strong>Outcome:</strong> {b.outcome || '—'}</p>
          <p><strong>Tipo parto:</strong> {b.isLiveBirth ? 'Viviparo' : 'Oviparo'}</p>

          {b.clutchSize && (
            <div className="flex gap-2 mt-2 text-xs">
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Tot: {b.clutchSize.total || 0}</span>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Fertili: {b.clutchSize.fertile || 0}</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Nati: {b.clutchSize.hatchedOrBorn || 0}</span>
            </div>
          )}
        </div>

        {b.events?.length > 0 && (
          <div className="mt-4">
            <p className="font-medium text-gray-700 mb-1">Eventi:</p>
            <ul className="space-y-1 text-xs text-gray-600">
              {b.events.map((e, i) => (
                <li key={i} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                  <span>{e.type} – {new Date(e.date).toLocaleDateString('it-IT')} {e.notes && `(${e.notes})`}</span>
                  <span className="space-x-1 text-sm">
                    <button onClick={() => openEditEventModal(b._id, e)} title="Modifica">✏️</button>
                    <button onClick={() => requestDeleteEvent(b._id, e._id)} title="Elimina">🗑️</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    ))}
  </div>
      </div>

  {
    showConfirmModal && (
      <Modal onClose={() => setShowConfirmModal(false)}>
        <h2 className="text-xl font-bold mb-4">Conferma eliminazione</h2>
        <p className="mb-4">Sei sicuro di voler eliminare questo evento?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 bg-gray-300 rounded">Annulla</button>
          <button onClick={confirmDeleteEvent} className="px-4 py-2 bg-red-600 text-white rounded">Elimina</button>
        </div>
      </Modal>
    )
  }

  {
    showEventModal && (
      <Modal onClose={() => setShowEventModal(false)}>
        <h2 className="text-xl font-bold mb-4">Aggiungi evento</h2>
        <div className="space-y-3">
          <select
            className="w-full border p-2"
            value={eventData.type}
            onChange={e => setEventData({ ...eventData, type: e.target.value })}
          >
            <option value="">-- Tipo evento --</option>
            {['Mating', 'Ovulation', 'Prelay Shed', 'Egg Laid', 'Birth', 'Hatching', 'Failed'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input type="date" className="w-full border p-2" value={eventData.date} onChange={e => setEventData({ ...eventData, date: e.target.value })} />
          <input type="text" placeholder="Note (opzionale)" className="w-full border p-2" value={eventData.notes} onChange={e => setEventData({ ...eventData, notes: e.target.value })} />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            onClick={editingEventId ? submitEditEvent : submitEvent}
          >
            {editingEventId ? 'Modifica evento' : 'Salva evento'}
          </button>
        </div>
      </Modal>

    )
  }


  {
    showOutcomeModal && (
      <Modal onClose={() => setShowOutcomeModal(false)}>
        <h2 className="text-xl font-bold mb-4">Modifica Outcome</h2>
        <div className="space-y-3">
          <select
            className="w-full border p-2"
            value={outcomeData.outcome}
            onChange={e =>
              setOutcomeData({ ...outcomeData, outcome: e.target.value })
            }
          >
            <option value="">-- Seleziona outcome --</option>
            {['Success', 'Partial', 'Failed', 'Unknown'].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>

          <input
            className="w-full border p-2"
            type="number"
            placeholder="Uova totali / Cuccioli"
            value={outcomeData.clutchSize.total}
            onChange={e =>
              setOutcomeData({
                ...outcomeData,
                clutchSize: {
                  ...outcomeData.clutchSize,
                  total: e.target.value
                }
              })
            }
          />
          <input
            className="w-full border p-2"
            type="number"
            placeholder="Fertili"
            value={outcomeData.clutchSize.fertile}
            onChange={e =>
              setOutcomeData({
                ...outcomeData,
                clutchSize: {
                  ...outcomeData.clutchSize,
                  fertile: e.target.value
                }
              })
            }
          />
          <input
            className="w-full border p-2"
            type="number"
            placeholder="Nati / Schiusi"
            value={outcomeData.clutchSize.hatchedOrBorn}
            onChange={e =>
              setOutcomeData({
                ...outcomeData,
                clutchSize: {
                  ...outcomeData.clutchSize,
                  hatchedOrBorn: e.target.value
                }
              })
            }
          />

          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded w-full"
            onClick={submitOutcome}
          >
            Salva outcome
          </button>
        </div>
      </Modal>
    )
  }

  {/* 🔒 Modale nuova coppia */ }
  {
    showModal && (
      <Modal onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-bold mb-4">Crea nuova coppia</h2>
        <div className="space-y-3">
          {/* STEP 1: Seleziona specie */}
          <select
            className="w-full border p-2"
            value={formData.species}
            onChange={e => setFormData({ ...formData, species: e.target.value })}
          >
            <option value="">-- Seleziona specie --</option>
            {[...new Set(reptiles.map(r => r.species?.trim()))].map((species, idx) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>

          {/* MASCHIO */}
          <select
            className="w-full border p-2"
            value={formData.male}
            onChange={e => setFormData({ ...formData, male: e.target.value })}
            disabled={!formData.species}
          >
            <option value="">-- Seleziona maschio --</option>
            {reptiles
              .filter(r => r.sex?.toUpperCase() === 'M')
              .filter(r => r.species?.trim().toLowerCase() === formData.species.trim().toLowerCase())
              .map(r => (
                <option key={r._id} value={r._id}>
                  {r.name || r.sex} ({r.morph})
                </option>
              ))}
          </select>

          {/* FEMMINA */}
          <select
            className="w-full border p-2"
            value={formData.female}
            onChange={e => setFormData({ ...formData, female: e.target.value })}
            disabled={!formData.species}
          >
            <option value="">-- Seleziona femmina --</option>
            {reptiles
              .filter(r => r.sex?.toUpperCase() === 'F')
              .filter(r => r.species?.trim().toLowerCase() === formData.species.trim().toLowerCase())
              .map(r => (
                <option key={r._id} value={r._id}>
                  {r.name || r.sex} ({r.morph})
                </option>
              ))}
          </select>

          <input className="w-full border p-2" type="text" placeholder="Morph Combo" value={formData.morphCombo} onChange={e => setFormData({ ...formData, morphCombo: e.target.value })} />
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.isLiveBirth} onChange={e => setFormData({ ...formData, isLiveBirth: e.target.checked })} />
            <span>Viviparo?</span>
          </label>
          <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" onClick={handleSubmit}>
            Salva coppia
          </button>
        </div>
      </Modal>

    )
  }
    </div >
  );
}
