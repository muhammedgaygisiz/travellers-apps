import { AppActions } from '../actions';

describe('App Actions', () => {
  it('should have a fetchGpsPosition action', () => {
    expect(AppActions.fetchGPSPosition).toBeDefined();
  });

  it('should have a loadedGpsPosition action', () => {
    expect(AppActions.loadedGPSPosition).toBeDefined();
  });

  it('should have a errorLoadingGpsPosition action', () => {
    expect(AppActions.fetchGPSPosition).toBeDefined();
  });

  it('should have a savedSettings action', () => {
    expect(AppActions.savedSettings).toBeDefined();
  });

  it('should have a savePublicProfile action', () => {
    expect(AppActions.savePublicProfile).toBeDefined();
  });

  it('should have a loadedSettingsFromApi action', () => {
    expect(AppActions.loadedSettingsFromAPI).toBeDefined();
  });

  it('should have a setPublicProfile action', () => {
    expect(AppActions.setPublicProfile).toBeDefined();
  });
});
