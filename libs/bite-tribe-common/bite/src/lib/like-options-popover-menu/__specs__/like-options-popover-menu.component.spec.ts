import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonChip } from '@ionic/angular/standalone';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu.component';
import { ComponentRef } from '@angular/core';
import { vi } from 'vitest';

describe('LikeOptionsPopoverMenuComponent', () => {
  let component: LikeOptionsPopoverMenuComponent;
  let fixture: ComponentFixture<LikeOptionsPopoverMenuComponent>;
  let componentRef: ComponentRef<LikeOptionsPopoverMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LikeOptionsPopoverMenuComponent, IonChip],
    }).compileComponents();

    fixture = TestBed.createComponent(LikeOptionsPopoverMenuComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit like event with correct data when bite exists', () => {
    // Arrange
    const mockBite = { id: '123', name: 'Test Bite' };
    const emitSpy = vi.spyOn(component.likeButtonClick, 'emit');
    componentRef.setInput('bite', mockBite);

    // Act
    component.onLikeButtonClicked('thumbup');

    // Assert
    expect(emitSpy).toHaveBeenCalledWith({
      likeType: 'thumbup',
      biteId: '123',
    });
  });

  it('should not emit like event when bite is undefined', () => {
    // Arrange
    const emitSpy = vi.spyOn(component.likeButtonClick, 'emit');
    componentRef.setInput('bite', undefined);

    // Act
    component.onLikeButtonClicked('thumbup');

    // Assert
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should render three ion-chips with emojis', () => {
    // Arrange
    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    // Assert
    expect(chips.length).toBe(3);
    expect(chips[0].textContent).toContain('👍');
    expect(chips[1].textContent).toContain('🤤');
    expect(chips[2].textContent).toContain('🤯');
  });

  it('should emit correct like type for each emoji click', () => {
    // Arrange
    const mockBite = { id: '123', name: 'Test Bite' };
    const emitSpy = vi.spyOn(component.likeButtonClick, 'emit');
    componentRef.setInput('bite', mockBite);
    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    // Act & Assert
    chips[0].click();
    expect(emitSpy).toHaveBeenCalledWith({
      likeType: 'thumbup',
      biteId: '123',
    });

    chips[1].click();
    expect(emitSpy).toHaveBeenCalledWith({
      likeType: 'drooling',
      biteId: '123',
    });

    chips[2].click();
    expect(emitSpy).toHaveBeenCalledWith({
      likeType: 'mindblown',
      biteId: '123',
    });
  });
});
