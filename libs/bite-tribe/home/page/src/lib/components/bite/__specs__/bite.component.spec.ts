import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BitePage } from '../bite-page.component';
import { ComponentRef } from '@angular/core';

describe('BiteComponent', () => {
  let component: BitePage;
  let fixture: ComponentFixture<BitePage>;
  let componentRef: ComponentRef<BitePage>;

  const mockBite = {
    name: 'Test Burger',
    image: 'test-image.jpg',
    place: 'Test Restaurant',
  };

  beforeEach(() => {
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
    expect(fixture.nativeElement.textContent).toBe('0.5 km');
  });

  it('should handle undefined bite input', () => {
    componentRef.setInput('bite', undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('0.5 km');
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
});
