import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  Pipe,
  PipeTransform,
  input,
} from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { Geopoint, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { DashboardComponent } from '../dashboard.component';

@Pipe({
  name: 'transloco',
})
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

/**
 * Leaflet needs a real layout box and jsdom gives it none, so the map itself is
 * stubbed. What is asserted here is what the dashboard hands it, and whether it
 * is rendered at all — both of which are this component's decisions.
 */
@Component({
  selector: 'bt-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class MockMapComponent {
  readonly gpsPosition = input<Geopoint | null | undefined>();
  readonly geopoints = input<Geopoint[] | null | undefined>([]);
  readonly enableZoom = input(false);
  readonly readonly = input(false);
}

describe(DashboardComponent.name, () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let compRef: ComponentRef<DashboardComponent>;

  const restaurant = (over: Partial<Restaurant>): Restaurant =>
    ({
      id: 'restaurant-1',
      name: 'Pizza Palace',
      position: { latitude: 46.948, longitude: 7.4474 },
      ...over,
    }) as Restaurant;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    })
      .overrideComponent(DashboardComponent, {
        remove: { imports: [TranslocoPipe, MapComponent] },
        add: { imports: [MockTranslocoPipe, MockMapComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    compRef = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders an entry per section', () => {
    const items = fixture.nativeElement.querySelectorAll(
      '[data-testid="dashboard-sections"] ion-item',
    );

    expect(items).toHaveLength(component.sections.length);
  });

  // Restaurant-candidate verification and the unmatched Bite places are
  // BiteTribe-internal and moved to the admin app with issue #1473. A section
  // for either reappearing here would put them back in front of every
  // restaurant that signs in.
  it('offers a restaurant only its own surfaces', () => {
    expect(component.sections.map((section) => section.path)).toEqual([
      '/bite-trails',
      '/restaurants',
    ]);
  });

  it('emits the section that was clicked', () => {
    const emitSpy = jest.spyOn(component.sectionClick, 'emit');

    fixture.nativeElement
      .querySelectorAll('[data-testid="dashboard-sections"] ion-item')[0]
      .dispatchEvent(new Event('click'));

    expect(emitSpy).toHaveBeenCalledWith(component.sections[0]);
  });

  describe('the map', () => {
    // The one view a list cannot give: where the restaurants are relative to
    // each other and to the device.
    it('marks every restaurant that has a position', () => {
      compRef.setInput('restaurants', [
        restaurant({ id: 'a' }),
        restaurant({
          id: 'b',
          position: { latitude: 52.52, longitude: 13.405 },
        }),
      ]);

      expect(component.restaurantPositions()).toEqual([
        { id: 'a', latitude: 46.948, longitude: 7.4474 },
        { id: 'b', latitude: 52.52, longitude: 13.405 },
      ]);
    });

    // Leaflet reads a missing coordinate as `NaN` and drops the whole layer
    // rather than the one marker, so an unplaceable restaurant takes every
    // other marker with it.
    it('drops a restaurant with no usable position rather than the layer', () => {
      compRef.setInput('restaurants', [
        restaurant({ id: 'placed' }),
        restaurant({ id: 'no-position', position: undefined }),
        restaurant({
          id: 'half-a-position',
          position: { latitude: 46.948 },
        } as Partial<Restaurant>),
      ]);

      expect(component.restaurantPositions().map((point) => point.id)).toEqual([
        'placed',
      ]);
    });

    it('renders once there is a restaurant to show, with no device position', () => {
      compRef.setInput('gpsPosition', null);
      compRef.setInput('restaurants', [restaurant({})]);
      fixture.detectChanges();

      expect(component.showMap()).toBe(true);
      expect(fixture.nativeElement.querySelector('bt-map')).not.toBeNull();
    });

    it('renders on the device position alone', () => {
      compRef.setInput('gpsPosition', { latitude: 46.948, longitude: 7.4474 });
      compRef.setInput('restaurants', []);
      fixture.detectChanges();

      expect(component.showMap()).toBe(true);
    });

    // An empty world map is worse than no map: it reserves the space and shows
    // nothing.
    it('stays hidden with neither', () => {
      compRef.setInput('gpsPosition', null);
      compRef.setInput('restaurants', []);
      fixture.detectChanges();

      expect(component.showMap()).toBe(false);
      expect(fixture.nativeElement.querySelector('bt-map')).toBeNull();
    });
  });
});
