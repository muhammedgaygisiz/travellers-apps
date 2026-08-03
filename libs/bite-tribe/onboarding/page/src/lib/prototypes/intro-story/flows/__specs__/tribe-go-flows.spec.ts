import {
  JOIN_THE_TRIBE_FLOWS,
  READY_TO_TASTE_FLOWS,
  TRIBE_GO_FLOW_BY_ID,
} from '../tribe-go-flows';

describe('Join the tribe / Ready to taste flow contracts', () => {
  it('registers 10 Join the tribe flows with unique ids', () => {
    expect(JOIN_THE_TRIBE_FLOWS).toHaveLength(10);
    const ids = JOIN_THE_TRIBE_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(10);
    expect(JOIN_THE_TRIBE_FLOWS.every((f) => f.beat === 'tribe')).toBe(true);
    expect(JOIN_THE_TRIBE_FLOWS.every((f) => f.steps.length > 0)).toBe(true);
  });

  it('registers 10 Ready to taste flows with unique ids', () => {
    expect(READY_TO_TASTE_FLOWS).toHaveLength(10);
    const ids = READY_TO_TASTE_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(10);
    expect(READY_TO_TASTE_FLOWS.every((f) => f.beat === 'go')).toBe(true);
    expect(READY_TO_TASTE_FLOWS.every((f) => f.steps.length > 0)).toBe(true);
  });

  it('indexes every tribe/go flow by id', () => {
    for (const flow of [...JOIN_THE_TRIBE_FLOWS, ...READY_TO_TASTE_FLOWS]) {
      expect(TRIBE_GO_FLOW_BY_ID[flow.id]).toEqual(flow);
    }
  });

  it('canonical tribe script follows creator then Follow', () => {
    const steps = JOIN_THE_TRIBE_FLOWS[0].steps;
    const creatorTap = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at: unknown }).at === '.bite-creator-container',
    );
    const follow = steps.find(
      (s) =>
        (s.kind === 'emit' &&
          (s as { action?: { type?: string } }).action?.type === 'follow') ||
        (s.kind === 'tap' &&
          (s as { emitOnPress?: { type?: string } }).emitOnPress?.type ===
            'follow'),
    );
    expect(creatorTap).toBeTruthy();
    expect(follow).toBeTruthy();
  });

  it('canonical go script selects a pin then opens directions', () => {
    const steps = READY_TO_TASTE_FLOWS[0].steps;
    const pin = steps.find(
      (s) =>
        (s.kind === 'emit' &&
          (s as { action?: { type?: string } }).action?.type === 'selectPin') ||
        (s.kind === 'tap' &&
          (s as { emitOnPress?: { type?: string } }).emitOnPress?.type ===
            'selectPin'),
    );
    const drawer = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at: unknown }).at === '[data-intro="map-drawer"]',
    );
    const directions = steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at: unknown }).at === '[data-testid="bite-details-navigation"]',
    );
    expect(pin).toBeTruthy();
    expect(drawer).toBeTruthy();
    expect(directions).toBeTruthy();
  });
});
