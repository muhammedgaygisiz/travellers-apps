import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { Restaurant } from 'model';
import { addNecessaryIcons, APP_TITLE } from 'utils';
import { RestaurantPhotos } from '../restaurant-photos';

addNecessaryIcons();

const RESTAURANTS = [
  {
    id: 'r-1',
    name: 'Osteria Vecchia',
    address: { city: 'Napoli', country: 'Italy' },
  },
  { id: 'r-2', name: 'Sakura Kitchen', ownerUserIds: ['owner-1'] },
] as Restaurant[];

/** The worklist of restaurants with no photo (GitHub issue #1510). */
describe(RestaurantPhotos.name, () => {
  let fixture: ComponentFixture<RestaurantPhotos>;
  let component: RestaurantPhotos;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
        {
          provide: TranslocoService,
          useValue: {
            translate: jest.fn((key: string) => key),
            config: { reRenderOnLangChange: jest.fn() },
            langChanges$: of(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RestaurantPhotos);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('restaurants', RESTAURANTS);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('lists each restaurant without a photo', () => {
    expect(
      el().querySelector('[data-testid="restaurant-photos-r-1"]'),
    ).toBeTruthy();
    expect(
      el().querySelector('[data-testid="restaurant-photos-r-2"]'),
    ).toBeTruthy();
  });

  it('says when every restaurant has a photo', () => {
    fixture.componentRef.setInput('restaurants', []);
    fixture.detectChanges();

    expect(
      el().querySelector('[data-testid="restaurant-photos-empty"]'),
    ).toBeTruthy();
  });

  it('attaches the chosen photo to the chosen restaurant', () => {
    const attached = jest.fn();
    component.attach.subscribe(attached);

    el()
      .querySelector<HTMLElement>('[data-testid="restaurant-photos-r-1"]')
      ?.click();
    fixture.detectChanges();
    expect(
      el().querySelector('[data-testid="restaurant-photos-attach"]'),
    ).toBeTruthy();

    component.submit();
    expect(attached).not.toHaveBeenCalled();

    component.photo.setValue('data:image/png;base64,x');
    component.submit();
    expect(attached).toHaveBeenCalledWith({
      restaurantId: 'r-1',
      photo: 'data:image/png;base64,x',
    });
  });

  it('sends nothing while an attach is running', () => {
    const attached = jest.fn();
    component.attach.subscribe(attached);
    component.select(RESTAURANTS[0]);
    component.photo.setValue('photo');
    fixture.componentRef.setInput('attachingId', 'r-1');
    fixture.detectChanges();

    component.submit();

    expect(attached).not.toHaveBeenCalled();
  });

  it('lets go of a restaurant once its photo is published', () => {
    component.select(RESTAURANTS[0]);
    component.photo.setValue('photo');
    fixture.detectChanges();

    fixture.componentRef.setInput('restaurants', [RESTAURANTS[1]]);
    fixture.detectChanges();

    expect(component.selectedId()).toBeUndefined();
    expect(component.photo.value).toBeNull();
  });

  it('writes where a restaurant is from its city and country', () => {
    expect(component.placeOf(RESTAURANTS[0])).toBe('Napoli, Italy');
    expect(component.placeOf(RESTAURANTS[1])).toBe('');
  });
});
