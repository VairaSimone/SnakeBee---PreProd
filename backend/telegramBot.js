import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
i18next
  .use(Backend)
  .init({
    // Lingua di fallback se la lingua dell'utente non è disponibile
    fallbackLng: 'it',
    // Lingue da pre-caricare in memoria
    preload: ['en', 'it'],
    // Namespace (di solito 'translation' è lo standard)
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      // Percorso ai tuoi file di traduzione
      // Assicurati che il percorso sia corretto rispetto alla posizione di telegramBot.js
      loadPath: path.join(__dirname, '../locales/{{lng}}/translation.json')
    }
  });
async function getUserTranslator(chatId) {
    const user = await User.findOne({ telegramId: chatId }).select('language').lean();
    const lang = user?.language || 'it'; // 'it' come fallback 
    return (key, options) => i18next.t(key, { lng: lang, ...options });
}
// --- Costanti per una migliore manutenibilità ---
const CALLBACK_PREFIX = {
    REPTILE_SELECTED: 'reptile_',
    ADD_FEEDING: 'add_feeding_',
    ADD_EVENT: 'add_event_',
    VIEW_FEEDINGS: 'feedings_',
    VIEW_EVENTS: 'events_',
    SET_EVENT_TYPE: 'set_event_type_',
    BACK_TO_LIST: 'back_to_reptiles',
    SELECT_INVENTORY_ITEM: 'inv_item_', // Selezione articolo inventario
    OTHER_FOOD_TYPE: 'other_food'
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
        };
               if (method.toLowerCase() === 'post') {
            config.data = data;
        }
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
    
    const t = i18next.t; // Translator globale per i comandi

    bot.setMyCommands([
        { command: '/start', description: t('telegram.commands.start') },
        { command: '/reptiles', description: t('telegram.commands.reptiles') },
        { command: '/inventory', description: t('telegram.commands.inventory') },
        { command: '/cancel', description: t('telegram.commands.cancel') }
    ]);

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const t = await getUserTranslator(chatId);
        bot.sendMessage(chatId, t('telegram.welcome', { name: msg.from.first_name }));
        bot.sendChatAction(chatId, 'typing');
        try {
            const data = await apiRequest('get', `/link?telegramId=${chatId}`, chatId);
            bot.sendMessage(chatId, t('telegram.link_generated', { url: data.url }));
        } catch (err) {
            bot.sendMessage(chatId, t('telegram.link_error', { error: err.message }));
        }
    });

    bot.onText(/\/reptiles/, (msg) => showReptileList(msg.chat.id));

    bot.onText(/\/inventory/, async (msg) => {
        const chatId = msg.chat.id;
        const t = await getUserTranslator(chatId);
        bot.sendChatAction(chatId, 'typing');
        try {
            const { inventory } = await apiRequest('get', '/inventory', chatId);
            if (!inventory || inventory.length === 0) {
                return bot.sendMessage(chatId, t('telegram.inventory_empty'));
            }
            let text = t('telegram.inventory_title');
            inventory.forEach(item => {
                text += t('telegram.inventory_item', {
                    foodType: escapeMarkdown(item.foodType),
                    weight: item.weightPerUnit,
                    quantity: item.quantity
                });
            });
            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        } catch (err) {
            bot.sendMessage(chatId, `❌ ${err.message}`);
        }
    });

    bot.onText(/\/cancel/, async (msg) => {
        const chatId = msg.chat.id;
        const t = await getUserTranslator(chatId);
        if (userState[chatId]) {
            delete userState[chatId];
            bot.sendMessage(chatId, t('telegram.operation_cancelled'));
        } else {
            bot.sendMessage(chatId, t('telegram.no_operation_to_cancel'));
        }
    });

    bot.on("callback_query", handleCallbackQuery);
    bot.on("message", handleMessage);

} else {
    bot = global.bot;
}

// --- Logica di Visualizzazione ---

async function showReptileList(chatId, messageId = null) {
    const t = await getUserTranslator(chatId);
    const text = t('telegram.loading_reptiles');
    
    if (messageId) {
        bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
    } else {
        bot.sendMessage(chatId, text);
    }
    
    bot.sendChatAction(chatId, 'typing');

    try {
        const { reptiles } = await apiRequest('get', '/reptiles', chatId);
        if (!reptiles || reptiles.length === 0) {
            const noReptilesText = t('telegram.no_reptiles');
            if (messageId) {
                return bot.editMessageText(noReptilesText, { chat_id: chatId, message_id: messageId });
            }
            return bot.sendMessage(chatId, noReptilesText);
        }

        const inlineKeyboard = reptiles.map(r => ([{
            text: r.name || t('telegram.unnamed'),
            callback_data: `${CALLBACK_PREFIX.REPTILE_SELECTED}${r._id}`
        }]));

        const options = {
            chat_id: chatId,
            text: t('telegram.select_reptile'),
            reply_markup: { inline_keyboard: inlineKeyboard }
        };
        
        if (messageId) {
            options.message_id = messageId;
            bot.editMessageText(options.text, options);
        } else {
            bot.sendMessage(chatId, options.text, {reply_markup: options.reply_markup});
        }

    } catch (err) {
        const errorText = t('telegram.list_error', { error: err.message });
        if (messageId) {
            bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId });
        } else {
            bot.sendMessage(chatId, errorText);
        }
    }
}

async function showReptileDetails(chatId, reptileId, messageId) {
    const t = await getUserTranslator(chatId);
    bot.editMessageText(t('telegram.loading_details'), { chat_id: chatId, message_id: messageId });
    bot.sendChatAction(chatId, 'typing');

    try {
        const { reptile: r } = await apiRequest('get', `/reptile/${reptileId}`, chatId);
        
        const birthDateText = r.birthDate ? t('telegram.birth_date', { date: new Date(r.birthDate).toLocaleDateString("it-IT") }) : '';
        const dietText = r.foodType ? t('telegram.diet', { foodType: escapeMarkdown(r.foodType) }) : '';

        const text = t('telegram.reptile_details', {
            name: escapeMarkdown(r.name || t('telegram.unnamed')),
            species: escapeMarkdown(r.species || "-"),
            morph: escapeMarkdown(r.morph || "-"),
            sex: r.sex || "-",
            birthDate: birthDateText,
            diet: dietText
        });
        
        const keyboard = [
            [{ text: t('telegram.add_feeding'), callback_data: `${CALLBACK_PREFIX.ADD_FEEDING}${r._id}` }],
            [{ text: t('telegram.add_event'), callback_data: `${CALLBACK_PREFIX.ADD_EVENT}${r._id}` }],
            [{ text: t('telegram.feeding_history'), callback_data: `${CALLBACK_PREFIX.VIEW_FEEDINGS}${r._id}` }, { text: t('telegram.event_history'), callback_data: `${CALLBACK_PREFIX.VIEW_EVENTS}${r._id}` }],
            [{ text: t('telegram.back_to_list'), callback_data: CALLBACK_PREFIX.BACK_TO_LIST }]
        ];
        
        if (r.image?.length) {
            await bot.sendPhoto(chatId, r.image[0]);
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
    const t = await getUserTranslator(chatId);
    bot.sendChatAction(chatId, 'typing');
    try {
        if (type === 'feedings') {
            const { feedings } = await apiRequest('get', `/reptile/${reptileId}/feedings`, chatId);
            if (!feedings?.length) return bot.sendMessage(chatId, t('telegram.no_feedings_recorded'));
            
            let text = t('telegram.last_5_feedings_title');
            feedings.forEach(f => {
                text += t('telegram.feeding_history_item', {
                    date: new Date(f.date).toLocaleDateString("it-IT"),
                    foodType: f.foodType,
                    quantity: f.quantity || "-",
                    status: f.wasEaten ? t('telegram.eaten') : t('telegram.not_eaten')
                });
            });
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

        } else if (type === 'events') {
            const { events } = await apiRequest('get', `/reptile/${reptileId}/events`, chatId);
            if (!events?.length) return bot.sendMessage(chatId, t('telegram.no_events_recorded'));

            let text = t('telegram.latest_events_title');
            events.slice(0, 5).forEach(ev => {
                const extra = ev.weight ? t('telegram.weight_extra', { weight: ev.weight }) : "";
                text += t('telegram.event_history_item', {
                    type: capitalize(ev.type),
                    date: new Date(ev.date).toLocaleDateString("it-IT"),
                    extra: extra,
                    notes: ev.notes ? `- ${escapeMarkdown(ev.notes)}` : ""
                });
            });
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
    } catch (err) {
        bot.sendMessage(chatId, t('telegram.history_error', { error: err.message }));
    }
}

// --- Gestori di Azioni e Conversazioni ---

async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    
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
        handleEventConversation(chatId, eventType, true);
    } else if (data.startsWith(CALLBACK_PREFIX.SELECT_INVENTORY_ITEM)) {
        const inventoryItemId = data.substring(CALLBACK_PREFIX.SELECT_INVENTORY_ITEM.length);
        await selectInventoryItem(chatId, inventoryItemId, messageId);
    } else if (data === CALLBACK_PREFIX.OTHER_FOOD_TYPE) {
        await startManualFeeding(chatId, messageId);
    } else if (data === 'feeding_eaten_yes' || data === 'feeding_eaten_no') {
        const wasEaten = data === 'feeding_eaten_yes';
        await advanceFeedingConversationAfterEaten(chatId, wasEaten, messageId);
    }
}

async function startManualFeeding(chatId, messageId) {
    const t = await getUserTranslator(chatId);
    const state = userState[chatId];
    if (!state || state.step !== 'select_food') {
        return bot.sendMessage(chatId, t('telegram.session_expired'));
    }
    
    await bot.editMessageText(t('telegram.chose_other'), { chat_id: chatId, message_id: messageId, parse_mode: "Markdown" });
    
    state.step = 'manual_foodType';
    bot.sendMessage(chatId, t('telegram.enter_food_type_manual'), { parse_mode: "Markdown" });
}

async function selectInventoryItem(chatId, inventoryItemId, messageId) {
    const t = await getUserTranslator(chatId);
    const state = userState[chatId];
    if (!state || state.step !== 'select_food') {
        return bot.sendMessage(chatId, t('telegram.session_expired'));
    }
    
    try {
        const { inventory } = await apiRequest('get', '/inventory', chatId);
        const selectedItem = inventory.find(item => item._id === inventoryItemId);

        if (!selectedItem) {
             return bot.sendMessage(chatId, t('telegram.item_not_found'));
        }

        state.data.foodType = selectedItem.foodType;
        state.data.weightPerUnit = selectedItem.weightPerUnit;
        
        await bot.editMessageText(t('telegram.you_selected_inventory', {
            foodType: escapeMarkdown(selectedItem.foodType),
            weight: selectedItem.weightPerUnit
        }), { chat_id: chatId, message_id: messageId, parse_mode: "Markdown" });

        state.step = 'quantity';
        bot.sendMessage(chatId, t('telegram.enter_quantity_inventory', { quantity: selectedItem.quantity }), { parse_mode: "Markdown" });

    } catch (err) {
        bot.sendMessage(chatId, t('telegram.inventory_selection_error', { error: err.message }));
        delete userState[chatId];
    }
}

async function advanceFeedingConversationAfterEaten(chatId, wasEaten, messageId) {
    const t = await getUserTranslator(chatId);
    const state = userState[chatId];
    if (!state || state.step !== 'wasEaten') {
        return bot.sendMessage(chatId, t('telegram.session_expired'));
    }

    try {
        state.data.wasEaten = wasEaten;

        const confirmationText = wasEaten ? t('telegram.meal_eaten_confirm') : t('telegram.meal_not_eaten_confirm');
        await bot.editMessageText(confirmationText, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown" });

        if (wasEaten) {
            bot.sendChatAction(chatId, 'typing');
            const { reptile } = await apiRequest('get', `/reptile/${state.reptileId}`, chatId);

            if (reptile.nextMealDay) {
                state.step = 'notes';
                bot.sendMessage(chatId, t('telegram.add_notes'));
            } else {
                state.step = 'ask_next_feeding_days';
                bot.sendMessage(chatId, t('telegram.ask_next_feeding'));
            }
        } else {
            state.step = 'notes';
            bot.sendMessage(chatId, t('telegram.add_notes'));
        }
    } catch (err) {
        console.error("Errore nell'avanzamento della conversazione dopo 'wasEaten':", err.message);
        bot.sendMessage(chatId, t('telegram.generic_error_retry', { error: err.message }));
        delete userState[chatId];
    }
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    if (!userState[chatId] || msg.text.startsWith('/')) return;

    const state = userState[chatId];
    if (state.action === 'add_feeding') {
        await handleFeedingConversation(chatId, msg.text);
    } else if (state.action === 'add_event') {
        await handleEventConversation(chatId, msg.text);
    }
}

// --- Logica delle Conversazioni ---

async function startFeedingConversation(chatId, reptileId) {
    const t = await getUserTranslator(chatId);
    userState[chatId] = { action: 'add_feeding', reptileId, step: 'check_inventory', data: {} };
    bot.sendChatAction(chatId, 'typing');

    try {
        const { inventory } = await apiRequest('get', '/inventory', chatId);

        if (inventory?.length) {
            userState[chatId].step = 'select_food';

            let text = t('telegram.select_from_inventory_or_other');
            const inventoryButtons = inventory.map((item) => {
                text += t('telegram.inventory_item', {
                    foodType: escapeMarkdown(item.foodType),
                    weight: item.weightPerUnit,
                    quantity: item.quantity
                });
                return [{ 
                    text: `${item.foodType} (${item.weightPerUnit}g) [${item.quantity}]`, 
                    callback_data: `${CALLBACK_PREFIX.SELECT_INVENTORY_ITEM}${item._id}`
                }];
            });

            inventoryButtons.push([{ text: t('telegram.other_manual_entry'), callback_data: CALLBACK_PREFIX.OTHER_FOOD_TYPE }]);

            bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: inventoryButtons }
            });

        } else {
            userState[chatId].step = 'manual_foodType';
            bot.sendMessage(chatId, t('telegram.enter_food_type'), { parse_mode: "Markdown" });
        }
    } catch (err) {
        if (err.message.includes("BREEDER")) {
            bot.sendMessage(chatId, t('telegram.inventory_for_breeder_only'));
        } else {
            console.error("Errore nel recupero inventario:", err.message);
        }
        userState[chatId].step = 'manual_foodType';
        bot.sendMessage(chatId, t('telegram.enter_food_type'), { parse_mode: "Markdown" });
    }
}

async function handleFeedingConversation(chatId, text) {
    const t = await getUserTranslator(chatId);
    const state = userState[chatId];
    if (!state) return;

    try {
        switch (state.step) {
            case 'manual_foodType':
                state.data.foodType = text;
                state.step = 'quantity';
                bot.sendMessage(chatId, t('telegram.enter_quantity'), { parse_mode: "Markdown" });
                break;
        
            case 'quantity':
                state.data.quantity = parseInt(text, 10);
                if (isNaN(state.data.quantity) || state.data.quantity <= 0) return bot.sendMessage(chatId, t('telegram.invalid_number_positive'));
                
                if (!state.data.weightPerUnit) {
                    state.step = 'weightPerUnit';
                    bot.sendMessage(chatId, t('telegram.enter_weight_per_unit'), { parse_mode: "Markdown" });
                } else {
                    state.step = 'wasEaten';
                    bot.sendMessage(chatId, t('telegram.preloaded_data_confirm', {
                        foodType: escapeMarkdown(state.data.foodType),
                        weight: state.data.weightPerUnit
                    }), {
                        parse_mode: "Markdown",
                        reply_markup: { inline_keyboard: [
                            [{ text: t('telegram.yes'), callback_data: "feeding_eaten_yes" }],
                            [{ text: t('telegram.no'), callback_data: "feeding_eaten_no" }]
                        ]}
                    });
                }
                break;
            case 'ask_next_feeding_days':
                const days = parseInt(text, 10);
                if (isNaN(days) || days <= 0) {
                    return bot.sendMessage(chatId, t('telegram.invalid_number_positive'));
                }
                state.data.nextMealDayManual = days;
                state.step = 'notes';
                bot.sendMessage(chatId, t('telegram.great_add_notes'));
                break;
            case 'weightPerUnit':
                state.data.weightPerUnit = parseInt(text, 10);
                if (isNaN(state.data.weightPerUnit) || state.data.weightPerUnit <= 0) return bot.sendMessage(chatId, t('telegram.invalid_number_positive'));
                state.step = 'wasEaten';
                bot.sendMessage(chatId, t('telegram.confirm_eaten'), {
                    reply_markup: { inline_keyboard: [
                        [{ text: t('telegram.yes'), callback_data: "feeding_eaten_yes" }],
                        [{ text: t('telegram.no'), callback_data: "feeding_eaten_no" }]
                    ]}
                });
                break;
            case 'notes':
                state.data.notes = (text.toLowerCase() === t('telegram.no').toLowerCase()) ? '' : text;
                bot.sendMessage(chatId, t('telegram.saving'));
                await apiRequest('post', `/reptile/${state.reptileId}/feedings`, chatId, state.data);
                bot.sendMessage(chatId, t('telegram.feeding_saved_success'));
                delete userState[chatId];
                break;
        }
    } catch (err) {
        bot.sendMessage(chatId, t('telegram.generic_error_cancelled', { error: err.message }));
        delete userState[chatId];
    }
}

async function startEventConversation(chatId, reptileId) {
    const t = await getUserTranslator(chatId);
    userState[chatId] = { action: 'add_event', reptileId, step: 'type', data: {} };
    bot.sendMessage(chatId, t('telegram.select_event_type'), {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: t('telegram.shed'), callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}shed` }, { text: t('telegram.feces'), callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}feces` }],
                [{ text: t('telegram.vet'), callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}vet` }, { text: t('telegram.weighing'), callback_data: `${CALLBACK_PREFIX.SET_EVENT_TYPE}weight` }]
            ]
        }
    });
}

async function handleEventConversation(chatId, text, fromCallback = false) {
    const t = await getUserTranslator(chatId);
    const state = userState[chatId];
    if (!state) return;

    try {
        switch (state.step) {
            case 'type':
                state.data.type = text;
                state.step = 'notes';
                bot.sendMessage(chatId, t('telegram.type_set_add_notes', { type: text }), { parse_mode: "Markdown" });
                break;
            case 'notes':
                state.data.notes = (text.toLowerCase() === t('telegram.no').toLowerCase()) ? '' : text;
                if (state.data.type === 'weight') {
                    state.step = 'weight';
                    bot.sendMessage(chatId, t('telegram.enter_weight'));
                } else {
                    await saveEvent(chatId, state);
                }
                break;
            case 'weight':
                state.data.weight = parseInt(text, 10);
                if (isNaN(state.data.weight)) return bot.sendMessage(chatId, t('telegram.invalid_number'));
                await saveEvent(chatId, state);
                break;
        }
    } catch (err) {
        bot.sendMessage(chatId, t('telegram.generic_error_cancelled', { error: err.message }));
        delete userState[chatId];
    }
}

async function saveEvent(chatId, state) {
    const t = await getUserTranslator(chatId);
    bot.sendMessage(chatId, t('telegram.saving_event'));
    await apiRequest('post', `/reptile/${state.reptileId}/events`, chatId, state.data);
    bot.sendMessage(chatId, t('telegram.event_saved_success'));
    delete userState[chatId];
}

export default bot;