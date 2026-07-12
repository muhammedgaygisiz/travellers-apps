import { ProgressPipe } from '../progress.pipe';
import { Bucketlist } from 'model';

describe('ProgressPipe', () => {
  let pipe: ProgressPipe;

  beforeEach(() => {
    pipe = new ProgressPipe();
  });

  it('should return the tried-out ratio', () => {
    const bucketlist = {
      biteIds: ['1', '2', '3', '4'],
      triedOutBites: [
        { biteId: '1', date: '', timestamp: 0 },
        { biteId: '2', date: '', timestamp: 0 },
      ],
    } as Bucketlist;

    expect(pipe.transform(bucketlist)).toBe(0.5);
  });

  it('should return 0 when no bites have been tried out', () => {
    const bucketlist = {
      biteIds: ['1', '2'],
    } as Bucketlist;

    expect(pipe.transform(bucketlist)).toBe(0);
  });

  it('should return 1 when all bites have been tried out', () => {
    const bucketlist = {
      biteIds: ['1', '2'],
      triedOutBites: [
        { biteId: '1', date: '', timestamp: 0 },
        { biteId: '2', date: '', timestamp: 0 },
      ],
    } as Bucketlist;

    expect(pipe.transform(bucketlist)).toBe(1);
  });

  it('should return 0 when there are no bites', () => {
    expect(pipe.transform({ biteIds: [] } as unknown as Bucketlist)).toBe(0);
  });

  it('should return 0 for null or undefined', () => {
    expect(pipe.transform(null as any)).toBe(0);
    expect(pipe.transform(undefined as any)).toBe(0);
  });
});
