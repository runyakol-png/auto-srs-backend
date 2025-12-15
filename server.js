import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let orders = [];

/* Получить все заказы */
app.get("/orders", (req, res) => {
  res.json(orders);
});

/* Добавить заказ */
app.post("/orders", (req, res) => {
  const order = {
    id: Date.now(),
    title: req.body.title,
    items: req.body.items,
    master: req.body.master,
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log("Backend running on", PORT);
});
