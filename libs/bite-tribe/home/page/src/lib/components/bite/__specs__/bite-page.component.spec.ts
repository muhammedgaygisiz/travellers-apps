import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BitePage } from '../bite-page.component';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { PopoverController } from '@ionic/angular';
import { LikeOptionsPopoverMenuComponent } from '../../like-options-popover-menu/like-options-popover-menu.component';

describe('BitePage', () => {
  let component: BitePage;
  let fixture: ComponentFixture<BitePage>;
  let componentRef: ComponentRef<BitePage>;
  const mockBite = {
    name: 'Test Burger',
    image: 'test-image.jpg',
    place: 'Test Restaurant',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), PopoverController],
    });

    fixture = TestBed.createComponent(BitePage);

    componentRef = fixture.componentRef;
    component = fixture.componentInstance;
    componentRef.setInput('bite', mockBite);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display bite name in card title', () => {
    const titleElement = fixture.debugElement.query(By.css('ion-card-title'));
    expect(titleElement.nativeElement.textContent).toContain(mockBite.name);
  });

  it('should display place in card subtitle', () => {
    const subtitleElement = fixture.debugElement.query(
      By.css('ion-card-subtitle')
    );
    expect(subtitleElement.nativeElement.textContent).toContain(mockBite.place);
  });

  it('should display the bite image', () => {
    const imageElement = fixture.debugElement.query(By.css('img'));
    expect(imageElement.nativeElement.src).toContain(mockBite.image);
  });

  it('should handle null bite input', () => {
    componentRef.setInput('bite', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('-👍');
  });

  it('should handle undefined bite input', () => {
    componentRef.setInput('bite', undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('-👍');
  });

  it('should update view when bite input changes', () => {
    const updatedBite = {
      name: 'New Burger',
      image: 'new-image.jpg',
      place: 'New Restaurant',
    };

    componentRef.setInput('bite', updatedBite);
    fixture.detectChanges();

    const titleElement = fixture.debugElement.query(By.css('ion-card-title'));
    const subtitleElement = fixture.debugElement.query(
      By.css('ion-card-subtitle')
    );
    const imageElement = fixture.debugElement.query(By.css('img'));

    expect(titleElement.nativeElement.textContent).toContain(updatedBite.name);
    expect(subtitleElement.nativeElement.textContent).toContain(
      updatedBite.place
    );
    expect(imageElement.nativeElement.src).toContain(updatedBite.image);
  });

  describe('calcClass', () => {
    it('should return "liked" when user has liked the bite', () => {
      const biteWithLike = {
        ...mockBite,
        likes: [{ userId: 'user123', likeType: 'thumbup' }],
      };
      componentRef.setInput('bite', biteWithLike);
      componentRef.setInput('userId', 'user123');
      fixture.detectChanges();

      expect(component.calcClass()).toBe('liked');
    });

    it('should return empty string when user has not liked the bite', () => {
      const biteWithOtherLike = {
        ...mockBite,
        likes: [{ userId: 'otherUser', likeType: 'thumbup' }],
      };
      componentRef.setInput('bite', biteWithOtherLike);
      componentRef.setInput('userId', 'user123');
      fixture.detectChanges();

      expect(component.calcClass()).toBe('');
    });
  });

  describe('openLikeOptions', () => {
    it('should create and present popover with correct props', async () => {
      // Arrange
      const mockEvent = new MouseEvent('click');
      const createSpy = jest.spyOn(component['popoverController'], 'create');
      const mockPopover = { present: jest.fn() };
      createSpy.mockResolvedValue(mockPopover as any);

      // Act
      await component.openLikeOptions(mockEvent);

      // Assert
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith({
        component: LikeOptionsPopoverMenuComponent,
        event: mockEvent,
        dismissOnSelect: true,
        componentProps: {
          bite: component.bite,
          userId: component.userId,
          likeButtonClick: component.likeButtonClick,
        },
      });
      expect(mockPopover.present).toHaveBeenCalled();
    });
  });
});
