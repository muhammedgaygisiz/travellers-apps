import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons } from 'utils';
import { EditRestaurantService } from '../edit-restaurant.service';
import { RestaurantOverviewContainer } from '../restaurant-overview-container.component';

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

describe(RestaurantOverviewContainer.name, () => {
  it('shows the restaurant from the service', () => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: EditRestaurantService,
          useValue: {
            restaurant: signal(undefined),
            guestBitesToLink: { value: signal(undefined) },
            menuBuiltFromBites: { value: signal(undefined) },
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: jest.fn((key: string): string => key),
            config: { reRenderOnLangChange: jest.fn() },
            langChanges$: of(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(RestaurantOverviewContainer);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-restaurant-overview'),
    ).toBeTruthy();
  });
});
