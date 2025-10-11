import { AppActions } from '../../app/actions';

describe('Bucketlists Actions', () => {
  it('should have a fetchGPSPosition action', () => {
    expect(AppActions.fetchGPSPosition).toBeDefined();
  });

  it('should have a loadedGPSPosition action', () => {
    expect(AppActions.loadedGPSPosition).toBeDefined();
  });

  it('should have a errorLoadingGPSPosition action', () => {
    expect(AppActions.errorLoadingGPSPosition).toBeDefined();
  });

  it('should have a saveSettings action', () => {
    expect(AppActions.saveSettings).toBeDefined();
  });

  it('should have a savePublicProfile action', () => {
    expect(AppActions.savePublicProfile).toBeDefined();
  });

  it('should have a loadedSettingsFromAPI action', () => {
    expect(AppActions.loadedSettingsFromAPI).toBeDefined();
  });

  it('should have a setPublicProfile action', () => {
    expect(AppActions.setPublicProfile).toBeDefined();
  });

  it('should have a goPublic action', () => {
    expect(AppActions.goPublic).toBeDefined();
  });

  it('should have a goPrivate action', () => {
    expect(AppActions.goPrivate).toBeDefined();
  });

  it('should have a setHomeFilters action', () => {
    expect(AppActions.setHomeFilters).toBeDefined();
  });

  it('should have a clearHomeFilters action', () => {
    expect(AppActions.clearHomeFilters).toBeDefined();
  });
});
