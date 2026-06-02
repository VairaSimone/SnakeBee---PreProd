// frontend/src/pages/GeneticCalculator.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api'; 

export default function GeneticCalculator() {
  const [geneOptions, setGeneOptions] = useState([]);
  const [fatherGenes, setFatherGenes] = useState([]);
  const [motherGenes, setMotherGenes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const MAX_GENES = 6;

  // Carica le opzioni genetiche dal backend all'avvio
  useEffect(() => {
    const fetchGeneticOptions = async () => {
      try {
        const response = await api.get('/breeding/genetic/options');
        if (response.data.success) {
          setGeneOptions(response.data.options);
        }
      } catch (error) {
        console.error("Errore nel caricamento delle opzioni genetiche", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchGeneticOptions();
  }, []);

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

  const hasLethals = results.some(r => r.isLethal);

  if (loadingOptions) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="animate-pulse">Caricamento varianti genetiche dal database...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md mt-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">🧮 Calcolatore Genetico Pitoni Reali</h1>
      <p className="text-gray-500 text-center mb-8">Seleziona i tratti genetici dei riproduttori per calcolare le probabilità della covata.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* PADRE */}
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-700 flex items-center gap-2">♂️ Padre</h2>
            <span className={`text-sm font-bold ${fatherGenes.length >= MAX_GENES ? 'text-red-500' : 'text-blue-500'}`}>
              {fatherGenes.length} / {MAX_GENES} Geni
            </span>
          </div>
          <GeneSelectorForm 
            geneOptions={geneOptions}
            onAdd={(id, status) => addGene('male', id, status)} 
            disabled={fatherGenes.length >= MAX_GENES} 
          />
          <SelectedGenesList geneOptions={geneOptions} genes={fatherGenes} onRemove={(id) => removeGene('male', id)} />
        </div>

        {/* MADRE */}
        <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-pink-700 flex items-center gap-2">♀️ Madre</h2>
            <span className={`text-sm font-bold ${motherGenes.length >= MAX_GENES ? 'text-red-500' : 'text-pink-500'}`}>
              {motherGenes.length} / {MAX_GENES} Geni
            </span>
          </div>
          <GeneSelectorForm 
            geneOptions={geneOptions}
            onAdd={(id, status) => addGene('female', id, status)} 
            disabled={motherGenes.length >= MAX_GENES} 
          />
          <SelectedGenesList geneOptions={geneOptions} genes={motherGenes} onRemove={(id) => removeGene('female', id)} />
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

      {results.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-xl font-bold text-slate-700 mb-4">🧬 Previsioni della Progenie:</h3>
          
          {hasLethals && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
              <p className="font-bold text-red-700">⚠️ Attenzione: Rischio Combinazioni Letali</p>
              <p className="text-sm text-red-600 mt-1">L'accoppiamento calcolato ha generato probabilità di morph in omozigosi letale (es. Super Spider, Super Champagne). Le uova potrebbero non schiudersi o generare esemplari con gravi difetti incompatibili con la vita.</p>
            </div>
          )}

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
                  <tr key={index} className={`transition ${res.isLethal ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${res.isLethal ? 'text-red-600' : 'text-amber-600'}`}>
                      {res.probability}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${res.isLethal ? 'text-red-700' : 'text-gray-700'}`}>
                      {res.phenotype}
                    </td>
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

function GeneSelectorForm({ geneOptions, onAdd, disabled }) {
  const [selectedGene, setSelectedGene] = useState('');
  const [status, setStatus] = useState('visual');

  // Trova le info del gene selezionato per controllarne il tipo
  const currentGeneInfo = geneOptions.find(g => g.id === selectedGene);

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select 
        className="border p-2 rounded-lg flex-1 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400"
        value={selectedGene} 
        onChange={e => { setSelectedGene(e.target.value); setStatus('visual'); }}
        disabled={disabled}
      >
        <option value="">-- Seleziona Gene --</option>
        
        <optgroup label="Recessivi">
          {geneOptions.filter(g => g.type === 'recessive').map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>

        <optgroup label="Dominanti / Co-Dominanti (Singoli)">
          {geneOptions.filter(g => (g.type === 'co-dominant' || g.type === 'dominant') && !g.complex).map(g => (
             <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>

        <optgroup label="Complesso Fire (BEL a occhi neri)">
          {geneOptions.filter(g => g.complex === 'black_eyed_lucy').map(g => (
             <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>

        <optgroup label="Complesso BEL (Blue Eyed Lucy)">
          {geneOptions.filter(g => g.complex === 'bel').map(g => (
             <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>

        <optgroup label="Complesso Yellow Belly">
          {geneOptions.filter(g => g.complex === 'yellow_belly').map(g => (
             <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>

        <optgroup label="Complesso 8-Ball">
          {geneOptions.filter(g => g.complex === 'eight_ball').map(g => (
             <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </optgroup>
      </select>

      <select 
        className="border p-2 rounded-lg bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400"
        value={status} 
        onChange={e => setStatus(e.target.value)}
        disabled={disabled || !selectedGene}
      >
        <option value="visual">Visual</option>
        {selectedGene && ['co-dominant', 'dominant'].includes(currentGeneInfo?.type) && (
          <option value="super">Super (Omozigote)</option>
        )}
        <option value="het">Het</option>
      </select>

      <button 
        onClick={() => { onAdd(selectedGene, status); setSelectedGene(''); setStatus('visual'); }}
        disabled={disabled || !selectedGene}
        className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 rounded-lg text-sm font-bold transition"
      >
        Aggiungi
      </button>
    </div>
  );
}

function SelectedGenesList({ geneOptions, genes, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {genes.map(g => {
        const name = geneOptions.find(opt => opt.id === g.geneId)?.name || g.geneId;
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