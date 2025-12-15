import express from "express";

const app = express();
app.use(express.json());

let orders = [];

function cleanOrder(text) {
  return text
    .replace(/\+?\d[\d\s\-()]{7,}/g, "")     // телефоны
    .replace(/\d+\s?(₾|\$|грн|gel|usd)/gi, "") // цены
    .replace(/р\/с.*$/gim, "")               // р/с строка
    .replace(/\n{2,}/g, "\n")
    .trim();
}

app.post("/telegram", (req, res) => {
  const msg = req.body?.message?.text || req.body?.channel_post?.text;
  if (!msg) return res.sendStatus(200);

  const clean = cleanOrder(msg);

  orders.unshift({
    id: Date.now(),
    text: clean
  });

  res.sendStatus(200);
});

app.get("/orders", (req, res) => {
  res.json(orders);
});

app.get("/", (req, res) => {
  res.send("AUTO SRS backend OK");
});

app.listen(3000, () => console.log("Backend running on 3000"));
