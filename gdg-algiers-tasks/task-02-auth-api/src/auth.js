const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("JWT_SECRET manquant : copie .env.example vers .env");
  process.exit(1);
}
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: EXPIRES_IN, algorithm: "HS256" });

// Middleware : Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  try {
    req.user = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ error: msg });
  }
}

module.exports = { signToken, requireAuth };
