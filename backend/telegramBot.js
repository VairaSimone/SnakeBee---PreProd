import TelegramBot from "node--bot-api";
import axios from "axios";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Chiedo al backend un link magico per collegare Telegram
    const res = await axios.get(`${process.env.BACKEND_URL}/v1/telegram/link`, {
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

// Esempio: aggiungi feeding da Telegram
bot.onText(/\/feeding (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const reptileName = match[1];

  try {
    await axios.post(`${process.env.BACKEND_URL}/v1/reptiles/feeding`, 
      { reptileName },
      { headers: { "x-telegram-id": chatId } } // il backend riconosce l’utente da telegramId
    );

    bot.sendMessage(chatId, `Feeding aggiunto per ${reptileName} ✅`);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "Errore nell’aggiungere il feeding.");
  }
});

export default bot;
