#!/usr/bin/env node
/**
 * Extrae strings literales de un componente TSX/JSX y genera claves sugeridas.
 * Uso: node scripts/extract-i18n.js src/components/Foo.tsx
 * Salida: JSON con { clave: "texto" } + sugerencias de reemplazo.
 * No modifica archivos; es una ayuda para la migración manual.
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/extract-i18n.js <archivo.tsx>');
  process.exit(1);
}
const src = fs.readFileSync(file, 'utf8');

const strings = new Set();
// 1. Texto entre tags JSX: >texto<
const jsxText = src.match(/>([^<>{}]+)</g) || [];
for (const m of jsxText) {
  const t = m.slice(1, -1).trim();
  if (t && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t) && t.length < 120
      && !/[;{}()[\]]/.test(t) && !/\b(const|let|var|function|return|import)\b/.test(t)) strings.add(t);
}
// 2. Atributos string comunes
const attrs = ['title', 'placeholder', 'label', 'aria-label', 'alt', 'tooltip'];
for (const a of attrs) {
  const re = new RegExp(`${a}="(.*?)"`, 'g');
  let m;
  while ((m = re.exec(src)) !== null) {
    const t = m[1].trim();
    if (t && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t)) strings.add(t);
  }
}

function slug(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

const keys = {};
const seen = new Set();
for (const s of strings) {
  let k = slug(s);
  if (seen.has(k)) k = k + '_' + Math.random().toString(36).slice(2, 6);
  seen.add(k);
  keys[k] = s;
}

console.log('=== Strings encontrados:', strings.size, '===');
console.log('\n--- JSON sugerido (pegar en es.json) ---');
console.log(JSON.stringify(keys, null, 2));
console.log('\n--- Reemplazos sugeridos ---');
for (const s of strings) {
  console.log(`  "${s}"  ->  t('${slug(s)}')`);
}