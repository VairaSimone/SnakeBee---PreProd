import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

let bot;

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
          [{ text: "Mostra ultimi 5 feedings 🥩", callback_data: `feedings_${r._id}` }],
          [{ text: "Mostra ultimi eventi 📅", callback_data: `events_${r._id}` }]
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
        feedings.slice(0,5).forEach(f => {
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
          grouped[type].slice(0,3).forEach(ev => {
            const date = new Date(ev.date).toLocaleDateString("it-IT");
            const extra = ev.weight ? ` - Peso: ${ev.weight}g` : "";
            text += `• ${date}${extra} ${ev.notes ? "- " + escapeMarkdown(ev.notes) : ""}\n`;
          });
          text += "\n";
        }
        bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
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

// Helper functions
function escapeMarkdown(text) {
  return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, "\\$1");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
