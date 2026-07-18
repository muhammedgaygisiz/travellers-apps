import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type {
  ProfileMetaData,
  PublicUser,
  Settings,
  UploadParams,
} from 'model';
import type { Position } from '@capacitor/geolocation';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
    'Fetch GPS position': emptyProps(),
    'Reload GPS position': emptyProps(),
    'Clear GPS error': emptyProps(),
    'Loaded GPS position': props<{ position: Position }>(),
    'Clear Reload GPS position': props<{ reason: string }>(),
    'Error loading GPS position': props<{ error: unknown }>(),
    'Saved settings': props<{ settings: Settings }>(),
    'Save public profile': props<{ profile: PublicUser }>(),
    'Saved public profile': props<{ profile: PublicUser }>(),
    'Upload profile image': props<{ profile: PublicUser }>(),
    'Error Uploading Profile Image': props<{ profile: PublicUser }>(),
    'Error saving public profile': emptyProps(),
    'Loaded settings from API': props<{ settings: Settings }>(),
    'Set public profile': props<{ profile: PublicUser }>(),
    'Follow user': props<{ user: PublicUser }>(),
    'Unfollow user': props<{ user: PublicUser }>(),
    'Loaded exchange rates from API': props<{
      exchangeRates: Record<string, number>;
    }>(),
    'Loaded Profile metadata': props<ProfileMetaData>(),
    'Reload Profile metadata': emptyProps(),
    'Uploading Profile Image': props<{
      progress: UploadParams;
      profile: PublicUser;
      imagePath: string;
    }>(),
    'Uploaded Profile Image': props<{
      profile: PublicUser;
      imagePath: string;
    }>(),
    'Updated Photo Url in Profile': props<{ profile: PublicUser }>(),
    'Error Updating PhotoUrl in Profile': props<{ profile: PublicUser }>(),
    'Update last seen': emptyProps(),
    'Update user metadata': emptyProps(),
    'Sync email verification status': emptyProps(),
    'Synced email verification status': props<{
      metadata: Pick<
        PublicUser,
        | 'emailVerified'
        | 'emailVerificationRequired'
        | 'emailVerificationProvider'
        | 'emailVerificationReminderCount'
        | 'emailVerificationLastSentAt'
        | 'emailVerificationLastSentAtTimestamp'
        | 'emailVerificationManualLastSentAt'
        | 'emailVerificationManualLastSentAtTimestamp'
      >;
    }>(),
  },
});
