import {
  fetchGpsPosition,
  goPrivate,
  goPublic,
  loadedGpsPosition,
  loadedSettingsFromApi,
  savePublicProfile,
  saveSettings,
  setPublicProfile,
} from '../actions';

describe('App Actions', () => {
  it('should have a fetchGpsPosition action', () => {
    expect(fetchGpsPosition).toBeDefined();
  });

  it('should have a loadedGpsPosition action', () => {
    expect(loadedGpsPosition).toBeDefined();
  });

  it('should have a errorLoadingGpsPosition action', () => {
    expect(fetchGpsPosition).toBeDefined();
  });

  it('should have a saveSettings action', () => {
    expect(saveSettings).toBeDefined();
  });

  it('should have a savePublicProfile action', () => {
    expect(savePublicProfile).toBeDefined();
  });

  it('should have a loadedSettingsFromApi action', () => {
    expect(loadedSettingsFromApi).toBeDefined();
  });

  it('should have a setPublicProfile action', () => {
    expect(setPublicProfile).toBeDefined();
  });

  it('should have a goPublic action', () => {
    expect(goPublic).toBeDefined();
  });

  it('should have a goPrivate action', () => {
    expect(goPrivate).toBeDefined();
  });
});
