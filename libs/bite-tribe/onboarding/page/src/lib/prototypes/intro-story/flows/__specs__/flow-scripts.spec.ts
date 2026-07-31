import {
  ALL_INTRO_FLOWS,
  FIND_THE_BITE_FLOWS,
  SHARE_THE_FIND_FLOWS,
} from '../flow-scripts';

describe('intro intentional flow scripts', () => {
  it('ships 10 Find + 10 Share variants', () => {
    expect(FIND_THE_BITE_FLOWS).toHaveLength(10);
    expect(SHARE_THE_FIND_FLOWS).toHaveLength(10);
    expect(ALL_INTRO_FLOWS).toHaveLength(20);
  });

  it('gives every flow a unique id, title, and caption', () => {
    const ids = ALL_INTRO_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const flow of ALL_INTRO_FLOWS) {
      expect(flow.title.length).toBeGreaterThan(3);
      expect(flow.caption.length).toBeGreaterThan(10);
      expect(flow.steps.length).toBeGreaterThan(4);
    }
  });

  it('Find flows use discover beat; Share flows use share beat', () => {
    expect(FIND_THE_BITE_FLOWS.every((f) => f.beat === 'discover')).toBe(true);
    expect(SHARE_THE_FIND_FLOWS.every((f) => f.beat === 'share')).toBe(true);
  });

  it('canonical Find scrolls and taps the same Botanic card', () => {
    const steps = FIND_THE_BITE_FLOWS[0].steps;
    const scroll = steps.find((s) => s.kind === 'scrollToTarget') as {
      target: string;
    };
    const tap = steps.find(
      (s) => s.kind === 'tap' && typeof (s as { at?: unknown }).at === 'string',
    ) as { at: string };
    expect(scroll.target).toContain('bite1');
    expect(tap.at).toBe(scroll.target);
  });

  it('canonical Share starts on home then opens Create Bite', () => {
    const first = SHARE_THE_FIND_FLOWS[0].steps[0] as {
      kind: string;
      action: { type: string; screen?: string };
    };
    expect(first.kind).toBe('emit');
    expect(first.action).toEqual({ type: 'navigate', screen: 'home' });
    const createTap = SHARE_THE_FIND_FLOWS[0].steps.find(
      (s) =>
        s.kind === 'tap' &&
        (s as { at?: string }).at === '[data-testid="footer-add-button"]',
    );
    expect(createTap).toBeTruthy();
  });
});
