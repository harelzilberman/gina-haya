export type DayType = 'root' | 'flower' | 'leaf' | 'fruit' | 'node';

export interface BDPlainSummary {
  headline: { he: string; en: string };
  goodFor: { he: string[]; en: string[] };
  avoidToday: { he: string[]; en: string[] };
  moonMessage: { he: string; en: string };
  scoreLabel: { he: string; en: string };
  bdDetail: { he: string; en: string };
}

interface DayMsgEntry {
  headline: { he: string; en: string };
  goodFor: { he: string[]; en: string[] };
  avoid: { he: string[]; en: string[] };
  bdDetail: { he: string; en: string };
}

export function getBDPlainSummary(
  dayType: DayType,
  score: number,
  ascending: boolean,
  isNode: boolean,
  prep500: boolean,
  prep501: boolean,
): BDPlainSummary {

  if (isNode) {
    return {
      headline: {
        he: 'יום מנוחה לגינה — הירח עובר צומת',
        en: 'Rest day for the garden — moon crossing node',
      },
      goodFor: {
        he: ['תכנון, קריאה, תחזוקת כלים'],
        en: ['Planning, reading, tool maintenance'],
      },
      avoidToday: {
        he: ['זריעה, שתילה, קטיף'],
        en: ['Sowing, planting, harvesting'],
      },
      moonMessage: {
        he: 'הצומת הוא נקודת מעבר אסטרולוגית — הגינה זקוקה למנוחה',
        en: 'The node is an astrological crossing point — the garden needs rest',
      },
      scoreLabel: { he: 'לא מומלץ לגינן היום', en: 'Not recommended for gardening today' },
      bdDetail: { he: 'יום צומת (Node day)', en: 'Node day (יום צומת)' },
    };
  }

  const dayMessages: Record<string, DayMsgEntry> = {
    root: {
      headline: {
        he: 'יום שורש — מצוין לעבודת קרקע ושתילה',
        en: 'Root day — great for soil work and planting',
      },
      goodFor: {
        he: ['שתילת ירקות שורש (גזר, תפוח-אדמה, בצל, שום)', 'עידור וריכוך קרקע', 'דישון וקומפוסט', 'גיזום שורשים'],
        en: ['Planting root vegetables (carrot, potato, onion, garlic)', 'Hoeing and loosening soil', 'Fertilising and compost application', 'Root pruning'],
      },
      avoid: {
        he: ['קטיף עלים וצמחי תבלין'],
        en: ['Harvesting leafy greens and herbs'],
      },
      bdDetail: { he: 'יום שורש — הירח בגדי עפר (שור, בתולה, גדי)', en: 'Root day — moon in earth signs (Taurus, Virgo, Capricorn)' },
    },
    leaf: {
      headline: {
        he: 'יום עלה — מצוין לגידולי עלים ושקייה',
        en: 'Leaf day — great for leafy plants and watering',
      },
      goodFor: {
        he: ['קטיף חסה, תרד, עשבי תיבול', 'השקיית צמחים (מי יום-עלה נספגים טוב)', 'שתילת ירקות עלה', 'דישון נוזלי (תה קומפוסט, אצות)'],
        en: ['Harvesting lettuce, spinach, herbs', 'Watering (leaf-day water absorbs well)', 'Planting leafy vegetables', 'Liquid fertilising (compost tea, seaweed)'],
      },
      avoid: {
        he: ['קטיף פירות וירקות לאחסון ארוך'],
        en: ['Harvesting fruit for long storage'],
      },
      bdDetail: { he: 'יום עלה — הירח בגדי מים (סרטן, עקרב, דגים)', en: 'Leaf day — moon in water signs (Cancer, Scorpio, Pisces)' },
    },
    flower: {
      headline: {
        he: 'יום פרח — מצוין לפרחים ומריחת BD-501',
        en: 'Flower day — great for flowers and BD-501 spraying',
      },
      goodFor: {
        he: ['קטיף פרחים לזר או לייבוש', 'שתילת פרחים ועצי נוי', prep501 ? 'ריסוס BD-501 (מומלץ היום במיוחד!)' : 'ריסוס עלים מניעתי', 'הנחת כוורות'],
        en: ['Cutting flowers for bouquets or drying', 'Planting flowers and ornamentals', prep501 ? 'BD-501 spraying (especially recommended today!)' : 'Preventive foliar spraying', 'Beehive placement'],
      },
      avoid: {
        he: ['עבודת קרקע כבדה'],
        en: ['Heavy soil work'],
      },
      bdDetail: { he: 'יום פרח — הירח בגדי אוויר (תאומים, מאזניים, דלי)', en: 'Flower day — moon in air signs (Gemini, Libra, Aquarius)' },
    },
    fruit: {
      headline: {
        he: 'יום פרי — מצוין לקטיף ושתילת עצי פרי',
        en: 'Fruit day — great for harvesting and fruit tree work',
      },
      goodFor: {
        he: ['קטיף עגבניות, מלפפונים, פלפלים, דלעות', 'שתילת עצי פרי וגפנים', 'הכנת ריבות ושימורים', 'קטיף זרעים לשמירה'],
        en: ['Harvesting tomatoes, cucumbers, peppers, squash', 'Planting fruit trees and vines', 'Making jams and preserves', 'Harvesting seeds for saving'],
      },
      avoid: {
        he: ['עבודת שורשים, עידור עמוק'],
        en: ['Root work, deep hoeing'],
      },
      bdDetail: { he: 'יום פרי — הירח בגדי אש (טלה, אריה, קשת)', en: 'Fruit day — moon in fire signs (Aries, Leo, Sagittarius)' },
    },
    node: {
      headline: { he: 'יום מנוחה לגינה', en: 'Rest day for the garden' },
      goodFor: { he: ['תכנון וקריאה'], en: ['Planning and reading'] },
      avoid: { he: ['זריעה, שתילה, קטיף'], en: ['Sowing, planting, harvesting'] },
      bdDetail: { he: 'יום צומת', en: 'Node day' },
    },
  };

  const dm = dayMessages[dayType] ?? dayMessages['root'];

  const moonMessage = ascending
    ? { he: 'ירח עולה — מצוין לזריעה ולריסוס עלים', en: 'Ascending moon — great for sowing and foliar spraying' }
    : { he: 'ירח יורד — מצוין לשתילה, קומפוסט ועבודת קרקע', en: 'Descending moon — great for transplanting, compost and soil work' };

  const scoreLabel =
    score >= 8 ? { he: 'תנאים מצוינים לגינון היום', en: 'Excellent gardening conditions today' }
    : score >= 6 ? { he: 'תנאים טובים לגינון היום', en: 'Good gardening conditions today' }
    : score >= 4 ? { he: 'תנאים בינוניים — עדיף לחכות', en: 'Moderate conditions — better to wait' }
    : { he: 'לא מומלץ לגינון היום', en: 'Not recommended for gardening today' };

  const goodForHe = [...dm.goodFor.he];
  const goodForEn = [...dm.goodFor.en];
  if (prep500 && dayType === 'root') {
    goodForHe.unshift('ריסוס BD-500 (מומלץ היום!)');
    goodForEn.unshift('BD-500 spraying (recommended today!)');
  }

  return {
    headline: dm.headline,
    goodFor: { he: goodForHe, en: goodForEn },
    avoidToday: { he: dm.avoid.he, en: dm.avoid.en },
    moonMessage,
    scoreLabel,
    bdDetail: dm.bdDetail,
  };
}
