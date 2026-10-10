import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import type { FollowSuggestion } from 'model';
import { of } from 'rxjs';
import { FollowSuggestionsComponent } from '../follow-suggestions.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const ana: FollowSuggestion = {
  userId: 'ana',
  displayName: 'Ana',
  photoUrl: 'https://example.com/ana.jpg',
  biteCount: 4,
  reason: 'nearby',
};
const ben: FollowSuggestion = {
  userId: 'ben',
  displayName: 'Ben',
  biteCount: 2,
  reason: 'active',
};

describe(FollowSuggestionsComponent.name, () => {
  let fixture: ComponentFixture<FollowSuggestionsComponent>;

  const root = (): HTMLElement =>
    fixture.debugElement.nativeElement as HTMLElement;
  const all = (testId: string): HTMLElement[] => [
    ...root().querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`),
  ];

  const render = async (
    inputs: Partial<Record<keyof FollowSuggestionsComponent, unknown>>,
  ): Promise<void> => {
    Object.entries(inputs).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FollowSuggestionsComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FollowSuggestionsComponent);
  });

  it('renders nothing when there is nobody to suggest', async () => {
    await render({ suggestions: [] });

    expect(all('follow-suggestions')).toHaveLength(0);
  });

  it('renders a card per person', async () => {
    await render({ suggestions: [ana, ben] });

    expect(
      all('follow-suggestion').map((card) => card.dataset['userId']),
    ).toEqual(['ana', 'ben']);
  });

  it('draws placeholders while loading', async () => {
    await render({ loading: true });

    expect(all('follow-suggestions')).toHaveLength(1);
    expect(all('follow-suggestion')).toHaveLength(0);
    expect(root().querySelectorAll('ion-skeleton-text').length).toBeGreaterThan(
      0,
    );
  });

  it('emits the person whose Follow was tapped', async () => {
    const followed: FollowSuggestion[] = [];
    fixture.componentInstance.follow.subscribe((s) => followed.push(s));
    await render({ suggestions: [ana, ben] });

    all('follow-suggestion-follow')[1].click();

    expect(followed).toEqual([ben]);
  });

  it('disables the button of a pending follow', async () => {
    await render({ suggestions: [ana, ben], pendingIds: new Set(['ana']) });

    const [first, second] = all('follow-suggestion-follow');

    expect(first.getAttribute('disabled')).not.toBeNull();
    expect(second.getAttribute('disabled')).toBeNull();
    expect(first.querySelector('ion-spinner')).not.toBeNull();
  });

  it('reports itself shown once, with how many people it showed', async () => {
    const shown: number[] = [];
    fixture.componentInstance.shown.subscribe((count) => shown.push(count));

    await render({ suggestions: [] });
    await render({ suggestions: [ana, ben] });
    await render({ suggestions: [ben] });

    expect(shown).toEqual([2]);
  });

  it('centres only on a surface that asks for it', async () => {
    await render({ suggestions: [ana, ben] });

    const [section] = all('follow-suggestions');

    expect(section.classList).not.toContain('follow-suggestions--centered');

    await render({ centered: true });

    expect(section.classList).toContain('follow-suggestions--centered');
  });

  it('offers a close button only when dismissible', async () => {
    let dismissed = 0;
    fixture.componentInstance.dismiss.subscribe(() => (dismissed += 1));
    await render({ suggestions: [ana] });

    expect(all('follow-suggestions-dismiss')).toHaveLength(0);

    await render({ dismissible: true });
    all('follow-suggestions-dismiss')[0].click();

    expect(dismissed).toBe(1);
  });

  it('opens a profile only when linkable', async () => {
    const opened: string[] = [];
    fixture.componentInstance.openProfile.subscribe((id) => opened.push(id));
    await render({ suggestions: [ana] });

    const person = root().querySelector<HTMLButtonElement>(
      '.follow-suggestions__person',
    );

    expect(person?.disabled).toBe(true);

    await render({ linkable: true });
    person?.click();

    expect(opened).toEqual(['ana']);
  });

  it('falls back to the placeholder icon when a photo fails', async () => {
    await render({ suggestions: [ana] });

    root().querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(root().querySelector('img')).toBeNull();
  });
});
