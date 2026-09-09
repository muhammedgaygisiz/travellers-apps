import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { SearchBite } from 'model';
import { BiteSearchComponent } from '../bite-search.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

/** The confirmation dialog resolves its own copy, so the service is needed too. */
const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const bite = (over: Partial<SearchBite> = {}): SearchBite => ({
  id: 'b1',
  name: 'Ramen',
  place: 'Noodle Bar',
  ...over,
});

describe(BiteSearchComponent.name, () => {
  let component: BiteSearchComponent;
  let fixture: ComponentFixture<BiteSearchComponent>;
  let ref: ComponentRef<BiteSearchComponent>;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const textOf = (testId: string): string =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)
      ?.textContent ?? '';

  beforeEach(() => {
    // `ta-page` renders an `ion-back-button` here, which injects the Router.
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(BiteSearchComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BiteSearchComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    fixture.detectChanges();
  });

  it('lists the Bites it is given', () => {
    setInputs({ results: [bite(), bite({ id: 'b2', name: 'Gyoza' })] });

    expect(textOf('admin-bite-results')).toContain('Ramen');
    expect(textOf('admin-bite-results')).toContain('Gyoza');
  });

  it('emits the term when the search is submitted', () => {
    const emitted: string[] = [];
    component.searchSubmit.subscribe((term) => emitted.push(term));

    component.onTermChange('  ramen  ');
    component.onSearch();

    expect(emitted).toEqual(['ramen']);
  });

  describe('the Bite image', () => {
    const imageOf = (): HTMLImageElement | null =>
      fixture.nativeElement.querySelector('[data-testid="admin-bite-image"]');

    // On an improper Bite the image is usually the thing that has to be judged:
    // no text field answers "is this food" (issue #1475).
    it('shows the uploaded image of the selected Bite', () => {
      const selected = bite({ imagePath: 'https://example.test/ramen.jpg' });
      setInputs({ results: [selected], selected });

      expect(imageOf()?.getAttribute('src')).toBe(
        'https://example.test/ramen.jpg',
      );
    });

    // `image` is the base64 copy a Bite still carries while its upload is
    // pending or after one failed, and an operator has to be able to judge that
    // Bite too.
    it('falls back to the base64 copy when there is no uploaded path', () => {
      const selected = bite({ image: 'data:image/jpeg;base64,AAAA' });
      setInputs({ results: [selected], selected });

      expect(imageOf()?.getAttribute('src')).toBe(
        'data:image/jpeg;base64,AAAA',
      );
    });

    it('prefers the uploaded path over the base64 copy', () => {
      const selected = bite({
        image: 'data:image/jpeg;base64,AAAA',
        imagePath: 'https://example.test/ramen.jpg',
      });
      setInputs({ results: [selected], selected });

      expect(imageOf()?.getAttribute('src')).toBe(
        'https://example.test/ramen.jpg',
      );
    });

    // A Bite with no image and a Bite whose image failed to render look the
    // same otherwise, and only one of them is worth investigating.
    it('says so when the Bite has no image at all', () => {
      const selected = bite();
      setInputs({ results: [selected], selected });

      expect(imageOf()).toBeNull();
      expect(textOf('admin-bite-no-image')).toContain('admin-bites-no-image');
    });
  });

  describe('deleting a Bite', () => {
    const selected = bite();

    const deleteDisabled = (): boolean =>
      fixture.nativeElement.querySelector('[data-testid="admin-bite-delete"]')
        .disabled;

    beforeEach(() => setInputs({ results: [selected], selected }));

    // The callable requires a reason, and a rejected call is a worse way to
    // learn that than a disabled button.
    it('refuses to delete without a reason', () => {
      expect(component.canDelete()).toBe(false);
      expect(deleteDisabled()).toBe(true);
    });

    it.each([['  '], ['\t']])(
      'treats the blank reason %p as none',
      (reason): void => {
        component.onReasonChange(reason);
        fixture.detectChanges();

        expect(component.canDelete()).toBe(false);
      },
    );

    it('allows the delete once a reason is typed', () => {
      component.onReasonChange('Not food');
      fixture.detectChanges();

      expect(component.canDelete()).toBe(true);
      expect(deleteDisabled()).toBe(false);
    });

    it('disables the button while a delete is in flight', () => {
      component.onReasonChange('Not food');
      setInputs({ deleting: true });

      expect(deleteDisabled()).toBe(true);
    });

    // The deletion is irreversible, so it goes through a confirmation rather
    // than firing on the click.
    it('confirms before emitting anything', async () => {
      const emitted: unknown[] = [];
      component.deleteBite.subscribe((value) => emitted.push(value));
      const alert = { present: jest.fn().mockResolvedValue(undefined) };
      const create = jest
        .spyOn(component['alertController'], 'create')
        .mockResolvedValue(alert as never);
      component.onReasonChange('Not food');

      await component.onDelete();

      expect(create).toHaveBeenCalled();
      expect(alert.present).toHaveBeenCalled();
      expect(emitted).toEqual([]);
    });

    it('emits the id and the trimmed reason when the confirmation is accepted', async () => {
      const emitted: unknown[] = [];
      component.deleteBite.subscribe((value) => emitted.push(value));
      jest.spyOn(component['alertController'], 'create').mockImplementation(
        (options): never =>
          ({
            present: async (): Promise<void> => {
              const confirm = options?.buttons?.find(
                (button) =>
                  typeof button !== 'string' && button.role === 'destructive',
              );

              if (typeof confirm !== 'string') {
                confirm?.handler?.({});
              }
            },
          }) as never,
      );
      component.onReasonChange('  Not food  ');

      await component.onDelete();

      expect(emitted).toEqual([{ biteId: 'b1', reason: 'Not food' }]);
    });

    it('does not open the confirmation when there is no reason', async () => {
      const create = jest.spyOn(component['alertController'], 'create');

      await component.onDelete();

      expect(create).not.toHaveBeenCalled();
    });
  });

  // A reason typed for one Bite must not be submittable against another — the
  // log entry is the only record the deletion leaves.
  describe('the reason and the target', () => {
    it('clears the reason when another Bite is selected', () => {
      setInputs({ results: [bite(), bite({ id: 'b2' })], selected: bite() });
      component.onReasonChange('Not food');

      component.onSelect(bite({ id: 'b2' }));

      expect(component.reason()).toBe('');
    });

    it('clears the reason when a new search runs', () => {
      component.onTermChange('ramen');
      component.onReasonChange('Not food');

      component.onSearch();

      expect(component.reason()).toBe('');
    });
  });

  it('emits the Bite that was clicked', () => {
    const emitted: SearchBite[] = [];
    component.selectBite.subscribe((value) => emitted.push(value));
    const target = bite();
    setInputs({ results: [target] });

    fixture.nativeElement
      .querySelector('[data-testid="admin-bite-results"] ion-item')
      .click();

    expect(emitted).toEqual([target]);
  });

  it('shows no detail until a Bite is selected', () => {
    setInputs({ results: [bite()] });

    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-bite-detail"]'),
    ).toBeNull();
  });

  it('shows what BiteTribe holds about the selected Bite', () => {
    setInputs({
      results: [bite()],
      selected: bite({
        description: 'Tonkotsu, extra egg',
        tags: ['ramen', 'japanese'],
      }),
    });

    const detail = textOf('admin-bite-detail');
    expect(detail).toContain('b1');
    expect(detail).toContain('Noodle Bar');
    expect(detail).toContain('Tonkotsu, extra egg');
    expect(detail).toContain('japanese');
  });

  // The minimum is the callable's and applies to every caller. An empty result
  // list for a two-character term reads as "no such Bite".
  describe('the callable minimum', () => {
    it.each([['r'], ['ra']])('refuses to search for %p', (term) => {
      const emitted: string[] = [];
      component.searchSubmit.subscribe((value) => emitted.push(value));

      component.onTermChange(term);
      component.onSearch();

      expect(component.canSearch()).toBe(false);
      expect(emitted).toEqual([]);
    });

    it('says the term is too short rather than showing nothing', () => {
      component.onTermChange('ra');
      fixture.detectChanges();

      expect(textOf('admin-bite-hint')).toContain('admin-bites-too-short');
    });

    it('says nothing about the length before anything is typed', () => {
      expect(component.tooShort()).toBe(false);
    });
  });

  describe('an empty result list', () => {
    // The two mean opposite things and render identically without this.
    it('invites a search before one has run', () => {
      setInputs({ results: [], searched: false });

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-bite-no-results"]',
        ),
      ).toBeNull();
    });

    it('reports no match after one has run', () => {
      setInputs({ results: [], searched: true });

      expect(textOf('admin-bite-no-results')).toContain(
        'admin-bites-no-results',
      );
    });

    // A failed search is not an absent Bite, and an operator acting on a report
    // must not conclude one from the other.
    it('reports a failure as a failure, not as no match', () => {
      setInputs({ results: [], searched: true, failed: true });

      expect(textOf('admin-bite-failed')).toContain(
        'admin-bites-search-failed',
      );
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-bite-no-results"]',
        ),
      ).toBeNull();
    });
  });

  // A truncated answer and a complete one look identical otherwise.
  describe('the callable result cap', () => {
    const manyBites = (count: number): SearchBite[] =>
      Array.from({ length: count }, (_unused, index) =>
        bite({ id: `b${index}`, name: `Bite ${index}` }),
      );

    it('says so when the results fill the cap', () => {
      setInputs({ results: manyBites(20), searched: true });

      expect(textOf('admin-bite-cap')).toContain('admin-bites-capped');
    });

    it('stays quiet when they do not', () => {
      setInputs({ results: manyBites(19), searched: true });

      expect(
        fixture.nativeElement.querySelector('[data-testid="admin-bite-cap"]'),
      ).toBeNull();
    });
  });
});
