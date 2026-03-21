import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateCustomCitesDocument = async (req, res) => {
    try {
        // Estrai i dati inviati dal frontend dal body della richiesta
        // Personalizza i campi a seconda di ciò che invii dal tuo Form/Modal
        const { sellerInfo, buyerInfo, animalInfo, date } = req.body;

        // 1. Crea un nuovo documento PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // Dimensioni standard A4
        const { width, height } = page.getSize();

        // 2. Incorpora i font standard
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // --- HELPER: Funzione per disegnare il testo più facilmente ---
        const drawText = (text, x, y, size = 10, font = fontRegular, color = rgb(0, 0, 0)) => {
            page.drawText(text, { x, y, size, font, color });
        };

        // --- HEADER ---
        // Striscia colorata in alto (Stile Dark per un look professionale / brandizzato SnakeBee)
        page.drawRectangle({
            x: 0, y: height - 85, 
            width: width, height: 85,
            color: rgb(0.12, 0.12, 0.12) // Grigio scuro
        });

        // Testo Header
        drawText('SNAKEBEE', 50, height - 40, 24, fontBold, rgb(1, 1, 1)); // Bianco
        drawText('DOCUMENTO DI CESSIONE AI FINI CITES', 50, height - 60, 12, fontBold, rgb(0.8, 0.8, 0.8));

        // --- RIFERIMENTI NORMATIVI ---
        drawText('Dichiarazione di cessione gratuita/vendita di esemplari inclusi nell\'Allegato B/C del Regolamento (CE) n. 338/97', 50, height - 120, 9, fontBold);
        drawText('e successive modifiche ed integrazioni.', 50, height - 135, 9, fontBold);

        let currentY = height - 170; // Cursore verticale

        // --- HELPER: Funzione per creare i blocchi delle Sezioni ---
        const drawSection = (title, items) => {
            // Sfondo del titolo della sezione (Grigio chiaro)
            page.drawRectangle({
                x: 45, y: currentY - 15, 
                width: width - 90, height: 22,
                color: rgb(0.92, 0.92, 0.92)
            });
            drawText(title, 50, currentY - 10, 11, fontBold);
            
            currentY -= 35;

            // Stampa i campi: Etichetta in grassetto, Valore normale
            items.forEach(item => {
                drawText(`${item.label}:`, 50, currentY, 10, fontBold);
                drawText(`${item.value || '_______________________'}`, 180, currentY, 10, fontRegular);
                currentY -= 20;
            });
            currentY -= 15; // Margine in basso prima della prossima sezione
        };

        // --- SEZIONE 1: CEDENTE ---
        drawSection('1. DATI DEL CEDENTE (Allevatore / Proprietario attuale)', [
            { label: 'Nome e Cognome', value: sellerInfo?.name },
            { label: 'Indirizzo e Città', value: sellerInfo?.address },
            { label: 'Indirizzo Email', value: sellerInfo?.email },
            { label: 'Numero di telefono', value: sellerInfo?.PhoneNumber }
        ]);

        // --- SEZIONE 2: CESSIONARIO ---
        drawSection('2. DATI DEL CESSIONARIO (Nuovo Proprietario)', [
            { label: 'Nome e Cognome', value: buyerInfo?.name },
            { label: 'Indirizzo e Città', value: buyerInfo?.address },
            { label: 'Indirizzo Email', value: buyerInfo?.email },
            { label: 'Numero di telefono', value: buyerInfo?.PhoneNumber }
        ]);

        // --- SEZIONE 3: ESEMPLARE ---
        drawSection('3. DATI DELL\'ESEMPLARE', [
            { label: 'Specie (Nome Scientifico)', value: animalInfo?.species },
            { label: 'Morph / Mutazione', value: animalInfo?.morph },
            { label: 'Sesso', value: animalInfo?.sex },
            { label: 'Data di Nascita', value: animalInfo?.birthDate },
            { label: 'Paese di origine', value: animalInfo?.state },
            { label: 'Estremi marcaggio', value: animalInfo?.microchip },
            { label: 'Num. Protocollo CITES', value: animalInfo?.protocolNumber },
        ]);

        // --- SEZIONE 4: DICHIARAZIONE ---
        currentY -= 10;
        const todayDate = date || new Date().toLocaleDateString('it-IT');
        const cedenteName = sellerInfo?.name || '_______________________';
        
        const declarationText = `Il sottoscritto ${cedenteName} dichiara sotto la propria responsabilità che ` +
            `l'esemplare\nsopra descritto è nato in cattività ed è stato regolarmente ceduto in data ${todayDate}\n` +
            `nel pieno rispetto della normativa CITES vigente in materia fornendo tutte le informazioni necessarie\n` +  
            `al ricevente sulle operazione richieste per garantire una corretta assistenza degli esemplari.`;
        
        drawText('DICHIARAZIONE:', 50, currentY, 10, fontBold);
        currentY -= 20;
        
        // Vai a capo automaticamente per la dichiarazione
        const lines = declarationText.split('\n');
        lines.forEach(line => {
            drawText(line, 50, currentY, 10, fontRegular);
            currentY -= 15;
        });

        // --- FIRME ---
        currentY -= 50;
        drawText('Firma del Cedente', 70, currentY, 10, fontBold);
        page.drawLine({ start: { x: 50, y: currentY - 20 }, end: { x: 200, y: currentY - 20 }, thickness: 1 });
        
        drawText('Firma del Cessionario', 370, currentY, 10, fontBold);
        page.drawLine({ start: { x: 350, y: currentY - 20 }, end: { x: 500, y: currentY - 20 }, thickness: 1 });

        drawText('Data',  50, 40, 8,);
        page.drawLine({ start: { x: 30, y: 40 }, end: { x: 220, y: 40 - 20 }, thickness: 1 });

        // 3. Serializza e Salva
        const pdfBytes = await pdfDoc.save();

        // 4. Invia il PDF al client
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=SnakeBee_CITES_Document.pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Errore nella generazione del CITES dinamico:", error);
        res.status(500).json({ message: 'Errore durante la generazione del documento CITES' });
    }
};