// frontend/src/utils/marketData.js

export const MARKET_KITS = [
  // --- GECO CILIATUS ---
  {
    id: "geco-ciliatus-arredo",
    name: "Geco Ciliatus Kit Arredo",
    category: "Gechi",
    price: 39.99,
    features: ["Igrometro", "Liane muschio 200cm", "Piante 40cm", "Tana cocco", "Ciotola"],
    dimensions: "N/D"
  },
  {
    id: "geco-ciliatus-ricorrente",
    name: "Kit Ricorrente Ciliatus",
    category: "Gechi",
    price: 24.99,
    features: ["Fibra di cocco", "Sfagno 100g", "Foglie di cobra", "Calcio + D3"],
    dimensions: "N/D"
  },
  {
    id: "geco-ciliatus-elettrico",
    name: "Kit Elettrico Ciliatus",
    category: "Tecnica",
    price: 79.99,
    features: ["Spot 60w", "2x Portalampade", "Termostato PID TC02", "UVB 5% 13W"],
    dimensions: "N/D"
  },

  // --- PITONE REALE ---
  {
    id: "pitone-reale-arredo",
    name: "Pitone Reale Kit Arredo",
    category: "Pitoni",
    price: 69.99,
    features: ["Igrometro", "Tana tronco", "Tana con ciotola", "Pinze 25cm", "Tubi sughero"],
    dimensions: "N/D"
  },
  {
    id: "pitone-reale-ricorrente",
    name: "Kit Ricorrente Pitone Reale",
    category: "Pitoni",
    price: 14.99,
    features: ["2x Fibra di cocco", "Sfagno 100g"],
    dimensions: "N/D"
  },

  // --- GECO LEOPARDINO ---
  {
    id: "geco-leopardino-arredo",
    name: "Geco Leopardino Kit Arredo",
    category: "Gechi",
    price: 39.99,
    features: ["Igrometro", "Tana umida GC", "Tana roccia", "Ciotola pietra", "Pinze 25cm"],
    dimensions: "N/D"
  },
  {
    id: "geco-leopardino-ricorrente",
    name: "Kit Ricorrente Geco Leopardino",
    category: "Gechi",
    price: 25.99,
    features: ["Calcio + D3", "Multivitaminico", "Sfagno 100g"],
    dimensions: "N/D"
  },

  // --- SERPENTE DEL GRANO ---
  {
    id: "serpente-grano-arredo",
    name: "Serpente del Grano Kit Arredo",
    category: "Serpenti",
    price: 44.99,
    features: ["Igrometro", "Tana pioppo", "Tana roccia", "Ciotola 13.8cm", "Pinze 25cm"],
    dimensions: "N/D"
  },
  {
    id: "serpente-grano-ricorrente",
    name: "Kit Ricorrente Serpente del Grano",
    category: "Serpenti",
    price: 19.99,
    features: ["2x Aspen 15lt PremiumRep"],
    dimensions: "N/D"
  },

  // --- TECNICA COMUNE ---
  {
    id: "kit-elettrico-standard",
    name: "Kit Elettrico (Grano/Leo/Pitone)",
    category: "Tecnica",
    price: 32.90,
    features: ["Tappetino 14W (28x28)", "Termostato 300R"],
    dimensions: "28 × 28 cm"
  }
];


export const snakebeeKits = [
  {
    id: "kit-arredo-ciliatus",
    name: "Geco Ciliatus Kit Arredo",
    description: "Igrometro, Liane con muschio 200cm, Piante artificiali 40cm, Tana finto cocco, Ciotola bassa in plastica 9cm.",
    price: 39.99
  },
  {
    id: "kit-ricorrente-ciliatus",
    name: "Kit ricorrente Ciliatus",
    description: "Fibra di cocco mattoncino 650g, Sfagno disidratati 100g, Foglie di cobra, Carbonato di Calcio + D3.",
    price: 24.99
  },
  {
    id: "kit-elettrico-ciliatus",
    name: "Kit elettrico Ciliatus",
    description: "Lampada spot 60w, 2x Portalampade con cavo e interruttore, Termostato Dimming PID TC02, Lampada UVB compatta 5% 13W.",
    price: 79.99
  },
  {
    id: "kit-arredo-pitone-reale",
    name: "Pitone reale Kit Arredo",
    description: "Igrometro, Tana finto tronco, Tana simil tronco con ciotola, Pinze Tweezer 25cm, Corteccia di sughero grezza in tubi.",
    price: 69.99
  },
  {
    id: "kit-ricorrente-pitone-reale",
    name: "Kit ricorrente Pitone reale",
    description: "2x Fibra di cocco mattoncino 650g, Sfagno disidratati 100g.",
    price: 14.99
  },
  {
    id: "kit-arredo-leopardino",
    name: "Geco Leopardino Kit Arredo",
    description: "Igrometro, Tana umida GC, Tana finta roccia, Ciotola in finte pietre, Pinze Tweezer in Acciaio 25cm.",
    price: 39.99
  },
  {
    id: "kit-ricorrente-leopardino",
    name: "Kit ricorrente Geco Leopardino",
    description: "Carbonato di Calcio + D3 50g, Multivitaminico 50g, Sfagno disidratati 100g.",
    price: 25.99
  },
  {
    id: "kit-arredo-serpente-grano",
    name: "Serpente del Grano Kit Arredo",
    description: "Igrometro, Tana finto pioppo, Tana finta roccia, Ciotola in plastica, Pinze Tweezer 25cm.",
    price: 44.99
  },
  {
    id: "kit-ricorrente-serpente-grano",
    name: "Kit ricorrente Serpente del Grano",
    description: "2x Aspen 15lt PremiumRep.",
    price: 19.99
  },
  {
    id: "kit-elettrico-universale",
    name: "Kit elettrico Serpi, Leo, Pitone",
    description: "Tappetini Riscaldanti 28x28cm 14W, Termostato on-off Thermocontrol 300R.",
    price: 32.90
  }
];
export const MARKET_URL = "https://market.snakebee.it";