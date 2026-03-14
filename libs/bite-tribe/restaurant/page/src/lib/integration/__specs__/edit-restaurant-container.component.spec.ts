import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { EditRestaurantContainer } from '../edit-restaurant-container.component';
import { RestaurantService } from '../restaurant.service';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe(EditRestaurantContainer.name, () => {
  let component: EditRestaurantContainer;
  let fixture: ComponentFixture<EditRestaurantContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: RestaurantService,
          useValue: {},
        },
      ],
    });

    fixture = TestBed.createComponent(EditRestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
