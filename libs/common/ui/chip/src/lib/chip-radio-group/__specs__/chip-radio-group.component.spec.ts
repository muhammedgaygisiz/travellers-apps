import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipRadioGroupComponent } from '../chip-radio-group.component';

describe(ChipRadioGroupComponent.name, () => {
  let component: ChipRadioGroupComponent;
  let fixture: ComponentFixture<ChipRadioGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipRadioGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipRadioGroupComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', [
      { label: 'User', value: 'user' },
      { label: 'Bite', value: 'bite' },
    ]);
    fixture.componentRef.setInput('selectedValue', 'user');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render options with radio state', () => {
    fixture.detectChanges();

    const radios = fixture.nativeElement.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('User');
    expect(fixture.nativeElement.textContent).toContain('Bite');
  });

  it('should emit valueChange when an option is clicked', () => {
    const emitSpy = jest.spyOn(component.valueChange, 'emit');
    fixture.detectChanges();

    fixture.nativeElement.querySelectorAll('ion-chip')[1].click();

    expect(emitSpy).toHaveBeenCalledWith('bite');
  });
});
