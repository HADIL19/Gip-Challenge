# Task 01 – Auto-complete Search Box

Barre de recherche côté client, en HTML/CSS/JS vanilla.

## Lancer
Le projet utilise des modules ES (`import`/`export`), donc il faut un petit serveur local (double-clic sur `index.html` ne marche pas) :
```bash
npx serve .          # ou : python3 -m http.server 8000
```

## Choix techniques
- **Normalisation** : minuscules, accents supprimés (`NFD` + retrait des diacritiques), apostrophes ignorées → `cote d'ivoire` trouve `Côte d'Ivoire`.
- **Mid-word** : recherche par sous-chaîne (`land` → Iceland, Ireland, Finland…).
- **Performance** : données normalisées **une seule fois** au chargement, debounce de 80 ms, limite de 10 résultats.
- **Classement** : début de chaîne > début de mot > milieu de mot.
- **Accessibilité/UX** : navigation clavier (↑ ↓ Entrée Échap), surlignage du texte trouvé, attributs ARIA.

`data.js` est le dataset officiel (`export const countries = [{ id, name }, ...]`), non modifié.
