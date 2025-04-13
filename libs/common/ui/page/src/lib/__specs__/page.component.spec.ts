import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponent } from '../page.component';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  ComponentRef,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';

addNecessaryIcons();

jest.mock('localization');

describe('PageComponent', () => {
  let component: PageComponent;
  let fixture: ComponentFixture<PageComponent>;
  let componentRef: ComponentRef<PageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });
    fixture = TestBed.createComponent(PageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showMenuPopover', () => {
    it('should show menu popover', async () => {
      const popoverControllerCreateSpy = jest
        .spyOn(component.popoverController, 'create')
        .mockReturnValue({ present: jest.fn() } as any);

      await component.showMenuPopover({} as MouseEvent);

      expect(popoverControllerCreateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('app title', () => {
    it('should return input title when provided', () => {
      componentRef.setInput('title', 'Test Title');
      expect(component.appTitle()).toBe('Test Title');
    });

    describe('with injector token', () => {
      const mockAppTitle = 'Mock App Title';

      beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideExperimentalZonelessChangeDetection(),
            provideIonicAngular(getIonicConfig()),
            { provide: APP_TITLE, useValue: mockAppTitle },
          ],
        });
        fixture = TestBed.createComponent(PageComponent);
        component = fixture.componentInstance;
      });

      it('should return appTitleToken when no title is provided', () => {
        expect(component.appTitle()).toBe(mockAppTitle);
      });
    });
  });
});
