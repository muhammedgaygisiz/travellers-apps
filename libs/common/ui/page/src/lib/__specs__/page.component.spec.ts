import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponent } from '../page.component';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

addNecessaryIcons();

jest.mock('@travellers-apps/prices/localization');

describe('PageComponent', () => {
  let component: PageComponent;
  let fixture: ComponentFixture<PageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });
    fixture = TestBed.createComponent(PageComponent);
    component = fixture.componentInstance;
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
});
