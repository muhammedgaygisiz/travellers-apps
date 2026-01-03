import { RoundDistancePipe } from '../round-distance.pipe';
import { vi } from 'vitest';

const roundDistanceMock = vi.fn();
vi.mock('../../utils/round-distance', () => ({
  roundDistance: (...args: any): void => roundDistanceMock(...args),
}));

describe('RoundDistancePipe', () => {
  const pipe = new RoundDistancePipe();

  beforeEach(() => {
    roundDistanceMock.mockReset();
  });

  it('should call function', () => {
    roundDistanceMock.mockReturnValue(undefined);
    expect(pipe.transform('any')).toBeUndefined();
    expect(roundDistanceMock).toHaveBeenCalledTimes(1);
  });
});
