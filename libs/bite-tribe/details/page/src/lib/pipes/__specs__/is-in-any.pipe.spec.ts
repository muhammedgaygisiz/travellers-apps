import { IsInPipe } from '../is-in-any.pipe';
import type { Bite, Bucketlist } from 'model';

describe('IsInAnyPipe', () => {
  let pipe: IsInPipe;

  const mockBite: Bite = {
    id: 'bite1',
    name: 'Test Bite',
  } as Bite;

  const mockBucketlists: Bucketlist[] = [
    {
      id: 'list1',
      name: 'Test List 1',
      biteIds: ['bite2', 'bite3'],
    } as Bucketlist,
    {
      id: 'list2',
      name: 'Test List 2',
      biteIds: ['bite1', 'bite4'],
    } as Bucketlist,
  ];

  beforeEach(() => {
    pipe = new IsInPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "bookmark" when bite is in any bucketlist', () => {
    expect(pipe.transform(mockBite, mockBucketlists)).toBe('bookmark');
  });

  it('should return "add-outline" when bite is not in any bucketlist', () => {
    const differentBite = { ...mockBite, id: 'bite5' };
    expect(pipe.transform(differentBite, mockBucketlists)).toBe('add-outline');
  });

  it('should return "add-outline" when bucketlists array is empty', () => {
    expect(pipe.transform(mockBite, [])).toBe('add-outline');
  });

  it('should return "add-outline" when bite is undefined', () => {
    expect(pipe.transform(undefined, mockBucketlists)).toBe('add-outline');
  });

  it('should return "add-outline" when bucketlists is undefined', () => {
    expect(pipe.transform(mockBite, undefined as unknown as Bucketlist[])).toBe(
      'add-outline',
    );
  });

  it('should return "add-outline" when both bite and bucketlists are undefined', () => {
    expect(
      pipe.transform(undefined, undefined as unknown as Bucketlist[]),
    ).toBe('add-outline');
  });
});
