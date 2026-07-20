import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoachMarkOverlayComponent } from '../coach-mark-overlay.component';

const rect = (partial: Partial<DOMRect>): DOMRect =>
  ({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...partial,
  }) as DOMRect;

describe(CoachMarkOverlayComponent.name, () => {
  let fixture: ComponentFixture<CoachMarkOverlayComponent>;
  let component: CoachMarkOverlayComponent;

  const query = (testId: string): HTMLElement | null =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"]`,
    );

  /** jsdom reports a zero layout box, so the card measures itself as 0 high. */
  const stubCardHeight = (height: number): void => {
    jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(height);
  };

  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CoachMarkOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachMarkOverlayComponent);
    component = fixture.componentInstance;
  });

  it('shows the supplied copy and dismiss label', () => {
    fixture.componentRef.setInput('title', 'What is a Bite?');
    fixture.componentRef.setInput('body', 'A dish worth sharing.');
    fixture.componentRef.setInput('dismissLabel', 'Got it');

    fixture.detectChanges();

    const card = query('coach-mark-card');
    expect(card?.textContent).toContain('What is a Bite?');
    expect(card?.textContent).toContain('A dish worth sharing.');
    expect(query('coach-mark-dismiss')?.textContent).toContain('Got it');
  });

  it('emits dismiss only from the explicit action, not the backdrop', () => {
    const dismiss = jest.spyOn(component.dismiss, 'emit');
    fixture.detectChanges();

    (fixture.debugElement.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.coach-mark-scrim')
      ?.click();
    expect(dismiss).not.toHaveBeenCalled();

    query('coach-mark-dismiss')?.click();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('positions the spotlight around the anchor with padding', () => {
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 100, left: 50, width: 80, height: 40, bottom: 140 }),
    );

    fixture.detectChanges();

    // 8px padding on every side of the anchor rect.
    expect(component.spotlightTop()).toBe(92);
    expect(component.spotlightLeft()).toBe(42);
    expect(component.spotlightWidth()).toBe(96);
    expect(component.spotlightHeight()).toBe(56);
    expect(
      (fixture.debugElement.nativeElement as HTMLElement).querySelector(
        '.coach-mark-spotlight',
      ),
    ).not.toBeNull();
  });

  it('falls back to a centered card with a plain scrim when there is no anchor', () => {
    fixture.detectChanges();

    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('.coach-mark-scrim')).not.toBeNull();
    expect(nativeElement.querySelector('.coach-mark-spotlight')).toBeNull();
    expect(
      query('coach-mark-card')?.classList.contains('coach-mark-card-centered'),
    ).toBe(true);
  });

  it('reports zeroed spotlight geometry when there is no anchor', () => {
    fixture.detectChanges();

    // With no anchor the geometry collapses to just the padding; the spotlight
    // is not rendered, but the fallbacks must stay defined.
    expect(component.spotlightTop()).toBe(-8);
    expect(component.spotlightLeft()).toBe(-8);
    expect(component.spotlightWidth()).toBe(16);
    expect(component.spotlightHeight()).toBe(16);
  });

  it('treats an unknown viewport height as zero when placing the card', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 0,
      configurable: true,
    });
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 10, height: 5, bottom: 15 }),
    );

    fixture.detectChanges();

    // A zero viewport height makes any anchor count as "near the bottom", so the
    // card lifts above rather than dropping off an unknown-height screen.
    expect(component.cardAbove()).toBe(true);
  });

  it('drops the card below an anchor near the top of the viewport', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 100, height: 40, bottom: 140 }),
    );

    fixture.detectChanges();

    expect(component.cardAbove()).toBe(false);
    // Anchor bottom (140) + 16px gap.
    expect(component.cardTop()).toBe(156);
  });

  it('lifts the card above an anchor near the bottom of the viewport', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 700, height: 40, bottom: 740 }),
    );

    fixture.detectChanges();

    expect(component.cardAbove()).toBe(true);
    // Anchor top (700) - 16px gap - the card's own height (0 in jsdom).
    expect(component.cardTop()).toBe(684);
  });

  it('keeps the card on screen when the anchor sits below the fold', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    stubCardHeight(240);
    // An anchor scrolled past the bottom edge would otherwise place the card
    // (and the only dismiss action) off screen entirely.
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 1200, height: 40, bottom: 1240 }),
    );

    fixture.detectChanges();

    // Clamped to viewport (800) - 16px margin - card height (240).
    expect(component.cardTop()).toBe(544);
  });

  it('keeps the card clear of the bottom safe area inset', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    document.documentElement.style.setProperty(
      '--ion-safe-area-bottom',
      '48px',
    );
    stubCardHeight(240);
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 1200, height: 40, bottom: 1240 }),
    );

    fixture.detectChanges();

    // The 48px system bar is excluded from the usable viewport.
    expect(component.cardTop()).toBe(496);

    document.documentElement.style.removeProperty('--ion-safe-area-bottom');
  });

  it('favours the top edge when the card is taller than the viewport', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 300,
      configurable: true,
    });
    stubCardHeight(400);
    fixture.componentRef.setInput(
      'anchor',
      rect({ top: 250, height: 40, bottom: 290 }),
    );

    fixture.detectChanges();

    // Title and body stay readable rather than being pushed off the top.
    expect(component.cardTop()).toBe(16);
  });
});
