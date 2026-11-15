import type {
  WeeklyLeaderboardEntry,
  WeeklyLeaderboardSnapshot,
} from 'bite-tribe/api';
import { overtookInTopTen } from '../overtook-in-top-ten';

const WEEK = '2026-11-09';
const ME = 'leela';

/** One entry; `id` doubles as the display name unless `name` is given. */
const entry = (
  id: string,
  biteCount: number,
  name = id.toUpperCase(),
): WeeklyLeaderboardEntry => ({ userId: id, displayName: name, biteCount });

const board = (
  users: WeeklyLeaderboardEntry[],
  week = WEEK,
): WeeklyLeaderboardSnapshot => ({ week, users });

const TOP = [entry('a', 9), entry('b', 8), entry('c', 7)];

describe('overtookInTopTen', () => {
  it('names the user the Bite took them past and the rank they climbed to', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 6), entry('d', 5)]);

    expect(overtookInTopTen(previous, current, ME)).toEqual({
      rank: 4,
      user: 'D',
    });
  });

  it('names only the user directly below when one Bite passes several', () => {
    const previous = board([
      entry('a', 9),
      entry('b', 5),
      entry('c', 5),
      entry(ME, 4),
    ]);
    const current = board([
      entry('a', 9),
      entry(ME, 6),
      entry('b', 5),
      entry('c', 5),
    ]);

    expect(overtookInTopTen(previous, current, ME)).toEqual({
      rank: 2,
      user: 'B',
    });
  });

  it('celebrates nothing when the user below is tied with them', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 5), entry('d', 5)]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('celebrates nothing when they climbed because the user above lost Bites', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 4), entry('d', 3)]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('celebrates nothing when the user below was not above them before', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 6), entry('e', 5), entry('d', 2)]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('names the user passed for #1, and nobody when none is listed below', () => {
    const previous = board([entry('a', 9), entry(ME, 4), entry('b', 3)]);
    const current = board([entry(ME, 10), entry('a', 9)]);

    expect(overtookInTopTen(previous, current, ME)).toEqual({
      rank: 1,
      user: 'A',
    });
    expect(
      overtookInTopTen(
        board([entry('a', 9), entry(ME, 4)]),
        board([entry(ME, 10)]),
        ME,
      ),
    ).toBeUndefined();
  });

  it('celebrates nothing when the passed user has no display name', () => {
    const previous = board([...TOP, entry('d', 5, ''), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 6), entry('d', 5, '')]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('celebrates nothing when the rank stays or drops, though the count rose', () => {
    const previous = board([...TOP, entry(ME, 5)]);

    expect(
      overtookInTopTen(previous, board([...TOP, entry(ME, 6)]), ME),
    ).toBeUndefined();
    expect(
      overtookInTopTen(
        previous,
        board([...TOP, entry('d', 9), entry(ME, 6)]),
        ME,
      ),
    ).toBeUndefined();
  });

  it('celebrates nothing for entering the board, which is the top-ten moment', () => {
    const previous = board([...TOP, entry('d', 5)]);
    const current = board([...TOP, entry(ME, 6), entry('d', 5)]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('celebrates nothing across a weekly reset', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)], '2026-11-02');
    const current = board([...TOP, entry(ME, 6), entry('d', 5)]);

    expect(overtookInTopTen(previous, current, ME)).toBeUndefined();
  });

  it('celebrates nothing for the user who was passed', () => {
    const previous = board([...TOP, entry('d', 5), entry(ME, 4)]);
    const current = board([...TOP, entry(ME, 6), entry('d', 5)]);

    expect(overtookInTopTen(previous, current, 'd')).toBeUndefined();
  });
});
