import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { EditRestaurantContainer } from '../edit-restaurant-container.component';
import { EditRestaurantService } from '../edit-restaurant.service';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(EditRestaurantContainer.name, () => {
  let component: EditRestaurantContainer;
  let fixture: ComponentFixture<EditRestaurantContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: EditRestaurantService,
          useValue: {},
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(EditRestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
