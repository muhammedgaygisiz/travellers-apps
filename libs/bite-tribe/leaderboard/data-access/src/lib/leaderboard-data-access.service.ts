import { Injectable, resource, ResourceLoader } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { PublicUser } from 'model';

export type LeaderboardUser = Pick<
  PublicUser,
  | 'userId'
  | 'displayName'
  | 'email'
  | 'photoUrl'
  | 'city'
  | 'public'
  | 'biteCount'
> &
  Required<Pick<PublicUser, 'biteCount'>>;

@Injectable({ providedIn: 'root' })
export class LeaderboardDataAccessService {
  usersLoader: ResourceLoader<LeaderboardUser[], undefined> = async () => {
    try {
      const result = await FirebaseFunctions.callByName<
        void,
        LeaderboardUser[]
      >({
        name: 'loadLeaderboard',
        data: undefined,
      });

      return result.data;
    } catch {
      return [];
    }
  };

  users = resource({
    loader: this.usersLoader.bind(this),
    defaultValue: [],
  });
}
