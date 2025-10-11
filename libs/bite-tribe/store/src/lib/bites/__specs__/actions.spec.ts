import { BiteActions } from '../actions';

describe('Bites - Actions', () => {
  it('should have reloadBites action', () => {
    expect(BiteActions.reloadBites).toBeDefined();
  });

  it('should have loadedFromAPI action', () => {
    expect(BiteActions.loadedFromAPI).toBeDefined();
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

  it('should have stopReloadingBites action', () => {
    expect(BiteActions.stopReloadingBites).toBeDefined();
  });
});
