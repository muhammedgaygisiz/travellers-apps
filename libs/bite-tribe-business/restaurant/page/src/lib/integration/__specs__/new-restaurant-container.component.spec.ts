import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { NewRestaurantContainer } from '../new-restaurant-container.component';
import { NewRestaurantService } from '../new-restaurant.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('heic2any', () => jest.fn());
jest.mock('image-compression', () => ({
  compressFile: jest.fn((f: File) => Promise.resolve(f)),
}));

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

describe(NewRestaurantContainer.name, () => {
  let component: NewRestaurantContainer;
  let fixture: ComponentFixture<NewRestaurantContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: NewRestaurantService,
          useValue: {
            restaurantToCreate: signal(undefined),
            googlePlaces: signal([]),
            googlePlacesLoading: signal(false),
            placeDetails: signal(undefined),
            placeDetailsLoading: signal(false),
            submitNewRestaurant: jest.fn(),
            biteClicked: jest.fn(),
            searchPrefillPlaces: jest.fn(),
            searchGooglePlaces: jest.fn(),
            loadPlaceDetails: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(NewRestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
