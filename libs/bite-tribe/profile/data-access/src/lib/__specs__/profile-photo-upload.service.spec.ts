import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { CreateAndUploadImageCallbackParams, PublicUser } from 'model';
import {
  ProfilePhotoUploadService,
  STALLED_PROFILE_PHOTO_UPLOAD_MS,
} from '../profile-photo-upload.service';

type Callback = (p: CreateAndUploadImageCallbackParams) => void;

const PROFILE: PublicUser = {
  userId: 'user-1',
  displayName: 'Mo',
  email: 'mo@test.com',
  photoUrl: 'old-url',
  photoStatus: 'pending',
};

const PHOTO = 'data:image/jpeg;base64,AAAA';

const progress = (completed: boolean): CreateAndUploadImageCallbackParams => ({
  imagePath: 'images/users/user-1/new.jpg',
  uploadParams: {
    evt: { completed } as never,
    err: undefined,
    offlineImagePath: '',
  },
});

const failure = (): CreateAndUploadImageCallbackParams => ({
  imagePath: 'images/users/user-1/new.jpg',
  uploadParams: { evt: null, err: new Error('boom'), offlineImagePath: '' },
});

/** GitHub issue #1953. */
describe(ProfilePhotoUploadService.name, () => {
  let service: ProfilePhotoUploadService;
  let callback: Callback;
  const publicUser$ = new BehaviorSubject<PublicUser | undefined>(PROFILE);

  const api = {
    uploadProfilePhoto: jest.fn(),
    setProfilePhotoStatus: jest.fn(),
    findLocalProfilePhoto: jest.fn(),
  };
  const store = { publicUser$, notifySavedProfile: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    publicUser$.next(PROFILE);

    api.uploadProfilePhoto.mockImplementation(
      async (_uid: string, _photo: string, cb: Callback) => {
        callback = cb;
      },
    );
    api.setProfilePhotoStatus.mockResolvedValue(undefined);
    api.findLocalProfilePhoto.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ProfilePhotoUploadService,
        { provide: BiteTribeApiService, useValue: api },
        { provide: BiteTribeStoreService, useValue: store },
      ],
    });
    service = TestBed.inject(ProfilePhotoUploadService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Only the finalize trigger publishes the photo, once the image check
   * passed it (GitHub issue #2140): a finished transfer writes nothing here.
   */
  it('leaves publishing the photo to the backend once the upload finishes', async () => {
    service.start(PROFILE, PHOTO);
    callback(progress(true));
    await jest.runOnlyPendingTimersAsync();

    expect(api.uploadProfilePhoto).toHaveBeenCalledWith(
      'user-1',
      PHOTO,
      expect.any(Function),
    );
    expect(store.notifySavedProfile).not.toHaveBeenCalled();
    expect(api.setProfilePhotoStatus).not.toHaveBeenCalled();
  });

  it('does not write a finished upload off when it later goes quiet', () => {
    service.start(PROFILE, PHOTO);
    callback(progress(true));

    jest.advanceTimersByTime(STALLED_PROFILE_PHOTO_UPLOAD_MS * 2);

    expect(api.setProfilePhotoStatus).not.toHaveBeenCalled();
  });

  it('writes the upload off as failed when it errors', () => {
    service.start(PROFILE, PHOTO);
    callback(failure());

    expect(api.setProfilePhotoStatus).toHaveBeenCalledWith('user-1', 'failed');
    expect(store.notifySavedProfile).toHaveBeenCalledWith(
      expect.objectContaining({ photoStatus: 'failed' }),
    );
  });

  it('writes the upload off as failed when it stalls', () => {
    service.start(PROFILE, PHOTO);
    callback(progress(false));

    jest.advanceTimersByTime(STALLED_PROFILE_PHOTO_UPLOAD_MS - 1);
    expect(api.setProfilePhotoStatus).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(api.setProfilePhotoStatus).toHaveBeenCalledWith('user-1', 'failed');
  });

  it('fails an attempt once, however many errors it reports', () => {
    service.start(PROFILE, PHOTO);
    callback(failure());
    callback(failure());

    expect(api.setProfilePhotoStatus).toHaveBeenCalledTimes(1);
  });

  it('starts no second transfer while one is running', () => {
    service.start(PROFILE, PHOTO);
    service.start(PROFILE, PHOTO);

    expect(api.uploadProfilePhoto).toHaveBeenCalledTimes(1);
  });

  describe('pendingPhoto', () => {
    it('holds the photo until the check publishes it', () => {
      service.start(PROFILE, PHOTO);

      expect(service.pendingPhoto()).toBe(PHOTO);

      callback(progress(true));
      TestBed.tick();

      // Transferred, but still waiting for the check's verdict.
      expect(service.pendingPhoto()).toBe(PHOTO);

      publicUser$.next({ ...PROFILE, photoStatus: 'uploaded' });
      TestBed.tick();

      expect(service.pendingPhoto()).toBeUndefined();
    });

    it('lets go of a photo the check refused', () => {
      service.start(PROFILE, PHOTO);
      callback(progress(true));

      publicUser$.next({ ...PROFILE, photoStatus: 'refused' });
      TestBed.tick();

      expect(service.pendingPhoto()).toBeUndefined();
      expect(api.findLocalProfilePhoto).not.toHaveBeenCalled();
    });

    it('keeps the photo of a failed upload', () => {
      service.start(PROFILE, PHOTO);
      callback(failure());

      expect(service.pendingPhoto()).toBe(PHOTO);
    });

    it('reads the copy on this device after a reload', async () => {
      api.findLocalProfilePhoto.mockResolvedValue('data:local-copy');
      publicUser$.next({ ...PROFILE, photoStatus: 'failed' });

      TestBed.tick();
      await jest.runOnlyPendingTimersAsync();

      expect(api.findLocalProfilePhoto).toHaveBeenCalledWith('user-1');
      expect(service.pendingPhoto()).toBe('data:local-copy');
    });

    it('forgets the photo when another account signs in', () => {
      service.start(PROFILE, PHOTO);
      callback(failure());

      publicUser$.next({
        ...PROFILE,
        userId: 'user-2',
        photoStatus: undefined,
      });
      TestBed.tick();

      expect(service.pendingPhoto()).toBeUndefined();
    });
  });

  describe('retry', () => {
    it('sends the photo from this session again, marked pending', async () => {
      service.start(PROFILE, PHOTO);
      callback(failure());
      jest.clearAllMocks();

      await expect(service.retry()).resolves.toBe(true);

      expect(api.setProfilePhotoStatus).toHaveBeenCalledWith(
        'user-1',
        'pending',
        expect.any(Number),
      );
      expect(store.notifySavedProfile).toHaveBeenCalledWith(
        expect.objectContaining({ photoStatus: 'pending' }),
      );
      expect(api.uploadProfilePhoto).toHaveBeenCalledWith(
        'user-1',
        PHOTO,
        expect.any(Function),
      );
    });

    it('falls back to the copy on this device after a reload', async () => {
      api.findLocalProfilePhoto.mockResolvedValue('data:local-copy');

      await expect(service.retry()).resolves.toBe(true);

      expect(api.findLocalProfilePhoto).toHaveBeenCalledWith('user-1');
      expect(api.uploadProfilePhoto).toHaveBeenCalledWith(
        'user-1',
        'data:local-copy',
        expect.any(Function),
      );
    });

    it('never sends a refused photo again, and has the user choose another', async () => {
      api.findLocalProfilePhoto.mockResolvedValue('data:refused-copy');
      publicUser$.next({ ...PROFILE, photoStatus: 'refused' });
      TestBed.tick();

      await expect(service.retry()).resolves.toBe(false);

      expect(api.uploadProfilePhoto).not.toHaveBeenCalled();
      expect(api.setProfilePhotoStatus).not.toHaveBeenCalled();
    });

    it('answers false when there is no photo left to send', async () => {
      await expect(service.retry()).resolves.toBe(false);

      expect(api.uploadProfilePhoto).not.toHaveBeenCalled();
      expect(api.setProfilePhotoStatus).not.toHaveBeenCalled();
    });
  });
});
