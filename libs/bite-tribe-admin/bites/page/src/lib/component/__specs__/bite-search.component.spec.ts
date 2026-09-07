import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchBite } from 'model';
import { BiteSearchComponent } from '../bite-search.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

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
      providers: [provideIonicAngular(), provideRouter([])],
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
