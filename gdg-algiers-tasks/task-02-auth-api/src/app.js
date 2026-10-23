const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const store = require("./store");
const { signToken, requireAuth } = require("./auth");

const app = express();
app.use(express.json({ limit: "10kb" }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash factice pour égaliser le temps de réponse quand l'email n'existe pas
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });

// POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (store.findByEmail(email)) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = store.create({
    id: crypto.randomUUID(),
    email: email.trim(),
    name: typeof name === "string" ? name.trim() : "",
    passwordHash,
  });
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const user = store.findByEmail(email);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    return res.status(401).json({ error: "Invalid credentials" }); // message générique
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

// GET /auth/me  (route protégée : vérification du JWT)
app.get("/auth/me", requireAuth, (req, res) => {
  const user = store.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
