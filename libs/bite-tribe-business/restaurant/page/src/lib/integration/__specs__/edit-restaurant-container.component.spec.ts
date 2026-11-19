import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { EditRestaurantContainer } from '../edit-restaurant-container.component';
import { EditRestaurantService } from '../edit-restaurant.service';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

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
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ section: 'links' })) },
        },
      ],
    });

    fixture = TestBed.createComponent(EditRestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads the section from the route (#2183)', () => {
    expect(component.section()).toBe('links');
  });
});
