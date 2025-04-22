import { withPaddedData } from '../with-padded-data';

describe('withPaddedData', () => {
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return empty array for empty input', () => {
    expect(withPaddedData([])).toEqual([]);
  });

  it('should pad single data point with day before and after', () => {
    const today = new Date();
    const data = [
      {
        date: today.toISOString(),
        amount: 100,
        balance: 100,
      },
    ];

    const result = withPaddedData(data);

    expect(result).toMatchSnapshot();
  });

  it('should pad multiple data points correctly', () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);

    const data = [
      {
        date: today.toISOString(),
        amount: 100,
        balance: 100,
      },
      {
        date: tomorrow.toISOString(),
        amount: 50,
        balance: 150,
      },
    ];

    const result = withPaddedData(data);

    expect(result).toMatchSnapshot();
  });
});
