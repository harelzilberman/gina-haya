const fs = require('fs');
const path = require('path');

const localConst = `
const SCORE_COLOURS = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#333333',
};
`;

// Files that might import SCORE_COLOURS
const files = [
  'packages/web/src/components/calendar/TodayCard.tsx',
  'packages/web/src/components/calendar/WeekStrip.tsx',
  'packages/web/src/components/calendar/MooshDailySummary.tsx',
  'packages/web/src/pages/CalendarPage.tsx',
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('SCORE_COLOURS') && !content.includes('SCORE_COLOUR_THRESHOLDS')) {
    console.log(`Skipping ${filePath} - no SCORE_COLOURS`);
    return;
  }

  // Remove import of SCORE_COLOURS from shared
  content = content.replace(/,?\s*SCORE_COLOURS\s*,?/g, (match, offset, str) => {
    // Only remove if it's inside an import statement
    const lineStart = str.lastIndexOf('\n', offset) + 1;
    const lineEnd = str.indexOf('\n', offset);
    const line = str.substring(lineStart, lineEnd);
    if (line.includes('import') && line.includes('@gina-haya/shared')) {
      return match.replace('SCORE_COLOURS', '').replace(/,\s*,/, ',').replace(/\{\s*,/, '{').replace(/,\s*\}/, '}');
    }
    return match;
  });

  // Clean up empty imports like: import { } from '@gina-haya/shared';
  content = content.replace(/import\s*\{\s*\}\s*from\s*'@gina-haya\/shared';\n/g, '');

  // Add local const before first non-import line if SCORE_COLOURS is used
  if (content.includes('SCORE_COLOURS') && !content.includes("const SCORE_COLOURS")) {
    // Find position after last import
    const lines = content.split('\n');
    let lastImportLine = 0;
    lines.forEach((line, i) => {
      if (line.startsWith('import ')) lastImportLine = i;
    });
    lines.splice(lastImportLine + 1, 0, localConst);
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
