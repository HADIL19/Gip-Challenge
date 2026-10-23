/**
 * First Missing Positive — O(n) temps, O(1) espace supplémentaire.
 * Idée : placer chaque valeur v (1 <= v <= n) à l'indice v-1 (tri par cycles),
 * puis le premier indice i où nums[i] !== i+1 donne la réponse i+1.
 */
function firstMissingPositive(input) {
  const nums = [...input]; // ne pas modifier l'entrée (retirer pour un vrai O(1) strict)
  const n = nums.length;

  for (let i = 0; i < n; i++) {
    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const j = nums[i] - 1;
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
  }
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) return i + 1;
  }
  return n + 1;
}

module.exports = { firstMissingPositive };

// ---- tests rapides : node solution.js ----
if (require.main === module) {
  const assert = require("assert");
  assert.strictEqual(firstMissingPositive([0, -2, 1, 2]), 3);
  assert.strictEqual(firstMissingPositive([1, 2, 0]), 3);
  assert.strictEqual(firstMissingPositive([3, 4, -1, 1]), 2);
  assert.strictEqual(firstMissingPositive([7, 8, 9, 11, 12]), 1);
  assert.strictEqual(firstMissingPositive([]), 1);
  assert.strictEqual(firstMissingPositive([1, 1, 1]), 2);
  assert.strictEqual(firstMissingPositive([1, 2, 3, 4]), 5);
  console.log("✅ All tests passed");
}
