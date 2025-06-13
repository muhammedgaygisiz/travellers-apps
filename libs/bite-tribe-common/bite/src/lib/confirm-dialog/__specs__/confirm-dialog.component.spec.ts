import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from '../confirm-dialog.component';
import { DialogRef } from '@angular/cdk/dialog';
import { IonButton } from '@ionic/angular/standalone';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: jest.Mocked<DialogRef<string>>;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<DialogRef<string>>;

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, IonButton],
      providers: [
        {
          provide: DialogRef,
          useValue: mockDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render confirmation message', () => {
    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent).toContain(
      'Are you sure you want to delete this bite?'
    );
  });

  it('should render two buttons for confirmation and cancellation', () => {
    const buttons = fixture.nativeElement.querySelectorAll('ion-button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('Yes');
    expect(buttons[1].textContent.trim()).toBe('No');
  });

  describe('button interactions', () => {
    it('should close dialog with "confirm" when confirm button is clicked', () => {
      const confirmButton = fixture.nativeElement.querySelector('ion-button');
      confirmButton.click();

      expect(mockDialogRef.close).toHaveBeenCalledWith('confirm');
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('should close dialog with "cancel" when cancel button is clicked', () => {
      const buttons = fixture.nativeElement.querySelectorAll('ion-button');
      const cancelButton = buttons[1];
      cancelButton.click();

      expect(mockDialogRef.close).toHaveBeenCalledWith('cancel');
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('dialog methods', () => {
    it('should call dialogRef.close with "confirm" when onConfirm is called', () => {
      component.onConfirm();
      expect(mockDialogRef.close).toHaveBeenCalledWith('confirm');
    });

    it('should call dialogRef.close with "cancel" when onCancel is called', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith('cancel');
    });
  });
});
