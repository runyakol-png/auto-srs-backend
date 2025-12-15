import express from "express";
import cors from "cors";
import { Telegraf } from "telegraf";

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === ХРАНИЛИЩЕ ЗАКАЗОВ (пока в памяти) ===
let orders = [];

// === TELEGRAM BOT ===
const bot = new Telegraf(process.env.BOT_TOKEN);

// 🔥 ПАРСИНГ ЗАКАЗА ИЗ КАНАЛА
bot.on("channel_post", (ctx) => {
  const text = ctx.channelPost?.text;
  if (!text) return;

  console.log("NEW TELEGRAM MESSAGE:\n", text);

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // Первая строка — заголовок заказа
  const title = lines[0] || "Заказ";

  // Имя мастера — строка с Р/с
  const masterLine = lines.find(l => l.toLowerCase().includes("р/с"));
  const master = masterLine
    ? masterLine.replace(/р\/с/gi, "").replace(/\d+/g, "").trim()
    : "";

  // Позиции — всё кроме телефонов, цен и Р/с
  const items = lines.filter(l =>
    !l.match(/\+?\d[\d\s\-()]{7,}/) &&      // телефоны
    !l.match(/\d+\s*(\$|₴|грн|gel|usd)/i) && // цены
    !l.toLowerCase().includes("р/с")
  );

  const order = {
    id: Date.now(),
    title,
    items,
    master,
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);
  console.log("ORDER SAVED:", order);
});

// === WEBHOOK ДЛЯ TELEGRAM ===
const WEBHOOK_PATH = "/bot";
const WEBHOOK_URL = process.env.WEBHOOK_URL;

bot.telegram.setWebhook(`${WEBHOOK_URL}${WEBHOOK_PATH}`);

app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// === API ===

// получить все заказы
app.get("/orders", (req, res) => {
  res.json(orders);
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log("Backend + Telegram bot running on port", PORT);
});
