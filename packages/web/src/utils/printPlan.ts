import type { WeeklyPlan } from '../stores/planStore';

const SCORE_COLOURS: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#555555',
};

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)}/${parseInt(m)}`;
}

export function printWeeklyPlan(plan: WeeklyPlan, today: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  const rows = {
    date: plan.days.map(day =>
      `<td style="padding:3px 4px;text-align:right;border:1px solid #ddd;font-size:9px;background:${
        day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#f5f5f5'
      }">${shortDate(day.date)} · ${day.dayTypeHe} ${day.dayTypeEmoji}</td>`
    ).join(''),

    score: plan.days.map(day =>
      `<td style="text-align:center;font-size:18px;font-weight:bold;color:${
        SCORE_COLOURS[day.scoreColour] ?? '#4A7C59'
      };padding:3px 4px;border:1px solid #ddd;background:${
        day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : 'white'
      }">${day.nodeActive ? '⚫' : day.plantingScore}</td>`
    ).join(''),

    moon: plan.days.map(day =>
      `<td style="padding:3px 4px;font-size:9px;border:1px solid #ddd;background:${
        day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#fafafa'
      }">${day.moonDirection === 'ascending' ? '↑' : '↓'} ${day.moonDirectionHe}</td>`
    ).join(''),

    actions: plan.days.map(day =>
      `<td style="vertical-align:top;padding:3px 4px;border:1px solid #ddd;background:${
        day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : 'white'
      }"><ul style="margin:0;padding:0;list-style:none;font-size:9px;line-height:1.4">${
        day.recommendedActions.map(a => `<li>✓ ${a}</li>`).join('')
      }</ul></td>`
    ).join(''),

    plants: plan.days.map(day =>
      `<td style="vertical-align:top;padding:3px 4px;font-size:9px;border:1px solid #ddd;background:${
        day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#fafafa'
      }">${day.recommendedPlants.length > 0 ? `צמחים: ${day.recommendedPlants.join(', ')}` : ''}</td>`
    ).join(''),

    bd: plan.days.map(day =>
      `<td style="font-size:9px;color:#4A7C59;padding:3px 4px;border:1px solid #ddd;background:${
        (day.prep500 || day.prep501) ? '#f0fff0' : day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : 'white'
      }">${day.prep500 ? 'BD 500 ✓ ' : ''}${day.prep501 ? 'BD 501 ✓' : ''}</td>`
    ).join(''),

    moosh: plan.days.map(day =>
      `<td style="font-size:9px;font-style:italic;color:#666;vertical-align:top;padding:3px 4px;border:1px solid #ddd;background:${
        day.nodeActive ? '#fff0f0' : '#fffdf0'
      }">${day.mooshTip ? `מוש: ${day.mooshTip}` : ''}</td>`
    ).join(''),

    header: plan.days.map(day =>
      `<th style="padding:5px 6px;text-align:right;background:#1C3A1E;color:#F5C840;border:1px solid #2d4f2f;font-size:${
        day.date === today ? '9px' : '8px'
      };font-weight:${day.date === today ? 'bold' : 'normal'}">${
        day.dayOfWeek}${day.date === today ? ' ★' : ''
      }</th>`
    ).join(''),
  };

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תכנית שבועית — גינה חיה</title>
<style>
  @page { size: A4 portrait; margin: 1cm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 0; background: white; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { word-wrap: break-word; overflow-wrap: break-word; }
</style>
</head>
<body>
  <div style="font-size:11px;margin-bottom:8px;border-bottom:2px solid #1C3A1E;padding-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
    <span style="color:#999;font-size:9px">${new Date().toLocaleDateString('he-IL')}</span>
    <strong style="font-size:12px">גינה חיה | תכנית שבועית | ${plan.weekStart} — ${plan.weekEnd}</strong>
  </div>

  <table>
    <thead>
      <tr>${rows.header}</tr>
      <tr>${rows.date}</tr>
      <tr>${rows.score}</tr>
    </thead>
    <tbody>
      <tr>${rows.moon}</tr>
      <tr>${rows.actions}</tr>
      <tr>${rows.plants}</tr>
      <tr>${rows.bd}</tr>
      <tr>${rows.moosh}</tr>
    </tbody>
  </table>

  ${plan.gardenTasks.length > 0 ? `
  <div style="margin-top:12px;font-size:9px;">
    <strong>משימות שבועיות: </strong>${plan.gardenTasks.join(' • ')}
  </div>` : ''}

  <div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
    גינה חיה ונושמת — gina-haya.com | הדפס בתבונה 🌱
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
