// backend/controllers/GeneticCalculatorController.js
import { BALL_PYTHON_GENES, COMPLEX_COMBOS } from "../config/ballPythonGenetics.js"; // Usato per misurare l'attività
export const calculateBreedingOutputs = async (req, res) => {
  try {
    const { fatherGenes, motherGenes } = req.body; 
    // Struttura input attesa: 
    // fatherGenes = [ { geneId: 'pastel', status: 'visual' }, { geneId: 'clown', status: 'het' } ]

    // 1. Inizializziamo l'array dei loci genetici da analizzare
    const allActiveGenes = Array.from(new Set([...fatherGenes.map(g => g.geneId), ...motherGenes.map(g => g.geneId)]));
    
    // Rappresentazione interna degli alleli per ogni gene:
    // 'N' = Normale/Wildtype, 'M' = Mutato
    let genePools = {};

    allActiveGenes.forEach(geneId => {
      const geneInfo = BALL_PYTHON_GENES[geneId];
      if (!geneInfo) return;

      // Determina gli alleli del padre per questo gene
      let fatherAlleles = ['N', 'N'];
      const fGene = fatherGenes.find(g => g.geneId === geneId);
      if (fGene) {
        if (fGene.status === 'visual' || fGene.status === 'super') fatherAlleles = ['M', 'M'];
        if (fGene.status === 'het') fatherAlleles = ['M', 'N'];
      }

      // Determina gli alleli della madre per questo gene
      let motherAlleles = ['N', 'N'];
      const mGene = motherGenes.find(g => g.geneId === geneId);
      if (mGene) {
        if (mGene.status === 'visual' || mGene.status === 'super') motherAlleles = ['M', 'M'];
        if (mGene.status === 'het') motherAlleles = ['M', 'N'];
      }

      // Quadrato di Punnett per questo singolo gene
      let outcomes = [];
      for (let f of fatherAlleles) {
        for (let m of motherAlleles) {
          outcomes.push([f, m].sort().join('')); // Genera stringhe ordinate come 'MM', 'MN', 'NN'
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
    let resultsMap = {};

    combinations.forEach(combo => {
      // Traduciamo la combinazione di alleli in fenotipo testuale (Morph visibile)
      let morphNameParts = [];
      let hetParts = [];
      let belGroup = []; // Per tracciare i complessi allelici

      for (let geneId in combo => {
        const allele = combo[geneId];
        const geneInfo = BALL_PYTHON_GENES[geneId];

        if (geneInfo.type === 'recessive') {
          if (allele === 'MM') morphNameParts.push(geneInfo.name);
          if (allele === 'MN') hetParts.push(`100% Het ${geneInfo.name}`);
        } 
        else if (geneInfo.type === 'co-dominant') {
          if (geneInfo.complex === 'bel') {
            if (allele === 'MM' || allele === 'MN') {
              // Se fa parte del complesso BEL, lo isoliamo temporaneamente
              belGroup.push({ geneId, allele });
            }
          } else {
            if (allele === 'MM') morphNameParts.push(geneInfo.superName || `Super ${geneInfo.name}`);
            if (allele === 'MN') morphNameParts.push(geneInfo.name);
          }
        }
      });

      // Gestione del complesso allelico BEL (Mojave, Lesser, ecc.)
      if (belGroup.length > 0) {
        if (belGroup.length === 1 && belGroup[0].allele === 'MN') {
          morphNameParts.push(BALL_PYTHON_GENES[belGroup[0].geneId].name);
        } else {
          // Ordiniamo le chiavi per matchare il dizionario COMPLEX_COMBOS
          const comboKey = belGroup.map(b => b.geneId).sort().join('+');
          const specialComboName = COMPLEX_COMBOS.bel[comboKey];
          if (specialComboName) {
            morphNameParts.push(specialComboName);
          } else {
            // Fallback se è una combo non censita
            belGroup.forEach(b => morphNameParts.push(BALL_PYTHON_GENES[b.geneId].name));
          }
        }
      }

      // Componiamo il nome finale del fenotipo (es: "Pastel Clown 100% Het Piebald")
      if (morphNameParts.length === 0) morphNameParts.push('Normal (Wildtype)');
      const finalPhenotype = [...morphNameParts, ...hetParts].join(' ');

      resultsMap[finalPhenotype] = (resultsMap[finalPhenotype] || 0) + 1;
    });

    // 4. Formattazione dell'output in percentuali chiare
    const finalCalculatedResults = Object.keys(resultsMap).map(phenotype => ({
      phenotype,
      probability: ((resultsMap[phenotype] / totalCombinations) * 100).toFixed(2) + '%'
    })).sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    return res.status(200).json({ success: true, results: finalCalculatedResults });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};