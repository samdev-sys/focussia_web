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

let fixed = 0;
for (const file of walk('src')) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes("t('") && !src.includes('t("')) continue;
  // Replace t('...' and t("...
  src = src.replace(/\bt\('/g, "i18n.t('");
  src = src.replace(/\bt\("/g, 'i18n.t("');
  // Add import
  const parts = file.split(path.sep);
  // src/i18n is at src/i18n; depth from file's dir to src/
  const depth = parts.length - 2; // exclude 'src' and filename
  const rel = depth <= 0 ? './i18n' : '../'.repeat(depth) + 'i18n';
  if (!src.includes("from '" + rel + "'") && !src.includes('from "' + rel + '"')) {
    const m = src.match(/import .* from 'react';?\n/);
    if (m) src = src.replace(m[0], m[0] + `import i18n from '${rel}';\n`);
    else src = `import i18n from '${rel}';\n` + src;
  }
  // Remove any leftover useTranslation imports/hook lines that may be broken? keep them; they're harmless if unused
  fs.writeFileSync(file, src);
  fixed++;
}
console.log('Fixed files:', fixed);