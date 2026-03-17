const fs = require('fs');

const RAILWAY_URL = 'https://powerful-embrace-production-95ea.up.railway.app';

const files = [
  'packages/web/src/components/ui/UpgradeModal.tsx',
  'packages/web/src/hooks/useCalendar.ts',
  'packages/web/src/hooks/usePlants.ts',
  'packages/web/src/pages/BillingPage.tsx',
  'packages/web/src/stores/gardenStore.ts',
  'packages/web/src/stores/mooshStore.ts',
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  content = content.split('http://localhost:3001').join(RAILWAY_URL);
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  } else {
    console.log('No changes needed:', filePath);
  }
});

console.log('Done!');
