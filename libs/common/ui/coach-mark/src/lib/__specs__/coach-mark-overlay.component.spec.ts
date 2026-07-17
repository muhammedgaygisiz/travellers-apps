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
    // Anchor top (700) - 16px gap; CSS lifts it by its own height.
    expect(component.cardTop()).toBe(684);
    expect(
      query('coach-mark-card')?.classList.contains('coach-mark-card-above'),
    ).toBe(true);
  });
});
