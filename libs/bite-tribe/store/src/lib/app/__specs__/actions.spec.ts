import { describe, expect, it } from 'vitest';
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

  it('should have a saveSettings action', () => {
    expect(AppActions.saveSettings).toBeDefined();
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

  it('should have a goPublic action', () => {
    expect(AppActions.goPublic).toBeDefined();
  });

  it('should have a goPrivate action', () => {
    expect(AppActions.goPrivate).toBeDefined();
  });
});
