import { toPublicUser } from '../to-public-user';

describe('toPublicUser', () => {
  it('should convert document data to public user', () => {
    const result = toPublicUser({
      data: {
        someField: 'someValue',
      },
      id: 'user123',
    } as unknown as never);

    expect(result).toEqual({
      someField: 'someValue',
      userId: 'user123',
    });
  });
});
