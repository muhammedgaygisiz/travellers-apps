import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { HomeMapContainerComponent } from '../home-map-container.component';
import { MapService } from '../map.service';
import { CoachMarkStateService } from 'bite-tribe/coach-mark';

jest.mock('leaflet');
jest.mock('leaflet.markercluster');
jest.mock('leaflet-usermarker');

addNecessaryIcons();

class Mock {}

describe('HomeMapContainerComponent', () => {
  let component: HomeMapContainerComponent;
  let fixture: ComponentFixture<HomeMapContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: MapService,
          useValue: Mock,
        },
        {
          provide: CoachMarkStateService,
          useValue: {
            hasSeen: jest.fn().mockResolvedValue(true),
            markSeen: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(HomeMapContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
