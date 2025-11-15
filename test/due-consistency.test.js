/**
 * Due Date Consistency Tests
 * Ensures UI badges, engine isDue(), and blocked-page/background logic share the same semantics
 */

const tsnode = require('ts-node');
tsnode.register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
const assert = require('node:assert');
const { test, describe } = require('node:test');

const path = require('node:path');
const enginePath = path.join(__dirname, '..', 'src', 'spaced-repetition', 'SpacedRepetitionEngine.ts');
const utilsPath = path.join(__dirname, '..', 'src', 'utils', 'dateUtils.ts');

/** @type {{ SpacedRepetitionEngine: any }} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SpacedRepetitionEngine } = require(enginePath);
/** @type {{ formatDueBadge: (n:number)=>{text:string,bg:string,color:string,urgent:boolean}, startOfDay: (n:number)=>number, endOfDay: (n:number)=>number, MILLISECONDS_PER_DAY:number, calendarDayDelta: (d:number,n:number)=>number }} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { formatDueBadge, startOfDay, endOfDay, MILLISECONDS_PER_DAY, calendarDayDelta } = require(utilsPath);

const createCard = (dueDate) => ({
  id: 'q',
  type: 'text',
  front: 'F',
  back: 'B',
  tags: [],
  created: Date.now(),
  modified: Date.now(),
  algorithm: { interval: 1, ease: 2.5, repetitions: 0, dueDate }
});

describe('Due semantics: engine.isDue vs UI badge', () => {
  test('Overdue is due and labeled as overdue/now', () => {
    const now = Date.now();
    const dueDate = now - 60_000;
    const q = createCard(dueDate);
    assert.strictEqual(SpacedRepetitionEngine.isDue(q, now), true);
    const badge = formatDueBadge(dueDate, now);
    assert.strictEqual(badge.urgent, true);
    assert.ok(badge.text === 'Due now' || badge.text.includes('overdue'));
  });

  test('Due later today is considered due and labeled as "Due today"', () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const nowTs = now.getTime();
    const dueDate = new Date(nowTs);
    dueDate.setHours(21, 0, 0, 0);
    const q = createCard(dueDate.getTime());
    assert.strictEqual(SpacedRepetitionEngine.isDue(q, nowTs), true);
    const badge = formatDueBadge(dueDate.getTime(), nowTs);
    assert.strictEqual(badge.text, 'Due today');
  });

  test('Tomorrow is not due, labeled "Due tomorrow"', () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const nowTs = now.getTime();
    const dueDate = new Date(startOfDay(nowTs) + MILLISECONDS_PER_DAY);
    dueDate.setHours(8, 0, 0, 0);
    const q = createCard(dueDate.getTime());
    assert.strictEqual(SpacedRepetitionEngine.isDue(q, nowTs), false);
    const badge = formatDueBadge(dueDate.getTime(), nowTs);
    assert.strictEqual(badge.text, 'Due tomorrow');
  });

  test('Future days show correct day/week/month labels', () => {
    const now = Date.now();
    
    // Use calendar arithmetic to avoid DST issues
    const d2Date = new Date(now);
    d2Date.setDate(d2Date.getDate() + 2);
    d2Date.setHours(0, 0, 1, 0); // 1 second after midnight
    const d2 = d2Date.getTime();
    
    const d10Date = new Date(now);
    d10Date.setDate(d10Date.getDate() + 10);
    d10Date.setHours(0, 0, 0, 0);
    const d10 = d10Date.getTime();
    
    const d45Date = new Date(now);
    d45Date.setDate(d45Date.getDate() + 45);
    d45Date.setHours(0, 0, 0, 0);
    const d45 = d45Date.getTime();

    let b = formatDueBadge(d2, now);
    assert.ok(b.text === '2d', `Expected '2d', got '${b.text}'`);

    b = formatDueBadge(d10, now);
    assert.ok(b.text.endsWith('w'), `Expected to end with 'w', got '${b.text}'`);

    b = formatDueBadge(d45, now);
    assert.ok(b.text.endsWith('mo'), `Expected to end with 'mo', got '${b.text}'`);
  });

  test('Boundary: end of today is due, start of tomorrow is not', () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const nowTs = now.getTime();
    const endToday = endOfDay(nowTs);
    const startTomorrow = startOfDay(nowTs) + MILLISECONDS_PER_DAY;

    let q = createCard(endToday);
    assert.strictEqual(SpacedRepetitionEngine.isDue(q, nowTs), true);

    q = createCard(startTomorrow);
    assert.strictEqual(SpacedRepetitionEngine.isDue(q, nowTs), false);
  });
});

