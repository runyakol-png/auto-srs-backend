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

// === CHANNEL PARSER ===
bot.on("channel_post", (ctx) => {
  const text = ctx.channelPost?.text;
  if (!text) return;

  console.log("NEW CHANNEL MESSAGE:\n", text);

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const title = lines[0] || "Заказ";

  const masterLine = lines.find(l =>
    l.toLowerCase().includes("р/с")
  );

  const master = masterLine
    ? masterLine
        .replace(/р\/с/gi, "")
        .replace(/\d+/g, "")
        .trim()
    : "";

  const items = lines.filter(l =>
    !l.match(/\+?\d[\d\s\-()]{7,}/) &&
    !l.match(/\d+\s*(\$|₴|грн|gel|usd)/i) &&
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

// === API ===
app.get("/orders", (req, res) => {
  res.json(orders);
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
