import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

let bot;
const userState = {};
if (!global.bot) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  global.bot = bot;

  // START
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const res = await axios.get(`${process.env.BACKEND_URL}/api/telegram/link`, {
        params: { telegramId: chatId }
      });
      bot.sendMessage(chatId, `Ciao ${msg.from.first_name}! 👋\nPer collegare il tuo account SnakeBee, clicca qui: ${res.data.url}`);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "Errore nel generare il link di collegamento. Riprova più tardi.");
    }
  });

  // REPTILES
  bot.onText(/\/reptiles/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const res = await axios.get(`${process.env.BACKEND_URL}/api/telegram/reptiles`, {
        headers: { "x-telegram-id": chatId }
      });
      const reptiles = res.data.reptiles;

      if (!reptiles || reptiles.length === 0) {
        return bot.sendMessage(chatId, "Non hai ancora registrato rettili 🦎");
      }

      // Inline keyboard per selezione rettile
      const inlineKeyboard = reptiles.map(r => ([{
        text: r.name || "Senza nome",
        callback_data: `reptile_${r._id}`
      }]));

      bot.sendMessage(chatId, "Seleziona un rettile:", {
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "Errore nel recuperare la lista dei rettili.");
    }
  });

  bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]) {
      delete userState[chatId];
      bot.sendMessage(chatId, "Operazione annullata. 👍");
    } else {
      bot.sendMessage(chatId, "Nessuna operazione in corso.");
    }
  });

  bot.onText(/\/inventory/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const res = await axios.get(`${process.env.BACKEND_URL}/api/telegram/inventory`, {
        headers: { "x-telegram-id": chatId }
      });
      const inventory = res.data.inventory;
      if (!inventory || inventory.length === 0) {
        return bot.sendMessage(chatId, "Il tuo inventario è vuoto. 텅 빈");
      }
      let text = "📦 *Il tuo inventario:*\n\n";
      inventory.forEach(item => {
        text += `• *${item.foodType}* (${item.weightPerUnit}g): ${item.quantity} unità\n`;
      });
      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Errore nel recuperare l'inventario.";
      bot.sendMessage(chatId, errorMsg);
    }
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (!userState[chatId] || msg.text.startsWith('/')) return; // Ignora se non c'è una conversazione attiva o è un comando

    const state = userState[chatId];

    // Aggiungi qui la logica per le diverse conversazioni
    if (state.action === 'add_feeding') {
      await handleFeedingConversation(chatId, msg.text);
    } else if (state.action === 'add_event') {
      await handleEventConversation(chatId, msg.text);
    }
  });


  // CALLBACK HANDLER
  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    const sendError = (msg) => bot.sendMessage(chatId, msg);

    try {
      if (data.startsWith("reptile_")) {
        const reptileId = data.split("_")[1];
        const res = await axios.get(`${process.env.BACKEND_URL}/api/telegram/reptile/${reptileId}`, {
          headers: { "x-telegram-id": chatId }
        });
        const r = res.data.reptile;

        // Testo principale
        let text = `📋 *${escapeMarkdown(r.name || "Senza nome")}*\n\n`;
        text += `🐍 Specie: ${escapeMarkdown(r.species || "-")}\n`;
        text += `🎨 Morph: ${escapeMarkdown(r.morph || "-")}\n`;
        text += `♂️♀️ Sesso: ${r.sex || "-"}\n`;
        text += `👨‍👩‍👧 Genitori: ${r.parents?.father || "-"} × ${r.parents?.mother || "-"}\n`;
        text += `🧬 Breeder: ${r.isBreeder ? "Sì" : "No"}\n`;
        if (r.birthDate) text += `🎂 Data di nascita: ${new Date(r.birthDate).toLocaleDateString("it-IT")}\n`;
        if (r.stats) text += `📈 Stats: ${r.stats.breedings} breedings, ${r.stats.successCount} successi, ${r.stats.offspringCount} figli\n`;
        if (r.documents?.cites?.number) text += `📄 CITES: ${r.documents.cites.number} (${r.documents.cites.issuer || "?"})\n`;
        if (r.documents?.microchip?.code) text += `🔑 Microchip: ${r.documents.microchip.code}\n`;
        if (r.price?.amount) text += `💰 Prezzo: ${r.price.amount} ${r.price.currency}\n`;
        if (r.notes) text += `📝 Note: ${escapeMarkdown(r.notes)}\n`;
        if (r.foodType) text += `🍗 Dieta: ${escapeMarkdown(r.foodType)}\n`;

        // Foto
        if (r.image?.length) r.image.forEach(img => bot.sendPhoto(chatId, img));

        // Keyboard feedings + eventi
        const keyboard = [
          [{ text: "Aggiungi Alimentazione 🥩", callback_data: `add_feeding_${r._id}` }],
          [{ text: "Aggiungi Evento 📅", callback_data: `add_event_${r._id}` }],
          [{ text: "Storico Alimentazioni 🍽️", callback_data: `feedings_${r._id}` }],
          [{ text: "Storico Eventi 📜", callback_data: `events_${r._id}` }]
        ];

        bot.sendMessage(chatId, text, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        });

      } else if (data.startsWith("feedings_")) {
        const reptileId = data.split("_")[1];
        const resFeed = await axios.get(`${process.env.BACKEND_URL}/api/telegram/reptile/${reptileId}/feedings`, {
          headers: { "x-telegram-id": chatId }
        });
        const feedings = resFeed.data.feedings;
        if (!feedings?.length) return sendError("Nessun feeding registrato per questo rettile.");
        let feedingText = "🍽 Ultimi 5 feedings:\n\n";
        feedings.slice(0, 5).forEach(f => {
          feedingText += `• ${new Date(f.date).toLocaleDateString("it-IT")}: ${f.foodType}, qty: ${f.quantity || "-"}\n`;
        });
        bot.sendMessage(chatId, feedingText);

      } else if (data.startsWith("events_")) {
        const reptileId = data.split("_")[1];
        const resEvents = await axios.get(`${process.env.BACKEND_URL}/api/telegram/reptile/${reptileId}/events`, {
          headers: { "x-telegram-id": chatId }
        });
        const events = resEvents.data.events;
        if (!events?.length) return sendError("Nessun evento registrato per questo rettile.");

        const grouped = {};
        events.forEach(ev => {
          if (!grouped[ev.type]) grouped[ev.type] = [];
          grouped[ev.type].push(ev);
        });

        let text = "📅 Ultimi eventi per categoria:\n\n";
        for (const type in grouped) {
          text += `*${capitalize(type)}*\n`;
          grouped[type].slice(0, 3).forEach(ev => {
            const date = new Date(ev.date).toLocaleDateString("it-IT");
            const extra = ev.weight ? ` - Peso: ${ev.weight}g` : "";
            text += `• ${date}${extra} ${ev.notes ? "- " + escapeMarkdown(ev.notes) : ""}\n`;
          });
          text += "\n";
        }
        bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
      } else if (data.startsWith("add_feeding_")) {
        const reptileId = data.split("_")[1];
        userState[chatId] = {
          action: 'add_feeding',
          reptileId: reptileId,
          step: 'foodType',
          data: {}
        };
        bot.sendMessage(chatId, "🥩 Inserisci il *tipo* di cibo (es. Topo, Ratto):", { parse_mode: "Markdown" });
      } else if (data.startsWith("add_event_")) {
        const reptileId = data.split("_")[1];
        userState[chatId] = {
          action: 'add_event',
          reptileId: reptileId,
          step: 'type',
          data: {}
        };
        // Chiedi il tipo di evento con una tastiera per comodità
        bot.sendMessage(chatId, "📅 Seleziona il *tipo* di evento:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Muta", callback_data: "set_event_type_shed" }],
              [{ text: "Feci", callback_data: "set_event_type_feces" }],
              [{ text: "Veterinario", callback_data: "set_event_type_vet" }],
              [{ text: "Pesata", callback_data: "set_event_type_weight" }]
            ]
          }
        });
      } else if (data.startsWith("set_event_type_")) {
        if (!userState[chatId] || userState[chatId].action !== 'add_event') return;
        const eventType = data.split("_")[3];
        userState[chatId].data.type = eventType;
        userState[chatId].step = 'notes';
        bot.sendMessage(chatId, `Tipo impostato: ${eventType}.\n📝 Aggiungi delle note (o scrivi 'no'):`);
      }

    } catch (err) {
      console.error(err);
      sendError("Errore nella richiesta al server.");
    }
  });

} else {
  bot = global.bot;
}

export default bot;

async function handleFeedingConversation(chatId, text) {
    const state = userState[chatId];
    try {
        switch (state.step) {
            case 'foodType':
                state.data.foodType = text;
                state.step = 'quantity';
                bot.sendMessage(chatId, "🔢 Inserisci la *quantità*:", { parse_mode: "Markdown" });
                break;
            case 'quantity':
                state.data.quantity = parseInt(text, 10);
                state.step = 'weightPerUnit';
                bot.sendMessage(chatId, "⚖️ Inserisci il *peso per unità* in grammi:", { parse_mode: "Markdown" });
                break;
            case 'weightPerUnit':
                state.data.weightPerUnit = parseInt(text, 10);
                state.step = 'wasEaten';
                bot.sendMessage(chatId, "✅ Il pasto è stato mangiato? (sì/no)");
                break;
            case 'wasEaten':
                state.data.wasEaten = ['sì', 'si', 's', 'yes', 'y'].includes(text.toLowerCase());
                state.step = 'notes';
                bot.sendMessage(chatId, "📝 Aggiungi delle note (o scrivi 'no'):");
                break;
            case 'notes':
                state.data.notes = (text.toLowerCase() === 'no') ? '' : text;
                
                // Chiamata API per salvare
                await axios.post(`${process.env.BACKEND_URL}/api/telegram/reptile/${state.reptileId}/feedings`, state.data, {
                    headers: { "x-telegram-id": chatId }
                });
                
                bot.sendMessage(chatId, "✅ Alimentazione registrata con successo!");
                delete userState[chatId]; // Pulisci lo stato
                break;
        }
    } catch (err) {
        const errorMsg = err.response?.data?.message || "Si è verificato un errore.";
        bot.sendMessage(chatId, `❌ Errore: ${errorMsg}\nOperazione annullata.`);
        delete userState[chatId];
    }
}

async function handleEventConversation(chatId, text) {
    const state = userState[chatId];
    try {
        switch (state.step) {
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
                await saveEvent(chatId, state);
                break;
        }
    } catch (err) {
        const errorMsg = err.response?.data?.message || "Si è verificato un errore.";
        bot.sendMessage(chatId, `❌ Errore: ${errorMsg}\nOperazione annullata.`);
        delete userState[chatId];
    }
}

async function saveEvent(chatId, state) {
    await axios.post(`${process.env.BACKEND_URL}/api/telegram/reptile/${state.reptileId}/events`, state.data, {
        headers: { "x-telegram-id": chatId }
    });
    bot.sendMessage(chatId, "✅ Evento registrato con successo!");
    delete userState[chatId]; // Pulisci lo stato
}


// Helper functions
function escapeMarkdown(text) {
  return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, "\\$1");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
