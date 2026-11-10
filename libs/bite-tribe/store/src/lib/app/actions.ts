import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ProfileMetaData, PublicUser, Settings } from 'model';
import type { Position } from '@capacitor/geolocation';
import type { LocationPermissionState } from 'geolocation';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
    'Fetch GPS position': emptyProps(),
    'Reload GPS position': emptyProps(),
    'Clear GPS error': emptyProps(),
    'Loaded GPS position': props<{ position: Position }>(),
    // Sub-threshold movement: refresh the stored position (so the map marker
    // follows the user) without triggering the bite refetch that
    // `Loaded GPS position` drives.
    'Updated GPS position without reload': props<{ position: Position }>(),
    // The permission state travels with the failure so the recovery UI can name
    // the actual obstacle: only `denied` needs the settings-page handoff, and
    // only `prompt` still has an OS prompt left to spend. It is undefined when
    // the read failed for a reason other than permission.
    'Error loading GPS position': props<{
      error: unknown;
      permissionState?: LocationPermissionState;
    }>(),
    'Saved settings': props<{ settings: Settings }>(),
    'Saved public profile': props<{ profile: PublicUser }>(),
    'Loaded settings from API': props<{ settings: Settings }>(),
    'Set public profile': props<{ profile: PublicUser }>(),
    'Follow user': props<{ user: PublicUser }>(),
    'Unfollow user': props<{ user: PublicUser }>(),
    // Dispatched after the follow/unfollow write succeeds so the viewed
    // profile's follower count updates immediately. The `followersCount`
    // aggregate is maintained by a Firestore trigger that commits after the
    // relationship write, so reloading it right away would read a stale value;
    // the optimistic update is exact and reconciles on the next navigation.
    'Followed user': emptyProps(),
    'Unfollowed user': emptyProps(),
    'Loaded blocked users': props<{ userIds: string[] }>(),
    'Block user': props<{ user: PublicUser }>(),
    'Blocked user': props<{ userId: string }>(),
    'Unblock user': props<{ user: PublicUser }>(),
    'Unblocked user': props<{ userId: string }>(),
    'Loaded exchange rates from API': props<{
      exchangeRates: Record<string, number>;
    }>(),
    'Loaded Profile metadata': props<ProfileMetaData>(),
    'Reload Profile metadata': emptyProps(),
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
