import { SettingsApiService } from '../settings-api.service';
import { TestBed, inject } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestScheduler } from 'rxjs/testing';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addDocumentSnapshotListener: jest.fn(),
    setDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  getUser: (): any => ({ uid: '123' }),
  isLoggedIn$: of(false),
};

describe(SettingsApiService.name, () => {
  let scheduler: TestScheduler;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });
  });

  it('should create', inject(
    [SettingsApiService],
    (service: SettingsApiService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('startSettingsListener', () => {
    let addDocumentSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addDocumentSnapshotListener')
        .mockResolvedValue('callback-id');
    });

    it('should start the listener', inject(
      [SettingsApiService],
      async (service: SettingsApiService) => {
        await service.startSettingsListener();

        expect(addDocumentSnapshotListenerSpy).toHaveBeenCalled();
      },
    ));

    describe('settings$', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: {
            ...MockedAuthService,
            isLoggedIn$: of(true),
          },
        });
      });

      it('should call startListener', inject(
        [SettingsApiService],
        (service: SettingsApiService) => {
          const startSettingsListenerSpy = jest.spyOn(
            service,
            'startSettingsListener',
          );

          scheduler.run(({ expectObservable }) => {
            expectObservable(service.settings$).toBe('');
          });

          expect(startSettingsListenerSpy).toHaveBeenCalled();
        },
      ));
    });

    describe('given passed callback of listener', () => {
      it('should handle response when listener callback is invoked', inject(
        [SettingsApiService],
        async (service: SettingsApiService) => {
          await service.startSettingsListener();

          const mockSettingsDoc = {
            snapshot: {
              data: {
                theme: 'dark',
                notificationsEnabled: true,
              },
            },
          } as any;

          const callback = (
            addDocumentSnapshotListenerSpy.mock.calls[0][1] as any
          ).bind(service);

          callback(mockSettingsDoc);
        },
      ));
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(inject([SettingsApiService], (service: SettingsApiService) => {
      nextSpy = jest
        .spyOn((service as any).settingsChannel$, 'next')
        .mockImplementation();
    }));

    it('should handle response and update settings channel', inject(
      [SettingsApiService],
      (service: SettingsApiService) => {
        const mockSettingsDoc = {
          snapshot: {
            data: {
              theme: 'dark',
              notificationsEnabled: true,
            },
          },
        } as any;

        service.handleResponse(mockSettingsDoc);

        expect(nextSpy).toHaveBeenCalledWith({
          theme: 'dark',
          notificationsEnabled: true,
        });
      },
    ));

    describe('given settingsDoc is undefined', () => {
      it('should call next with undefined', inject(
        [SettingsApiService],
        (service: SettingsApiService) => {
          service.handleResponse(undefined as any);

          expect(nextSpy).toHaveBeenCalledWith(undefined);
        },
      ));
    });
  });

  describe('saveSettings', () => {
    let setDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      setDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue();
    });

    it('should call FirebaseFirestore.setDocument', inject(
      [SettingsApiService],
      async (service: SettingsApiService) => {
        const settingsToSave = { theme: 'light', notificationsEnabled: false };

        await service.saveSettings(settingsToSave);

        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'settings/123',
          data: {
            theme: 'light',
            notificationsEnabled: false,
            updatedAt: mockDate.toISOString(),
          },
        });
      },
    ));

    describe('given user is undefined', () => {
      beforeEach(() => {
        jest.spyOn(MockedAuthService, 'getUser').mockReturnValue({});
      });

      it('should throw an error', inject(
        [SettingsApiService],
        async (service: SettingsApiService) => {
          const settingsToSave = {
            theme: 'light',
            notificationsEnabled: false,
          };

          await expect(service.saveSettings(settingsToSave)).rejects.toThrow(
            'No user logged in',
          );
        },
      ));
    });
  });
});
