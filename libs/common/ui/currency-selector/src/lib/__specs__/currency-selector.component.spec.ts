import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencySelectorComponent } from '../currency-selector.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

describe('CurrencySelectorComponent', () => {
  let component: CurrencySelectorComponent;
  let fixture: ComponentFixture<CurrencySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencySelectorComponent],
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrencySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all currencies when no search term', () => {
    expect(component.filteredCurrencies().length).toBeGreaterThan(0);
  });

  it('should filter currencies based on search term', () => {
    component.rawSearchTerm.set('usd');
    const filtered = component.filteredCurrencies();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((c) => c.code === 'USD')).toBeTruthy();
  });

  it('should emit currencySelected when currency is selected', () => {
    let selectedCode = '';
    component.currencySelected.subscribe((code) => {
      selectedCode = code;
    });

    component.selectCurrency('EUR');
    expect(selectedCode).toBe('EUR');
  });

  it('should emit selectionCancel when cancel is called', () => {
    let cancelled = false;
    component.selectionCancel.subscribe(() => {
      cancelled = true;
    });

    component.cancel();
    expect(cancelled).toBeTruthy();
  });
});
