import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { RestaurantImageComponent } from '../restaurant-image.component';
import { ComponentRef } from '@angular/core';

vi.mock('localization');

addNecessaryIcons();

describe('RestaurantImageComponent', () => {
  let component: RestaurantImageComponent;
  let fixture: ComponentFixture<RestaurantImageComponent>;
  let componentRef: ComponentRef<RestaurantImageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(RestaurantImageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('skeletonAnimation', () => {
    it('should return pulse-dark when darkTheme is true', () => {
      componentRef.setInput('darkTheme', true);
      expect(component.skeletonAnimation()).toBe('pulse-dark');
    });

    it('should return pulse when darkTheme is false', () => {
      componentRef.setInput('darkTheme', false);
      expect(component.skeletonAnimation()).toBe('pulse');
    });
  });
});
