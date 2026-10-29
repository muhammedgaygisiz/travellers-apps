import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TestBed } from '@angular/core/testing';
import confetti from 'canvas-confetti';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import {
  CELEBRATION_BURST,
  CELEBRATION_MESSAGE_KEYS,
  CelebrationMoment,
  CelebrationService,
} from '../celebration.service';

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
jest.mock('ta-firestore', () => ({
  AnalyticsEvent: { CelebrationShown: 'celebration_shown' },
  AnalyticsService: class {},
}));
jest.mock('toast', () => ({ ToastService: class {} }));

const create = confetti.create as jest.Mock;

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

    fire = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          endBurst = resolve;
        }),
    );
    create.mockReturnValue(fire);

    window.matchMedia = jest.fn((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
    })) as unknown as typeof window.matchMedia;
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (property: string) => THEME[property] ?? '',
    } as CSSStyleDeclaration);

    present = jest.fn().mockResolvedValue(undefined);
    logEvent = jest.fn();

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

  it('creates no canvas under reduced motion and still presents the toast', async () => {
    reducedMotion = true;

    await service.celebrate('first-follow');

    expect(create).not.toHaveBeenCalled();
    expect(canvases()).toHaveLength(0);
    expect(present).toHaveBeenCalledTimes(1);
  });

  it('draws no second burst while one is running', async () => {
    const first = service.celebrate('first-bite');
    await Promise.resolve();
    const second = service.celebrate('first-country', { country: 'Japan' });
    await second;

    expect(create).toHaveBeenCalledTimes(1);
    expect(canvases()).toHaveLength(1);
    expect(present).toHaveBeenCalledTimes(2);

    endBurst();
    await first;
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

  it.each(Object.entries(CELEBRATION_MESSAGE_KEYS))(
    'presents exactly one success toast for %s',
    async (moment, messageKey) => {
      reducedMotion = true;

      await service.celebrate(moment as CelebrationMoment, { user: 'leela' });

      expect(present).toHaveBeenCalledTimes(1);
      expect(present).toHaveBeenCalledWith({
        messageKey,
        params: { user: 'leela' },
        outcome: 'success',
      });
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
