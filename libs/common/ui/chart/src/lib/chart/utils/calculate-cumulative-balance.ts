import { ChartData } from '../api/chart-data';

export const calculateCumulativeBalance = (data: ChartData[]): void => {
  let balance = 0;

  data.forEach((item) => {
    balance += +item.amount;
    item.balance = balance;
  });
};
