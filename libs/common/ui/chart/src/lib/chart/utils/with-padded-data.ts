import { ChartData } from '../api/chart-data';

const DAY_IN_MILLIS = 86400000;

const dayBefore = (firstDay: any): ChartData => {
  const date = new Date(firstDay.date);

  return {
    date: new Date(date.getTime() - DAY_IN_MILLIS),
    amount: 0,
    balance: 0,
  };
};

const addDayAfter = (lastDay: any): ChartData => {
  const date = new Date(lastDay.date);

  return {
    date: new Date(date.getTime() + DAY_IN_MILLIS),
    amount: 0,
    balance: lastDay.balance,
  };
};

export const withPaddedData = (currentData: ChartData[] = []): ChartData[] => {
  if (!currentData.length) {
    return [];
  }

  const firstData = currentData[0];
  const lastData = currentData[currentData.length - 1];

  return [dayBefore(firstData), ...currentData, addDayAfter(lastData)];
};
