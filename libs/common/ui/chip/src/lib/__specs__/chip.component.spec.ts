import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addIcons } from 'ionicons';
import { closeCircle } from 'ionicons/icons';
import { ChipComponent } from '../chip.component';

addIcons({
  closeCircle,
});

describe(ChipComponent.name, () => {
  let component: ChipComponent;
  let fixture: ComponentFixture<ChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'chicken');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the label', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('chicken');
  });

  it('should emit chipClick when the chip is clicked', () => {
    const emitSpy = jest.spyOn(component.chipClick, 'emit');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('ion-chip').click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should emit removeClick without emitting chipClick from the remove icon', () => {
    const chipClickSpy = jest.spyOn(component.chipClick, 'emit');
    const removeClickSpy = jest.spyOn(component.removeClick, 'emit');
    fixture.componentRef.setInput('removable', true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.remove-icon').click();

    expect(removeClickSpy).toHaveBeenCalled();
    expect(chipClickSpy).not.toHaveBeenCalled();
  });
});
