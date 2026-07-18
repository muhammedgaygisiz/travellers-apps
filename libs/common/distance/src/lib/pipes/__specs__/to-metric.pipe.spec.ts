import { ToMetricPipe } from '../to-metric.pipe';

const toMetricMock = jest.fn();
jest.mock('../../utils/to-metric', () => ({
  toMetric: (...args: unknown[]): void => toMetricMock(...args),
}));

describe('ToMetricPipe', () => {
  const pipe = new ToMetricPipe();

  beforeEach(() => {
    toMetricMock.mockReset();
  });

  it('should call function', () => {
    toMetricMock.mockReturnValue(undefined);
    expect(pipe.transform('any')).toBeUndefined();
    expect(toMetricMock).toHaveBeenCalledTimes(1);
  });
});
