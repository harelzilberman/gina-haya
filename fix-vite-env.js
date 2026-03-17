const fs = require('fs');
const content = '/// <reference types="vite/client" />\n';
fs.writeFileSync('packages/web/src/vite-env.d.ts', content, 'utf8');
console.log('Done! File contents:');
console.log(fs.readFileSync('packages/web/src/vite-env.d.ts', 'utf8'));
