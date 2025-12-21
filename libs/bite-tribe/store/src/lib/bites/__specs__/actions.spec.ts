import { BiteActions } from '../actions';

describe('Bites - Actions', () => {
  it('should have loadedByGPSPositionFromAPI actions', () => {
    expect(BiteActions.loadedByGPSPositionFromAPI).toBeDefined();
  });

  it('should have loadedByUserFromAPI actions', () => {
    expect(BiteActions.loadedByUserFromAPI).toBeDefined();
  });

  it('should have loadedByBucketlistFromAPI actions', () => {
    expect(BiteActions.loadedByBucketlistFromAPI).toBeDefined();
  });

  it('should have saveNewBite action', () => {
    expect(BiteActions.saveNewBite).toBeDefined();
  });

  it('should have saveExistingBite action', () => {
    expect(BiteActions.saveExistingBite).toBeDefined();
  });

  it('should have saveNewTags action', () => {
    expect(BiteActions.saveNewTags).toBeDefined();
  });

  it('should have cacheBite action', () => {
    expect(BiteActions.cacheBite).toBeDefined();
  });

  it('should have deleteBite action', () => {
    expect(BiteActions.deleteBite).toBeDefined();
  });

  it('should have loadedBiteCreator action', () => {
    expect(BiteActions.loadedBiteCreator).toBeDefined();
  });

  it('should have noPublicCreatorForBite action', () => {
    expect(BiteActions.noPublicCreatorForBite).toBeDefined();
  });
});
