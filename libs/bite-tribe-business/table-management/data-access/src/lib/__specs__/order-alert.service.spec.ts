import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { ORDER_ALERT_KEY, OrderAlertService } from '../order-alert.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const preferences = Preferences as unknown as Record<string, jest.Mock>;

/** A minimal `AudioContext`, enough to record that a chime was scheduled. */
const stubAudio = (): { starts: number[] } => {
  const starts: number[] = [];

  (globalThis as Record<string, unknown>)['AudioContext'] = class {
    currentTime = 0;
    destination = {};

    createOscillator(): Record<string, unknown> {
      return {
        frequency: { value: 0 },
        connect: (): void => undefined,
        start: (at: number): void => {
          starts.push(at);
        },
        stop: (): void => undefined,
      };
    }

    createGain(): Record<string, unknown> {
      return { gain: { value: 0 }, connect: (): void => undefined };
    }
  } as unknown as typeof AudioContext;

  return { starts };
};

/**
 * The busy-service alert (GitHub issue #1105).
 *
 * Off until somebody turns it on, remembered per device rather than per
 * account, and incapable of stopping the queue from opening however badly the
 * platform underneath it behaves.
 */
describe(OrderAlertService.name, () => {
  let service: OrderAlertService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete (globalThis as Record<string, unknown>)['AudioContext'];

    TestBed.configureTestingModule({ providers: [OrderAlertService] });
    service = TestBed.inject(OrderAlertService);
  });

  /** The issue asks for it in as many words, and it is the only safe default. */
  it('starts off', () => {
    expect(service.enabled()).toBe(false);
  });

  it('restores what this device chose', async () => {
    preferences['get'].mockResolvedValue({ value: 'true' });

    await service.restore();

    expect(preferences['get']).toHaveBeenCalledWith({ key: ORDER_ALERT_KEY });
    expect(service.enabled()).toBe(true);
  });

  it('reads a device that has never chosen as off', async () => {
    preferences['get'].mockResolvedValue({ value: null });

    await service.restore();

    expect(service.enabled()).toBe(false);
  });

  /**
   * A preference store that refuses to read is a device with the alert off,
   * which is the default anyway - and it must not stop the queue opening.
   */
  it('survives a preference store that will not read', async () => {
    preferences['get'].mockRejectedValue(new Error('no storage'));

    await service.restore();

    expect(service.enabled()).toBe(false);
  });

  it('remembers the choice for next time', async () => {
    preferences['set'].mockResolvedValue(undefined);

    await service.setEnabled(true);

    expect(preferences['set']).toHaveBeenCalledWith({
      key: ORDER_ALERT_KEY,
      value: 'true',
    });
    expect(service.enabled()).toBe(true);
  });

  it('keeps the setting for this session when it cannot be written', async () => {
    preferences['set'].mockRejectedValue(new Error('no storage'));

    await service.setEnabled(true);

    expect(service.enabled()).toBe(true);
  });

  /**
   * Turning it on plays the chime once: that gesture is the interaction a
   * browser requires before it will make any sound at all, and a setting nobody
   * has heard is a setting nobody can judge.
   */
  it('plays the chime when it is switched on, and not when it is switched off', async () => {
    const audio = stubAudio();

    preferences['set'].mockResolvedValue(undefined);

    await service.setEnabled(true);
    expect(audio.starts).toHaveLength(2);

    await service.setEnabled(false);
    expect(audio.starts).toHaveLength(2);
  });

  it('sounds on a new order only while it is on', async () => {
    const audio = stubAudio();

    service.alert();
    expect(audio.starts).toHaveLength(0);

    preferences['set'].mockResolvedValue(undefined);
    await service.setEnabled(true);
    service.alert();

    expect(audio.starts).toHaveLength(4);
  });

  /**
   * A browser that will not make a sound leaves the visual flash, which is the
   * channel that works in a kitchen loud enough to need the sound.
   */
  it('does nothing at all where there is no audio to play', () => {
    service.enabled.set(true);

    expect(() => service.alert()).not.toThrow();
  });
});
