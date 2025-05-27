import { LikesComponent } from '../likes.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PopoverController } from '@ionic/angular';
import { ComponentRef } from '@angular/core';
import { Bite } from 'model';
import { LikeOptionsPopoverMenuComponent } from '../../like-options-popover-menu/like-options-popover-menu.component';

const mockBite: Bite = {
  id: 'bite1',
  name: 'Test Bite',
  image: 'test-image.jpg',
  place: 'Test Place',
  price: 15.99,
  currency: 'USD',
  position: { longitude: 12.34, latitude: 56.78 } as any,
  distance: '500',
  restaurantId: 'rest1',
  likes: [
    { userId: 'user1', likeType: 'thumbup' },
    { userId: 'user2', likeType: 'drooling' },
  ],
  thumbup: 1,
  drooling: 1,
  mindblown: 0,
  tags: ['spicy', 'vegetarian'],
};

describe('LikesComponent', () => {
  let component: LikesComponent;
  let componentRef: ComponentRef<LikesComponent>;
  let fixture: ComponentFixture<LikesComponent>;
  let popoverControllerMock: jest.Mocked<PopoverController>;
  let popoverMock: any;

  beforeEach(() => {
    popoverMock = {
      present: jest.fn(),
    };

    popoverControllerMock = {
      create: jest.fn().mockResolvedValue(popoverMock),
    } as unknown as jest.Mocked<PopoverController>;

    TestBed.configureTestingModule({
      providers: [
        { provide: PopoverController, useValue: popoverControllerMock },
      ],
    });

    fixture = TestBed.createComponent(LikesComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Set required inputs using setInput method
    componentRef.setInput('bite', mockBite);
    componentRef.setInput('userId', 'user1');
  });

  it('should calculate class correctly for liked bite', () => {
    expect(component.calcClass()).toBe('liked');
  });

  it('should calculate class correctly for non-liked bite', () => {
    componentRef.setInput('userId', 'user3');
    fixture.detectChanges();
    expect(component.calcClass()).toBe('');
  });

  it('should map like types to emojis correctly', () => {
    const emojis = component.getLikeEmojis();
    expect(emojis).toContain('👍');
    expect(emojis).toContain('🤤');
    expect(emojis).toHaveLength(2);
  });

  it('should handle empty likes array', () => {
    const emptyLikesBite = { ...mockBite, likes: [] };
    componentRef.setInput('bite', emptyLikesBite);
    fixture.detectChanges();
    expect(component.getLikeEmojis()).toHaveLength(0);
  });

  it('should handle null likes', () => {
    const nullLikesBite = { ...mockBite, likes: null };
    componentRef.setInput('bite', nullLikesBite);
    fixture.detectChanges();
    expect(component.getLikeEmojis()).toHaveLength(0);
  });

  it('should open like options popover when openLikeOptions is called', async () => {
    const mockEvent = new MouseEvent('click');
    const createSpy = jest.spyOn(component['popoverController'], 'create');

    await component.openLikeOptions(mockEvent);

    expect(createSpy).toHaveBeenCalledWith({
      component: LikeOptionsPopoverMenuComponent,
      event: mockEvent,
      dismissOnSelect: true,
      componentProps: {
        bite: component.bite,
        userId: component.userId,
        likeButtonClick: component.likeButtonClick,
      },
      cssClass: 'like-options-popover',
      alignment: 'center',
      size: 'auto',
      arrow: true,
    });
  });
});
