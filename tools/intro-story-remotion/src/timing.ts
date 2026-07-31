/** Shared timing — fps-relative so motion stays consistent if FPS changes. */
export const FPS = 30;
export const WIDTH = 390;
export const HEIGHT = 844;

/** ~3.6s per beat: concise, no dead air, room for joyful settle. */
export const BEAT_FRAMES = Math.round(3.6 * FPS);

export const colors = {
  cream: '#fffbef',
  ink: '#20201e',
  primary: '#4a90d9',
  orange: '#e08a3a',
  rose: '#c45d6a',
  green: '#3f8f6b',
  softBlue: '#d6e7f8',
  softOrange: '#fde7d0',
  softRose: '#f8d9de',
  softGreen: '#d5eee3',
  white: '#ffffff',
  muted: 'rgba(32,32,30,0.55)',
};
