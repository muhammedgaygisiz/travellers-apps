import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailComponent } from './bite-trail';

describe('BiteTrail', () => {
  let component: BiteTrailComponent;
  let fixture: ComponentFixture<BiteTrailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
