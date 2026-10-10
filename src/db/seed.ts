import { db } from './database';
import { generateId } from '@/lib/utils';
import { format, subDays, addDays, setHours, setMinutes } from 'date-fns';

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ', 'JPM', 'NFLX'];
const SETUPS = ['Breakout', 'Pullback', 'Gap Fill', 'VWAP Reclaim', 'Opening Range', 'Mean Reversion'];
const MISTAKES = ['FOMO', 'Oversized', 'Early Exit', 'No Stop', 'Revenge Trade', 'Chased'];
const EMOTIONS = ['Confident', 'Anxious', 'Patient', 'Impulsive', 'Focused', 'Distracted'];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function seed() {
  console.log('Seeding database...');

  await db.trades.clear();
  await db.executions.clear();
  await db.tags.clear();
  await db.tradeTags.clear();
  await db.dayNotes.clear();
  await db.notes.clear();
  await db.accounts.clear();
  await db.settings.clear();

  const accountId = generateId();
  await db.accounts.put({
    id: accountId,
    name: 'Main Trading Account',
    currency: 'USD',
    startingBalance: 50000,
    timezone: 'America/New_York',
    commissionPerTrade: 0,
    commissionPerShare: 0.005,
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const secondAccountId = generateId();
  await db.accounts.put({
    id: secondAccountId,
    name: 'Swing Account',
    currency: 'USD',
    startingBalance: 25000,
    timezone: 'America/New_York',
    commissionPerTrade: 1,
    commissionPerShare: 0,
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const tagIds: Record<string, string> = {};
  for (const setup of SETUPS) {
    const id = generateId();
    tagIds[setup] = id;
    await db.tags.put({
      id,
      name: setup,
      color: '#6C5CE7',
      category: 'setup',
      createdAt: Date.now()
    });
  }
  for (const mistake of MISTAKES) {
    const id = generateId();
    tagIds[mistake] = id;
    await db.tags.put({
      id,
      name: mistake,
      color: '#EA3943',
      category: 'mistake',
      createdAt: Date.now()
    });
  }
  for (const emotion of EMOTIONS) {
    const id = generateId();
    tagIds[emotion] = id;
    await db.tags.put({
      id,
      name: emotion,
      color: '#16C784',
      category: 'emotion',
      createdAt: Date.now()
    });
  }

  const today = new Date();
  const startDate = subDays(today, 180);

  let tradeCount = 0;
  let currentDate = startDate;

  while (currentDate <= today) {
    if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
      const tradesToday = randomInt(0, 5);

      for (let i = 0; i < tradesToday; i++) {
        const symbol = pick(SYMBOLS);
        const side = Math.random() > 0.5 ? ('long' as const) : ('short' as const);
        const account = Math.random() > 0.3 ? accountId : secondAccountId;

        const entryPrice = randomBetween(50, 500);
        const qty = randomInt(10, 200);
        const isWin = Math.random() > 0.42;

        let exitPrice: number;
        if (isWin) {
          exitPrice = entryPrice * (1 + randomBetween(0.005, 0.04));
        } else {
          exitPrice = entryPrice * (1 - randomBetween(0.003, 0.03));
        }

        if (side === 'short') {
          const temp = entryPrice;
          exitPrice = entryPrice - (exitPrice - entryPrice);
          void temp;
        }

        const openTime = setMinutes(setHours(new Date(currentDate), randomInt(9, 10)), randomInt(0, 59));
        const closeTime = setMinutes(
          setHours(new Date(currentDate), randomInt(10, 15)),
          randomInt(0, 59)
        );

        const tradeId = generateId();
        tradeCount++;

        const plannedStop = side === 'long' ? entryPrice * 0.99 : entryPrice * 1.01;
        const plannedTarget = side === 'long' ? entryPrice * 1.02 : entryPrice * 0.98;

        const usePlannedStop = Math.random() > 0.2;

        await db.trades.put({
          id: tradeId,
          accountId: account,
          symbol,
          side,
          status: 'closed',
          openedAt: openTime.getTime(),
          closedAt: closeTime.getTime(),
          plannedEntry: entryPrice,
          plannedStop: usePlannedStop ? plannedStop : null,
          plannedTarget: usePlannedStop ? plannedTarget : null,
          rating: randomInt(1, 5),
          notes:
            Math.random() > 0.5
              ? `<p>${isWin ? 'Good execution on this trade' : 'Tightened stop too early'} — followed the plan mostly.</p>`
              : '',
          createdAt: openTime.getTime(),
          updatedAt: closeTime.getTime()
        });

        const numEntries = Math.random() > 0.6 ? randomInt(2, 3) : 1;
        const numExits = Math.random() > 0.7 ? randomInt(2, 3) : 1;

        let remainingQty = qty;
        const entryBase = side === 'long' ? entryPrice : entryPrice;

        for (let e = 0; e < numEntries; e++) {
          const entryQty =
            e === numEntries - 1 ? remainingQty : Math.ceil(remainingQty / (numEntries - e));
          remainingQty -= entryQty;
          const priceVar = e === 0 ? 1 : 1 + randomBetween(-0.002, 0.002);

          await db.executions.put({
            id: generateId(),
            tradeId,
            type: 'entry',
            price: entryBase * priceVar,
            quantity: entryQty,
            fees: entryQty * 0.005,
            executedAt: openTime.getTime() + e * 60000,
            note: null
          });
        }

        let remainingExitQty = qty;
        for (let x = 0; x < numExits; x++) {
          const exitQty = x === numExits - 1 ? remainingExitQty : Math.ceil(remainingExitQty / (numExits - x));
          remainingExitQty -= exitQty;
          const priceVar = x === 0 ? 1 : 1 + randomBetween(-0.003, 0.003);

          await db.executions.put({
            id: generateId(),
            tradeId,
            type: 'exit',
            price: exitPrice * priceVar,
            quantity: exitQty,
            fees: exitQty * 0.005,
            executedAt: closeTime.getTime() + x * 30000,
            note: null
          });
        }

        const tagsToAdd = pickN(SETUPS, 1);
        if (Math.random() > 0.7) tagsToAdd.push(pick(MISTAKES));
        if (Math.random() > 0.5) tagsToAdd.push(pick(EMOTIONS));

        for (const tagName of tagsToAdd) {
          if (tagIds[tagName]) {
            await db.tradeTags.put({ tradeId, tagId: tagIds[tagName] as string });
          }
        }
      }

      if (Math.random() > 0.5) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        await db.dayNotes.put({
          id: `${accountId}_${dateStr}`,
          accountId,
          date: dateStr,
          preMarketPlan:
            Math.random() > 0.5
              ? '<p>Watch NVDA for breakout above 125. AAPL support at 175.</p>'
              : '',
          postMarketReview:
            Math.random() > 0.4
              ? '<p>Good patience today. Waited for confirmation on entries.</p>'
              : '',
          mood: pick(['😊', '😐', '😤', '😰', '🚀']),
          createdAt: currentDate.getTime(),
          updatedAt: currentDate.getTime()
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  const noteFolders = ['Strategy', 'Review', 'Ideas', 'Learning'];
  const folderIds = new Map<string, string>();
  for (const name of noteFolders) {
    const folderId = generateId();
    folderIds.set(name, folderId);
    await db.noteFolders.put({ id: folderId, name, createdAt: Date.now() });
  }

  const noteTitles = [
    'My Trading Rules',
    'Weekly Review Template',
    'Best Setups This Month',
    'Psychology Notes',
    'Risk Management Framework'
  ];

  for (let i = 0; i < noteTitles.length; i++) {
    const id = generateId();
    await db.notes.put({
      id,
      title: noteTitles[i] as string,
      content: `<p>This is my note about ${(noteTitles[i] as string).toLowerCase()}. Edit me to add your own content.</p>`,
      folderId: folderIds.get(pick(noteFolders)) ?? null,
      tags: pickN(SETUPS, 2),
      linkedTradeIds: [],
      linkedDates: [],
      pinned: i === 0,
      createdAt: Date.now() - i * 86400000,
      updatedAt: Date.now() - i * 3600000
    });
  }

  await db.settings.put({
    key: 'app',
    theme: 'system',
    sidebarCollapsed: false,
    defaultAccountId: accountId,
    lastDateRange: null,
    seeded: true
  });

  console.log(`Seeded ${tradeCount} trades over 6 months`);
}

export { seed };
