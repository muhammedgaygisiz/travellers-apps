import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PricesLocalizationComponent } from './prices-localization.component';

describe('PricesLocalizationComponent', () => {
  let component: PricesLocalizationComponent;
  let fixture: ComponentFixture<PricesLocalizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricesLocalizationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PricesLocalizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
