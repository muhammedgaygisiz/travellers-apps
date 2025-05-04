import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsContainer } from './details.container';

describe('DetailsComponent', () => {
  let component: DetailsContainer;
  let fixture: ComponentFixture<DetailsContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsContainer],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
