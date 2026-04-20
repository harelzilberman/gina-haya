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
  chupChuTip: string;
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

function dayCardHTML(day: DayPlan, today: string, widthPct: string): string {
  const isToday = day.date === today;
  const bgColor = day.nodeActive ? '#fff5f5' : isToday ? '#fffbf0' : '#ffffff';
  const borderColor = day.nodeActive ? '#e09090' : isToday ? '#c8a040' : '#cccccc';
  const scoreColor = SCORE_COLOURS[day.scoreColour] ?? '#333';

  const actions = day.recommendedActions.slice(0, 8)
    .map(a => `
      <li style="list-style:none;display:flex;align-items:flex-start;gap:5px;margin-bottom:4px;">
        <span style="display:inline-block;min-width:11px;height:11px;border:1.5px solid #444;border-radius:2px;flex-shrink:0;margin-top:1px;"></span>
        <span>${a}</span>
      </li>`).join('');

  const plants = day.recommendedPlants.slice(0, 6).join('، ');

  const bdPreps = [
    day.prep500 ? '<span style="color:#2d6e3e;font-weight:bold;background:#e8f5e8;padding:1px 6px;border-radius:3px;">פרפרט 500 ✓</span>' : '',
    day.prep501 ? '<span style="color:#2d6e3e;font-weight:bold;background:#e8f5e8;padding:1px 6px;border-radius:3px;">פרפרט 501 ✓</span>' : '',
  ].filter(Boolean).join(' ');

  const chupChu = day.chupChuTip
    ? `<div style="font-style:italic;color:#555;font-size:10px;margin-top:6px;border-top:1px dashed #ddd;padding-top:5px;">💬 ${day.chupChuTip.substring(0, 120)}${day.chupChuTip.length > 120 ? '...' : ''}</div>`
    : '';

  return `
    <td style="
      width:${widthPct};
      vertical-align:top;
      padding:10px;
      border:2px solid ${borderColor};
      border-radius:6px;
      background:${bgColor};
      font-size:11px;
      font-family:Arial,sans-serif;
    ">
      <div style="border-bottom:1.5px solid ${borderColor};padding-bottom:6px;margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;color:${isToday ? '#8b6914' : '#1a1a1a'}">${day.dayOfWeek}${isToday ? ' ★' : ''}</strong>
          <span style="font-size:11px;color:#666;">${shortDate(day.date)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="background:${borderColor}22;border:1px solid ${borderColor};border-radius:3px;padding:2px 7px;font-size:10px;">
            ${day.dayTypeEmoji} ${day.dayTypeHe}
          </span>
          <span style="font-size:20px;font-weight:bold;color:${scoreColor};">${day.nodeActive ? '⚫' : day.plantingScore}</span>
        </div>
        ${day.nodeActive ? '<div style="color:#c00;font-size:10px;margin-top:3px;font-weight:bold;">⚫ יום צומת — מנוחה לגינה</div>' : ''}
      </div>

      <div style="color:#444;margin-bottom:6px;font-size:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
        <span>${day.moonDirection === 'ascending' ? '↑' : '↓'} ${day.moonDirectionHe}</span>
        <span>${bdPreps}</span>
      </div>

      ${!day.nodeActive ? `
      <ul style="margin:0;padding:0;font-size:11px;line-height:1.6;color:#222;">
        ${actions}
      </ul>` : '<div style="color:#999;font-size:11px;font-style:italic;">הימנע מעבודות גינה היום</div>'}

      ${plants && !day.nodeActive ? `<div style="margin-top:5px;font-size:10px;color:#2d6e3e;">🌱 ${plants}</div>` : ''}

      ${chupChu}
    </td>
  `;
}

function spacer(): string {
  return '<td style="width:6px;padding:0;border:none;background:transparent;"></td>';
}

export function printWeeklyPlan(plan: WeeklyPlan, today: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  // 4 rows: 2, 2, 2, 1
  const rows = [
    plan.days.slice(0, 2),
    plan.days.slice(2, 4),
    plan.days.slice(4, 6),
    plan.days.slice(6, 7),
  ];

  function tableRow(days: DayPlan[], colWidth: string): string {
    const cells = days.map(day => dayCardHTML(day, today, colWidth)).join(spacer());
    return `<tr>${cells}</tr>`;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תכנית שבועית — גינה חיה</title>
<style>
  @page { size: A4 portrait; margin: 1cm 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; direction: rtl; background: white; color: #1a1a1a; font-size: 11px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  @media print {
    td { page-break-inside: avoid; padding: 6px !important; }
    td > div:first-child { padding-bottom: 4px !important; margin-bottom: 4px !important; }
    ul { line-height: 1.05 !important; }
    li { margin-bottom: 3px !important; line-height: 1.05 !important; }
    table { margin-bottom: 3px !important; }
    .task-section { padding: 5px 8px !important; margin-bottom: 4px !important; }
    .task-row { gap: 4px 13px !important; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #1C3A1E;padding-bottom:7px;margin-bottom:10px;">
    <div style="font-size:9px;color:#999;text-align:left;">
      <div><span style="display:inline-block;width:9px;height:9px;background:#f0fff0;border:1px solid #2d6e3e;border-radius:2px;margin-left:3px;"></span>BD מומלץ</div>
      <div style="margin-top:2px;"><span style="display:inline-block;width:9px;height:9px;background:#fff0f0;border:1px solid #e09090;border-radius:2px;margin-left:3px;"></span>יום צומת</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:16px;font-weight:bold;color:#1C3A1E;">גינה חיה | תכנית שבועית</div>
      <div style="font-size:11px;color:#666;margin-top:2px;">${plan.weekStart} — ${plan.weekEnd}</div>
    </div>
    <div style="font-size:9px;color:#999;">${new Date().toLocaleDateString('he-IL')}</div>
  </div>

  ${plan.weekSummary ? `<div style="font-size:10px;color:#555;margin-bottom:8px;font-style:italic;border-right:3px solid #c8a040;padding-right:7px;">${plan.weekSummary}</div>` : ''}

  <!-- Row 1: Days 1-2 -->
  <table style="margin-bottom:5px;">${tableRow(rows[0], '50%')}</table>

  <!-- Row 2: Days 3-4 -->
  <table style="margin-bottom:5px;">${tableRow(rows[1], '50%')}</table>

  <!-- Row 3: Days 5-6 -->
  <table style="margin-bottom:5px;">${tableRow(rows[2], '50%')}</table>

  <!-- Row 4: Day 7 (full width) -->
  ${rows[3].length > 0 ? `<table style="margin-bottom:8px;">${tableRow(rows[3], '100%')}</table>` : ''}

  <!-- Weekly tasks -->
  ${plan.gardenTasks && plan.gardenTasks.length > 0 ? `
  <div class="task-section" style="border:1.5px solid #1C3A1E;border-radius:5px;padding:8px 12px;margin-bottom:6px;font-size:11px;">
    <strong style="color:#1C3A1E;display:block;margin-bottom:6px;font-size:12px;">📋 משימות שבועיות:</strong>
    <div class="task-row" style="display:flex;flex-wrap:wrap;gap:6px 20px;">
      ${plan.gardenTasks.map(t => `
        <span style="display:inline-flex;align-items:center;gap:6px;min-width:220px;">
          <span style="display:inline-block;min-width:12px;height:12px;border:1.5px solid #1C3A1E;border-radius:2px;flex-shrink:0;"></span>
          ${t}
        </span>`).join('')}
    </div>
  </div>` : ''}

  ${(plan.bestDayForPlanting || plan.bestDayForHarvest) ? `
  <div style="display:flex;gap:20px;margin-bottom:6px;font-size:10px;">
    ${plan.bestDayForPlanting ? `<span><strong style="color:#2d6e3e;">🌱 יום שתילה מומלץ:</strong> ${plan.bestDayForPlanting}</span>` : ''}
    ${plan.bestDayForHarvest ? `<span><strong style="color:#8b6914;">🌾 יום קציר מומלץ:</strong> ${plan.bestDayForHarvest}</span>` : ''}
  </div>` : ''}

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
