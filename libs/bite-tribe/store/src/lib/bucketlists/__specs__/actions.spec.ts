import {
  clearHomeFilters,
  errorLoadingGpsPosition,
  fetchGpsPosition,
  goPrivate,
  goPublic,
  loadedGpsPosition,
  loadedSettingsFromApi,
  savePublicProfile,
  saveSettings,
  setHomeFilters,
  setPublicProfile,
} from '../../app/actions';

describe('Bucketlists Actions', () => {
  it('should have a fetchGpsPosition action', () => {
    expect(fetchGpsPosition).toBeDefined();
  });

  it('should have a loadedGpsPosition action', () => {
    expect(loadedGpsPosition).toBeDefined();
  });

  it('should have a errorLoadingGpsPosition action', () => {
    expect(errorLoadingGpsPosition).toBeDefined();
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

  it('should have a setHomeFilters action', () => {
    expect(setHomeFilters).toBeDefined();
  });

  it('should have a clearHomeFilters action', () => {
    expect(clearHomeFilters).toBeDefined();
  });
});
