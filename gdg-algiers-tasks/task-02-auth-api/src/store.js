// Stockage simple en mémoire (remplaçable par une vraie DB : Mongo, Postgres…)
const users = new Map(); // key: email (lowercase)

module.exports = {
  findByEmail: (email) => users.get(email.toLowerCase()),
  findById: (id) => [...users.values()].find((u) => u.id === id),
  create: (user) => { users.set(user.email.toLowerCase(), user); return user; },
};
