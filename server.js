import express from "express";
import cors from "cors";
import { Telegraf } from "telegraf";

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === STORAGE (in-memory) ===
let orders = [];

// === BOT ===
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined");
}

const bot = new Telegraf(BOT_TOKEN);

// === HELPERS ===
function cleanItem(line) {
  return line
    .replace(/\+?\d[\d\s\-()]{7,}/g, "")                 // телефоны
    .replace(/\d+\s*(\$|₴|грн|gel|usd)/gi, "")           // цены
    .replace(/\b(грн|uah|gel|usd|\$|₴)\b/gi, "")         // валюты
    .replace(/\d+/g, "")                                 // остаточные цифры
    .trim();
}

// === CHANNEL PARSER ===
bot.on("channel_post", (ctx) => {
  const text = ctx.channelPost?.text;
  if (!text) return;

  console.log("NEW CHANNEL MESSAGE:\n", text);

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // --- TITLE ---
  const title = lines[0] || "Заказ";

  // --- MASTER ---
  const masterLine = lines.find(l =>
    l.toLowerCase().includes("р/с")
  );

  const master = masterLine
    ? masterLine
        .replace(/р\/с/gi, "")
        .replace(/\d+/g, "")
        .replace(/\b(грн|uah|gel|usd|\$|₴)\b/gi, "")
        .trim()
    : "";

  // --- ITEMS ---
  const items = lines
    .slice(1)
    .filter(l =>
      !l.toLowerCase().includes("р/с") &&
      !l.match(/\+?\d[\d\s\-()]{7,}/)
    )
    .map(cleanItem)
    .filter(Boolean)
    .map(name => ({
      name,
      done: false
    }));

  const order = {
    id: Date.now(),
    title,
    items,
    master,
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);

  console.log("ORDER SAVED:", JSON.stringify(order, null, 2));
});

// === API ===
app.get("/orders", (req, res) => {
  res.json(orders);
});

// === TOGGLE ITEM STATUS ===
app.patch("/orders/:orderId/items/:index", (req, res) => {
  const { orderId, index } = req.params;

  const order = orders.find(o => o.id == orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const item = order.items[index];
  if (!item) return res.status(404).json({ error: "Item not found" });

  item.done = !item.done;

  res.json(item);
});

// === WEBHOOK ===
const WEBHOOK_PATH = "/webhook";
const WEBHOOK_URL = process.env.WEBHOOK_URL;

app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// === START ===
app.listen(PORT, async () => {
  console.log("Backend running on port", PORT);

  if (!WEBHOOK_URL) {
    console.warn("WEBHOOK_URL is not defined");
    return;
  }

  const fullWebhook = `${WEBHOOK_URL}${WEBHOOK_PATH}`;

  try {
    await bot.telegram.setWebhook(fullWebhook);
    console.log("Webhook set:", fullWebhook);
  } catch (err) {
    console.error("Webhook error:", err);
  }
});
