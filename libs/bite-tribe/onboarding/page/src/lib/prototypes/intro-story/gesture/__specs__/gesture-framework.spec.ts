import {
  fitPhoneStage,
  G,
  INTRO_BEAT_SCRIPTS,
  script,
  type GestureScriptStep,
} from '../index';

describe('fitPhoneStage', () => {
  it('fits the full 390×844 phone into the frame at zoom 1', () => {
    const result = fitPhoneStage({
      frameW: 320,
      frameH: 640,
      nativeW: 390,
      nativeH: 844,
      padding: 8,
      zoom: 1,
    });

    expect(result.fit).toBeCloseTo(
      Math.min((320 - 16) / 390, (640 - 16) / 844),
      5,
    );
    expect(result.scale).toBeCloseTo(result.fit, 5);
    expect(result.transform).toContain('scale(');
    expect(result.transform).toContain('translate(');
  });

  it('keeps scale ≤ frame so filters are not clipped at zoom 1', () => {
    const { scale, nativeW, nativeH } = fitPhoneStage({
      frameW: 280,
      frameH: 520,
      padding: 8,
      zoom: 1,
    });
    expect(nativeW * scale).toBeLessThanOrEqual(280);
    expect(nativeH * scale).toBeLessThanOrEqual(520);
  });
});

describe('gesture script builders', () => {
  it('builds a synced scroll-to-target script with shared step kinds', () => {
    const steps: GestureScriptStep[] = script()
      .appear({ x: 50, y: 80 })
      .moveTo({ x: 50, y: 40 }, 600)
      .scrollToTarget('[data-bite-id="bite1"]', 1200, { alignY: 46 })
      .tap('[data-bite-id="bite1"]')
      .then(() => undefined)
      .wait(400)
      .build();

    expect(steps.map((s) => s.kind)).toEqual([
      'appear',
      'moveTo',
      'scrollToTarget',
      'tap',
      'then',
      'wait',
    ]);
  });

  it('exposes compact G factories', () => {
    expect(G.down().kind).toBe('down');
    expect(G.up().kind).toBe('up');
    expect(G.drag({ x: 10, y: 20 }, 500).kind).toBe('drag');
    expect(G.scrollToTarget('[data-bite-id="bite1"]', 1000).kind).toBe(
      'scrollToTarget',
    );
  });
});

describe('intro beat narrative contracts', () => {
  it('discover scrolls and taps the same Botanic Breeze card', () => {
    const steps = INTRO_BEAT_SCRIPTS.discover.steps;
    const scroll = steps.find((s) => s.kind === 'scrollToTarget') as {
      kind: 'scrollToTarget';
      target: string;
    };
    const tap = steps.find((s) => s.kind === 'tap') as {
      kind: 'tap';
      at: string;
    };
    expect(scroll?.target).toBe('bt-bite[data-bite-id="bite1"]');
    expect(tap?.at).toBe(scroll?.target);

    const details = steps.find(
      (s) =>
        s.kind === 'emit' &&
        (s as { action?: { type?: string; screen?: string } }).action?.type ===
          'navigate' &&
        (s as { action?: { screen?: string } }).action?.screen === 'details',
    ) as { action: { biteId?: string } };
    expect(details?.action?.biteId).toBe('bite1');
  });

  it('share starts on home then taps Create Bite', () => {
    const first = INTRO_BEAT_SCRIPTS.share.steps[0] as {
      kind: 'emit';
      action: { type: string; screen?: string };
    };
    expect(first.action).toEqual({ type: 'navigate', screen: 'home' });
    const firstTap = INTRO_BEAT_SCRIPTS.share.steps.find(
      (s) => s.kind === 'tap',
    ) as { at: string };
    expect(firstTap?.at).toBe('[data-testid="footer-add-button"]');
  });

  it('go opens the pin drawer then directions for the same bite', () => {
    const steps = INTRO_BEAT_SCRIPTS.go.steps;
    const pinTap = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { emitOnPress?: { type?: string } }).emitOnPress?.type ===
          'selectPin',
    ) as { emitOnPress?: { biteId?: string } };
    expect(pinTap?.emitOnPress?.biteId).toBe('bite1');
    const drawerTap = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at: unknown }).at === '[data-intro="map-drawer"]',
    );
    expect(drawerTap).toBeTruthy();
    const directions = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at: unknown }).at === '[data-testid="bite-details-navigation"]',
    );
    expect(directions).toBeTruthy();
  });
});
