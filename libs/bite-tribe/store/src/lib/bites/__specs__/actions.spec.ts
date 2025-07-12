import {
  cacheBite,
  deleteBite,
  loadedBiteCreator,
  loadedBitesFromApi,
  noPublicCreatorForBite,
  saveExistingBite,
  saveNewBite,
  saveTags,
} from '../actions';

describe('Bites - Actions', () => {
  it('should have loadedBitesFromApi action', () => {
    expect(loadedBitesFromApi).toBeDefined();
  });

  it('should have saveNewBite action', () => {
    expect(saveNewBite).toBeDefined();
  });

  it('should have saveExistingBite action', () => {
    expect(saveExistingBite).toBeDefined();
  });

  it('should have saveTags action', () => {
    expect(saveTags).toBeDefined();
  });

  it('should have cacheBite action', () => {
    expect(cacheBite).toBeDefined();
  });

  it('should have deleteBite action', () => {
    expect(deleteBite).toBeDefined();
  });

  it('should have loadedBiteCreator action', () => {
    expect(loadedBiteCreator).toBeDefined();
  });

  it('should have noPublicCreatorForBite action', () => {
    expect(noPublicCreatorForBite).toBeDefined();
  });
});
