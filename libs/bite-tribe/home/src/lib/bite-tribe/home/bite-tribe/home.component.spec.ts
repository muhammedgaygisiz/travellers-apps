import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeHomeComponent } from './home.component';

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTribeHomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTribeHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
