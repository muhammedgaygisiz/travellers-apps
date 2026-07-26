import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { WeekRange, WeeklyBites } from 'model';

/**
 * Loads the bites created within one calendar week.
 *
 * The range is optional: without it the backend answers with the previous
 * calendar week, which is the week the latest summary notification counted. The
 * resolved range comes back with the bites so the page can label the week it is
 * actually showing.
 */
export const loadWeeklyBites = async (
  range?: WeekRange,
): Promise<WeeklyBites | undefined> => {
  try {
    const result = await FirebaseFunctions.callByName<
      Partial<WeekRange>,
      WeeklyBites
    >({
      name: 'loadWeeklyBites',
      data: {
        weekStart: range?.weekStart,
        weekEnd: range?.weekEnd,
      },
    });

    return result.data;
  } catch (error) {
    console.error('Failed loading the weekly bites:', error);

    return undefined;
  }
};
