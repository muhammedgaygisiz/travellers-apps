import { ChartData } from '../api/chart-data';
import { sanitizeDate } from './sanitize-date';
import { calculateCumulativeBalance } from './calculate-cumulative-balance';
import { withPaddedData } from './with-padded-data';
import { byDate } from 'utils';

export const prepareData = (currentData: ChartData[]): ChartData[] => {
  const data = currentData.sort(byDate).map(sanitizeDate);

  calculateCumulativeBalance(data);

  return withPaddedData(data);
};
