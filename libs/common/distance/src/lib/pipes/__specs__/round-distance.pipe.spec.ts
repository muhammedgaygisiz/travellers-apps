import { RoundDistancePipe } from '../round-distance.pipe';

const roundDistanceMock = jest.fn();
jest.mock('../../utils/round-distance', () => ({
  roundDistance: (...args: unknown[]): void => roundDistanceMock(...args),
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
