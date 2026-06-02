// frontend/src/pages/GeneticCalculator.jsx
import React, { useState } from 'react';
import api from '../services/api'; // Il tuo modulo Axios configurato

// Estraiamo la lista dei geni dal nostro dizionario per i menu a tendina
const GENE_OPTIONS = [
  { id: 'clown', name: 'Clown', type: 'recessive' },
  { id: 'piebald', name: 'Piebald', type: 'recessive' },
  { id: 'albino', name: 'Albino', type: 'recessive' },
  { id: 'pastel', name: 'Pastel', type: 'co-dominant' },
  { id: 'enchi', name: 'Enchi', type: 'co-dominant' },
  { id: 'mojave', name: 'Mojave', type: 'co-dominant' },
  { id: 'lesser', name: 'Lesser', type: 'co-dominant' },
];

export default function GeneticCalculator() {
  const [fatherGenes, setFatherGenes] = useState([]);
  const [motherGenes, setMotherGenes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addGene = (sex, geneId, status) => {
    if (!geneId || !status) return;
    const newGene = { geneId, status };
    if (sex === 'male') {
      if (!fatherGenes.some(g => g.geneId === geneId)) setFatherGenes([...fatherGenes, newGene]);
    } else {
      if (!motherGenes.some(g => g.geneId === geneId)) setMotherGenes([...motherGenes, newGene]);
    }
  };

  const removeGene = (sex, geneId) => {
    if (sex === 'male') {
      setFatherGenes(fatherGenes.filter(g => g.geneId !== geneId));
    } else {
      setMotherGenes(motherGenes.filter(g => g.geneId !== geneId));
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/breeding/genetic', {
        fatherGenes,
        motherGenes
      });
      if (response.data.success) {
        setResults(response.data.results);
      }
    } catch (error) {
      console.error("Errore nel calcolo genetico", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md mt-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">🧮 Calcolatore Genetico Pitoni Reali</h1>
      <p className="text-gray-500 text-center mb-8">Seleziona i tratti genetici dei riproduttori per calcolare le probabilità della covata.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* COLONNA MASCHIO */}
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">♂️ Padre (Maschio)</h2>
          <GeneSelectorForm onAdd={(id, status) => addGene('male', id, status)} />
          <SelectedGenesList genes={fatherGenes} onRemove={(id) => removeGene('male', id)} />
        </div>

        {/* COLONNA FEMMINA */}
        <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-100">
          <h2 className="text-xl font-bold text-pink-700 mb-4 flex items-center gap-2">♀️ Madre (Femmina)</h2>
          <GeneSelectorForm onAdd={(id, status) => addGene('female', id, status)} />
          <SelectedGenesList genes={motherGenes} onRemove={(id) => removeGene('female', id)} />
        </div>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg shadow transition duration-200 disabled:opacity-50"
        >
          {loading ? 'Calcolo in corso...' : 'Calcola Previsioni Covata 🐍'}
        </button>
      </div>

      {/* SEZIONE RISULTATI */}
      {results.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-xl font-bold text-slate-700 mb-4">🧬 Previsioni della Progenie:</h3>
          <div className="overflow-hidden bg-gray-50 rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probabilità</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Morph Fenotipo Sviluppato</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((res, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">{res.probability}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{res.phenotype}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Sotto-componente interno per la selezione rapida dei singoli geni
function GeneSelectorForm({ onAdd }) {
  const [selectedGene, setSelectedGene] = useState('');
  const [status, setStatus] = useState('visual');

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select 
        className="border p-2 rounded-lg flex-1 bg-white text-sm"
        value={selectedGene} 
        onChange={e => setSelectedGene(e.target.value)}
      >
        <option value="">-- Seleziona Gene --</option>
        {GENE_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>

      <select 
        className="border p-2 rounded-lg bg-white text-sm"
        value={status} 
        onChange={e => setStatus(e.target.value)}
      >
        <option value="visual">Visual (Omozigote / Singolo Dominante)</option>
        {selectedGene && GENE_OPTIONS.find(g => g.id === selectedGene)?.type === 'co-dominant' && (
          <option value="super">Super (Omozigote Co-Dom)</option>
        )}
        <option value="het">Het (Eterozigote Portatore)</option>
      </select>

      <button 
        onClick={() => { onAdd(selectedGene, status); setSelectedGene(''); }}
        className="bg-slate-700 hover:bg-slate-800 text-white px-4 rounded-lg text-sm font-bold"
      >
        Aggiungi
      </button>
    </div>
  );
}

function SelectedGenesList({ genes, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {genes.map(g => {
        const name = GENE_OPTIONS.find(opt => opt.id === g.geneId)?.name || g.geneId;
        return (
          <span key={g.geneId} className="inline-flex items-center gap-1 bg-white border px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            <span className="text-slate-700">{name}</span> 
            <span className="text-gray-400 font-normal">({g.status})</span>
            <button onClick={() => onRemove(g.geneId)} className="text-red-500 font-bold ml-1 hover:text-red-700">×</button>
          </span>
        );
      })}
    </div>
  );
}