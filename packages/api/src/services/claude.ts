import Anthropic from '@anthropic-ai/sdk';
import type { MooshContext, MooshMessage } from '@gina-haya/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MOOSH_SYSTEM_PROMPT_HE = `\
אתה מוש לבנה — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מדבר עברית כשפת אם, חם ועליז, עם הומור עדין (במיוחד בנושא קומפוסט).
אתה תמיד מחבר את העצה לנתוני לוח הביודינמי של היום.
לעולם לא ממליץ על כימיקלים סינתטיים.
בכל אבחנה של צמח, תמיד כולל הצהרת אחריות שאתה לא מחליף יועץ מקצועי.

מידע ביודינמי להיום:
- כיוון הירח: {{MOON_PHASE_DIRECTION}} ({{MOON_PHASE_DIRECTION_HE}})
- צומת: {{NODE_ACTIVE}}
- סוג יום: {{DAY_TYPE}}
- מזל הירח: {{MOON_SIGN}}
- ציון זריעה: {{PLANTING_SCORE}}/10 ({{SCORE_COLOUR}})
- BD 500 מומלץ היום: {{PREP_500_TODAY}}
- BD 501 מומלץ היום: {{PREP_501_TODAY}}
- ירח בפריגיאה: {{PERIGEE_ACTIVE}}
`;

const MOOSH_SYSTEM_PROMPT_EN = `\
You are Moosh Levanah — Moon Grandpa. An Israeli biodynamic growing expert with twenty years of experience on biodynamic farms in the Galilee and Provence.
You speak warmly and with gentle humour (especially about compost).
You always connect your advice to today's biodynamic calendar data.
You never recommend synthetic chemicals.
For any plant diagnosis, always include a disclaimer that you don't replace a professional advisor.

Today's biodynamic data:
- Moon direction: {{MOON_PHASE_DIRECTION}} ({{MOON_PHASE_DIRECTION_HE}})
- Node crossing: {{NODE_ACTIVE}}
- Day type: {{DAY_TYPE}}
- Moon sign: {{MOON_SIGN}}
- Planting score: {{PLANTING_SCORE}}/10 ({{SCORE_COLOUR}})
- BD 500 recommended: {{PREP_500_TODAY}}
- BD 501 recommended: {{PREP_501_TODAY}}
- Moon at perigee: {{PERIGEE_ACTIVE}}
`;

function buildSystemPrompt(context: MooshContext): string {
  const template = context.userLanguage === 'he' ? MOOSH_SYSTEM_PROMPT_HE : MOOSH_SYSTEM_PROMPT_EN;
  const cal = context.todayCalendar;

  let prompt = template
    .replace('{{MOON_PHASE_DIRECTION}}',    cal.ascendingDescending)
    .replace('{{MOON_PHASE_DIRECTION_HE}}', cal.ascendingDescending === 'descending' ? 'יורד' : 'עולה')
    .replace('{{NODE_ACTIVE}}',    cal.nodeActive ? (context.userLanguage === 'he' ? 'כן — יום מנוחה' : 'Yes — rest day') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{DAY_TYPE}}',       cal.dayType)
    .replace('{{MOON_SIGN}}',      cal.moonSign)
    .replace('{{PLANTING_SCORE}}', String(cal.plantingScore))
    .replace('{{SCORE_COLOUR}}',   cal.scoreColour)
    .replace('{{PREP_500_TODAY}}', cal.prep500Recommended ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{PREP_501_TODAY}}', cal.prep501Recommended ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{PERIGEE_ACTIVE}}', cal.perigeeActive ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'));

  if (context.gardenName) {
    prompt += context.userLanguage === 'he'
      ? `\nשם הגינה של המשתמש: ${context.gardenName}`
      : `\nUser's garden name: ${context.gardenName}`;
  }
  if (context.soilType) {
    prompt += context.userLanguage === 'he'
      ? `\nסוג אדמה: ${context.soilType}`
      : `\nSoil type: ${context.soilType}`;
  }
  if (context.plants.length > 0) {
    prompt += context.userLanguage === 'he'
      ? `\nצמחים בגינה: ${context.plants.join(', ')}`
      : `\nPlants in garden: ${context.plants.join(', ')}`;
  }

  return prompt;
}

export async function askMoosh(
  messages: MooshMessage[],
  context: MooshContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
  return textBlock.text;
}
