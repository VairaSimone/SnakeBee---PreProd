import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
let bot;

if (!global.bot) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  global.bot = bot;



bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Chiedo al backend un link magico per collegare Telegram
    const res = await axios.get(`${process.env.BACKEND_URL}/api/telegram/link`, {
      params: { telegramId: chatId }
    });

    bot.sendMessage(
      chatId,
      `Ciao ${msg.from.first_name}! 👋\nPer collegare il tuo account SnakeBee, clicca qui: ${res.data.url}`
    );
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "Errore nel generare il link di collegamento. Riprova più tardi.");
  }
});

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

    const inlineKeyboard = reptiles.map(r => [
      { text: `${r.name} (${r.species})`, callback_data: `reptile_${r._id}` }
    ]);

    bot.sendMessage(chatId, "Seleziona un rettile:", {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "Errore nel recuperare la lista dei rettili.");
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith("reptile_")) {
    const reptileId = data.split("_")[1];

    try {
      const res = await axios.get(
        `${process.env.BACKEND_URL}/api/telegram/reptile/${reptileId}`,
        { headers: { "x-telegram-id": chatId } }
      );

      const r = res.data.reptile;

      let text = `📋 *${r.name || "Senza nome"}*\n\n`;
      text += `🐍 Specie: ${r.species}\n`;
      text += `🎨 Morph: ${r.morph || "-"}\n`;
      text += `♂️♀️ Sesso: ${r.sex}\n`;
      text += `👨‍👩‍👧 Genitori: ${r.parents?.father || "-"} × ${r.parents?.mother || "-"}\n`;
      text += `🧬 Breeder: ${r.isBreeder ? "Sì" : "No"}\n\n`;

      if (r.birthDate) {
        const birth = new Date(r.birthDate).toLocaleDateString("it-IT");
        text += `🎂 Data di nascita: ${birth}\n`;
      }

      if (r.stats) {
        text += `📈 Stats: ${r.stats.breedings} breedings, ${r.stats.successCount} successi, ${r.stats.offspringCount} figli\n`;
      }

      if (r.documents?.cites?.number) {
        text += `📄 CITES: ${r.documents.cites.number} (${r.documents.cites.issuer || "?"})\n`;
      }

      if (r.documents?.microchip?.code) {
        text += `🔑 Microchip: ${r.documents.microchip.code}\n`;
      }

      if (r.price?.amount) {
        text += `💰 Prezzo: ${r.price.amount} ${r.price.currency}\n`;
      }

      if (r.notes) {
        text += `📝 Note: ${r.notes}\n`;
      }

      if (r.foodType) {
        text += `🍗 Dieta: ${r.foodType}\n`;
      }

      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

      // se vuoi anche foto
      if (r.image && r.image.length > 0) {
        for (const img of r.image) {
          bot.sendPhoto(chatId, img);
        }
      }

    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "Errore nel recuperare i dettagli del rettile.");
    }
  } 
  
});

}else {
  bot = global.bot;
}
export default bot;
