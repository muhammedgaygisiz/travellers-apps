import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { CoachMarkComponent } from '../coach-mark.component';
import { CoachMarkStateService } from '../coach-mark-state.service';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

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

/** Element whose layout box is stubbed, since jsdom reports zeros otherwise. */
const anchorElement = (box: Partial<DOMRect>): HTMLElement => {
  const element = document.createElement('div');
  element.getBoundingClientRect = (): DOMRect => rect(box);
  return element;
};

describe(CoachMarkComponent.name, () => {
  let fixture: ComponentFixture<CoachMarkComponent>;
  let hasSeen: jest.Mock;
  let markSeen: jest.Mock;

  const overlay = (): HTMLElement | null =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      'lib-coach-mark-overlay',
    );

  const setup = (): void => {
    hasSeen = jest.fn().mockResolvedValue(false);
    markSeen = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [CoachMarkComponent],
      providers: [
        { provide: CoachMarkStateService, useValue: { hasSeen, markSeen } },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachMarkComponent);
    fixture.componentRef.setInput('surface', 'map');
    fixture.componentRef.setInput('titleKey', 'coach-map-title');
    fixture.componentRef.setInput('bodyKey', 'coach-map-body');
  };

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  afterEach(() => jest.clearAllMocks());

  it('shows the overlay on first visit of an unseen surface', async () => {
    setup();
    fixture.componentRef.setInput(
      'anchor',
      anchorElement({ top: 100, left: 20, width: 80, height: 40, bottom: 140 }),
    );

    await settle();

    expect(hasSeen).toHaveBeenCalledWith('map');
    expect(overlay()).not.toBeNull();
  });

  it('measures the anchor and passes its rect to the overlay', async () => {
    setup();
    fixture.componentRef.setInput(
      'anchor',
      anchorElement({ top: 100, left: 20, width: 80, height: 40, bottom: 140 }),
    );

    await settle();

    expect(fixture.componentInstance['anchorRect']()?.top).toBe(100);
  });

  it('stays hidden for a surface already dismissed, but still settles the queue', async () => {
    setup();
    hasSeen.mockResolvedValue(true);
    const settled = jest.fn();
    fixture.componentInstance.settled.subscribe(settled);

    await settle();

    expect(overlay()).toBeNull();
    // A returning user's next mark must still be allowed to proceed.
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('records the surface as seen and emits on dismissal', async () => {
    setup();
    const dismissed = jest.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    await settle();
    (fixture.debugElement.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="coach-mark-dismiss"]')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(markSeen).toHaveBeenCalledWith('map');
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(overlay()).toBeNull();
  });

  it('settles after the user dismisses the mark', async () => {
    setup();
    const settled = jest.fn();
    fixture.componentInstance.settled.subscribe(settled);

    await settle();
    (fixture.debugElement.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="coach-mark-dismiss"]')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('holds a mark back until it is enabled', async () => {
    setup();
    fixture.componentRef.setInput('enabled', false);

    await settle();
    expect(hasSeen).not.toHaveBeenCalled();
    expect(overlay()).toBeNull();

    fixture.componentRef.setInput('enabled', true);
    await settle();

    expect(hasSeen).toHaveBeenCalledWith('map');
    expect(overlay()).not.toBeNull();
  });

  it('scrolls an anchor below the fold into view before measuring it', async () => {
    setup();
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    const element = anchorElement({
      top: 1200,
      left: 20,
      width: 80,
      height: 40,
      bottom: 1240,
    });
    const scrollIntoView = jest.fn(() => {
      // The scroll brings the control into the middle of the viewport.
      element.getBoundingClientRect = (): DOMRect =>
        rect({ top: 380, left: 20, width: 80, height: 40, bottom: 420 });
    });
    element.scrollIntoView = scrollIntoView;
    fixture.componentRef.setInput('anchor', element);

    await settle();

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
    });
    // The overlay must spotlight where the control ended up, not where it was.
    expect(fixture.componentInstance['anchorRect']()?.top).toBe(380);
  });

  it('leaves an already visible anchor where it is', async () => {
    setup();
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    const element = anchorElement({
      top: 100,
      left: 20,
      width: 80,
      height: 40,
      bottom: 140,
    });
    const scrollIntoView = jest.fn();
    element.scrollIntoView = scrollIntoView;
    fixture.componentRef.setInput('anchor', element);

    await settle();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('falls back to a chrome-owned anchor looked up by test id', async () => {
    setup();
    const chromeAnchor = anchorElement({
      top: 200,
      left: 40,
      width: 56,
      height: 56,
      bottom: 256,
    });
    chromeAnchor.setAttribute('data-testid', 'chrome-add-button');
    document.body.appendChild(chromeAnchor);
    fixture.componentRef.setInput('anchorTestId', 'chrome-add-button');

    await settle();

    expect(fixture.componentInstance['anchorRect']()?.top).toBe(200);

    chromeAnchor.remove();
  });
});
