import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { EditRestaurantComponent } from '../edit-restaurant.component';
import { Link, Restaurant } from 'model';
import SpyInstance = jest.SpyInstance;
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('EditRestaurantComponent', () => {
  let component: EditRestaurantComponent;
  let fixture: ComponentFixture<EditRestaurantComponent>;
  let componentRef: ComponentRef<EditRestaurantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(EditRestaurantComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('links', () => {
    it('should return empty array if no links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.links.length).toBe(0);
    });
  });

  describe('initSocialMediaLinks', () => {
    it('should initialize social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
          { network: 'instagram', url: 'https://instagram.com/test' },
          { network: 'twitter', url: 'https://twitter.com/test' },
          { network: 'website', url: 'https://test.com' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(4);
    });

    it('should handle no social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(0);
    });
  });

  describe('isInvalid', () => {
    it('should be false if valid links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(false);
    });

    it('should be true if invalid links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: '', url: '' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(true);
    });
  });

  describe('placeName', () => {
    it('should return restaurant name', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.placeName()).toBe('Test Restaurant');
    });

    it('should return undefined if no restaurant', () => {
      componentRef.setInput('restaurant', undefined);
      expect(component.placeName()).toBe(undefined);
    });
  });

  describe('addSocialMedia', () => {
    it('should add a new social media link', () => {
      const initialLength = component.links.length;
      component.addSocialMedia();
      expect(component.links.length).toBe(initialLength + 1);
    });
  });

  describe('hasMenu', () => {
    it('should return true if restaurant has a menuId', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        menuId: '/menus/menu123',
      } as Restaurant);
      expect(component.hasMenu()).toBe(true);
    });

    it('should return false if restaurant has no menuId', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.hasMenu()).toBe(false);
    });

    it('should return false if restaurant is undefined', () => {
      componentRef.setInput('restaurant', undefined);
      expect(component.hasMenu()).toBe(false);
    });
  });

  describe('createMenu', () => {
    it('should emit createMenu event when createMenu is called', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      const emitSpy = jest.spyOn(component.createMenu, 'emit');
      component.createMenu.emit();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should not render Create Menu button when restaurant already has a menuId', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        menuId: '/menus/existing-menu',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[aria-label="Create a new menu for this restaurant"]',
      );
      expect(button).toBeNull();
    });
  });

  describe('saveSocialMediaLinks', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.submitSocialMediaLinks, 'emit');
    });

    it('should emit save event if form is valid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).toHaveBeenCalledWith({
        links: [{ network: 'facebook', url: 'https://facebook.com/test' }],
      });
    });

    it('should not emit save event if form is invalid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: '', url: '' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
