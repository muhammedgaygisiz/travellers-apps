import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Profile visibility status for the signed-in user's own profile. It states
 * whether the profile is public or private and doubles as the entry point to
 * the visibility switch in profile edit, so the saved state no longer has to be
 * looked up by opening the edit form. See GitHub issue #1188.
 *
 * The whole status is one native button, so its text is the accessible name and
 * the icon stays decorative.
 */
@Component({
  selector: 'profile-visibility',
  templateUrl: 'profile-visibility.html',
  styleUrl: 'profile-visibility.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslocoPipe],
})
export class ProfileVisibility {
  isPublic = input<boolean | undefined>();

  readonly editClick = output();

  // A profile document carries no `public` field until the user has made a
  // choice, and an undecided profile is private, so anything other than an
  // explicit `true` reads as private.
  isPublicProfile = computed((): boolean => {
    return this.isPublic() === true;
  });

  statusKey = computed((): string => {
    return this.isPublicProfile()
      ? 'profile-visibility-public'
      : 'profile-visibility-private';
  });

  hintKey = computed((): string => {
    return this.isPublicProfile()
      ? 'profile-visibility-public-hint'
      : 'profile-visibility-private-hint';
  });

  iconName = computed((): string => {
    return this.isPublicProfile() ? 'earth-outline' : 'lock-closed-outline';
  });
}
