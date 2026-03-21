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

function scoreLabel(score: number): string {
  if (score >= 8) return 'מצוין';
  if (score >= 6) return 'טוב';
  if (score >= 4) return 'בינוני';
  return 'חלש';
}

export function printWeeklyPlan(plan: WeeklyPlan, today: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  // Split 7 days into rows: 4 + 3
  const row1 = plan.days.slice(0, 4);
  const row2 = plan.days.slice(4, 7);

  function dayCardHTML(day: DayPlan): string {
    const isToday = day.date === today;
    const bgColor = day.nodeActive ? '#fff0f0' : isToday ? '#f8f5e0' : '#ffffff';
    const borderColor = day.nodeActive ? '#e09090' : isToday ? '#c8a040' : '#cccccc';
    const scoreColor = SCORE_COLOURS[day.scoreColour] ?? '#333';

    const actions = day.recommendedActions.slice(0, 4)
      .map(a => `<li style="list-style:none;display:flex;align-items:flex-start;gap:4px;margin-bottom:2px"><span style="display:inline-block;width:9px;height:9px;border:1.5px solid #444;border-radius:2px;flex-shrink:0;margin-top:1px"></span>${a}</li>`).join('');

    const plants = day.recommendedPlants.slice(0, 4).join('، ');

    const bdPreps = [
      day.prep500 ? '<span style="color:#2d6e3e;font-weight:bold">BD500✓</span>' : '',
      day.prep501 ? '<span style="color:#2d6e3e;font-weight:bold">BD501✓</span>' : '',
    ].filter(Boolean).join(' ');

    const moosh = day.mooshTip
      ? `<div style="font-style:italic;color:#666;font-size:8px;margin-top:4px;border-top:1px solid #eee;padding-top:3px">${day.mooshTip.substring(0, 80)}${day.mooshTip.length > 80 ? '...' : ''}</div>`
      : '';

    return `
      <td style="
        width:${day === row2[row2.length - 1] && row2.length === 3 ? '33.33%' : '25%'};
        vertical-align:top;
        padding:6px;
        border:2px solid ${borderColor};
        border-radius:4px;
        background:${bgColor};
        font-size:9px;
        font-family:Arial,sans-serif;
      ">
        <!-- Day header -->
        <div style="border-bottom:1px solid ${borderColor};padding-bottom:4px;margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:10px;color:${isToday ? '#8b6914' : '#1a1a1a'}">${day.dayOfWeek}${isToday ? ' ★' : ''}</strong>
            <span style="font-size:9px;color:#666">${shortDate(day.date)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
            <span style="background:${borderColor}22;border:1px solid ${borderColor};border-radius:3px;padding:1px 5px;font-size:8px;">
              ${day.dayTypeEmoji} ${day.dayTypeHe}
            </span>
            <span style="font-size:14px;font-weight:bold;color:${scoreColor}">${day.nodeActive ? '⚫' : day.plantingScore}</span>
          </div>
          ${day.nodeActive ? '<div style="color:#c00;font-size:8px;margin-top:2px;font-weight:bold">⚫ יום צומת — מנוחה לגינה</div>' : ''}
        </div>

        <!-- Moon -->
        <div style="color:#444;margin-bottom:3px;font-size:8px;">
          ${day.moonDirection === 'ascending' ? '↑' : '↓'} ${day.moonDirectionHe}
          ${bdPreps ? `· ${bdPreps}` : ''}
        </div>

        <!-- Actions -->
        ${!day.nodeActive ? `
        <ul style="margin:0;padding:0 0 0 12px;font-size:8px;line-height:1.5;color:#222;">
          ${actions}
        </ul>` : ''}

        <!-- Plants -->
        ${plants && !day.nodeActive ? `<div style="margin-top:3px;font-size:8px;color:#2d6e3e;">🌱 ${plants}</div>` : ''}

        <!-- Moosh tip -->
        ${moosh}
      </td>
    `;
  }

  function tableRowHTML(days: DayPlan[]): string {
    return `
      <tr>
        ${days.map(day => dayCardHTML(day)).join('<td style="width:6px;padding:0;border:none;background:transparent"></td>')}
      </tr>
    `;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תכנית שבועית — גינה חיה</title>
<style>
  @page { 
    size: A4 portrait; 
    margin: 1cm 1.2cm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: Arial, sans-serif; 
    direction: rtl; 
    background: white; 
    color: #1a1a1a;
    font-size: 9px;
  }
  table { width: 100%; border-collapse: separate; border-spacing: 4px; }
  ul { padding-right: 12px; padding-left: 0; }
</style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1C3A1E;padding-bottom:6px;margin-bottom:8px;">
    <span style="color:#999;font-size:8px">${new Date().toLocaleDateString('he-IL')}</span>
    <div style="text-align:center">
      <div style="font-size:14px;font-weight:bold;color:#1C3A1E">גינה חיה | תכנית שבועית</div>
      <div style="font-size:9px;color:#666">${plan.weekStart} — ${plan.weekEnd}</div>
    </div>
    <div style="text-align:left;font-size:8px;color:#999">
      <span style="display:inline-block;width:8px;height:8px;background:#f0fff0;border:1px solid #2d6e3e;border-radius:2px;margin-left:2px"></span>BD מומלץ
      <br>
      <span style="display:inline-block;width:8px;height:8px;background:#fff0f0;border:1px solid #e09090;border-radius:2px;margin-left:2px"></span>יום צומת
    </div>
  </div>

  <!-- Week summary -->
  ${plan.weekSummary ? `<div style="font-size:8px;color:#555;margin-bottom:8px;font-style:italic;border-right:3px solid #c8a040;padding-right:6px;">${plan.weekSummary}</div>` : ''}

  <!-- Row 1: Days 1-4 -->
  <table style="margin-bottom:6px;">
    ${tableRowHTML(row1)}
  </table>

  <!-- Row 2: Days 5-7 -->
  <table style="margin-bottom:8px;">
    <tr>
      ${row2.map(day => dayCardHTML(day)).join('<td style="width:6px;padding:0;border:none;background:transparent"></td>')}
      ${row2.length === 3 ? '' : '<td style="background:transparent;border:none"></td>'}
    </tr>
  </table>

  <!-- Weekly tasks -->
  ${plan.gardenTasks && plan.gardenTasks.length > 0 ? `
  <div style="border:1px solid #ddd;border-radius:4px;padding:6px 8px;margin-bottom:6px;font-size:8px;">
    <strong style="color:#1C3A1E">משימות שבועיות: </strong>
    </strong><br>
    ${plan.gardenTasks.map(t => `<span style="display:inline-flex;align-items:center;margin-left:16px;margin-top:3px"><span style="display:inline-block;width:10px;height:10px;border:1.5px solid #1C3A1E;border-radius:2px;margin-left:5px;flex-shrink:0"></span>${t}</span>`).join('')}
  </div>` : ''}

  <!-- Best days -->
  ${(plan.bestDayForPlanting || plan.bestDayForHarvest) ? `
  <div style="display:flex;gap:12px;margin-bottom:6px;font-size:8px;">
    ${plan.bestDayForPlanting ? `<span><strong style="color:#2d6e3e">🌱 יום שתילה מומלץ:</strong> ${plan.bestDayForPlanting}</span>` : ''}
    ${plan.bestDayForHarvest ? `<span><strong style="color:#8b6914">🌾 יום קציר מומלץ:</strong> ${plan.bestDayForHarvest}</span>` : ''}
  </div>` : ''}

  <!-- Footer -->
  <div style="border-top:1px solid #ddd;padding-top:4px;font-size:7px;color:#999;display:flex;justify-content:space-between;">
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
