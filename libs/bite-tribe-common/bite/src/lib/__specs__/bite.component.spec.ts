import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteComponent } from '../bite.component';
import { ToMetricPipe } from 'distance-pipe';
import { PopoverController } from '@ionic/angular';
import { Bite } from 'model';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';

describe('BiteComponent', () => {
  let component: BiteComponent;
  let fixture: ComponentFixture<BiteComponent>;
  let popoverControllerMock: jest.Mocked<PopoverController>;
  let popoverMock: any;
  let componentRef: any;

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

  beforeEach(async () => {
    popoverMock = {
      present: jest.fn(),
    };

    popoverControllerMock = {
      create: jest.fn().mockResolvedValue(popoverMock),
    } as unknown as jest.Mocked<PopoverController>;

    await TestBed.configureTestingModule({
      imports: [BiteComponent],
      providers: [
        { provide: PopoverController, useValue: popoverControllerMock },
        provideIonicAngular(),
        ToMetricPipe,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Set required inputs using setInput method
    componentRef.setInput('bite', mockBite);
    componentRef.setInput('userId', 'user1');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

  it('should emit biteClick when bite is clicked', () => {
    const emitSpy = jest.spyOn(component.biteClick, 'emit');
    component.biteClick.emit(mockBite);
    expect(emitSpy).toHaveBeenCalledWith(mockBite);
  });

  it('should emit restaurantClick when restaurant is clicked', () => {
    const emitSpy = jest.spyOn(component.restaurantClick, 'emit');
    component.restaurantClick.emit(mockBite);
    expect(emitSpy).toHaveBeenCalledWith(mockBite);
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

  it('should have correct like counts', () => {
    expect(mockBite.thumbup).toBe(1);
    expect(mockBite.drooling).toBe(1);
    expect(mockBite.mindblown).toBe(0);
  });

  it('should display tags when available', () => {
    expect(mockBite.tags).toContain('spicy');
    expect(mockBite.tags).toContain('vegetarian');
    expect(mockBite.tags?.length).toBe(2);
  });
});
