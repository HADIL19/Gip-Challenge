// Test d'intégration minimal : npm test
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
const assert = require("assert");
const app = require("./app");

(async () => {
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const call = async (path, method = "GET", body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  };

  let r = await call("/auth/signup", "POST", { email: "a@b.com", password: "password123", name: "Hadil" });
  assert.strictEqual(r.status, 201); assert.ok(r.data.token); assert.ok(!r.data.user.passwordHash);
  r = await call("/auth/signup", "POST", { email: "a@b.com", password: "password123" });
  assert.strictEqual(r.status, 409);
  r = await call("/auth/signup", "POST", { email: "bad", password: "password123" });
  assert.strictEqual(r.status, 400);
  r = await call("/auth/login", "POST", { email: "a@b.com", password: "wrongpass" });
  assert.strictEqual(r.status, 401);
  r = await call("/auth/login", "POST", { email: "a@b.com", password: "password123" });
  assert.strictEqual(r.status, 200);
  const token = r.data.token;
  r = await call("/auth/me", "GET", null, token);
  assert.strictEqual(r.status, 200); assert.strictEqual(r.data.user.email, "a@b.com");
  r = await call("/auth/me");
  assert.strictEqual(r.status, 401);
  r = await call("/auth/me", "GET", null, token + "x");
  assert.strictEqual(r.status, 401);

  console.log("✅ All auth tests passed");
  server.close();
})().catch((e) => { console.error("❌", e); process.exit(1); });
