import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { BiteDietaryComponent } from '../bite-dietary.component';

/** The key itself, so a spec can tell which sentence a node shows. */
@Pipe({ name: 'transloco' })
class KeyPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

/** A Bite's dietary labels, each naming its source (GitHub issue #2195). */
describe(BiteDietaryComponent.name, () => {
  let fixture: ComponentFixture<BiteDietaryComponent>;

  const render = (inputs: {
    creatorLabels?: unknown;
    restaurantLabels?: string[];
    restaurantOptions?: string[];
  }): HTMLElement => {
    Object.entries(inputs).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const testIds = (element: HTMLElement, prefix: string): string[] =>
    Array.from(
      element.querySelectorAll(`[data-testid^="${prefix}"]`),
      (node) => node.getAttribute('data-testid') ?? '',
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    TestBed.overrideComponent(BiteDietaryComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [KeyPipe] },
    });

    fixture = TestBed.createComponent(BiteDietaryComponent);
  });

  it("shows the creator's labels as the creator's claim, dropping unknown values", () => {
    const element = render({ creatorLabels: ['vegetarian', 'keto', 'vegan'] });

    expect(testIds(element, 'bite-dietary-creator-label-')).toEqual([
      'bite-dietary-creator-label-vegan',
      'bite-dietary-creator-label-vegetarian',
    ]);
    expect(
      element.querySelector('[data-testid="bite-dietary-creator-source"]')
        ?.textContent,
    ).toContain('dietary-claimed-by-creator');
    expect(
      element.querySelector('[data-testid="bite-dietary-restaurant"]'),
    ).toBeNull();
  });

  it('shows both sources side by side, and neither replaces the other', () => {
    const element = render({
      creatorLabels: ['vegan'],
      restaurantLabels: ['vegan', 'halal'],
      restaurantOptions: ['gluten-free', 'halal'],
    });

    expect(testIds(element, 'bite-dietary-creator-label-')).toEqual([
      'bite-dietary-creator-label-vegan',
    ]);
    expect(testIds(element, 'bite-dietary-restaurant-label-')).toEqual([
      'bite-dietary-restaurant-label-vegan',
      'bite-dietary-restaurant-label-halal',
    ]);
    expect(testIds(element, 'bite-dietary-restaurant-option-')).toEqual([
      'bite-dietary-restaurant-option-gluten-free',
    ]);
    expect(
      element.querySelector('[data-testid="bite-dietary-restaurant-source"]')
        ?.textContent,
    ).toContain('dietary-declared-by-restaurant');
  });

  it('adds the notice to a high-risk label only the creator claims', () => {
    const notice = (element: HTMLElement): Element | null =>
      element.querySelector('[data-testid="bite-dietary-notice"]');

    expect(notice(render({ creatorLabels: ['vegan'] }))).toBeNull();
    expect(
      notice(render({ creatorLabels: ['vegan', 'nut-free'] }))?.textContent,
    ).toContain('dietary-confirm-with-restaurant');
    // The restaurant declares it too, so the creator is not its only source.
    expect(
      notice(
        render({
          creatorLabels: ['vegan', 'nut-free'],
          restaurantLabels: ['nut-free'],
        }),
      ),
    ).toBeNull();
  });

  it('renders nothing when neither source has a label', () => {
    const element = render({ creatorLabels: undefined });

    expect(element.querySelector('.dietary')).toBeNull();
  });
});
