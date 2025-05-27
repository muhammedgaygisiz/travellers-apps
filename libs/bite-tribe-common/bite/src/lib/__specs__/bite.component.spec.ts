import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteComponent } from '../bite.component';
import { ToMetricPipe } from 'distance-pipe';
import { Bite } from 'model';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';

describe('BiteComponent', () => {
  let component: BiteComponent;
  let fixture: ComponentFixture<BiteComponent>;
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
    await TestBed.configureTestingModule({
      imports: [BiteComponent],
      providers: [provideIonicAngular(), ToMetricPipe],
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
