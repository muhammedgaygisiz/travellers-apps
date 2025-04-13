import { ChartData } from '../api/chart-data';

const dayBefore = (firstDay: any) => {
  return {
    date: new Date(firstDay.date.getTime() - 86400000), // subtract 1 day in milliseconds
    amount: 0,
    balance: 0,
  };
};

const addDayAfter = (lastDay: any) => {
  return {
    date: new Date(lastDay.date.getTime() + 86400000), // add 1 day in milliseconds
    amount: 0,
    balance: lastDay.balance,
  };
};

export const withPaddedData = (currentData: ChartData[] = []) => {
  if (!currentData.length) {
    return [];
  }

  const firstData = currentData[0];
  const lastData = currentData[currentData.length - 1];

  return [dayBefore(firstData), ...currentData, addDayAfter(lastData)];
};
