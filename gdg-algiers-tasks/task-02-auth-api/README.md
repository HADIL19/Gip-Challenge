# Task 02 – Auth API

API d'authentification : signup / login avec hachage de mot de passe (bcrypt) et JWT (émission + vérification).
Stack : Node.js, Express, bcryptjs, jsonwebtoken.

## Lancer
```bash
npm install
cp .env.example .env     # puis changer JWT_SECRET
npm start                # http://localhost:3000
npm test                 # tests d'intégration
```

## Endpoints
| Méthode | Route | Body | Description |
|---|---|---|---|
| POST | `/auth/signup` | `{ email, password, name? }` | Crée un compte, renvoie `{ user, token }` (201) |
| POST | `/auth/login` | `{ email, password }` | Renvoie `{ user, token }` (200) |
| GET | `/auth/me` | – (header `Authorization: Bearer <token>`) | Route protégée, vérifie le JWT |

### Exemple
```bash
curl -X POST localhost:3000/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"hadil@example.com","password":"password123","name":"Hadil"}'

curl localhost:3000/auth/me -H "Authorization: Bearer <token>"
```

## Choix de sécurité
- Mots de passe hachés avec **bcrypt** (jamais stockés ni renvoyés en clair).
- JWT signé en **HS256**, avec expiration (`JWT_EXPIRES_IN`), algorithme imposé à la vérification.
- Secret dans `.env` (non commité).
- Message d'erreur générique au login + comparaison bcrypt même si l'email n'existe pas (limite l'énumération d'utilisateurs / timing).
- Validation des entrées (email, mot de passe ≥ 8 caractères), taille du body limitée.
- Stockage en mémoire pour la démo : remplaçable par une base de données (`src/store.js`).
