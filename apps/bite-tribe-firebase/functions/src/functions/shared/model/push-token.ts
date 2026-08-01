export type PushToken = {
  enabled: boolean;
  /**
   * The Capacitor platform the installation registered from, e.g. `ios`,
   * `android`, or `web`.
   *
   * Absent on tokens registered before the field was written, so a platform
   * filter must treat "unknown" as "not this platform" rather than assuming one
   * (issue \#1194).
   */
  platform?: string;
};
