import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeShellComponent } from './bite-tribe-shell.component';

describe('BiteTribeShellComponent', () => {
  let component: BiteTribeShellComponent;
  let fixture: ComponentFixture<BiteTribeShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTribeShellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTribeShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
