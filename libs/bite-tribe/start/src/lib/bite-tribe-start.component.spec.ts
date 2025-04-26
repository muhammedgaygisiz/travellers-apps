import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeStartComponent } from './bite-tribe-start.component';
import { provideRouter } from '@angular/router';

describe('BiteTribeStartComponent', () => {
  let component: BiteTribeStartComponent;
  let fixture: ComponentFixture<BiteTribeStartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(BiteTribeStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
