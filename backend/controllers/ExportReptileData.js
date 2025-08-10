
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Reptile from '../models/Reptile.js';
import Event from '../models/Event.js';
import Feeding from '../models/Feeding.js';
import Breeding from '../models/Breeding.js';
import { logAction } from '../utils/logAction.js';
import User from '../models/User.js';
import { getUserPlan } from '../utils/getUserPlans.js'

export const exportReptileData = async (req, res) => {
  try {
    const userId = req.params.userId;
    await logAction(req.user.userid, "ExportReptile");

    const reptiles = await Reptile.find({ user: userId }).lean();
    const reptileMap = reptiles.reduce((acc, r) => {
      acc[r._id] = {
        morph: r.morph || 'No morph',
        sex: r.sex || 'Unknown',
      };
      return acc;
    }, {});

    const reptileIds = Object.keys(reptileMap);

    const feedings = await Feeding.find({ reptile: { $in: reptileIds } }).lean();
    const events = await Event.find({ reptile: { $in: reptileIds } }).lean();
    const breedings = await Breeding.find({ user: userId })
      .populate('male', 'morph sex')
      .populate('female', 'morph sex')
      .lean();

    const workbook = new ExcelJS.Workbook();

    // Reptiles Sheet
    const reptileSheet = workbook.addWorksheet('Rettili');
    reptileSheet.columns = [
      { header: 'Nome', key: 'name' },
      { header: 'Specie', key: 'species' },
      { header: 'Morph', key: 'morph' },
      { header: 'Sesso', key: 'sex' },
      { header: 'Data di nascita', key: 'birthDate' },
      { header: 'Riproduttore', key: 'isBreeder' },
      { header: 'Note', key: 'notes' },
      { header: 'Padre', key: 'father' },
      { header: 'Madre', key: 'mother' },
      { header: 'Numero CITES', key: 'citesNumber' },
      { header: 'Data rilascio CITES', key: 'citesIssueDate' },
      { header: 'Ente rilasciante CITES', key: 'citesIssuer' },
      { header: 'Codice Microchip', key: 'microchipCode' },
      { header: 'Data impianto Microchip', key: 'microchipImplantDate' },
      { header: 'Etichetta', key: 'labelText' },
    ];



    reptileSheet.addRows(reptiles.map(r => ({
      name: r.name || 'N/A',
      species: r.species,
      morph: r.morph || 'No morph',
      sex: r.sex || 'Unknown',
      birthDate: r.birthDate ? new Date(r.birthDate).toLocaleDateString() : 'N/A',
      isBreeder: r.isBreeder ? 'Yes' : 'No',
      notes: r.notes || '',
      father: r.parents?.father || '',
      mother: r.parents?.mother || '',
      citesNumber: r.documents?.cites?.number || '',
      citesIssueDate: r.documents?.cites?.issueDate ? new Date(r.documents.cites.issueDate).toLocaleDateString() : '',
      citesIssuer: r.documents?.cites?.issuer || '',
      microchipCode: r.documents?.microchip?.code || '',
      microchipImplantDate: r.documents?.microchip?.implantDate ? new Date(r.documents.microchip.implantDate).toLocaleDateString() : '',
      labelText: r.label?.text || '',

    })));
    reptileSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    reptileSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };
    reptileSheet.views = [{ state: 'frozen', ySplit: 1 }];

    reptileSheet.columns.forEach(col => {
      let maxLength = col.header.length;
      col.eachCell?.({ includeEmpty: true }, cell => {
        maxLength = Math.max(maxLength, (cell.value || '').toString().length);
      });
      col.width = maxLength + 2;
    });

    //  Feedings
    const feedingSheet = workbook.addWorksheet('Alimentazione');
    feedingSheet.columns = [
      { header: 'Rettile (Morph - Sesso)', key: 'reptile' },
      { header: 'Data', key: 'date' },
      { header: 'Tipo di cibo', key: 'foodType' },
      { header: 'Quantità', key: 'quantity' },
      { header: 'Peso per unità (g)', key: 'weightPerUnit' }, // nuovo
      { header: 'Prossimo pasto', key: 'nextFeedingDate' },
      { header: 'Mangiato', key: 'wasEaten' },
      { header: 'Riprovare dopo (giorni)', key: 'retryAfterDays' },
      { header: 'Note', key: 'notes' },
    ];
    feedingSheet.addRows(feedings.map(f => ({
      reptile: `${reptileMap[f.reptile]?.morph} - ${reptileMap[f.reptile]?.sex}`,
      date: f.date ? new Date(f.date).toLocaleDateString() : '',
      foodType: f.foodType,
      quantity: f.quantity,
      weightPerUnit: f.weightPerUnit ?? '',
      nextFeedingDate: f.nextFeedingDate ? new Date(f.nextFeedingDate).toLocaleDateString() : '',
      wasEaten: f.wasEaten ? 'Yes' : 'No',
      retryAfterDays: f.retryAfterDays ?? '',
      notes: f.notes || ''
    })));
    feedingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    feedingSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };
    feedingSheet.views = [{ state: 'frozen', ySplit: 1 }];

    feedingSheet.columns.forEach(col => {
      let maxLength = col.header.length;
      col.eachCell?.({ includeEmpty: true }, cell => {
        maxLength = Math.max(maxLength, (cell.value || '').toString().length);
      });
      col.width = maxLength + 2;
    });
    //  Events
    const eventSheet = workbook.addWorksheet('Eventi');
    eventSheet.columns = [
      { header: 'Rettile (Morph - Sesso)', key: 'reptile' },
      { header: 'Tipo', key: 'type' },
      { header: 'Data', key: 'date' },
      { header: 'Note', key: 'notes' },
      { header: 'Peso (g)', key: 'weight' },
    ];
    const translateEventType = (type) => {
      const map = {
        shed: 'Muta',
        feces: 'Feci',
        vet: 'Visita veterinaria',
        weight: 'Peso',
      };
      return map[type] || type;
    };

    eventSheet.addRows(events.map(e => ({
      reptile: `${reptileMap[e.reptile]?.morph} - ${reptileMap[e.reptile]?.sex}`,
      type: translateEventType(e.type),
      date: e.date ? new Date(e.date).toLocaleDateString() : '',
      notes: e.notes || '',
      weight: e.type === 'weight' ? e.weight : '',

    })));
    eventSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    eventSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };

    eventSheet.columns.forEach(col => {
      let maxLength = col.header.length;
      col.eachCell?.({ includeEmpty: true }, cell => {
        maxLength = Math.max(maxLength, (cell.value || '').toString().length);
      });
      col.width = maxLength + 2;
    });
    eventSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Breedings
    const breedingEventMap = {
      Mating: 'Accoppiamento',
      Ovulation: 'Ovulazione',
      'Prelay Shed': 'Muta pre-deposizione',
      'Egg Laid': 'Deposte uova',
      Birth: 'Parto',
      Hatching: 'Schiusa',
      Failed: 'Fallito'
    };

    const breedingSheet = workbook.addWorksheet('Riproduzione');
    breedingSheet.columns = [
      { header: 'Anno', key: 'year' },
      { header: 'Specie', key: 'species' },
      { header: 'Combinazione morph', key: 'morphCombo' },
      { header: 'Maschio (Morph)', key: 'male' },
      { header: 'Femmina (Morph)', key: 'female' },
      { header: 'Parto vivo', key: 'isLiveBirth' },
      { header: 'Uova/Cuccioli totali', key: 'clutchTotal' },
      { header: 'Uova fertili', key: 'clutchFertile' },
      { header: 'Nati/schiusi', key: 'clutchHatchedOrBorn' },
      { header: 'Esito', key: 'outcome' },
      { header: 'Eventi', key: 'events' },
      { header: 'Note', key: 'notes' }
    ];
    breedingSheet.addRows(breedings.map(b => ({
      year: b.year,
      species: b.species,
      morphCombo: b.morphCombo || '',
      male: `${b.male?.morph || 'No morph'}`,
      female: `${b.female?.morph || 'No morph'}`,
      isLiveBirth: b.isLiveBirth ? 'Yes' : 'No',
      clutchTotal: b.clutchSize?.total ?? '',
      clutchFertile: b.clutchSize?.fertile ?? '',
      clutchHatchedOrBorn: b.clutchSize?.hatchedOrBorn ?? '',
      outcome: b.outcome || '',
      events: b.events?.map(ev =>
        `${breedingEventMap[ev.type] || ev.type} - ${new Date(ev.date).toLocaleDateString()}`
      ).join(', ') || '',
      notes: b.notes || ''
    })));

    breedingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    breedingSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };

    breedingSheet.columns.forEach(col => {
      let maxLength = col.header.length;
      col.eachCell?.({ includeEmpty: true }, cell => {
        maxLength = Math.max(maxLength, (cell.value || '').toString().length);
      });
      col.width = maxLength + 2;
    });
    breedingSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const hatchlingSheet = workbook.addWorksheet('Cuccioli');
    hatchlingSheet.columns = [
      { header: 'Anno di stagione', key: 'seasonYear' },
      { header: 'Morph', key: 'morph' },
      { header: 'Sesso', key: 'sex' },
      { header: 'Peso (g)', key: 'weight' },
    ];

    breedings.forEach(b => {
      const entries = b.hatchlings?.map(h => ({
        seasonYear: b.year,
        morph: h.morph || '',
        sex: h.sex || 'U',
        weight: h.weight || '',
      })) || [];
      hatchlingSheet.addRows(entries);
    });

    hatchlingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hatchlingSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };

    hatchlingSheet.columns.forEach(col => {
      let maxLength = col.header.length;
      col.eachCell?.({ includeEmpty: true }, cell => {
        maxLength = Math.max(maxLength, (cell.value || '').toString().length);
      });
      col.width = maxLength + 2;
    });

    hatchlingSheet.views = [{ state: 'frozen', ySplit: 1 }];

    //  Sending the Excel file as a response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reptile_data.xlsx');
    workbook.worksheets.sort((a, b) => {
      const order = ['Rettili', 'Alimentazione', 'Eventi', 'Riproduzione', 'Cuccioli'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).send({ message: 'Errore durante esportazione' });
  }
};

export async function generateReptilePDF(req, res) {


  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const reptileId = req.params.id;

  try {

    const userId = req.user.userid;
    const user = await User.findById(userId);
    const { plan } = getUserPlan(user);

    if (plan === 'free') {
      return res.status(403).json({
        message: 'Il download del PDF è disponibile solo per utenti con piano Basic o Premium attivo.'
      });
    }

    const reptile = await Reptile.findById(reptileId).lean();

    const events = await Event.find({ reptile: reptileId }).sort({ date: -1 }).lean();
    const feedings = await Feeding.find({ reptile: reptileId }).sort({ date: -1 }).lean();
    const breedings = await Breeding.find({
      $or: [{ male: reptileId }, { female: reptileId }]
    }).populate('male female').lean();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${(reptile.morph || 'reptile').replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // --- Header ---
    doc
      .font('Helvetica-Bold')
      .fontSize(26)
      .fillColor('#2E8B57')
      .text(`Informazioni del rettile ${reptile.name || ''}`, { underline: true, align: 'center' })
      .moveDown(1.5);

    // --- Basic Information ---
    doc.fontSize(14).fillColor('black').font('Helvetica');
    doc.text('Informazioni Base', { underline: true });
    doc.moveDown(0.5);

    const baseInfo = [
      `Specie: ${reptile.species || '-'}`,
      `Sesso: ${reptile.sex === 'M' ? 'Maschio' : reptile.sex === 'F' ? 'Femmina' : 'Sconosciuto'}`,
      `Morph: ${reptile.morph || '-'}`,
      `Data di nascita: ${reptile.birthDate ? reptile.birthDate.toLocaleDateString() : '-'}`,
      `Note: ${reptile.notes || '-'}`,
      `Madre: ${reptile.parents?.mother || '-'}`,
      `Padre: ${reptile.parents?.father || '-'}`
    ];
    baseInfo.forEach(line => doc.text(line));
    doc.moveDown();


    // --- Documentation ---
    doc.fontSize(16).fillColor('#2E8B57').font('Helvetica-Bold').text('Documentazione', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('black').font('Helvetica');
    if (reptile.documents?.cites?.number) {
      doc.list([
        `CITES: ${reptile.documents.cites.number} (${reptile.documents.cites.issueDate?.toLocaleDateString() || 'data sconosciuta'})`
      ]);
    }
    if (reptile.documents?.microchip?.code) {
      doc.list([
        `Microchip: ${reptile.documents.microchip.code} (${reptile.documents.microchip.implantDate?.toLocaleDateString() || 'data sconosciuta'})`
      ]);
    }
    if (!reptile.documents?.cites?.number && !reptile.documents?.microchip?.code) {
      doc.text('Nessuna documentazione disponibile.');
    }
    doc.moveDown();

    // --- Recorded events ---
    doc.fontSize(16).fillColor('#2E8B57').font('Helvetica-Bold').text('Eventi registrati', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('black').font('Helvetica');
    if (events.length === 0) {
      doc.text('Nessun evento registrato.');
    } else {
      const eventi = events.map(event => {
        const labelMap = {
          shed: 'Muta',
          feces: 'Feci',
          vet: 'Visita Veterinaria',
          weight: 'Peso'
        };
        const label = labelMap[event.type] || event.type;
        const pesoInfo = event.type === 'weight' && event.weight ? ` (${event.weight}g)` : '';
        return `- ${label}: ${new Date(event.date).toLocaleDateString()}${pesoInfo} | Note: ${event.notes || '-'}`;
      });
      doc.list(eventi);
    }
    doc.moveDown();

    // --- Diet ---
    doc.fontSize(16).fillColor('#2E8B57').font('Helvetica-Bold').text('Alimentazione', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('black').font('Helvetica');
    if (feedings.length === 0) {
      doc.text('Nessun pasto registrato.');
    } else {
      const pasti = feedings.map(feed => `- ${new Date(feed.date).toLocaleDateString()} | ${feed.foodType} x${feed.quantity || 1} (${feed.weightPerUnit}g ciascuno) | Esito: ${feed.wasEaten ? 'riuscito' : 'fallito'}${feed.retryAfterDays ? ` | Ritenta tra ${feed.retryAfterDays}g` : ''} | Note: ${feed.notes || '-'}`);
      doc.list(pasti);
    }
    doc.moveDown();

    // --- Pairings ---
    doc.fontSize(16).fillColor('#2E8B57').font('Helvetica-Bold').text('Accoppiamenti', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('black').font('Helvetica');
    if (breedings.length === 0) {
      doc.text('Nessun accoppiamento registrato.');
    } else {
      breedings.forEach(b => {
        const maschio = b.male?.morph || 'Maschio sconosciuto';
        const femmina = b.female?.morph || 'Femmina sconosciuta';
        doc.text(`- Anno: ${b.year} | Maschio: ${maschio} | Femmina: ${femmina}`);
        const outcomes = {
          Success: 'Successo',
          Partial: 'Parziale',
          Failed: 'Fallito',
          Unknown: 'Non terminato'
        };
        doc.text(`  Esito: ${outcomes[b.outcome] || b.outcome}`);
        if (b.notes) doc.text(`  Note: ${b.notes}`);

        // Reproductive events
        const eventiTradotti = {
          Mating: 'Accoppiamento',
          Ovulation: 'Ovulazione',
          'Prelay Shed': 'Muta pre-deposizione',
          'Egg Laid': 'Deposizione delle uova',
          Birth: 'Nascita',
          Hatching: 'Schiusa',
          Failed: 'Fallito'
        };
        if (b.events?.length) {
          b.events.forEach(evt => {
            const nomeEvento = eventiTradotti[evt.type] || evt.type;
            doc.text(`    • ${nomeEvento}: ${new Date(evt.date).toLocaleDateString()} | Note: ${evt.notes || '-'}`);
          });
        }

        // Hatchlings
        if (b.hatchlings?.length) {
          doc.text('   Schiuse:');
          b.hatchlings.forEach(h => {
            doc.text(`      - Morph: ${h.morph || '-'} | Peso: ${h.weight || '-'}g | Sesso: ${h.sex || '-'}`);
          });
        }

        doc.moveDown(0.8);
      });
    }

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Errore nella generazione del PDF');
  }
}
