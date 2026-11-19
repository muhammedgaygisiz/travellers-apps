import { FOLLOW_REQUESTS_COLLECTION, followRequestId } from '../follow-request';

describe(followRequestId.name, () => {
  it('names the request by its owner and then its requester', () => {
    expect(followRequestId('owner-1', 'requester-1')).toBe(
      'owner-1_requester-1',
    );
  });

  it('names the two directions of a pair apart', () => {
    expect(followRequestId('a', 'b')).not.toBe(followRequestId('b', 'a'));
  });
});

describe('FOLLOW_REQUESTS_COLLECTION', () => {
  it('is the collection the rules and the callables name', () => {
    expect(FOLLOW_REQUESTS_COLLECTION).toBe('followRequests');
  });
});
