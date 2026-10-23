# Task 03 – First Missing Positive

Plus petit entier `n > 0` absent d'un tableau non trié.

## Lancer
```bash
node solution.js
```

## Approche
La réponse est toujours dans `[1, n+1]`. On range chaque valeur `v` (avec `1 <= v <= n`) à l'indice `v-1` par échanges (cycle sort), puis on cherche le premier indice `i` où `nums[i] !== i+1`.

- Temps : **O(n)** (chaque échange place définitivement un élément)
- Espace : **O(1)** supplémentaire (la copie d'entrée peut être retirée pour travailler sur place)
