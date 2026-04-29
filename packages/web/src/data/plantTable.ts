// Auto-generated from planting_and_germinating_seeds_time_table.xlsx (v2)
// 50 plants with verified spacings, planting months, BD day types

export interface PlantTableEntry {
  nameHe: string;
  nameEn: string;
  family: string;
  ediblePart: string;
  bdDayType: 'fruit' | 'root' | 'leaf' | 'flower';
  plantingMonths: string[];
  spacingCm: number | null;
  rowSpacingCm: number | null;
  placementSpacingCm: number;
  plantsPerSqm: string | null;
  rowsPerBed: string | null;
  method: string | null;
  germinationDays: string | null;
  daysToTransplant: string | null;
  daysToHarvest: string | null;
  images?: (string | null)[];
}

export const PLANT_TABLE: PlantTableEntry[] = [
  {
    "nameHe": "גזר",
    "nameEn": "Carrot",
    "family": "סוככיים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "אוקטובר",
      "נובמבר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 1.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "100",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "7",
    "daysToTransplant": null,
    "daysToHarvest": "120-160",
    "images": ["/images/plants/Carrot_stage1_00001_.png", "/images/plants/Carrot_stage2_00001_.png", "/images/plants/Carrot_stage3_00001_.png"]
  },
  {
    "nameHe": "כוסברה",
    "nameEn": "Coriander",
    "family": "סוככיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 0.75,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "150",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "5-6",
    "daysToTransplant": null,
    "daysToHarvest": "45"
  },
  {
    "nameHe": "סלרי עלים",
    "nameEn": "Leaf Celery",
    "family": "סוככיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר"
    ],
    "spacingCm": 30.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "14",
    "daysToTransplant": "40-45",
    "daysToHarvest": "120"
  },
  {
    "nameHe": "שורש סלרי",
    "nameEn": "Celeriac",
    "family": "סוככיים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר"
    ],
    "spacingCm": 20.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "14",
    "daysToTransplant": "40-45",
    "daysToHarvest": "120"
  },
  {
    "nameHe": "פטרוזיליה",
    "nameEn": "Parsley",
    "family": "סוככיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי",
      "אוגוסט"
    ],
    "spacingCm": 0.75,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "150",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "8-20",
    "daysToTransplant": null,
    "daysToHarvest": "45"
  },
  {
    "nameHe": "שורש פטרוזיליה",
    "nameEn": "Parsley Root",
    "family": "סוככיים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר"
    ],
    "spacingCm": 2.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "50",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "10-20",
    "daysToTransplant": "45",
    "daysToHarvest": "120"
  },
  {
    "nameHe": "שומר",
    "nameEn": "Fennel",
    "family": "סוככיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 20.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "5",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-120"
  },
  {
    "nameHe": "שמיר",
    "nameEn": "Dill",
    "family": "סוככיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 0.75,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "150",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "7-8",
    "daysToTransplant": null,
    "daysToHarvest": "45"
  },
  {
    "nameHe": "חציל",
    "nameEn": "Eggplant",
    "family": "סולניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 90.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "35",
    "daysToHarvest": "90-120",
    "images": ["/images/plants/Eggplant_stage1_00001_.png", "/images/plants/Eggplant_stage2_00001_.png", "/images/plants/Eggplant_stage3_00001_.png"]
  },
  {
    "nameHe": "עגבניה",
    "nameEn": "Tomato",
    "family": "סולניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 90.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "שתילה",
    "germinationDays": "5-6",
    "daysToTransplant": "30",
    "daysToHarvest": "60-90"
  },
  {
    "nameHe": "פלפל אדום",
    "nameEn": "Bell Pepper",
    "family": "סולניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 70.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "5-6",
    "daysToTransplant": "30",
    "daysToHarvest": "120-160"
  },
  {
    "nameHe": "פלפל חריף",
    "nameEn": "Hot Pepper",
    "family": "סולניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 70.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "5-6",
    "daysToTransplant": "30",
    "daysToHarvest": "120-140"
  },
  {
    "nameHe": "חומעה",
    "nameEn": "Sorrel",
    "family": "סלקיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "דצמבר",
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 0.7,
    "rowSpacingCm": 20.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "120",
    "rowsPerBed": "3-5",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "45"
  },
  {
    "nameHe": "סלק אדום",
    "nameEn": "Beetroot",
    "family": "סלקיים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 15.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 15.0,
    "plantsPerSqm": "6",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "8",
    "daysToTransplant": null,
    "daysToHarvest": "90-120"
  },
  {
    "nameHe": "סלק עלים",
    "nameEn": "Leaf Beet",
    "family": "סלקיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 0.7,
    "rowSpacingCm": 20.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "120",
    "rowsPerBed": "3-5",
    "method": "זריעה",
    "germinationDays": "8",
    "daysToTransplant": null,
    "daysToHarvest": "45"
  },
  {
    "nameHe": "מנגולד",
    "nameEn": "Chard",
    "family": "סלקיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי"
    ],
    "spacingCm": 25.0,
    "rowSpacingCm": 50.0,
    "placementSpacingCm": 25.0,
    "plantsPerSqm": "4",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-120"
  },
  {
    "nameHe": "תרד",
    "nameEn": "Spinach",
    "family": "סלקיים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 4.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "25",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "35-40"
  },
  {
    "nameHe": "בצל",
    "nameEn": "Onion",
    "family": "שושניים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "ספטמבר",
      "נובמבר",
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 10.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 10.0,
    "plantsPerSqm": "10",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "8-16",
    "daysToTransplant": "30",
    "daysToHarvest": "120-160",
    "images": ["/images/plants/Onion_stage1_00001_.png", "/images/plants/Onion_stage2_00001_.png", "/images/plants/Onion_stage3_00001_.png"]
  },
  {
    "nameHe": "בצל ירוק",
    "nameEn": "Spring Onion",
    "family": "שושניים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 0.8,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "120",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "8-16",
    "daysToTransplant": "30",
    "daysToHarvest": "60",
    "images": ["/images/plants/Spring_Onion_stage1_00001_.png", "/images/plants/Spring_Onion_stage2_00001_.png", "/images/plants/Spring_Onion_stage3_00001_.png"]
  },
  {
    "nameHe": "לוף",
    "nameEn": "Leek",
    "family": "שושניים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 10.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 10.0,
    "plantsPerSqm": "10",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "8-10",
    "daysToTransplant": "60",
    "daysToHarvest": "90",
    "images": ["/images/plants/Leek_stage1_00001_.png", "/images/plants/Leek_stage2_00001_.png", "/images/plants/Leek_stage3_00001_.png"]
  },
  {
    "nameHe": "שום",
    "nameEn": "Garlic",
    "family": "שושניים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "ספטמבר"
    ],
    "spacingCm": 15.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 15.0,
    "plantsPerSqm": "6",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "14",
    "daysToTransplant": null,
    "daysToHarvest": "200"
  },
  {
    "nameHe": "בזיליקום",
    "nameEn": "Basil",
    "family": "שפתניים",
    "ediblePart": "פרח",
    "bdDayType": "flower",
    "plantingMonths": [
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי"
    ],
    "spacingCm": 30.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "3",
    "method": "גם זריעה וגם שתילה",
    "germinationDays": "7-16",
    "daysToTransplant": "30",
    "daysToHarvest": "45",
    "images": ["/images/plants/Basil_stage1_00001_.png", "/images/plants/Basil_stage2_00001_.png", "/images/plants/Basil_stage3_00001_.png"]
  },
  {
    "nameHe": "תירס",
    "nameEn": "Corn",
    "family": "דגניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי"
    ],
    "spacingCm": 15.0,
    "rowSpacingCm": 70.0,
    "placementSpacingCm": 15.0,
    "plantsPerSqm": "6",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "5-10",
    "daysToTransplant": "28",
    "daysToHarvest": "70"
  },
  {
    "nameHe": "דלעת",
    "nameEn": "Pumpkin",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 250.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 250.0,
    "plantsPerSqm": "0.4",
    "rowsPerBed": "1",
    "method": "שתילה",
    "germinationDays": "4-5",
    "daysToTransplant": "14",
    "daysToHarvest": "60-70",
    "images": ["/images/plants/Pumpkin_stage1_00001_.png", "/images/plants/Pumpkin_stage2_00001_.png", "/images/plants/Pumpkin_stage3_00001_.png"]
  },
  {
    "nameHe": "דלעת ערמונים",
    "nameEn": "Butternut Squash",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 50.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "4-5",
    "daysToTransplant": "14",
    "daysToHarvest": "60-70"
  },
  {
    "nameHe": "דלורית",
    "nameEn": "Delicata Squash",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 50.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "4-5",
    "daysToTransplant": "14",
    "daysToHarvest": "60"
  },
  {
    "nameHe": "מלפפון",
    "nameEn": "Cucumber",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "6",
    "daysToTransplant": "14",
    "daysToHarvest": "30-60",
    "images": ["/images/plants/Cucumber_stage1_00001_.png", "/images/plants/Cucumber_stage2_00001_.png", "/images/plants/Cucumber_stage3_00001_.png"]
  },
  {
    "nameHe": "קישוא",
    "nameEn": "Zucchini",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": "14",
    "daysToHarvest": "45-60"
  },
  {
    "nameHe": "אבטיח",
    "nameEn": "Watermelon",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "זריעה",
    "germinationDays": "6",
    "daysToTransplant": "14",
    "daysToHarvest": "30-60",
    "images": ["/images/plants/Watermelon_stage1_00001_.png", "/images/plants/Watermelon_stage2_00001_.png", "/images/plants/Watermelon_stage3_00001_.png"]
  },
  {
    "nameHe": "מלון",
    "nameEn": "Melon",
    "family": "דלועיים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "4",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "6",
    "daysToTransplant": "14",
    "daysToHarvest": "35-50",
    "images": ["/images/plants/Melon_stage1_00001_.png", "/images/plants/Melon_stage2_00001_.png", "/images/plants/Melon_stage3_00001_.png"]
  },
  {
    "nameHe": "תות שדה",
    "nameEn": "Strawberry",
    "family": "ורדניים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "ספטמבר",
      "מרץ"
    ],
    "spacingCm": 25.0,
    "rowSpacingCm": 50.0,
    "placementSpacingCm": 25.0,
    "plantsPerSqm": "4",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": null,
    "daysToTransplant": null,
    "daysToHarvest": "60"
  },
  {
    "nameHe": "בטטה",
    "nameEn": "Sweet Potato",
    "family": "חבלבליים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 20.0,
    "rowSpacingCm": 50.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "5",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": null,
    "daysToTransplant": null,
    "daysToHarvest": "100-120",
    "images": ["/images/plants/Sweet_Potato_stage1_00001_.png", "/images/plants/Sweet_Potato_stage2_00001_.png", "/images/plants/Sweet_Potato_stage3_00001_.png"]
  },
  {
    "nameHe": "ארטישוק",
    "nameEn": "Artichoke",
    "family": "מורכבים",
    "ediblePart": "פרח",
    "bdDayType": "flower",
    "plantingMonths": [
      "ספטמבר"
    ],
    "spacingCm": 100.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 100.0,
    "plantsPerSqm": "1",
    "rowsPerBed": "1",
    "method": "שתילה",
    "germinationDays": null,
    "daysToTransplant": null,
    "daysToHarvest": "120",
    "images": ["/images/plants/Artichoke_stage1_00001_.png", "/images/plants/Artichoke_stage2_00001_.png", "/images/plants/Artichoke_stage3_00001_.png"]
  },
  {
    "nameHe": "ארטישוק ירושלמי",
    "nameEn": "Jerusalem Artichoke",
    "family": "מורכבים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 100.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 100.0,
    "plantsPerSqm": "1",
    "rowsPerBed": "1",
    "method": "זריעה",
    "germinationDays": null,
    "daysToTransplant": null,
    "daysToHarvest": "120"
  },
  {
    "nameHe": "קנרס עליים",
    "nameEn": "Cardoon",
    "family": "מורכבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "זריעה",
    "germinationDays": "30",
    "daysToTransplant": "30",
    "daysToHarvest": "120"
  },
  {
    "nameHe": "חמניות",
    "nameEn": "Sunflower",
    "family": "מורכבים",
    "ediblePart": "פרח",
    "bdDayType": "flower",
    "plantingMonths": [
      "מרץ"
    ],
    "spacingCm": 45.0,
    "rowSpacingCm": 70.0,
    "placementSpacingCm": 45.0,
    "plantsPerSqm": "2.5",
    "rowsPerBed": "2",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "120",
    "images": ["/images/plants/Sunflower_stage1_00001_.png", "/images/plants/Sunflower_stage2_00001_.png", "/images/plants/Sunflower_stage3_00001_.png"]
  },
  {
    "nameHe": "חסה",
    "nameEn": "Lettuce",
    "family": "מורכבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי"
    ],
    "spacingCm": 30.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "30",
    "daysToHarvest": "35-60",
    "images": ["/images/plants/Lettuce_stage1_00001_.png", "/images/plants/Lettuce_stage2_00001_.png", "/images/plants/Lettuce_stage3_00001_.png"]
  },
  {
    "nameHe": "כרוב סיני",
    "nameEn": "Chinese Cabbage",
    "family": "מורכבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר"
    ],
    "spacingCm": 30.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "30",
    "daysToHarvest": "50-60"
  },
  {
    "nameHe": "גרגיר",
    "nameEn": "Arugula",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 2.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "50",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "4-5",
    "daysToTransplant": null,
    "daysToHarvest": "45-50"
  },
  {
    "nameHe": "חזרת",
    "nameEn": "Horseradish",
    "family": "מצליבים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "דצמבר",
      "פברואר",
      "מרץ"
    ],
    "spacingCm": 50.0,
    "rowSpacingCm": 180.0,
    "placementSpacingCm": 50.0,
    "plantsPerSqm": "2",
    "rowsPerBed": "1",
    "method": "שתילה",
    "germinationDays": null,
    "daysToTransplant": null,
    "daysToHarvest": "120"
  },
  {
    "nameHe": "ברוקולי",
    "nameEn": "Broccoli",
    "family": "מצליבים",
    "ediblePart": "פרי",
    "bdDayType": "fruit",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "2.5",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-90",
    "images": ["/images/plants/Broccoli_stage1_00001_.png", "/images/plants/Broccoli_stage2_00001_.png", "/images/plants/Broccoli_stage3_00001_.png"]
  },
  {
    "nameHe": "כרובית",
    "nameEn": "Cauliflower",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "2.5",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "7-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-90",
    "images": ["/images/plants/Cauliflower_stage1_00001_.png", "/images/plants/Cauliflower_stage2_00001_.png", "/images/plants/Cauliflower_stage3_00001_.png"]
  },
  {
    "nameHe": "כרוב",
    "nameEn": "Cabbage",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "2.5",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "5-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-120",
    "images": ["/images/plants/Cabbage_stage1_00001_.png", "/images/plants/Cabbage_stage2_00001_.png", "/images/plants/Cabbage_stage3_00001_.png"]
  },
  {
    "nameHe": "כרוב אדום",
    "nameEn": "Red Cabbage",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל"
    ],
    "spacingCm": 30.0,
    "rowSpacingCm": 40.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "3",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "5-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-120"
  },
  {
    "nameHe": "צנון",
    "nameEn": "White Radish",
    "family": "מצליבים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "אוקטובר"
    ],
    "spacingCm": 2.5,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "40",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "45-60"
  },
  {
    "nameHe": "צנונית",
    "nameEn": "Radish",
    "family": "מצליבים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 2.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "50",
    "rowsPerBed": "3-4",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "30-60"
  },
  {
    "nameHe": "צנון לבן- דייקון",
    "nameEn": "Daikon",
    "family": "מצליבים",
    "ediblePart": "שורש",
    "bdDayType": "root",
    "plantingMonths": [
      "אוקטובר"
    ],
    "spacingCm": 4.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 30.0,
    "plantsPerSqm": "30",
    "rowsPerBed": "3",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "45-60"
  },
  {
    "nameHe": "קולרבי",
    "nameEn": "Kohlrabi",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 10.0,
    "rowSpacingCm": 30.0,
    "placementSpacingCm": 10.0,
    "plantsPerSqm": "10",
    "rowsPerBed": "3",
    "method": "שתילה",
    "germinationDays": "5",
    "daysToTransplant": "30",
    "daysToHarvest": "45-60",
    "images": ["/images/plants/Kohlrabi_stage1_00001_.png", "/images/plants/Kohlrabi_stage2_00001_.png", "/images/plants/Kohlrabi_stage3_00001_.png"]
  },
  {
    "nameHe": "קייל",
    "nameEn": "Kale",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "נובמבר",
      "דצמבר"
    ],
    "spacingCm": 40.0,
    "rowSpacingCm": 70.0,
    "placementSpacingCm": 40.0,
    "plantsPerSqm": "2.5",
    "rowsPerBed": "2",
    "method": "שתילה",
    "germinationDays": "5-8",
    "daysToTransplant": "30",
    "daysToHarvest": "60-120",
    "images": ["/images/plants/Kale_stage1_00001_.png", "/images/plants/Kale_stage2_00001_.png", "/images/plants/Kale_stage3_00001_.png"]
  },
  {
    "nameHe": "רוקולה",
    "nameEn": "Rocket",
    "family": "מצליבים",
    "ediblePart": "עלה",
    "bdDayType": "leaf",
    "plantingMonths": [
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני"
    ],
    "spacingCm": 0.7,
    "rowSpacingCm": 20.0,
    "placementSpacingCm": 20.0,
    "plantsPerSqm": "120",
    "rowsPerBed": "3-5",
    "method": "זריעה",
    "germinationDays": "5",
    "daysToTransplant": null,
    "daysToHarvest": "35-50"
  },

  // House plants
  { nameHe: "מונסטרה", nameEn: "Monstera", family: "אראליים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 60, rowSpacingCm: null, placementSpacingCm: 60, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Monstera - Monstera deliciosa_stage1.png", "/images/plants/Monstera - Monstera deliciosa_stage2.png", "/images/plants/Monstera - Monstera deliciosa_stage3.png"] },
  { nameHe: "פילודנדרון עלה כינור", nameEn: "Fiddle Leaf Fig", family: "תותיים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 60, rowSpacingCm: null, placementSpacingCm: 60, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Fiddle Leaf Fig - Ficus lyrata_stage1.png", "/images/plants/Fiddle Leaf Fig - Ficus lyrata_stage2.png", "/images/plants/Fiddle Leaf Fig - Ficus lyrata_stage3.png"] },
  { nameHe: "פוטוס", nameEn: "Pothos", family: "אראליים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Pothos - Epipremnum aureum_stage1.png", "/images/plants/Pothos - Epipremnum aureum_stage2.png", "/images/plants/Pothos - Epipremnum aureum_stage3.png"] },
  { nameHe: "צמח עכביש", nameEn: "Spider Plant", family: "שושניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Spider Plant_stage1.png", "/images/plants/Spider Plant_stage2.png", "/images/plants/Spider Plant_stage3.png"] },
  { nameHe: "שלום שלום", nameEn: "Peace Lily", family: "אראליים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 40, rowSpacingCm: null, placementSpacingCm: 40, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Peace Lily - Spathiphyllum wallisii_stage1.png", "/images/plants/Peace Lily - Spathiphyllum wallisii_stage2.png", "/images/plants/Peace Lily - Spathiphyllum wallisii_stage3.png"] },
  { nameHe: "גומי גומי", nameEn: "Rubber Plant", family: "תותיים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 50, rowSpacingCm: null, placementSpacingCm: 50, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Rubber Plant - Ficus elastica_stage1.png", "/images/plants/Rubber Plant - Ficus elastica_stage2.png", "/images/plants/Rubber Plant - Ficus elastica_stage3.png"] },
  { nameHe: "לשון חמות", nameEn: "Snake Plant", family: "שושניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Snake Plant - Sansevieria trifasciata_stage1.png", "/images/plants/Snake Plant - Sansevieria trifasciata_stage2.png", "/images/plants/Snake Plant - Sansevieria trifasciata_stage3.png"] },
  { nameHe: "ZZ פלנט", nameEn: "ZZ Plant", family: "אראליים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 40, rowSpacingCm: null, placementSpacingCm: 40, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/ZZ Plant - Chlorophytum comosum_stage1.png", "/images/plants/ZZ Plant - Chlorophytum comosum_stage2.png", "/images/plants/ZZ Plant - Chlorophytum comosum_stage3.png"] },
  // Succulents
  { nameHe: "אגבה", nameEn: "Agave", family: "שושניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 100, rowSpacingCm: null, placementSpacingCm: 100, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Agave - Agave americana_stage1.png", "/images/plants/Agave - Agave americana_stage2.png", "/images/plants/Agave - Agave americana_stage3.png"] },
  { nameHe: "אלוורה", nameEn: "Aloe Vera", family: "שושניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 40, rowSpacingCm: null, placementSpacingCm: 40, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Aloe Vera - Aloe barbadensis miller_stage1.png", "/images/plants/Aloe Vera - Aloe barbadensis miller_stage2.png", "/images/plants/Aloe Vera - Aloe barbadensis miller_stage3.png"] },
  { nameHe: "אכוורייה", nameEn: "Echeveria", family: "חטבות", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 15, rowSpacingCm: null, placementSpacingCm: 15, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Echeveria - Echeveria elegans_stage1.png", "/images/plants/Echeveria - Echeveria elegans_stage2.png", "/images/plants/Echeveria - Echeveria elegans_stage3.png"] },
  { nameHe: "האוורתייה", nameEn: "Haworthia", family: "שושניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 10, rowSpacingCm: null, placementSpacingCm: 10, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Haworthia - Haworthia fasciata_stage1.png", "/images/plants/Haworthia - Haworthia fasciata_stage2.png", "/images/plants/Haworthia - Haworthia fasciata_stage3.png"] },
  { nameHe: "ג'ייד", nameEn: "Jade Plant", family: "חטבות", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Jade Plant - Crassula ovata_stage1.png", "/images/plants/Jade Plant - Crassula ovata_stage2.png", "/images/plants/Jade Plant - Crassula ovata_stage3.png"] },
  { nameHe: "שרשרת פנינים", nameEn: "String of Pearls", family: "מורכבים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 20, rowSpacingCm: null, placementSpacingCm: 20, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/String of Pearls - Senecio rowleyanus_stage1.png", "/images/plants/String of Pearls - Senecio rowleyanus_stage2.png", "/images/plants/String of Pearls - Senecio rowleyanus_stage3.png"] },
  { nameHe: "סדום", nameEn: "Sedum", family: "חטבות", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 20, rowSpacingCm: null, placementSpacingCm: 20, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Sedum - Sedum spectabile_stage1.png", "/images/plants/Sedum - Sedum spectabile_stage2.png", "/images/plants/Sedum - Sedum spectabile_stage3.png"] },
  // Cacti
  { nameHe: "קקטוס אוזני ארנב", nameEn: "Bunny Ears Cactus", family: "קקטוסיים", ediblePart: "פרי", bdDayType: "fruit", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Bunny Ears Cactus - Opuntia microdasys_stage1.png", "/images/plants/Bunny Ears Cactus - Opuntia microdasys_stage2.png", "/images/plants/Bunny Ears Cactus - Opuntia microdasys_stage3.png"] },
  { nameHe: "קקטוס חג המולד", nameEn: "Christmas Cactus", family: "קקטוסיים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Christmas Cactus - Schlumbergera bridgesii_stage1.png", "/images/plants/Christmas Cactus - Schlumbergera bridgesii_stage2.png", "/images/plants/Christmas Cactus - Schlumbergera bridgesii_stage3.png"] },
  { nameHe: "קקטוס חבית זהב", nameEn: "Golden Barrel Cactus", family: "קקטוסיים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 50, rowSpacingCm: null, placementSpacingCm: 50, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Golden Barrel Cactus - Echinocactus grusonii_stage1.png", "/images/plants/Golden Barrel Cactus - Echinocactus grusonii_stage2.png", "/images/plants/Golden Barrel Cactus - Echinocactus grusonii_stage3.png"] },
  { nameHe: "צבר", nameEn: "Prickly Pear", family: "קקטוסיים", ediblePart: "פרי", bdDayType: "fruit", plantingMonths: [], spacingCm: 100, rowSpacingCm: null, placementSpacingCm: 100, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: [null, "/images/plants/Prickly Pear - Opuntia ficus-indica_stage2.png", "/images/plants/Prickly Pear - Opuntia ficus-indica_stage3.png"] },
  // Medicinal
  { nameHe: "אשווגנדה", nameEn: "Ashwagandha", family: "סולניים", ediblePart: "שורש", bdDayType: "root", plantingMonths: [], spacingCm: 60, rowSpacingCm: null, placementSpacingCm: 60, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Ashwagandha - Withania somnifera_stage1.png", "/images/plants/Ashwagandha - Withania somnifera_stage2.png", "/images/plants/Ashwagandha - Withania somnifera_stage3.png"] },
  { nameHe: "שן הארי", nameEn: "Dandelion", family: "מורכבים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 20, rowSpacingCm: null, placementSpacingCm: 20, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Dandelion - Taraxacum officinale_stage1.png", "/images/plants/Dandelion - Taraxacum officinale_stage2.png", "/images/plants/Dandelion - Taraxacum officinale_stage3.png"] },
  { nameHe: "אכינאצאה", nameEn: "Echinacea", family: "מורכבים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 45, rowSpacingCm: null, placementSpacingCm: 45, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Echinacea - Echinacea purpurea_stage1.png", "/images/plants/Echinacea - Echinacea purpurea_stage2.png", "/images/plants/Echinacea - Echinacea purpurea_stage3.png"] },
  { nameHe: "סמבוק", nameEn: "Elderberry", family: "פרחוניים", ediblePart: "פרי", bdDayType: "fruit", plantingMonths: [], spacingCm: 200, rowSpacingCm: null, placementSpacingCm: 200, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: [null, "/images/plants/Elderberry - Sambucus nigra_stage2.png", "/images/plants/Elderberry - Sambucus nigra_stage3.png"] },
  { nameHe: "בזיליקום קדוש", nameEn: "Holy Basil (Tulsi)", family: "שפתניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Holy Basil (Tulsi) - Ocimum tenuiflorum_stage1.png", "/images/plants/Holy Basil (Tulsi) - Ocimum tenuiflorum_stage2.png", "/images/plants/Holy Basil (Tulsi) - Ocimum tenuiflorum_stage3.png"] },
  { nameHe: "מליסה", nameEn: "Lemon Balm", family: "שפתניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 40, rowSpacingCm: null, placementSpacingCm: 40, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Lemon Balm - Melissa officinalis_stage1.png", "/images/plants/Lemon Balm - Melissa officinalis_stage2.png", "/images/plants/Lemon Balm - Melissa officinalis_stage3.png"] },
  { nameHe: "גדילן מצוי", nameEn: "Milk Thistle", family: "מורכבים", ediblePart: "זרע", bdDayType: "fruit", plantingMonths: [], spacingCm: 60, rowSpacingCm: null, placementSpacingCm: 60, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Milk Thistle - Silybum marianum_stage1.png", "/images/plants/Milk Thistle - Silybum marianum_stage2.png", "/images/plants/Milk Thistle - Silybum marianum_stage3.png"] },
  { nameHe: "סרפד", nameEn: "Nettle", family: "סרפדיים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Nettle - Urtica dioica_stage1.png", "/images/plants/Nettle - Urtica dioica_stage2.png", "/images/plants/Nettle - Urtica dioica_stage3.png"] },
  { nameHe: "פסיפלורה", nameEn: "Passionflower", family: "פסיפלוריים", ediblePart: "פרי", bdDayType: "fruit", plantingMonths: [], spacingCm: 90, rowSpacingCm: null, placementSpacingCm: 90, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Passionflower - Passiflora incarnata_stage1.png", "/images/plants/Passionflower - Passiflora incarnata_stage2.png", "/images/plants/Passionflower - Passiflora incarnata_stage3.png"] },
  { nameHe: "נענע פלפל", nameEn: "Peppermint", family: "שפתניים", ediblePart: "עלה", bdDayType: "leaf", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Peppermint - Mentha piperita_stage1.png", "/images/plants/Peppermint - Mentha piperita_stage2.png", "/images/plants/Peppermint - Mentha piperita_stage3.png"] },
  { nameHe: "ורד הכלב", nameEn: "Rosehip", family: "ורדניים", ediblePart: "פרי", bdDayType: "fruit", plantingMonths: [], spacingCm: 100, rowSpacingCm: null, placementSpacingCm: 100, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Rosa canina - Rosa canina_stage1.png", "/images/plants/Rosa canina - Rosa canina_stage2.png", "/images/plants/Rosa canina - Rosa canina_stage3.png"] },
  { nameHe: "היפריקום", nameEn: "St. John's Wort", family: "היפריקומיים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 45, rowSpacingCm: null, placementSpacingCm: 45, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/St. John's Wort - Hypericum perforatum_stage1.png", "/images/plants/St. John's Wort - Hypericum perforatum_stage2.png", "/images/plants/St. John's Wort - Hypericum perforatum_stage3.png"] },
  { nameHe: "כורכום", nameEn: "Turmeric", family: "זנגביליים", ediblePart: "שורש", bdDayType: "root", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Turmeric - Curcuma longa_stage1.png", "/images/plants/Turmeric - Curcuma longa_stage2.png", "/images/plants/Turmeric - Curcuma longa_stage3.png"] },
  { nameHe: "ולריאן", nameEn: "Valerian", family: "ולריאניים", ediblePart: "שורש", bdDayType: "root", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Valerian - Valeriana officinalis_stage1.png", "/images/plants/Valerian - Valeriana officinalis_stage2.png", "/images/plants/Valerian - Valeriana officinalis_stage3.png"] },
  { nameHe: "ירוקה", nameEn: "Yarrow", family: "מורכבים", ediblePart: "פרח", bdDayType: "flower", plantingMonths: [], spacingCm: 30, rowSpacingCm: null, placementSpacingCm: 30, plantsPerSqm: null, rowsPerBed: null, method: null, germinationDays: null, daysToTransplant: null, daysToHarvest: null, images: ["/images/plants/Yarrow - Achillea millefolium_stage1.png", "/images/plants/Yarrow - Achillea millefolium_stage2.png", "/images/plants/Yarrow - Achillea millefolium_stage3.png"] },
];

export function getPlantByName(nameHe: string): PlantTableEntry | undefined {
  const n = nameHe.trim();
  return PLANT_TABLE.find(p =>
    p.nameHe === n ||
    p.nameEn.toLowerCase() === n.toLowerCase() ||
    p.nameHe.includes(n) ||
    n.includes(p.nameHe)
  );
}

export function getPlantSpacing(nameHe: string): number {
  return getPlantByName(nameHe)?.placementSpacingCm ?? 30;
}

export function getPlantingMonths(nameHe: string): string[] {
  return getPlantByName(nameHe)?.plantingMonths ?? [];
}

export function getBdDayType(nameHe: string): 'fruit' | 'root' | 'leaf' | 'flower' {
  return getPlantByName(nameHe)?.bdDayType ?? 'leaf';
}

export function getEdiblePart(nameHe: string): string | null {
  return getPlantByName(nameHe)?.ediblePart ?? null;
}
