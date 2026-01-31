import { SettingsApiService } from '../settings-api.service';
import { TestBed, inject } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as loadFn from '../utils/load-settings-by-user-id';

jest.mock('../utils/load-settings-by-user-id', () => ({
  loadSettingsByUserId: jest.fn(),
}));

jest.mock('@capacitor-firebase/firestore');

const MockedAuthService = {
  getUser: (): any => ({ uid: '123' }),
  isLoggedIn$: of(false),
};

describe(SettingsApiService.name, () => {
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
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

  describe('loadSettingsByUserId', () => {
    describe('given a user', () => {
      afterEach(() => {
        jest.clearAllMocks();
      });

      describe('with uid', () => {
        it('should call loadSettingsByUserId', inject(
          [SettingsApiService],
          async (service: SettingsApiService) => {
            const loadSettingsByUserIdSpy = jest
              .spyOn(loadFn, 'loadSettingsByUserId')
              .mockResolvedValue({ theme: 'dark' } as any);

            const settings = await service.loadSettingsByUserId();

            expect(loadSettingsByUserIdSpy).toHaveBeenCalledWith('123');
            expect(settings).toEqual({ theme: 'dark' });
          },
        ));
      });

      describe('without uid', () => {
        beforeEach(() => {
          jest.spyOn(MockedAuthService, 'getUser').mockReturnValue(null);
        });

        it('should return empty settings', inject(
          [SettingsApiService],
          async (service: SettingsApiService) => {
            const loadSettingsByUserIdSpy = jest.spyOn(
              loadFn,
              'loadSettingsByUserId',
            );

            const settings = await service.loadSettingsByUserId();

            expect(loadSettingsByUserIdSpy).not.toHaveBeenCalled();
            expect(settings).toEqual({} as any);
          },
        ));
      });
    });
  });

  describe('saveSettings', () => {
    describe('given a user', () => {
      describe('with uid', () => {
        let setDocumentSpy: jest.SpyInstance;

        beforeEach(() => {
          setDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'setDocument')
            .mockResolvedValue();

          jest
            .spyOn(MockedAuthService, 'getUser')
            .mockReturnValue({ uid: '123' });
        });

        it('should call FirebaseFirestore.setDocument', inject(
          [SettingsApiService],
          async (service: SettingsApiService) => {
            const settingsToSave = {
              theme: 'light',
              notificationsEnabled: false,
            };

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
      });

      describe('without uid', () => {
        beforeEach(() => {
          jest.clearAllMocks();

          jest.spyOn(MockedAuthService, 'getUser').mockReturnValue(null);
        });

        it('should not call FirebaseFirestore.setDocument', inject(
          [SettingsApiService],
          async (service: SettingsApiService) => {
            const setDocumentSpy = jest.spyOn(FirebaseFirestore, 'setDocument');

            const settingsToSave = {
              theme: 'light',
              notificationsEnabled: false,
            };

            await service.saveSettings(settingsToSave);

            expect(setDocumentSpy).not.toHaveBeenCalled();
          },
        ));
      });
    });

    describe('given no user', () => {
      it('should not call FirebaseFirestore.setDocument', inject(
        [SettingsApiService],
        async (service: SettingsApiService) => {
          jest.spyOn(MockedAuthService, 'getUser').mockReturnValue(null);
          const setDocumentSpy = jest.spyOn(FirebaseFirestore, 'setDocument');

          const settingsToSave = {
            theme: 'light',
            notificationsEnabled: false,
          };

          await service.saveSettings(settingsToSave);

          expect(setDocumentSpy).not.toHaveBeenCalled();
        },
      ));
    });

    describe('given an error', () => {
      beforeEach(() => {
        jest.spyOn(FirebaseFirestore, 'setDocument').mockImplementation(() => {
          throw new Error('Firestore error');
        });

        jest
          .spyOn(MockedAuthService, 'getUser')
          .mockReturnValue({ uid: '123' });
      });

      it('should handle the error', inject(
        [SettingsApiService],
        async (service: SettingsApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          const settingsToSave = {
            theme: 'light',
            notificationsEnabled: false,
          };

          try {
            await service.saveSettings(settingsToSave);
          } catch (error) {
            // Expected to throw
          }

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error saving settings:',
            expect.any(Error),
          );
        },
      ));
    });
  });
});
