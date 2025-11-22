import { BucketlistActions } from '../actions';

describe('Bucketlists Actions', () => {
  it('should have a loadedFromAPI action', () => {
    expect(BucketlistActions.loadedFromAPI).toBeDefined();
  });

  it('should have a saveBiteToBucketlist action', () => {
    expect(BucketlistActions.saveBiteToBucketlist).toBeDefined();
  });

  it('should have a createAndSaveBiteIdToBucketlist action', () => {
    expect(BucketlistActions.createAndSaveBiteIdToBucketlist).toBeDefined();
  });

  it('should have a createBucketlist action', () => {
    expect(BucketlistActions.createBucketlist).toBeDefined();
  });

  it('should have a removeBiteFromBucketlist action', () => {
    expect(BucketlistActions.removeBiteFromBucketlist).toBeDefined();
  });
});
