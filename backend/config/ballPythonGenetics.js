// backend/config/ballPythonGenetics.js

export const BALL_PYTHON_GENES = {
  // --- RECESSIVI ---
  albino: { name: 'Albino', type: 'recessive' },
  axanthic: { name: 'Axanthic (VPI)', type: 'recessive' },
  clown: { name: 'Clown', type: 'recessive' },
  desert_ghost: { name: 'Desert Ghost', type: 'recessive' },
  genetic_stripe: { name: 'Genetic Stripe', type: 'recessive' },
  ghost: { name: 'Ghost (Hypo)', type: 'recessive' },
  lavender_albino: { name: 'Lavender Albino', type: 'recessive' },
  monarch: { name: 'Monarch', type: 'recessive' },
  piebald: { name: 'Piebald (Pied)', type: 'recessive' },
  puzzle: { name: 'Puzzle', type: 'recessive' },
  sunset: { name: 'Sunset', type: 'recessive' },
  ultramel: { name: 'Ultramel', type: 'recessive' },

  // --- DOMINANTI PURI (Nessuna differenza visiva in omozigosi) ---
  pinstripe: { name: 'Pinstripe', type: 'dominant' }, 
  spider: { name: 'Spider', type: 'dominant', lethal: true }, // Super Spider è letale

  // --- CO-DOMINANTI / INCOMPLETE DOMINANTI (Singoli) ---
  banana: { name: 'Banana (Coral Glow)', type: 'co-dominant', superName: 'Super Banana' },
  champagne: { name: 'Champagne', type: 'co-dominant', superName: 'Super Champagne', lethal: true }, // Super Champagne è letale
  cypress: { name: 'Cypress', type: 'co-dominant', superName: 'Super Cypress' },
  enchi: { name: 'Enchi', type: 'co-dominant', superName: 'Super Enchi' },
  leopard: { name: 'Leopard', type: 'co-dominant', superName: 'Super Leopard' },
  mahogany: { name: 'Mahogany', type: 'co-dominant', superName: 'Suma (Super Mahogany)' },
  orange_dream: { name: 'Orange Dream (OD)', type: 'co-dominant', superName: 'Super Orange Dream (SOD)' },
  pastel: { name: 'Pastel', type: 'co-dominant', superName: 'Super Pastel' },
  spotnose: { name: 'Spotnose', type: 'co-dominant', superName: 'Super Spotnose' },

  // --- COMPLESSO BLACK EYED LUCY (Fire) ---
  disco: { name: 'Disco', type: 'co-dominant', complex: 'black_eyed_lucy' },
  fire: { name: 'Fire', type: 'co-dominant', complex: 'black_eyed_lucy' },
  vanilla: { name: 'Vanilla', type: 'co-dominant', complex: 'black_eyed_lucy' },

  // --- COMPLESSO BLUE EYED LUCY (BEL) ---
  bamboo: { name: 'Bamboo', type: 'co-dominant', complex: 'bel' },
  butter: { name: 'Butter', type: 'co-dominant', complex: 'bel' },
  lesser: { name: 'Lesser', type: 'co-dominant', complex: 'bel' },
  mojave: { name: 'Mojave', type: 'co-dominant', complex: 'bel' },
  mystic: { name: 'Mystic', type: 'co-dominant', complex: 'bel' },
  phantom: { name: 'Phantom', type: 'co-dominant', complex: 'bel' },
  russo: { name: 'Russo', type: 'co-dominant', complex: 'bel' },
  special: { name: 'Special', type: 'co-dominant', complex: 'bel' },

  // --- COMPLESSO YELLOW BELLY ---
  asphalt: { name: 'Asphalt', type: 'co-dominant', complex: 'yellow_belly' },
  gravel: { name: 'Gravel', type: 'co-dominant', complex: 'yellow_belly' },
  spark: { name: 'Spark', type: 'co-dominant', complex: 'yellow_belly' },
  specter: { name: 'Specter', type: 'co-dominant', complex: 'yellow_belly' },
  yellow_belly: { name: 'Yellow Belly', type: 'co-dominant', complex: 'yellow_belly' },

  // --- COMPLESSO 8-BALL (Cinnamon / Black Pastel) ---
  black_pastel: { name: 'Black Pastel', type: 'co-dominant', complex: 'eight_ball' },
  cinnamon: { name: 'Cinnamon', type: 'co-dominant', complex: 'eight_ball' },
};

export const COMPLEX_COMBOS = {
  bel: {
    'bamboo+bamboo': 'Super Bamboo (Blue Eyed Lucy)',
    'butter+butter': 'Super Butter (Blue Eyed Lucy)',
    'lesser+lesser': 'Super Lesser (Blue Eyed Lucy)',
    'mojave+mojave': 'Super Mojave (Blue Eyed Lucy)',
    'mystic+mystic': 'Super Mystic',
    'phantom+phantom': 'Super Phantom',
    'russo+russo': 'White Diamond (Super Russo)',
    'special+special': 'Super Special',
    'bamboo+mojave': 'Bamboo Mojave (Blue Eyed Lucy)',
    'butter+mojave': 'Butter Mojave (Blue Eyed Lucy)',
    'lesser+mojave': 'Mojave Lesser (Blue Eyed Lucy)',
    'mojave+mystic': 'Mystic Potion',
    'mojave+phantom': 'Purple Passion',
    'lesser+phantom': 'Karma',
    'mojave+special': 'Crystal',
  },
  yellow_belly: {
    'yellow_belly+yellow_belly': 'Ivory',
    'asphalt+asphalt': 'Super Asphalt',
    'gravel+gravel': 'Super Gravel',
    'specter+specter': 'Super Specter',
    'spark+spark': 'Puma',
    'asphalt+yellow_belly': 'Freeway',
    'gravel+yellow_belly': 'Highway',
    'spark+yellow_belly': 'Puma (Spark YB)',
    'specter+yellow_belly': 'Super Stripe',
  },
  eight_ball: {
    'black_pastel+black_pastel': 'Super Black Pastel',
    'cinnamon+cinnamon': 'Super Cinnamon',
    'black_pastel+cinnamon': '8-Ball',
  },
  black_eyed_lucy: {
    'fire+fire': 'Black Eyed Lucy (Super Fire)',
    'vanilla+vanilla': 'Super Vanilla',
    'disco+disco': 'Super Disco',
    'fire+vanilla': 'Vanilla Cream',
    'disco+fire': 'Disco Inferno',
  }
};