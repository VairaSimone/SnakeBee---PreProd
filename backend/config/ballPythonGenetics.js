// backend/config/ballPythonGenetics.js
export const BALL_PYTHON_GENES =  {
  // RECESSIVI
  clown: { name: 'Clown', type: 'recessive' },
  piebald: { name: 'Piebald (Pied)', type: 'recessive' },
  albino: { name: 'Albino', type: 'recessive' },
  axanthic: { name: 'Axanthic (VPI)', type: 'recessive' },
  desert_ghost: { name: 'Desert Ghost', type: 'recessive' },

  // CO-DOMINANTI / INCOMPLETE DOMINANTI
  pastel: { name: 'Pastel', type: 'co-dominant', superName: 'Super Pastel' },
  enchi: { name: 'Enchi', type: 'co-dominant', superName: 'Super Enchi' },
  fire: { name: 'Fire', type: 'co-dominant', superName: 'Black Eyed Lucy' },
  yellow_belly: { name: 'Yellow Belly', type: 'co-dominant', superName: 'Ivory' },
  
  // COMPLESSI ALLELICI (Esempio Blue Eyed Lucy Complex)
  mojave: { name: 'Mojave', type: 'co-dominant', complex: 'bel' },
  lesser: { name: 'Lesser', type: 'co-dominant', complex: 'bel' },
  butter: { name: 'Butter', type: 'co-dominant', complex: 'bel' },
};

// Mappatura delle combo alleliche speciali (Quando due geni dello stesso complesso si incontrano)
export const COMPLEX_COMBOS = {
  bel: {
    'mojave+mojave': 'Super Mojave (Blue Eyed Lucy)',
    'lesser+lesser': 'Super Lesser (Blue Eyed Lucy)',
    'mojave+lesser': 'Mojave Lesser (Blue Eyed Lucy)',
    'butter+mojave': 'Butter Mojave (Blue Eyed Lucy)',
  }
};

