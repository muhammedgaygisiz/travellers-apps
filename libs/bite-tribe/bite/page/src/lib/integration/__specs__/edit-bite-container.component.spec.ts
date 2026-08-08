import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import type { Bite } from 'model';
import { BiteService } from '../bite.service';
import { EditBiteContainer } from '../edit-bite-container.component';

jest.mock('@capacitor-firebase/analytics');
jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

describe(EditBiteContainer.name, () => {
  let fixture: ComponentFixture<EditBiteContainer>;
  let alertController: AlertController;
  const biteValue = signal<Bite | undefined>(undefined);
  const biteLoadFailed = signal(false);
  const retryBiteLoad = jest.fn();
  const goBack = jest.fn();

  beforeEach(() => {
    biteValue.set(undefined);
    biteLoadFailed.set(false);
    retryBiteLoad.mockClear();
    goBack.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BiteService,
          useValue: {
            biteValue,
            biteLoadFailed,
            retryBiteLoad,
            goBack,
            image: signal(''),
            nearbyRestaurants: signal([]),
            tagSuggestionsForEditingBite: signal([]),
            googlePlaces: signal([]),
            googlePlacesLoading: signal(false),
            submitEditedBite: jest.fn(),
            setEditingBite: jest.fn(),
            searchGooglePlaces: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(EditBiteContainer);
    alertController = TestBed.inject(AlertController);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('given the bite could not be read', () => {
    // An empty edit form looks like a Bite with no details rather than one that
    // never loaded, and submitting it would write that emptiness back.
    // See GitHub issue #1232.
    it('should block the page with a retry and a way back', async () => {
      const present = jest.fn();
      let created: Parameters<AlertController['create']>[0] | undefined;
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async (options) => {
          created = options;
          return { present } as never;
        });

      biteLoadFailed.set(true);
      fixture.detectChanges();
      await Promise.resolve();

      expect(present).toHaveBeenCalled();
      expect(created?.backdropDismiss).toBe(false);

      const buttons = created?.buttons as {
        handler?: () => void;
      }[];
      expect(buttons).toHaveLength(2);

      buttons[0].handler?.();
      expect(goBack).toHaveBeenCalled();

      buttons[1].handler?.();
      expect(retryBiteLoad).toHaveBeenCalled();
    });

    it('should report it once, not on every check', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockResolvedValue({ present: jest.fn() } as never);

      biteLoadFailed.set(true);
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();
      await Promise.resolve();

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('should report a retry that failed again', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockResolvedValue({ present: jest.fn() } as never);

      biteLoadFailed.set(true);
      fixture.detectChanges();
      await Promise.resolve();

      // The retry puts the read back in flight before it fails again.
      biteLoadFailed.set(false);
      fixture.detectChanges();
      await Promise.resolve();
      biteLoadFailed.set(true);
      fixture.detectChanges();
      await Promise.resolve();

      expect(create).toHaveBeenCalledTimes(2);
    });
  });

  describe('given the bite loaded', () => {
    it('should say nothing', async () => {
      const create = jest.spyOn(alertController, 'create');

      biteValue.set({ id: 'bite-1', name: 'Pizza' } as Bite);
      fixture.detectChanges();
      await Promise.resolve();

      expect(create).not.toHaveBeenCalled();
    });
  });
});
