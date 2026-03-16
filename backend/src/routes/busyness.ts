import { Router } from "express";
import { getBusynessData } from "../services/busyness";

export const busynessRoutes = Router();

busynessRoutes.get("/", async (_req, res) => {
  try {
    const data = await getBusynessData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch busyness data" });
  }
});
