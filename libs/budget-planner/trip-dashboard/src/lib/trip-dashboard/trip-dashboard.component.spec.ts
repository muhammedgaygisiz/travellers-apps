import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripDashboardComponent } from './trip-dashboard.component';

describe('TripDashboardComponent', () => {
  let component: TripDashboardComponent;
  let fixture: ComponentFixture<TripDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TripDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
