import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeBiteComponent } from './bite.component';

describe('BiteTribeBiteComponent', () => {
  let component: BiteTribeBiteComponent;
  let fixture: ComponentFixture<BiteTribeBiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTribeBiteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTribeBiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
