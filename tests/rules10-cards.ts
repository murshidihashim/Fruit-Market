// The rules 10 customer deck (live 1.11.0), before the compact rules halved every order and raised apples by $1.
// Older explanation scenarios were written against these cards; the explanations do not depend on the card numbers,
// so those tests keep their original cards (names, freshness types and art still come from today's data).
import type { CustomerCard, FruitId } from '../src/engine/data';

const RAW: CustomerCard[] = [
  { name: 'John', wants: [{ fruit: 'apple', qty: 3, max: 10 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Robert', wants: [{ fruit: 'blueberry', qty: 4, max: 7 }, { fruit: 'mango', qty: 1, max: 5 }] },
  { name: 'Daniel', wants: [{ fruit: 'mango', qty: 1, max: 8 }, { fruit: 'apple', qty: 3, max: 9 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Rara Jenab', wants: [{ fruit: 'mango', qty: 3, max: 7 }, { fruit: 'blueberry', qty: 2, max: 7 }] },
  { name: 'Aisyah', wants: [{ fruit: 'watermelon', qty: 3, max: 8 }] },
  { name: 'Ravi', wants: [{ fruit: 'mango', qty: 2, max: 9 }, { fruit: 'apple', qty: 2, max: 8 }] },
  { name: 'Mei Ling', wants: [{ fruit: 'blueberry', qty: 4, max: 6 }, { fruit: 'watermelon', qty: 1, max: 7 }] },
  { name: 'Farid', wants: [{ fruit: 'apple', qty: 4, max: 8 }] },
  { name: 'Siti', wants: [{ fruit: 'mango', qty: 1, max: 8 }, { fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Kumar', wants: [{ fruit: 'watermelon', qty: 2, max: 9 }, { fruit: 'blueberry', qty: 2, max: 5 }] },
  { name: 'Grace', wants: [{ fruit: 'apple', qty: 2, max: 10 }, { fruit: 'mango', qty: 2, max: 6 }] },
  { name: 'Hafiz', wants: [{ fruit: 'blueberry', qty: 5, max: 6 }] },
  { name: 'Wei Jie', wants: [{ fruit: 'mango', qty: 2, max: 7 }, { fruit: 'apple', qty: 2, max: 7 }, { fruit: 'watermelon', qty: 1, max: 8 }] },
  { name: 'Nurul', wants: [{ fruit: 'watermelon', qty: 4, max: 7 }] },
  { name: 'Priya', wants: [{ fruit: 'apple', qty: 3, max: 9 }, { fruit: 'blueberry', qty: 1, max: 8 }] },
  { name: 'Ahmad', wants: [{ fruit: 'mango', qty: 5, max: 6 }] },
  { name: 'Sarah', wants: [{ fruit: 'blueberry', qty: 2, max: 8 }, { fruit: 'mango', qty: 2, max: 7 }] },
  { name: 'Tan', wants: [{ fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'apple', qty: 2, max: 9 }] },
  { name: 'Lina', wants: [{ fruit: 'apple', qty: 1, max: 11 }, { fruit: 'mango', qty: 3, max: 7 }] },
  { name: 'Zul', wants: [{ fruit: 'blueberry', qty: 3, max: 7 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Anna', wants: [{ fruit: 'mango', qty: 3, max: 8 }] },
  { name: 'Vijay', wants: [{ fruit: 'apple', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 7 }, { fruit: 'mango', qty: 1, max: 9 }] },
  { name: 'Hui Min', wants: [{ fruit: 'watermelon', qty: 4, max: 7 }] },
  { name: 'Osman', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 1, max: 9 }] },
  { name: 'Jia Wen', wants: [{ fruit: 'apple', qty: 2, max: 9 }, { fruit: 'mango', qty: 2, max: 7 }] },
  { name: 'Rizal', wants: [{ fruit: 'blueberry', qty: 3, max: 6 }, { fruit: 'watermelon', qty: 2, max: 7 }] },
  { name: 'Devi', wants: [{ fruit: 'mango', qty: 4, max: 7 }] },
  { name: 'Marcus', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'mango', qty: 1, max: 8 }, { fruit: 'blueberry', qty: 1, max: 7 }] },
  { name: 'Fatimah', wants: [{ fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Ben', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Yuki', wants: [{ fruit: 'mango', qty: 2, max: 6 }, { fruit: 'apple', qty: 2, max: 9 }, { fruit: 'watermelon', qty: 1, max: 7 }] },
  { name: 'Hadi', wants: [{ fruit: 'blueberry', qty: 4, max: 7 }] },
  { name: 'Lakshmi', wants: [{ fruit: 'apple', qty: 2, max: 10 }, { fruit: 'watermelon', qty: 2, max: 8 }] },
  { name: 'Kenji', wants: [{ fruit: 'mango', qty: 1, max: 8 }, { fruit: 'blueberry', qty: 2, max: 6 }, { fruit: 'watermelon', qty: 2, max: 9 }] },
  { name: 'Mira', wants: [{ fruit: 'mango', qty: 3, max: 7 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Hock Seng', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 2, max: 9 }] },
];

const PRICE_SHIFT: Record<FruitId, number> = { blueberry: -1, watermelon: 0, apple: -3, mango: 3 };
export const RULES10_CUSTOMERS: CustomerCard[] = RAW.map((c) => ({ ...c, wants: c.wants.map((w) => ({ ...w, max: w.max + PRICE_SHIFT[w.fruit] })) }));
