// backend/controllers/GeneticCalculatorController.js
import { BALL_PYTHON_GENES, COMPLEX_COMBOS } from "../config/ballPythonGenetics.js";

export const calculateBreedingOutputs = async (req, res) => {
  try {
    const { fatherGenes, motherGenes } = req.body; 

    // Controllo di sicurezza sugli input
    if (!fatherGenes || !motherGenes) {
      return res.status(400).json({ success: false, message: "Dati dei genitori mancanti." });
    }

    // 1. Inizializziamo l'array dei loci genetici da analizzare
    const allActiveGenes = Array.from(new Set([...fatherGenes.map(g => g.geneId), ...motherGenes.map(g => g.geneId)]));
    
    let genePools = {};

    allActiveGenes.forEach(geneId => {
      const geneInfo = BALL_PYTHON_GENES[geneId];
      if (!geneInfo) return;

      let fatherAlleles = ['N', 'N'];
      const fGene = fatherGenes.find(g => g.geneId === geneId);
      if (fGene) {
        if (fGene.status === 'visual' || fGene.status === 'super') fatherAlleles = ['M', 'M'];
        if (fGene.status === 'het') fatherAlleles = ['M', 'N'];
      }

      let motherAlleles = ['N', 'N'];
      const mGene = motherGenes.find(g => g.geneId === geneId);
      if (mGene) {
        if (mGene.status === 'visual' || mGene.status === 'super') motherAlleles = ['M', 'M'];
        if (mGene.status === 'het') motherAlleles = ['M', 'N'];
      }

      let outcomes = [];
      for (let f of fatherAlleles) {
        for (let m of motherAlleles) {
          outcomes.push([f, m].sort().join('')); 
        }
      }
      genePools[geneId] = outcomes;
    });

    // 2. Combinazione di tutti i geni (Prodotto Cartesiano)
    let combinations = [{}];
    for (let geneId in genePools) {
      let nextCombinations = [];
      for (let current of combinations) {
        for (let outcome of genePools[geneId]) {
          nextCombinations.push({ ...current, [geneId]: outcome });
        }
      }
      combinations = nextCombinations;
    }

    // 3. Conteggio e raggruppamento delle frequenze
    const totalCombinations = combinations.length;
    const resultsMap = {}; 

    combinations.forEach(combo => {
      let morphNameParts = [];
      let hetParts = [];
      
      // NUOVA LOGICA: Un oggetto per tracciare i complessi multipli (es. un serpente che ha sia Mojave che Yellow Belly)
      let activeComplexes = {}; 

      for (let geneId in combo) {
        const allele = combo[geneId];
        const geneInfo = BALL_PYTHON_GENES[geneId];
        if (!geneInfo) continue;

        if (geneInfo.type === 'recessive') {
          if (allele === 'MM') {
            morphNameParts.push(geneInfo.name);
          } else if (allele === 'MN') {
            hetParts.push(`100% Het ${geneInfo.name}`);
          }
        } 
        else if (geneInfo.type === 'co-dominant') {
          if (geneInfo.complex) {
            // Se il gene appartiene a un complesso, lo aggiungiamo al suo gruppo specifico
            if (allele === 'MM' || allele === 'MN') {
              if (!activeComplexes[geneInfo.complex]) activeComplexes[geneInfo.complex] = [];
              activeComplexes[geneInfo.complex].push({ geneId, allele });
            }
          } else {
            // Co-dominanti normali
            if (allele === 'MM') {
              morphNameParts.push(geneInfo.superName || `Super ${geneInfo.name}`);
            } else if (allele === 'MN') {
              morphNameParts.push(geneInfo.name);
            }
          }
        }
      }

      // Elaborazione DINAMICA di tutti i complessi allelici trovati
      for (let complexId in activeComplexes) {
        const complexGroup = activeComplexes[complexId];

        // Caso 1: Singola copia di un gene del complesso
        if (complexGroup.length === 1 && complexGroup[0].allele === 'MN') {
          morphNameParts.push(BALL_PYTHON_GENES[complexGroup[0].geneId].name);
        } 
        // Caso 2: Combinazione di geni o forma Super
        else {
          let complexKeys = [];
          complexGroup.forEach(b => {
            complexKeys.push(b.geneId);
            if (b.allele === 'MM') complexKeys.push(b.geneId); 
          });

          const comboKey = complexKeys.sort().join('+');
          
          // Cerca nel dizionario corretto in base all'ID del complesso (es. COMPLEX_COMBOS['yellow_belly'])
          const specialComboName = COMPLEX_COMBOS[complexId] && COMPLEX_COMBOS[complexId][comboKey];
          
          if (specialComboName) {
            morphNameParts.push(specialComboName);
          } else {
            // Fallback
            complexGroup.forEach(b => {
              if (b.allele === 'MM') morphNameParts.push(`Super ${BALL_PYTHON_GENES[b.geneId].name}`);
              else morphNameParts.push(BALL_PYTHON_GENES[b.geneId].name);
            });
          }
        }
      }

      let finalPhenotype = "";
      
      if (morphNameParts.length === 0) {
        finalPhenotype = hetParts.length > 0 ? `Normal ${hetParts.join(' ')}` : 'Normal (Wildtype)';
      } else {
        finalPhenotype = hetParts.length > 0 ? `${morphNameParts.join(' ')} ${hetParts.join(' ')}` : morphNameParts.join(' ');
      }

      resultsMap[finalPhenotype] = (resultsMap[finalPhenotype] || 0) + 1;
    });

    // 4. Formattazione dell'output
    const finalCalculatedResults = Object.keys(resultsMap).map(phenotype => ({
      phenotype,
      probability: ((resultsMap[phenotype] / totalCombinations) * 100).toFixed(2) + '%'
    })).sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    return res.status(200).json({ success: true, results: finalCalculatedResults });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};