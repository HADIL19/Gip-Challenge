import { countries } from "./data.js";

/**
 * Auto-complete: normalisation (accents, apostrophes, casse) + recherche "contains"
 * sur des données pré-normalisées une seule fois (performance), avec debounce.
 */

// Minuscules, suppression des accents, apostrophes (' ’ ` ´) ignorées, espaces compactés.
function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Pré-calcul unique : [{ label, norm }]
const INDEX = countries.map(({ id, name }) => ({ id, label: name, norm: normalize(name) }));

/**
 * Retourne les résultats triés : préfixe du texte > début d'un mot > milieu de mot.
 */
function search(query, limit = 10) {
  const q = normalize(query);
  if (!q) return [];
  const scored = [];
  for (const entry of INDEX) {
    const pos = entry.norm.indexOf(q);
    if (pos === -1) continue;
    let rank = 2;                                   // milieu de mot
    if (pos === 0) rank = 0;                        // début de la chaîne
    else if (entry.norm[pos - 1] === " ") rank = 1; // début d'un mot
    scored.push({ entry, rank, pos });
  }
  scored.sort((a, b) => a.rank - b.rank || a.pos - b.pos || a.entry.label.localeCompare(b.entry.label));
  return scored.slice(0, limit).map((s) => s.entry.label);
}

// Surligne la portion qui matche dans le label original (en tenant compte des accents).
function highlight(label, query) {
  const q = normalize(query);
  if (!q) return escapeHtml(label);
  // Construit une version normalisée caractère par caractère + table de correspondance.
  let norm = "";
  const map = [];
  for (let i = 0; i < label.length; i++) {
    const n = normalize(label[i]);
    for (const ch of n) { norm += ch; map.push(i); }
  }
  const start = norm.indexOf(q);
  if (start === -1) return escapeHtml(label);
  const from = map[start];
  const to = map[start + q.length - 1] + 1;
  return escapeHtml(label.slice(0, from)) + "<mark>" + escapeHtml(label.slice(from, to)) + "</mark>" + escapeHtml(label.slice(to));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- UI ----------
const input = document.getElementById("search");
const list = document.getElementById("results");
const count = document.getElementById("count");
const combo = document.querySelector(".search");
let results = [];
let active = -1;

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function render() {
  const q = input.value;
  list.innerHTML = "";
  active = -1;
  if (!results.length) {
    list.hidden = true;
    combo.setAttribute("aria-expanded", "false");
    count.textContent = q.trim() ? "No results" : "";
    return;
  }
  const frag = document.createDocumentFragment();
  results.forEach((label, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.id = "opt-" + i;
    li.innerHTML = highlight(label, q);
    li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(i); });
    frag.appendChild(li);
  });
  list.appendChild(frag);
  list.hidden = false;
  combo.setAttribute("aria-expanded", "true");
  count.textContent = results.length + " result(s)";
}

function setActive(i) {
  const items = list.children;
  if (active >= 0 && items[active]) items[active].classList.remove("active");
  active = i;
  if (items[active]) {
    items[active].classList.add("active");
    items[active].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", items[active].id);
  }
}

function choose(i) {
  input.value = results[i];
  results = [];
  render();
  count.textContent = "Selected: " + input.value;
}

input.addEventListener("input", debounce(() => { results = search(input.value); render(); }, 80));
input.addEventListener("keydown", (e) => {
  if (list.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % results.length); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + results.length) % results.length); }
  else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(active); }
  else if (e.key === "Escape") { results = []; render(); }
});
input.addEventListener("blur", () => { list.hidden = true; });
input.addEventListener("focus", () => { if (results.length) list.hidden = false; });
