export interface DayPlan {
  date: string;
  dayOfWeek: string;
  dayType: string;
  dayTypeHe: string;
  dayTypeEmoji: string;
  plantingScore: number;
  scoreColour: string;
  nodeActive: boolean;
  moonDirection: string;
  moonDirectionHe: string;
  prep500: boolean;
  prep501: boolean;
  recommendedActions: string[];
  recommendedPlants: string[];
  avoidActions?: string[];
  mooshTip: string;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  weekSummary?: string;
  bestDayForPlanting?: string;
  bestDayForHarvest?: string;
  days: DayPlan[];
  gardenTasks: string[];
  weatherSummary?: string;
}

const SCORE_COLOURS: Record<string, string> = {
  green:  '#2d6e3e',
  yellow: '#a07010',
  orange: '#8b3a10',
  red:    '#7a1f1f',
  black:  '#333333',
};

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)}/${parseInt(m)}`;
}

function dayCardHTML(day: DayPlan, today: string): string {
  const isToday = day.date === today;
  const bgColor = day.nodeActive ? '#fff5f5' : isToday ? '#fffbf0' : '#ffffff';
  const borderColor = day.nodeActive ? '#e09090' : isToday ? '#c8a040' : '#cccccc';
  const scoreColor = SCORE_COLOURS[day.scoreColour] ?? '#333';

  const actions = day.recommendedActions.slice(0, 6)
    .map(a => `
      <li style="list-style:none;display:flex;align-items:flex-start;gap:5px;margin-bottom:3px;">
        <span style="display:inline-block;min-width:10px;height:10px;border:1.5px solid #444;border-radius:2px;flex-shrink:0;margin-top:1px;"></span>
        <span>${a}</span>
      </li>`).join('');

  const plants = day.recommendedPlants.slice(0, 5).join('، ');

  const bdPreps = [
    day.prep500 ? '<span style="color:#2d6e3e;font-weight:bold;background:#e8f5e8;padding:1px 5px;border-radius:3px;">BD 500 ✓</span>' : '',
    day.prep501 ? '<span style="color:#2d6e3e;font-weight:bold;background:#e8f5e8;padding:1px 5px;border-radius:3px;">BD 501 ✓</span>' : '',
  ].filter(Boolean).join(' ');

  const moosh = day.mooshTip
    ? `<div style="font-style:italic;color:#666;font-size:9px;margin-top:5px;border-top:1px dashed #ddd;padding-top:4px;">💬 ${day.mooshTip.substring(0, 100)}${day.mooshTip.length > 100 ? '...' : ''}</div>`
    : '';

  return `
    <td style="
      width:33.33%;
      vertical-align:top;
      padding:8px;
      border:2px solid ${borderColor};
      border-radius:5px;
      background:${bgColor};
      font-size:10px;
      font-family:Arial,sans-serif;
    ">
      <!-- Day header -->
      <div style="border-bottom:1.5px solid ${borderColor};padding-bottom:5px;margin-bottom:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:11px;color:${isToday ? '#8b6914' : '#1a1a1a'}">${day.dayOfWeek}${isToday ? ' ★' : ''}</strong>
          <span style="font-size:10px;color:#666;">${shortDate(day.date)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">
          <span style="background:${borderColor}22;border:1px solid ${borderColor};border-radius:3px;padding:2px 6px;font-size:9px;">
            ${day.dayTypeEmoji} ${day.dayTypeHe}
          </span>
          <span style="font-size:16px;font-weight:bold;color:${scoreColor};">${day.nodeActive ? '⚫' : day.plantingScore}</span>
        </div>
        ${day.nodeActive ? '<div style="color:#c00;font-size:9px;margin-top:3px;font-weight:bold;">⚫ יום צומת — מנוחה לגינה</div>' : ''}
      </div>

      <!-- Moon + BD -->
      <div style="color:#444;margin-bottom:5px;font-size:9px;display:flex;justify-content:space-between;align-items:center;">
        <span>${day.moonDirection === 'ascending' ? '↑' : '↓'} ${day.moonDirectionHe}</span>
        <span>${bdPreps}</span>
      </div>

      <!-- Actions -->
      ${!day.nodeActive ? `
      <ul style="margin:0;padding:0;font-size:10px;line-height:1.5;color:#222;">
        ${actions}
      </ul>` : '<div style="color:#999;font-size:10px;font-style:italic;">הימנע מעבודות גינה היום</div>'}

      <!-- Plants -->
      ${plants && !day.nodeActive ? `<div style="margin-top:4px;font-size:9px;color:#2d6e3e;">🌱 ${plants}</div>` : ''}

      <!-- Moosh tip -->
      ${moosh}
    </td>
  `;
}

export function printWeeklyPlan(plan: WeeklyPlan, today: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  // 3 rows: 3 + 2 + 2  (or adapt to actual days count)
  const row1 = plan.days.slice(0, 3);
  const row2 = plan.days.slice(3, 5);
  const row3 = plan.days.slice(5, 7);

  function tableRow(days: DayPlan[]): string {
    const cells = days.map(day => dayCardHTML(day, today)).join(
      '<td style="width:8px;padding:0;border:none;background:transparent;"></td>'
    );
    // Fill remaining columns if less than 3 days
    const empty = 3 - days.length;
    const emptyCells = empty > 0
      ? Array(empty).fill('<td style="border:none;background:transparent;"></td>').join(
          '<td style="width:8px;padding:0;border:none;background:transparent;"></td>'
        )
      : '';
    return `<tr>${cells}${empty > 0 ? '<td style="width:8px;padding:0;border:none;"></td>' + emptyCells : ''}</tr>`;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תכנית שבועית — גינה חיה</title>
<style>
  @page { size: A4 portrait; margin: 1cm 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; direction: rtl; background: white; color: #1a1a1a; font-size: 10px; }
  table { width: 100%; border-collapse: separate; border-spacing: 5px; }
</style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #1C3A1E;padding-bottom:7px;margin-bottom:10px;">
    <div style="font-size:8px;color:#999;text-align:left;">
      <div><span style="display:inline-block;width:9px;height:9px;background:#f0fff0;border:1px solid #2d6e3e;border-radius:2px;margin-left:3px;"></span>BD מומלץ</div>
      <div><span style="display:inline-block;width:9px;height:9px;background:#fff0f0;border:1px solid #e09090;border-radius:2px;margin-left:3px;"></span>יום צומת</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:15px;font-weight:bold;color:#1C3A1E;">גינה חיה | תכנית שבועית</div>
      <div style="font-size:10px;color:#666;">${plan.weekStart} — ${plan.weekEnd}</div>
    </div>
    <div style="font-size:9px;color:#999;">${new Date().toLocaleDateString('he-IL')}</div>
  </div>

  <!-- Week summary -->
  ${plan.weekSummary ? `<div style="font-size:9px;color:#555;margin-bottom:8px;font-style:italic;border-right:3px solid #c8a040;padding-right:7px;">${plan.weekSummary}</div>` : ''}

  <!-- Row 1: Days 1-3 -->
  <table style="margin-bottom:6px;"><${tableRow(row1)}</table>

  <!-- Row 2: Days 4-5 -->
  <table style="margin-bottom:6px;"><${tableRow(row2)}</table>

  <!-- Row 3: Days 6-7 -->
  <table style="margin-bottom:8px;"><${tableRow(row3)}</table>

  <!-- Weekly tasks -->
  ${plan.gardenTasks && plan.gardenTasks.length > 0 ? `
  <div style="border:1.5px solid #1C3A1E;border-radius:4px;padding:7px 10px;margin-bottom:6px;font-size:10px;">
    <strong style="color:#1C3A1E;display:block;margin-bottom:5px;">📋 משימות שבועיות:</strong>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${plan.gardenTasks.map(t => `
        <span style="display:inline-flex;align-items:center;gap:5px;min-width:200px;">
          <span style="display:inline-block;min-width:11px;height:11px;border:1.5px solid #1C3A1E;border-radius:2px;flex-shrink:0;"></span>
          ${t}
        </span>`).join('')}
    </div>
  </div>` : ''}

  <!-- Best days -->
  ${(plan.bestDayForPlanting || plan.bestDayForHarvest) ? `
  <div style="display:flex;gap:20px;margin-bottom:6px;font-size:9px;">
    ${plan.bestDayForPlanting ? `<span><strong style="color:#2d6e3e;">🌱 יום שתילה מומלץ:</strong> ${plan.bestDayForPlanting}</span>` : ''}
    ${plan.bestDayForHarvest ? `<span><strong style="color:#8b6914;">🌾 יום קציר מומלץ:</strong> ${plan.bestDayForHarvest}</span>` : ''}
  </div>` : ''}

  <!-- Footer -->
  <div style="border-top:1px solid #ddd;padding-top:5px;font-size:8px;color:#999;display:flex;justify-content:space-between;">
    <span>גינה חיה ונושמת — gina-haya.com</span>
    <span>הדפס בתבונה 🌱</span>
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
