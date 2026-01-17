import { SettingsApiService } from '../settings-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addDocumentSnapshotListener: jest.fn(),
    setDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123' } }),
  isLoggedIn$: of(false),
};

describe(SettingsApiService.name, () => {
  let service: SettingsApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(SettingsApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startSettingsListener', () => {
    let addDocumentSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addDocumentSnapshotListener')
        .mockResolvedValue('callback-id');
    });

    it('should start the listener', async () => {
      await service.startSettingsListener();

      expect(addDocumentSnapshotListenerSpy).toHaveBeenCalled();
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any).settingsChannel$, 'next')
        .mockImplementation();
    });

    it('should handle response and update settings channel', () => {
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
    });
  });

  describe('saveSettings', () => {
    let setDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      setDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue();
    });

    it('should call FirebaseFirestore.setDocument', async () => {
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
    });
  });
});
