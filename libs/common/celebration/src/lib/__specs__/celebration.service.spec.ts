import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import confetti from 'canvas-confetti';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import {
  BURST_TIMEOUT_MS,
  CELEBRATION_BURST,
  CELEBRATION_GRAND_BURST,
  CELEBRATION_GRAND_BURST_EMOJI,
  CELEBRATION_MESSAGE_KEYS,
  CELEBRATION_SETTLING_WINDOW_MS,
  CELEBRATION_THOUSAND_MESSAGE_KEY,
  CelebrationMoment,
  CelebrationService,
  GRAND_BURST_TIMEOUT_MS,
} from '../celebration.service';

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: { create: jest.fn(), shapeFromText: jest.fn() },
}));
jest.mock('ta-firestore', () => ({
  AnalyticsEvent: { CelebrationShown: 'celebration_shown' },
  AnalyticsService: class {},
}));
jest.mock('toast', () => ({ ToastService: class {} }));
// The real `SoundsService` runs against a stubbed `BiteSounds` plugin, so the
// setting and the one-at-a-time window are its own, not a copy of them.
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(), isPluginAvailable: jest.fn() },
  registerPlugin: jest.fn(() => ({
    posted: jest.fn(),
    celebration: jest.fn(),
  })),
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const create = confetti.create as jest.Mock;
const shapeFromText = confetti.shapeFromText as jest.Mock;

/** The moments held for the settling window (issue #2013). */
const HELD: ReadonlySet<string> = new Set([
  'first-country',
  'bite-milestone',
  'leaderboard-top-ten',
  'leaderboard-overtake',
]);

// Read before any `clearAllMocks`, which would drop the recorded result.
const biteSounds = (registerPlugin as jest.Mock).mock.results[0].value as {
  posted: jest.Mock;
  celebration: jest.Mock;
};
const getPreference = Preferences.get as jest.Mock;

/** Lets the sound, which is fired and not awaited, reach the plugin. */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const THEME: Record<string, string> = {
  '--ion-color-primary': ' #4a90d9',
  '--bite-tribe-color': '#fec56b',
  '--ion-color-secondary': '#20201e ',
  '--ion-color-tertiary': '#f1f1f1',
};

const WORKSPACE = join(__dirname, '..', '..', '..', '..', '..', '..');

/** Directories that hold no source of the apps, or only generated output. */
const SKIPPED = new Set([
  'node_modules',
  'dist',
  'coverage',
  'android',
  'ios',
  'www',
  '.angular',
]);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return SKIPPED.has(entry.name) ? [] : sourceFiles(path);
    }

    return /\.(ts|mjs|js)$/.test(entry.name) ? [path] : [];
  });

describe('CelebrationService', () => {
  let service: CelebrationService;
  let present: jest.Mock;
  let logEvent: jest.Mock;
  let fire: jest.Mock;
  let endBurst: () => void;
  let reducedMotion: boolean;

  /** The confetti canvases currently in the document. */
  const canvases = (): HTMLCanvasElement[] =>
    Array.from(document.body.querySelectorAll('canvas'));

  beforeEach(() => {
    jest.clearAllMocks();
    reducedMotion = false;

    // Every shot of a burst is its own promise; ending the burst ends them all.
    const running: (() => void)[] = [];
    endBurst = (): void => running.splice(0).forEach((end) => end());
    fire = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          running.push(resolve);
        }),
    );
    Object.assign(fire, { reset: jest.fn() });
    create.mockReturnValue(fire);
    shapeFromText.mockImplementation(({ text }: { text: string }) => ({
      type: 'bitmap',
      text,
    }));

    window.matchMedia = jest.fn((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
    })) as unknown as typeof window.matchMedia;
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (property: string) => THEME[property] ?? '',
    } as CSSStyleDeclaration);

    present = jest.fn().mockResolvedValue(undefined);
    logEvent = jest.fn();

    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    (Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(true);
    getPreference.mockResolvedValue({ value: null });
    biteSounds.posted.mockResolvedValue(undefined);
    biteSounds.celebration.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: { present } },
        { provide: AnalyticsService, useValue: { logEvent } },
      ],
    });

    service = TestBed.inject(CelebrationService);
  });

  afterEach(() => {
    canvases().forEach((canvas) => canvas.remove());
    jest.restoreAllMocks();
  });

  it('draws one burst from the bottom centre in the theme colours', async () => {
    const celebrated = service.celebrate('first-bite');
    await Promise.resolve();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(canvases()[0], {
      resize: true,
      useWorker: true,
    });
    expect(fire).toHaveBeenCalledTimes(1);
    expect(fire).toHaveBeenCalledWith({
      ...CELEBRATION_BURST,
      colors: ['#4a90d9', '#fec56b', '#20201e'],
    });
    expect(CELEBRATION_BURST).toMatchObject({
      origin: { x: 0.5, y: 1 },
      angle: 90,
    });

    endBurst();
    await celebrated;
  });

  it('removes its canvas when the burst ends', async () => {
    const celebrated = service.celebrate('first-bite');
    await Promise.resolve();

    expect(canvases()).toHaveLength(1);

    endBurst();
    await celebrated;

    expect(canvases()).toHaveLength(0);
  });

  it('draws on a full-viewport canvas that takes no pointer events', async () => {
    const celebrated = service.celebrate('first-bite');
    await Promise.resolve();

    const [canvas] = canvases();

    expect(canvas.parentElement).toBe(document.body);
    expect(canvas.style.pointerEvents).toBe('none');
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');

    endBurst();
    await celebrated;
  });

  it('falls back to the library colours when the theme sets none', async () => {
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    const celebrated = service.celebrate('first-bite');
    await Promise.resolve();

    expect(fire).toHaveBeenCalledWith({
      ...CELEBRATION_BURST,
      colors: undefined,
    });

    endBurst();
    await celebrated;
  });

  it('creates no canvas under reduced motion and still presents the toast and plays the sound', async () => {
    reducedMotion = true;

    await service.celebrate('first-follow');
    await settle();

    expect(create).not.toHaveBeenCalled();
    expect(canvases()).toHaveLength(0);
    expect(present).toHaveBeenCalledTimes(1);
    expect(present).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success' }),
    );
    expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
  });

  it('draws no second burst while one is running', async () => {
    const first = service.celebrate('first-bite');
    await Promise.resolve();
    const second = service.celebrate('first-follow', { displayName: 'Leela' });
    await second;

    expect(create).toHaveBeenCalledTimes(1);
    expect(canvases()).toHaveLength(1);
    expect(present).toHaveBeenCalledTimes(2);

    endBurst();
    await first;
  });

  it('plays no second sound while the first is playing', async () => {
    reducedMotion = true;

    await service.celebrate('first-bite');
    await service.celebrate('first-follow', { displayName: 'Leela' });
    await settle();

    expect(present).toHaveBeenCalledTimes(2);
    expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
  });

  it('plays confetti, toast and haptic but no sound with sounds switched off', async () => {
    getPreference.mockResolvedValue({ value: 'false' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: { present } },
        { provide: AnalyticsService, useValue: { logEvent } },
      ],
    });
    service = TestBed.inject(CelebrationService);

    const celebrated = service.celebrate('first-bite');
    await settle();

    expect(create).toHaveBeenCalledTimes(1);
    expect(present).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success' }),
    );

    endBurst();
    await celebrated;
    await settle();

    expect(biteSounds.celebration).not.toHaveBeenCalled();
    expect(biteSounds.posted).not.toHaveBeenCalled();
  });

  it('does not wait for the sound to finish', async () => {
    reducedMotion = true;
    biteSounds.celebration.mockReturnValue(new Promise<void>(() => undefined));

    await service.celebrate('first-bite');
    await settle();

    expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
  });

  it('resolves when the sound fails', async () => {
    reducedMotion = true;
    biteSounds.celebration.mockRejectedValue(new Error('no sound pool'));

    await expect(service.celebrate('first-bite')).resolves.toBeUndefined();
    await settle();

    expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
  });

  it('draws again once the earlier burst has ended', async () => {
    const first = service.celebrate('first-bite');
    await Promise.resolve();
    endBurst();
    await first;

    const second = service.celebrate('bite-trail-completed');
    await Promise.resolve();

    expect(create).toHaveBeenCalledTimes(2);

    endBurst();
    await second;
  });

  describe('a burst that never finishes (issue #2039)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps its canvas until the bound', async () => {
      void service.celebrate('first-bite');
      await jest.advanceTimersByTimeAsync(BURST_TIMEOUT_MS - 1);

      expect(canvases()).toHaveLength(1);
      expect(fire.reset).not.toHaveBeenCalled();
    });

    it('stops the burst, removes its canvas and resolves at the bound', async () => {
      const celebrated = service.celebrate('first-bite');
      await jest.advanceTimersByTimeAsync(BURST_TIMEOUT_MS);

      await expect(celebrated).resolves.toBeUndefined();
      expect(fire.reset).toHaveBeenCalledTimes(1);
      expect(canvases()).toHaveLength(0);
    });

    it('draws the next celebration again', async () => {
      void service.celebrate('first-bite');
      await jest.advanceTimersByTimeAsync(BURST_TIMEOUT_MS);

      void service.celebrate('first-follow', { displayName: 'Leela' });
      await jest.advanceTimersByTimeAsync(0);

      expect(create).toHaveBeenCalledTimes(2);
      expect(canvases()).toHaveLength(1);
    });

    it('leaves a burst that ends in time alone', async () => {
      const celebrated = service.celebrate('first-bite');
      await jest.advanceTimersByTimeAsync(2000);
      endBurst();
      await celebrated;
      await jest.advanceTimersByTimeAsync(BURST_TIMEOUT_MS);

      expect(fire.reset).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  it.each(Object.entries(CELEBRATION_MESSAGE_KEYS))(
    'presents exactly one success toast and one celebration sound for %s',
    async (moment, messageKey) => {
      reducedMotion = true;
      jest.useFakeTimers();

      const celebrated = service.celebrate(moment as CelebrationMoment, {
        user: 'leela',
      });
      await jest.advanceTimersByTimeAsync(
        HELD.has(moment) ? CELEBRATION_SETTLING_WINDOW_MS : 0,
      );
      await celebrated;
      await jest.advanceTimersByTimeAsync(0);
      jest.useRealTimers();

      expect(present).toHaveBeenCalledTimes(1);
      expect(present).toHaveBeenCalledWith({
        messageKey,
        params: { user: 'leela' },
        outcome: 'success',
      });
      expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
      expect(biteSounds.posted).not.toHaveBeenCalled();
    },
  );

  it('resolves when the library throws', async () => {
    create.mockImplementation(() => {
      throw new Error('no canvas');
    });

    await expect(service.celebrate('first-bite')).resolves.toBeUndefined();
    expect(canvases()).toHaveLength(0);
  });

  it('resolves when the burst rejects', async () => {
    fire.mockRejectedValue(new Error('worker failed'));

    await expect(
      service.celebrate('onboarding-finished'),
    ).resolves.toBeUndefined();
    expect(canvases()).toHaveLength(0);
  });

  it('logs the moment once per celebration, also under reduced motion', async () => {
    reducedMotion = true;

    await service.celebrate('onboarding-finished');

    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CelebrationShown, {
      moment: 'onboarding-finished',
    });
  });

  describe('one Bite, one celebration (issue #2013)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /** Raises `moment` and lets its settling window close. */
    const celebrateHeld = async (
      moment: CelebrationMoment,
      params?: Record<string, unknown>,
    ): Promise<void> => {
      const celebrated = service.celebrate(moment, params);
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);
      endBurst();
      await celebrated;
    };

    it('holds a moment until the settling window closes', async () => {
      reducedMotion = true;

      void service.celebrate('first-country', { country: 'Japan' });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS - 1);

      expect(present).not.toHaveBeenCalled();
      expect(logEvent).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);

      expect(present).toHaveBeenCalledTimes(1);
      expect(present).toHaveBeenCalledWith({
        messageKey: 'country-badge-earned',
        params: { country: 'Japan' },
        outcome: 'success',
      });
    });

    it('draws the standard burst for a hundredth Bite', async () => {
      const celebrated = service.celebrate('bite-milestone', { count: 100 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);

      expect(fire).toHaveBeenCalledTimes(1);
      expect(fire).toHaveBeenCalledWith({
        ...CELEBRATION_BURST,
        colors: ['#4a90d9', '#fec56b', '#20201e'],
      });
      expect(shapeFromText).not.toHaveBeenCalled();
      expect(present).toHaveBeenCalledWith(
        expect.objectContaining({ messageKey: 'bite-milestone' }),
      );

      endBurst();
      await celebrated;
    });

    it('draws the grand burst for a thousandth Bite', async () => {
      const celebrated = service.celebrate('bite-milestone', { count: 1000 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);

      const colors = ['#4a90d9', '#fec56b', '#20201e'];
      const [left, right, centre, emoji] = CELEBRATION_GRAND_BURST;

      expect(create).toHaveBeenCalledTimes(1);
      expect(fire.mock.calls).toEqual([
        [{ ...left.options, colors }],
        [{ ...right.options, colors }],
      ]);
      expect(left.options).toMatchObject({ origin: { x: 0, y: 1 }, angle: 60 });
      expect(right.options).toMatchObject({
        origin: { x: 1, y: 1 },
        angle: 120,
      });

      await jest.advanceTimersByTimeAsync(250);

      expect(fire).toHaveBeenCalledTimes(4);
      expect(fire).toHaveBeenNthCalledWith(3, { ...centre.options, colors });
      expect(fire).toHaveBeenNthCalledWith(4, {
        ...emoji.options,
        shapes: CELEBRATION_GRAND_BURST_EMOJI.map((text) => ({
          type: 'bitmap',
          text,
        })),
      });
      expect(shapeFromText).toHaveBeenCalledWith({
        text: '🍜',
        scalar: emoji.options.scalar,
      });
      expect(
        CELEBRATION_GRAND_BURST.reduce(
          (total, shot) => total + (shot.options.particleCount ?? 0),
          0,
        ),
      ).toBe(250);
      expect(present).toHaveBeenCalledWith(
        expect.objectContaining({
          messageKey: CELEBRATION_THOUSAND_MESSAGE_KEY,
          params: { count: 1000 },
        }),
      );
      expect(canvases()).toHaveLength(1);

      endBurst();
      await celebrated;

      expect(canvases()).toHaveLength(0);
    });

    it('still throws the confetti when the emoji cannot be drawn', async () => {
      shapeFromText.mockImplementation(() => {
        throw new Error('no OffscreenCanvas');
      });

      const celebrated = service.celebrate('bite-milestone', { count: 2000 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS + 250);

      expect(fire).toHaveBeenCalledTimes(3);

      endBurst();
      await celebrated;
    });

    it('bounds the grand burst by its own timeout', async () => {
      const celebrated = service.celebrate('bite-milestone', { count: 1000 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);
      await jest.advanceTimersByTimeAsync(GRAND_BURST_TIMEOUT_MS - 1);

      expect(canvases()).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(1);
      await celebrated;

      expect(fire.reset).toHaveBeenCalledTimes(1);
      expect(canvases()).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('creates no canvas for the grand burst under reduced motion and still presents the toast', async () => {
      reducedMotion = true;

      await celebrateHeld('bite-milestone', { count: 1000 });

      expect(create).not.toHaveBeenCalled();
      expect(canvases()).toHaveLength(0);
      expect(present).toHaveBeenCalledTimes(1);
      expect(present).toHaveBeenCalledWith(
        expect.objectContaining({
          messageKey: CELEBRATION_THOUSAND_MESSAGE_KEY,
        }),
      );
    });

    it.each([
      ['bite-milestone', 'first-country', 'country-badge-earned'],
      ['first-country', 'leaderboard-overtake', 'country-badge-earned'],
      ['leaderboard-overtake', 'leaderboard-top-ten', 'leaderboard-top-ten'],
      ['leaderboard-top-ten', 'bite-milestone', 'bite-milestone'],
    ] as const)(
      'plays one toast and one burst for the higher of %s and %s',
      async (earlier, later, messageKey) => {
        const first = service.celebrate(earlier, { count: 50, rank: 3 });
        await jest.advanceTimersByTimeAsync(1000);
        const second = service.celebrate(later, { count: 50, rank: 3 });
        await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);

        expect(present).toHaveBeenCalledTimes(1);
        expect(present).toHaveBeenCalledWith(
          expect.objectContaining({ messageKey }),
        );
        expect(create).toHaveBeenCalledTimes(1);
        expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledTimes(1);

        endBurst();
        await Promise.all([first, second]);
      },
    );

    it('keeps the later of two raises of the same moment', async () => {
      reducedMotion = true;

      const first = service.celebrate('leaderboard-overtake', { rank: 5 });
      const second = service.celebrate('leaderboard-overtake', { rank: 4 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);
      await Promise.all([first, second]);

      expect(present).toHaveBeenCalledTimes(1);
      expect(present).toHaveBeenCalledWith(
        expect.objectContaining({ params: { rank: 4 } }),
      );
    });

    it('plays a moment raised after the window has closed on its own', async () => {
      reducedMotion = true;

      await celebrateHeld('first-country', { country: 'Japan' });
      await celebrateHeld('leaderboard-top-ten', { rank: 7 });

      expect(present).toHaveBeenCalledTimes(2);
      expect(logEvent).toHaveBeenNthCalledWith(
        2,
        AnalyticsEvent.CelebrationShown,
        { moment: 'leaderboard-top-ten', rank: 7 },
      );
    });

    it('suppresses the held moments after a first Bite in the window', async () => {
      reducedMotion = true;

      await service.celebrate('first-bite');
      const later = service.celebrate('leaderboard-top-ten', { rank: 9 });
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);
      await later;

      expect(present).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CelebrationShown, {
        moment: 'first-bite',
      });
    });

    it('drops a held moment when a first Bite plays inside its window', async () => {
      reducedMotion = true;

      const held = service.celebrate('leaderboard-top-ten', { rank: 9 });
      await jest.advanceTimersByTimeAsync(500);
      await service.celebrate('first-bite');
      await held;
      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);

      expect(present).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CelebrationShown, {
        moment: 'first-bite',
      });
    });

    it('plays a direct moment at once while a window is open', async () => {
      reducedMotion = true;

      const held = service.celebrate('bite-milestone', { count: 5 });
      await service.celebrate('first-follow', { displayName: 'Leela' });

      expect(present).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(CELEBRATION_SETTLING_WINDOW_MS);
      await held;

      expect(present).toHaveBeenCalledTimes(2);
    });

    it('logs the count of a milestone and the rank of a leaderboard moment', async () => {
      reducedMotion = true;

      await celebrateHeld('bite-milestone', { count: 300, rank: 2 });
      await celebrateHeld('leaderboard-overtake', {
        count: 300,
        rank: 2,
        user: 'Leela',
      });

      expect(logEvent.mock.calls).toEqual([
        [
          AnalyticsEvent.CelebrationShown,
          { moment: 'bite-milestone', count: 300 },
        ],
        [
          AnalyticsEvent.CelebrationShown,
          { moment: 'leaderboard-overtake', rank: 2 },
        ],
      ]);
    });
  });

  it('is the only importer of canvas-confetti', () => {
    const importers = ['libs', 'apps']
      .flatMap((dir) => sourceFiles(join(WORKSPACE, dir)))
      .filter((file) => !file.includes('__specs__'))
      .filter((file) =>
        /from ['"]canvas-confetti['"]/.test(readFileSync(file, 'utf8')),
      )
      .map((file) => relative(WORKSPACE, file));

    expect(importers).toEqual([
      join(
        'libs',
        'common',
        'celebration',
        'src',
        'lib',
        'celebration.service.ts',
      ),
    ]);
  });
});

describe('the celebration_shown taxonomy entry', () => {
  /** The quoted members of the union `pattern` captures in `file`. */
  const members = (file: string, pattern: RegExp): string[] => {
    const match = pattern.exec(readFileSync(file, 'utf8'));

    if (!match) {
      throw new Error(`No ${pattern} declaration found in ${file}`);
    }

    return [...match[1].matchAll(/'([^']+)'/g)].map((member) => member[1]);
  };

  /**
   * The taxonomy inlines `CelebrationMoment`, because this library depends on
   * it. Compared as text so the copy cannot drift.
   */
  it('names the same moments as CelebrationMoment', () => {
    const moments = members(
      join(__dirname, '..', 'celebration.service.ts'),
      /export type CelebrationMoment =([^;]*);/,
    );
    const taxonomy = members(
      join(
        WORKSPACE,
        'libs',
        'common',
        'ta-firestore',
        'src',
        'lib',
        'analytics',
        'analytics-events.ts',
      ),
      /\[AnalyticsEvent\.CelebrationShown\]: \{\s*moment:([^}]*)\};/,
    );

    expect(taxonomy).toEqual(moments);
  });
});
