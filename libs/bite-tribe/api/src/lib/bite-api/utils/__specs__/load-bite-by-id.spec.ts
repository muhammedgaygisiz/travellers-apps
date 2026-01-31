import { loadBiteById } from '../load-bite-by-id';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore');

describe('loadBiteById', () => {
  let getDocumentSpy: jest.SpyInstance;

  beforeEach(() => {
    getDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockReturnValue(
        Promise.resolve({
          snapshot: {
            data: {},
            id: '123',
          } as any,
        }),
      );
  });

  it('should load bite', async () => {
    const bite = await loadBiteById('123');

    expect(getDocumentSpy).toHaveBeenCalledWith({
      reference: `bites/123`,
    });

    expect(bite).toEqual({
      id: '123',
      likes: [],
    });
  });
});
