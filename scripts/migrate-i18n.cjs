const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(f) && !p.includes('i18n')) out.push(p);
  }
  return out;
}
function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
}

const allKeys = {};
let migratedFiles = 0;

for (const file of walk('src')) {
  let src = fs.readFileSync(file, 'utf8');
  const strings = new Set();
  const jsxText = src.match(/>([^<>{}]+)</g) || [];
  for (const m of jsxText) {
    const t = m.slice(1, -1).trim();
    if (t && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t) && t.length < 120 && !/[;{}()[\]]/.test(t) && !/\b(const|let|var|function|return|import)\b/.test(t)) strings.add(t);
  }
  const attrs = ['title', 'placeholder', 'label', 'aria-label', 'alt'];
  for (const a of attrs) {
    const re = new RegExp(`${a}="(.*?)"`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const t = m[1].trim();
      if (t && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t) && !/[{}]/.test(t)) strings.add(t);
    }
  }
  if (strings.size === 0) continue;

  const keyMap = {};
  for (const s of strings) {
    let k = slug(s);
    if (allKeys[k] || keyMap[s] === k) k = k + '_' + Math.random().toString(36).slice(2, 6);
    allKeys[k] = s;
    keyMap[s] = k;
  }

  // Replace attributes
  for (const a of attrs) {
    src = src.replace(new RegExp(`${a}="([^"]*)"`, 'g'), (match, val) => {
      const t = val.trim();
      if (keyMap[t]) return `${a}={t('${keyMap[t]}')}`;
      return match;
    });
  }
  // Replace JSX text
  for (const s of strings) {
    const k = keyMap[s];
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    src = src.replace(new RegExp(`>${esc}<`, 'g'), `>{t('${k}')}<`);
  }

  // Add import
  if (!src.includes("react-i18next")) {
    const m = src.match(/import .* from 'react';?\n/);
    if (m) src = src.replace(m[0], m[0] + "import { useTranslation } from 'react-i18next';\n");
  }
  // Add hook call (best effort)
  if (!src.includes('useTranslation()')) {
    let done = false;
    src = src.replace(/(=>\s*\{\n)/, (mm) => { if (done) return mm; done = true; return mm + "  const { t } = useTranslation();\n"; }, 1);
    if (!src.includes('useTranslation()')) {
      src = src.replace(/(\)\s*\{\n)/, (mm) => { if (done) return mm; done = true; return mm + "  const { t } = useTranslation();\n"; }, 1);
    }
  }

  fs.writeFileSync(file, src);
  migratedFiles++;
}

const esPath = 'src/i18n/es.json';
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
for (const [k, v] of Object.entries(allKeys)) {
  if (es[k] === undefined) es[k] = v;
}
fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n');

console.log('Migrated files:', migratedFiles);
console.log('Total keys added:', Object.keys(allKeys).length);