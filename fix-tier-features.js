const fs = require('fs');

const localConst = `
const TIER_FEATURES = {
  free:         { appAccess: false, diagnosesPerMonth: 0,        adFree: false, multiGarden: false },
  grower:       { appAccess: true,  diagnosesPerMonth: 5,        adFree: false, multiGarden: false },
  gardener_pro: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
  professional: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
};

const TIER_PRICES: Record<string, number | null> = {
  free:           null,
  grower:         9,
  gardener_pro:   14,
  professional:   49,
};
`;

// Find all files importing from shared
const webSrc = 'packages/web/src';
const results = [];

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = require('path').join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules') {
      walk(full);
    } else if (f.match(/\.(ts|tsx)$/)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('TIER_FEATURES') || content.includes('TIER_PRICES')) {
        results.push(full);
      }
    }
  });
}

walk(webSrc);
console.log('Files using TIER_FEATURES or TIER_PRICES:', results);

results.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove TIER_FEATURES and TIER_PRICES from shared imports
  content = content.replace(/import\s*\{([^}]*)\}\s*from\s*'@gina-haya\/shared';/g, (match, imports) => {
    const cleaned = imports
      .split(',')
      .map(i => i.trim())
      .filter(i => i && i !== 'TIER_FEATURES' && i !== 'TIER_PRICES')
      .join(', ');
    if (!cleaned) return '';
    return `import { ${cleaned} } from '@gina-haya/shared';`;
  });

  // Add local constants if TIER_FEATURES is used and not yet defined
  if ((content.includes('TIER_FEATURES') || content.includes('TIER_PRICES')) && 
      !content.includes('const TIER_FEATURES')) {
    // Insert after last import line
    const lines = content.split('\n');
    let lastImport = 0;
    lines.forEach((line, i) => { if (line.startsWith('import ')) lastImport = i; });
    lines.splice(lastImport + 1, 0, localConst);
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed:', filePath);
});

console.log('Done!');
