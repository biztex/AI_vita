import { Router } from "express";

const r = Router();

r.get("/", (_req, res) => {
  // res.json({ ok: true });
  res.send("OK");
});

export default r;
  