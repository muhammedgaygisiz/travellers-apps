import { ToMetricPipe } from '../to-metric.pipe';
import { vi } from 'vitest';

const toMetricMock = vi.fn();
vi.mock('../../utils/to-metric', () => ({
  toMetric: (...args: any): void => toMetricMock(...args),
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
