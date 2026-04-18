import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { HomeMapContainerComponent } from '../home-map-container.component';
import { MapService } from '../map.service';

jest.mock('leaflet');
jest.mock('leaflet.markercluster');

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
      ],
    });

    fixture = TestBed.createComponent(HomeMapContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
