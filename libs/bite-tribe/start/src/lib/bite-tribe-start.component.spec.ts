import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeStartComponent } from './bite-tribe-start.component';

describe('BiteTribeStartComponent', () => {
  let component: BiteTribeStartComponent;
  let fixture: ComponentFixture<BiteTribeStartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTribeStartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTribeStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
