import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { DIETARY_LABELS, type DietaryLabel } from 'model';
import { DietaryLabelPickerComponent } from '../dietary-label-picker.component';

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

/** The Bite form's dietary label chips (GitHub issue #2195). */
describe(DietaryLabelPickerComponent.name, () => {
  let fixture: ComponentFixture<DietaryLabelPickerComponent>;
  let component: DietaryLabelPickerComponent;
  let emitted: DietaryLabel[][];

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const select = (labels: unknown[]): void => {
    fixture.componentRef.setInput('selected', labels);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    TestBed.overrideComponent(DietaryLabelPickerComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [KeyPipe] },
    });

    fixture = TestBed.createComponent(DietaryLabelPickerComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.selectedChange.subscribe((labels) => emitted.push(labels));
    fixture.detectChanges();
  });

  it('offers one chip per label of the vocabulary', () => {
    const chips = Array.from(
      element().querySelectorAll('[data-testid^="bite-dietary-label-"]'),
      (chip) => chip.getAttribute('data-testid'),
    );

    expect(chips).toEqual(
      DIETARY_LABELS.map((label) => `bite-dietary-label-${label}`),
    );
  });

  it('adds a label in vocabulary order, and takes it off again', () => {
    select(['halal']);

    component.toggle('vegan');
    component.toggle('halal');

    expect(emitted).toEqual([['vegan', 'halal'], []]);
  });

  it('marks the picked labels, ignoring a value the vocabulary does not know', () => {
    select(['vegan', 'keto']);

    expect(component.isSelected('vegan')).toBe(true);
    expect(component.isSelected('halal')).toBe(false);

    component.toggle('halal');

    expect(emitted).toEqual([['vegan', 'halal']]);
  });

  it('shows the confirm-with-the-restaurant notice only while a high-risk label is picked', () => {
    const notice = (): Element | null =>
      element().querySelector('[data-testid="bite-dietary-labels-notice"]');

    select(['vegan']);
    expect(notice()).toBeNull();

    select(['vegan', 'gluten-free']);
    expect(notice()?.textContent).toContain('dietary-confirm-with-restaurant');
  });
});
