import { ChartData } from '../api/chart-data';
import { byDate } from './by-date';
import { sanitizeDate } from './sanitize-date';
import { calculateCumulativeBalance } from './calculate-cumulative-balance';
import { withPaddedData } from './with-padded-data';

export const prepareData = (currentData: ChartData[]) => {
  const data = currentData.sort(byDate).map(sanitizeDate);

  calculateCumulativeBalance(data);
  return withPaddedData(data);
};
