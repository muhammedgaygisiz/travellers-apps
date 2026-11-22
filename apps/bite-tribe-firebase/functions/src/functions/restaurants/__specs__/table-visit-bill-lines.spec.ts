import { tableVisitBillLines } from '../table-visit-bill';

const line = (
  choice?: { id: string; name: string },
  quantity = 1,
): Record<string, unknown> => ({
  menuItemId: 'chop-suey',
  name: 'Chop-Suey-Spezial',
  price: 12.9,
  quantity,
  ...(choice
    ? {
        options: [
          {
            groupId: 'heat',
            groupName: 'Zubereitungsart',
            choiceId: choice.id,
            choiceName: choice.name,
          },
        ],
      }
    : {}),
});

const MILD = { id: 'mild', name: 'nicht scharf' };
const HOT = { id: 'hot', name: 'scharf' };

/** How the bill treats the options on its lines (GitHub issue #2254). */
describe('tableVisitBillLines with options', () => {
  it('merges lines with the same choice into one row, keeping the choice', () => {
    const [row, ...rest] = tableVisitBillLines([
      { lines: [line(HOT)] },
      { lines: [line(HOT, 2)] },
    ]);

    expect(rest).toHaveLength(0);
    expect(row).toMatchObject({ quantity: 3, lineTotal: 12.9 * 3 });
    expect(row.options).toEqual([
      {
        groupId: 'heat',
        groupName: 'Zubereitungsart',
        choiceId: 'hot',
        choiceName: 'scharf',
      },
    ]);
  });

  it('keeps a row per choice, and one for no choice', () => {
    const rows = tableVisitBillLines([
      { lines: [line(HOT), line(MILD), line()] },
    ]);

    expect(rows.map((row) => row.options?.[0]?.choiceName)).toEqual([
      'scharf',
      'nicht scharf',
      undefined,
    ]);
  });

  it('keeps a choice renamed mid-service as its own row', () => {
    const rows = tableVisitBillLines([
      { lines: [line(HOT)] },
      { lines: [line({ id: 'hot', name: 'pikant' })] },
    ]);

    expect(rows).toHaveLength(2);
  });

  it('writes no options field on a row ordered without any', () => {
    const [row] = tableVisitBillLines([{ lines: [line()] }]);

    expect('options' in row).toBe(false);
  });
});
