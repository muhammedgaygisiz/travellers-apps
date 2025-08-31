import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteComponent } from '../bite.component';
import { ToMetricPipe } from 'distance-pipe';
import { Bite, Like } from 'model';
import {
  ComponentRef,
  CUSTOM_ELEMENTS_SCHEMA,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ToBlobUrlPipe } from 'image-compression';

@Pipe({ name: 'toBlobUrl' })
class MockToBlobUrlPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('BiteComponent', () => {
  let component: BiteComponent;
  let componentRef: ComponentRef<BiteComponent>;
  let fixture: ComponentFixture<BiteComponent>;

  const mockBite: Bite = {
    id: 'bite1',
    name: 'Test Bite',
    image: 'test-image.jpg',
    place: 'Test Place',
    price: 15.99,
    currency: 'USD',
    position: { longitude: 12.34, latitude: 56.78 },
    distance: '500',
    restaurantId: 'rest1',
    likes: [
      { userId: 'user1', likeType: 'thumbup' } as Like,
      { userId: 'user2', likeType: 'drooling' } as Like,
    ],
    tags: ['spicy', 'vegetarian'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BiteComponent],
      providers: [provideIonicAngular(), ToMetricPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(BiteComponent, {
      remove: { imports: [ToBlobUrlPipe] },
      add: { imports: [MockToBlobUrlPipe] },
    });

    fixture = TestBed.createComponent(BiteComponent);
    componentRef = fixture.componentRef;
    component = fixture.componentInstance;

    componentRef.setInput('bite', mockBite);
    componentRef.setInput('userId', 'user1');
    componentRef.setInput('showEditButton', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit biteClick when bite is clicked', (done) => {
    component.biteClick.subscribe((emittedBite) => {
      expect(emittedBite).toEqual(mockBite);
      done();
    });

    component.biteClick.emit(mockBite);
  });

  it('should emit restaurantClick when restaurant is clicked', (done) => {
    component.restaurantClick.subscribe((emittedBite) => {
      expect(emittedBite).toEqual(mockBite);
      done();
    });

    component.restaurantClick.emit(mockBite);
  });

  it('should emit likeButtonClick with correct data', (done) => {
    const expectedData = { likeType: 'thumbup', biteId: 'bite1' };

    component.likeButtonClick.subscribe((data) => {
      expect(data).toEqual(expectedData);
      done();
    });

    component.likeButtonClick.emit(expectedData);
  });

  it('should emit gotoEdit when edit is clicked', (done) => {
    component.gotoEdit.subscribe((emittedBite) => {
      expect(emittedBite).toEqual(mockBite);
      done();
    });

    component.gotoEdit.emit(mockBite);
  });

  it('should have correct initial input values', () => {
    expect(component.bite()).toEqual(mockBite);
    expect(component.userId()).toBe('user1');
    expect(component.showEditButton()).toBe(false);
  });

  it('should have correct tags from bite data', () => {
    const tags = component.bite().tags;
    expect(tags).toContain('spicy');
    expect(tags).toContain('vegetarian');
    expect(tags?.length).toBe(2);
  });
});
