import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Category } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CategoryEditorComponent } from '../category-editor.component';

addNecessaryIcons();

const PIZZA: Category = {
  id: 'c1',
  title: 'Pizza',
  subtitle: 'Wood-fired',
  items: [],
  extrasBlock: {
    description: 'Toppings',
    extras: [{ id: 'e1', name: 'Olives', price: 1.5 }],
  },
};

/** See GitHub issue #2182. */
describe(CategoryEditorComponent.name, () => {
  const setup = (
    category: Category | undefined,
  ): {
    fixture: ComponentFixture<CategoryEditorComponent>;
    component: CategoryEditorComponent;
  } => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    const fixture = TestBed.createComponent(CategoryEditorComponent);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('currency', 'CHF');
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance };
  };

  it('shows the category’s title and subtitle', () => {
    const { component } = setup(PIZZA);

    expect(component.form.getRawValue()).toEqual({
      title: 'Pizza',
      subtitle: 'Wood-fired',
    });
  });

  it('saves the title and subtitle the owner typed', () => {
    const { component } = setup(PIZZA);
    const saved = jest.fn();
    component.save.subscribe(saved);

    component.form.patchValue({ title: 'Pizze', subtitle: '' });
    component.saveCategory();

    expect(saved).toHaveBeenCalledWith({ title: 'Pizze', subtitle: '' });
  });

  it('saves no category without a title', () => {
    const { component } = setup(undefined);
    const saved = jest.fn();
    component.save.subscribe(saved);

    component.saveCategory();

    expect(saved).not.toHaveBeenCalled();
    expect(component.form.controls.title.touched).toBe(true);
  });

  it('shows the extras of a category that exists, and passes their changes on', () => {
    const { fixture, component } = setup(PIZZA);
    const extras = jest.fn();
    component.saveExtras.subscribe(extras);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('business-category-extras')).toBeTruthy();

    const block = { description: 'Toppings', extras: [] };
    component.saveExtras.emit(block);
    expect(extras).toHaveBeenCalledWith(block);
  });

  it('offers no extras on a category that does not exist yet', () => {
    const { fixture } = setup(undefined);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'business-category-extras',
      ),
    ).toBeNull();
  });

  it('lets the owner leave without saving', () => {
    const { fixture, component } = setup(PIZZA);
    const cancelled = jest.fn();
    component.cancelEdit.subscribe(cancelled);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="cancel-category"]')
      ?.click();

    expect(cancelled).toHaveBeenCalled();
  });
});
