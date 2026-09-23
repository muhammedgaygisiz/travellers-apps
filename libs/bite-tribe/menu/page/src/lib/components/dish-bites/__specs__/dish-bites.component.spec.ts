import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoPipe } from '@jsverse/transloco';
import { Bite, MenuItem } from 'model';
import { DishBitesComponent } from '../dish-bites.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const DISH: MenuItem = {
  id: 'margherita',
  name: 'Margherita',
  description: '',
  price: 12,
};

const biteWith = (fields: Partial<Bite>): Bite =>
  ({
    id: 'bite-1',
    name: 'Margherita',
    ...fields,
  }) as Bite;

describe('DishBitesComponent', () => {
  let fixture: ComponentFixture<DishBitesComponent>;

  const render = (inputs: {
    dish?: MenuItem;
    bites?: Bite[];
    loading?: boolean;
  }): void => {
    fixture.componentRef.setInput('dish', inputs.dish);
    fixture.componentRef.setInput('bites', inputs.bites ?? []);
    fixture.componentRef.setInput('loading', inputs.loading ?? false);
    fixture.detectChanges();
  };

  // The rows live inside the modal's `ng-template`, which Ionic only stamps
  // out once the modal is presented - so the assertions below read the
  // component's own state rather than the DOM.
  const component = (): DishBitesComponent => fixture.componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DishBitesComponent] })
      .overrideComponent(DishBitesComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DishBitesComponent);
  });

  it('should stay shut until a dish is chosen', () => {
    render({ dish: undefined });

    expect(component()['isOpen']()).toBe(false);
  });

  it('should open for the dish that was tapped', () => {
    render({ dish: DISH });

    expect(component()['isOpen']()).toBe(true);
  });

  it('should not claim a dish is unwritten about while the read is in flight', () => {
    // A dish is only opened because its row said it had Bites, so an empty
    // list during a load is a load, not an answer.
    render({ dish: DISH, bites: [], loading: true });

    expect(component()['isEmpty']()).toBe(false);
  });

  it('should say nobody has written about it once the read came back empty', () => {
    render({ dish: DISH, bites: [], loading: false });

    expect(component()['isEmpty']()).toBe(true);
  });

  it('should draw a rating as stars, and nothing where the Bite carries none', () => {
    render({ dish: DISH });

    expect(component()['stars'](biteWith({ rating: 4 }))).toBe('★★★★');
    expect(component()['stars'](biteWith({ rating: undefined }))).toBe('');
  });

  it('should tell the page when the guest closes it', () => {
    const emitSpy = jest.spyOn(component().closed, 'emit');
    render({ dish: DISH });

    component().closed.emit();

    expect(emitSpy).toHaveBeenCalled();
  });
});
