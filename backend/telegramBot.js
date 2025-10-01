import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

// --- Costanti per una migliore manutenibilità ---
const CALLBACK_PREFIX = {
    REPTILE_SELECTED: 'reptile_',
    ADD_FEEDING: 'add_feeding_',
    ADD_EVENT: 'add_event_',
    VIEW_FEEDINGS: 'feedings_',
    VIEW_EVENTS: 'events_',
    SET_EVENT_TYPE: 'set_event_type_',
    BACK_TO_LIST: 'back_to_reptiles'
};

let bot;
const userState = {}; // Stato conversazione in memoria

// --- Funzioni Helper ---
function escapeMarkdown(text) {
    if (!text) return '';
    return text.toString().replace(/([_*[\]()~`>#+-=|{}.!])/g, "\\$1");
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Funzioni API ---
// Un unico punto per gestire le chiamate axios, aggiungendo l'header e la gestione errori
async function apiRequest(method, url, chatId, data = {}) {
    try {
        const config = {
            method,
            url: `${process.env.BACKEND_URL}/api/telegram${url}`,
            headers: { "x-telegram-id": chatId },
            data
        };
        const response = await axios(config);
        return response.data;
    } catch (err) {
        console.error(`API Error on ${method} ${url}:`, err.response?.data || err.message);
        // Rilancia l'errore per gestirlo nel chiamante
        throw new Error(err.response?.data?.message || "Si è verificato un errore di comunicazione con il server.");
    }
}


// --- Inizializzazione e Comandi Principali ---
if (!global.bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    global.bot = bot;

    // Imposta i comandi del bot nel menu di Telegram
    bot.setMyCommands([
        { command: '/start', description: 'Avvia il bot e collega il tuo account' },
        { command: '/reptiles', description: 'Mostra la lista dei tuoi rettili' },
        { command: '/inventory', description: 'Visualizza il tuo inventario (Breeder)' },
        { command: '/cancel', description: 'Annulla l\'operazione corrente' }
    ]);

    // Comando /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `Ciao ${msg.from.first_name}! 👋\nTi sto generando un link per collegare il tuo account SnakeBee...`);
        bot.sendChatAction(chatId, 'typing');
        try {
            const data = await apiRequest('get', '/link', chatId, { params: { telegramId: chatId } });
            bot.sendMessage(chatId, `Per collegare il tuo account, clicca qui: ${data.url}\n\nUna volta fatto, usa /reptiles per iniziare!`);
        } catch (err) {
            bot.sendMessage(chatId, `❌ Errore nel generare il link: ${err.message}. Riprova più tardi.`);
        }
    });

    // Comando /reptiles
    bot.onText(/\/reptiles/, (msg) => showReptileList(msg.chat.id));

    // Comando /inventory
    bot.onText(/\/inventory/, async (msg) => {
        const chatId = msg.chat.id;
        bot.sendChatAction(chatId, 'typing');
        try {
            const { inventory } = await apiRequest('get', '/inventory', chatId);
            if (!inventory || inventory.length === 0) {
                return bot.sendMessage(chatId, "Il tuo inventario è vuoto. 텅 빈");
            }
            let text = "📦 *Il tuo inventario:*\n\n";
            inventory.forEach(item => {
                text += `• *${escapeMarkdown(item.foodType)}* (${item.weightPerUnit}g): ${item.quantity} unità\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        } catch (err) {
            bot.sendMessage(chatId, `❌ ${err.message}`);
        }
    });

    // Comando /cancel
    bot.onText(/\/cancel/, (msg) => {
        const chatId = msg.chat.id;
        if (userState[chatId]) {
            delete userState[chatId];
            bot.sendMessage(chatId, "👍 Operazione annullata.");
        } else {
            bot.sendMessage(chatId, "Nessuna operazione in corso da annullare.");
        }
    });

    // --- Gestori di Callback e Messaggi ---
    bot.on("callback_query", handleCallbackQuery);
    bot.on("message", handleMessage);

} else {
    bot = global.bot;
}

// --- Logica di Visualizzazione ---

async function showReptileList(chatId, messageId = null) {
    const text = "Sto caricando i tuoi rettili...";
    
    // Se messageId è presente, modifica il messaggio esistente, altrimenti ne invia uno nuovo
    if (messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
    } else {
        bot.sendMessage(chatId, text);
    }
    
    bot.sendChatAction(chatId, 'typing');

    try {
        const { reptiles } = await apiRequest('get', '/reptiles', chatId);
        if (!reptiles || reptiles.length === 0) {
            const noReptilesText = "Non hai ancora registrato rettili 🦎. Aggiungine uno dall'app!";
            if (messageId) {
                return bot.editMessageText(noReptilesText, { chat_id: chatId, message_id: messageId });
            }
            return bot.sendMessage(chatId, noReptilesText);
        }

        const inlineKeyboard = reptiles.map(r => ([{
            text: r.name || "Senza nome",
            callback_data: `${CALLBACK_PREFIX.REPTILE_SELECTED}${r._id}`
        }]));

        const options = {
            chat_id: chatId,
            text: "Seleziona un rettile:",
            reply_markup: { inline_keyboard: inlineKeyboard }
        };
        
        if (messageId) {
            options.message_id = messageId;
            bot.editMessageText(options.text, options);
        } else {
            bot.sendMessage(chatId, options.text, {reply_markup: options.reply_markup});
        }

    } catch (err) {
        const errorText = `❌ Errore nel recuperare la lista: ${err.message}`;
        if (messageId) {
            bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId });
        } else {
            bot.sendMessage(chatId, errorText);
        }
    }
}

async function showReptileDetails(chatId, reptileId, messageId) {
    bot.editMessageText("Caricamento dettagli...", { chat_id: chatId, message_id: messageId });
    bot.sendChatAction(chatId, 'typing');

    try {
        const { reptile: r } = await apiRequest('get', `/reptile/${reptileId}`, chatId);
        
        let text = `📋 *${escapeMarkdown(r.name || "Senza nome")}*\n\n` +
                   `🐍 Specie: ${escapeMarkdown(r.species || "-")}\n` +
                   `🎨 Morph: ${escapeMarkdown(r.morph || "-")}\n` +
                   `젠더 Sesso: ${r.sex || "-"}\n` +
                   (r.birthDate ? `🎂 Nascita: ${new Date(r.birthDate).toLocaleDateString("it-IT")}\n` : '') +
                   (r.foodType ? `🍗 Dieta: ${escapeMarkdown(r.foodType)}\n` : '');
        
        const keyboard = [
            [{ text: "Aggiungi Alimentazione 🥩", callback_data: `${CALLBACK_PREFIX.ADD_FEEDING}${r._id}` }],
            [{ text: "Aggiungi Evento 📅", callback_data: `${CALLBACK_PREFIX.ADD_EVENT}${r._id}` }],
            [{ text: "Storico Alimentazioni 🍽️", callback_data: `${CALLBACK_PREFIX.VIEW_FEEDINGS}${r._id}` }, { text: "Storico Eventi 📜", callback_data: `${CALLBACK_PREFIX.VIEW_EVENTS}${r._id}` }],
            [{ text: "⬅️ Torna alla lista", callback_data: CALLBACK_PREFIX.BACK_TO_LIST }]
        ];
        
        // Se ci sono foto, le invia prima del messaggio con la tastiera
        if (r.image?.length) {
            await bot.sendPhoto(chatId, r.image[0]); // Invia solo la prima per non spammare
        }
        
        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard }
        });

    } catch (err) {
        bot.editMessageText(`❌ Errore: ${err.message}`, { chat_id: chatId, message_id: messageId });
    }
}

async function showHistory(chatId, reptileId, type) {
    bot.sendChatAction(chatId, 'typing');
    try {
        if (type === 'feedings') {
            const { feedings } = await apiRequest('get', `/reptile/${reptileId}/feedings`, chatId);
            if (!feedings?.length) return bot.sendMessage(chatId, "Nessun feeding registrato per questo rettile.");
            
            let text = "🍽 *Ultimi 5 feedings:*\n\n";
            feedings.forEach(f => {
                text += `• ${new Date(f.date).toLocaleDateString("it-IT")}: ${f.foodType}, qty: ${f.quantity || "-"} - ${f.wasEaten ? 'Mangiato ✅' : 'Non mangiato ❌'}\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

        } else if (type === 'events') {
            const { events } = await apiRequest('get', `/reptile/${reptileId}/events`, chatId);
            if (!events?.length) return bot.sendMessage(chatId, "Nessun evento registrato per questo rettile.");

            let text = "📜 *Ultimi eventi:*\n\n";
            events.slice(0, 5).forEach(ev => {
                const date = new Date(ev.date).toLocaleDateString("it-IT");
                const extra = ev.weight ? ` - Peso: ${ev.weight}g` : "";
                text += `• *${capitalize(ev.type)}* (${date})${extra} ${ev.notes ? `- ${escapeMarkdown(ev.notes)}` : ""}\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
    } catch (err) {
        bot.sendMessage(chatId, `❌ Errore nel recuperare lo storico: ${err.message}`);
    }
}

// --- Gestori di Azioni e Conversazioni ---

async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    
    // Risponde subito al callback per far sparire l'icona di caricamento sul client
    bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith(CALLBACK_PREFIX.REPTILE_SELECTED)) {
        const reptileId = data.substring(CALLBACK_PREFIX.REPTILE_SELECTED.length);
        showReptileDetails(chatId, reptileId, messageId);
    } else if (data === CALLBACK_PREFIX.BACK_TO_LIST) {
        showReptileList(chatId, messageId);
    } else if (data.startsWith(CALLBACK_PREFIX.VIEW_FEEDINGS)) {
        const reptileId = data.substring(CALLBACK_PREFIX.VIEW_FEEDINGS.length);
        showHistory(chatId, reptileId, 'feedings');
    } else if (data.startsWith(CALLBACK_PREFIX.VIEW_EVENTS)) {
        const reptileId = data.substring(CALLBACK_PREFIX.VIEW_EVENTS.length);
        showHistory(chatId, reptileId, 'events');
    } else if (data.startsWith(CALLBACK_PREFIX.ADD_FEEDING)) {
        const reptileId = data.substring(CALLBACK_PREFIX.ADD_FEEDING.length);
        startFeedingConversation(chatId, reptileId);
    } else if (data.startsWith(CALLBACK_PREFIX.ADD_EVENT)) {
        const reptileId = data.substring(CALLBACK_PREFIX.ADD_EVENT.length);
        startEventConversation(chatId, reptileId);
    } else if (data.startsWith(CALLBACK_PREFIX.SET_EVENT_TYPE)) {
        const eventType = data.substring(CALLBACK_PREFIX.SET_EVENT_TYPE.length);
        handleEventConversation(chatId, eventType, true); // Passa 'true' per indicare che è un input da tastiera
    }
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    // Ignora i messaggi se non c'è una conversazione attiva o se è un comando
    if (!userState[chatId] || msg.text.startsWith('/')) return;

    const state = userState[chatId];
    if (state.action === 'add_feeding') {
        await handleFeedingConversation(chatId, msg.text);
    } else if (state.action === 'add_event') {
        await handleEventConversation(chatId, msg.text);
    }
}

// --- Logica delle Conversazioni ---

function startFeedingConversation(chatId, reptileId) {
    userState[chatId] = { action: 'add_feeding', reptileId, step: 'foodType', data: {} };
    bot.sendMessage(chatId, "🥩 Inserisci il *tipo* di cibo (es. Topo, Ratto). \nUsa /cancel per annullare.", { parse_mode: "Markdown" });
}

async function handleFeedingConversation(chatId, text) {
    const state = userState[chatId];
    if (!state) return;

    try {
        switch (state.step) {
            case 'foodType':
                state.data.foodType = text;
                state.step = 'quantity';
                bot.sendMessage(chatId, "🔢 Inserisci la *quantità*:", { parse_mode: "Markdown" });
                break;
            case 'quantity':
                state.data.quantity = parseInt(text, 10);
                if (isNaN(state.data.quantity)) return bot.sendMessage(chatId, "Per favore, inserisci un numero valido.");
                state.step = 'weightPerUnit';
                bot.sendMessage(chatId, "⚖️ Inserisci il *peso per unità* in grammi:", { parse_mode: "Markdown" });
                break;
            case 'weightPerUnit':
                state.data.weightPerUnit = parseInt(text, 10);
                if (isNaN(state.data.weightPerUnit)) return bot.sendMessage(chatId, "Per favore, inserisci un numero valido.");
                state.step = 'wasEaten';
                bot.sendMessage(chatId, "✅ Il pasto è stato mangiato?", {
                    reply_markup: { inline_keyboard: [
                        [{ text: "Sì", callback_data: "feeding_eaten_yes" }],
                        [{ text: "No", callback_data: "feeding_eaten_no" }]
                    ]}
                });
                break;
            case 'wasEaten': // Questo step ora è gestito da un callback, ma lo teniamo per completezza
                state.data.wasEaten = ['sì', 'si', 's', 'yes', 'y'].includes(text.toLowerCase());
                state.step = 'notes';
                bot.sendMessage(chatId, "📝 Aggiungi delle note (o scrivi 'no'):");
                break;
            case 'notes':
                state.data.notes = (text.toLowerCase() === 'no') ? '' : text;
                bot.sendMessage(chatId, "Salvataggio in corso...");
                await apiRequest('post', `/reptile/${state.reptileId}/feedings`, chatId, state.data);
                bot.sendMessage(chatId, "✅ Alimentazione registrata con successo!");
                delete userState[chatId];
                break;
        }
    } catch (err) {
        bot.sendMessage(chatId, `❌ Errore: ${err.message}\nOperazione annullata.`);
        delete userState[chatId];
    }
}

function startEventConversation(chatId, reptileId) {
    userState[chatId] = { action: 'add_event', reptileId, step: 'type', data: {} };
    bot.sendMessage(chatId, "📅 Seleziona il *tipo* di evento o scrivilo. \nUsa /cancel per annullare.", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "Muta", callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}shed` }, { text: "Feci", callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}feces` }],
                [{ text: "Veterinario", callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}vet` }, { text: "Pesata", callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}weight` }]
            ]
        }
    });
}

async function handleEventConversation(chatId, text, fromCallback = false) {
    const state = userState[chatId];
    if (!state) return;

    try {
        switch (state.step) {
            case 'type':
                state.data.type = text;
                state.step = 'notes';
                bot.sendMessage(chatId, `Tipo impostato: *${text}*.\n📝 Aggiungi delle note (o scrivi 'no'):`, { parse_mode: "Markdown" });
                break;
            case 'notes':
                state.data.notes = (text.toLowerCase() === 'no') ? '' : text;
                if (state.data.type === 'weight') {
                    state.step = 'weight';
                    bot.sendMessage(chatId, "⚖️ Inserisci il *peso* in grammi:");
                } else {
                    await saveEvent(chatId, state);
                }
                break;
            case 'weight':
                state.data.weight = parseInt(text, 10);
                if (isNaN(state.data.weight)) return bot.sendMessage(chatId, "Per favore, inserisci un numero valido.");
                await saveEvent(chatId, state);
                break;
        }
    } catch (err) {
        bot.sendMessage(chatId, `❌ Errore: ${err.message}\nOperazione annullata.`);
        delete userState[chatId];
    }
}

async function saveEvent(chatId, state) {
    bot.sendMessage(chatId, "Salvataggio evento in corso...");
    await apiRequest('post', `/reptile/${state.reptileId}/events`, chatId, state.data);
    bot.sendMessage(chatId, "✅ Evento registrato con successo!");
    delete userState[chatId];
}


export default bot;