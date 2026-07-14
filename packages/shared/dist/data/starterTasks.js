"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTER_TASKS = void 0;
exports.getStarterTasks = getStarterTasks;
exports.STARTER_TASKS = {
    annual: [
        { title: 'השקיה ראשונה', notes: 'צמחים חד-שנתיים זקוקים להשקיה סדירה. השקו היטב לאחר השתילה.', category: 'watering', dayOffset: 0, priority: 'high' },
        { title: 'האכלה ראשונה', notes: 'דשנו בדשן מאוזן לעידוד צמיחה מהירה.', category: 'fertilizing', dayOffset: 7, priority: 'medium' },
        { title: 'בדיקת מזיקים', notes: 'עלים רכים מושכים מזיקים — בדקו את הצמח בקביעות.', category: 'pest_control', dayOffset: 5, priority: 'medium' },
        { title: 'מעקב צמיחה', notes: 'עקבו אחר קצב הצמיחה ורשמו שינויים.', category: 'general', dayOffset: 3, priority: 'low' },
    ],
    perennial: [
        { title: 'השקיה עמוקה', notes: 'השקו לעומק לביסוס מערכת שורשים חזקה.', category: 'watering', dayOffset: 0, priority: 'high' },
        { title: 'חיפוי קרקע', notes: 'פזרו חיפוי סביב הבסיס לשמירת לחות.', category: 'composting', dayOffset: 0, priority: 'medium' },
        { title: 'דישון ביסוס', notes: 'דשן איטי-שחרור יעזור לביסוס הצמח.', category: 'fertilizing', dayOffset: 7, priority: 'medium' },
        { title: 'גיזום ניקוי', notes: 'הסירו ענפים פגומים או יבשים.', category: 'pruning', dayOffset: 14, priority: 'low' },
    ],
    tree: [
        { title: 'השקיה עמוקה', notes: 'עצים חדשים זקוקים להשקיה עמוקה וסדירה בחודשים הראשונים.', category: 'watering', dayOffset: 0, priority: 'high' },
        { title: 'תמיכה וייצוב', notes: 'ודאו שהעץ מיוצב היטב מול רוח.', category: 'general', dayOffset: 0, priority: 'medium' },
        { title: 'חיפוי סביב הגזע', notes: 'פזרו חיפוי טבעתי סביב הגזע (הרחיקו מהגזע עצמו).', category: 'composting', dayOffset: 0, priority: 'medium' },
        { title: 'בדיקת בריאות', notes: 'בדקו את הקליפה והעלים לאיתור מזיקים או מחלות.', category: 'pest_control', dayOffset: 10, priority: 'low' },
    ],
    shrub: [
        { title: 'השקיה ראשונה', notes: 'השקו היטב לביסוס השיח.', category: 'watering', dayOffset: 0, priority: 'high' },
        { title: 'דישון', notes: 'דשנו לעידוד צמיחת ענפים.', category: 'fertilizing', dayOffset: 7, priority: 'medium' },
        { title: 'בדיקת מזיקים', notes: 'בדקו את העלווה לאיתור מזיקים.', category: 'pest_control', dayOffset: 7, priority: 'low' },
        { title: 'עיצוב קל', notes: 'גזמו קלות לעיצוב מבנה בריא.', category: 'pruning', dayOffset: 14, priority: 'low' },
    ],
    default: [
        { title: 'השקיה ראשונה', notes: 'בדקו את לחות האדמה והשקו לפי הצורך.', category: 'watering', dayOffset: 0, priority: 'high' },
        { title: 'בחירת מיקום שמשי', notes: 'ודאו שהצמח מקבל את כמות השמש המתאימה לו.', category: 'general', dayOffset: 0, priority: 'medium' },
        { title: 'דישון קל', notes: 'הוסיפו דשן אורגני קל לחיזוק הצמח.', category: 'fertilizing', dayOffset: 7, priority: 'medium' },
        { title: 'בדיקת מזיקים', notes: 'בדקו את העלים לאיתור מזיקים או מחלות.', category: 'pest_control', dayOffset: 7, priority: 'low' },
    ],
};
function getStarterTasks(plantType) {
    return exports.STARTER_TASKS[plantType ?? ''] ?? exports.STARTER_TASKS.default;
}
//# sourceMappingURL=starterTasks.js.map