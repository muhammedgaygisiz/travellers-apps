import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { RestaurantImageComponent } from '../restaurant-image.component';

addNecessaryIcons();

describe('RestaurantImageComponent', () => {
  let component: RestaurantImageComponent;
  let fixture: ComponentFixture<RestaurantImageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(RestaurantImageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
