import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrail } from './bite-trail';

describe('BiteTrail', () => {
  let component: BiteTrail;
  let fixture: ComponentFixture<BiteTrail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrail],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
