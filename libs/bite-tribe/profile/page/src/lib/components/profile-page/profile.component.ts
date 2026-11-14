import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent, PageMenuTarget } from 'common/ui/page';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import {
  Bite,
  LikeClick,
  normalizePronouns,
  ProfileMetaData,
  PublicUser,
  USER_REPORT_REASONS,
  UserReportReason,
  WeeklyBadge,
  WeeklyBadgeBoard,
} from 'model';

import { BiteComponent } from 'bite-tribe-common/bite';
import { HapticsService } from 'haptics';
import { AlertButton, AlertInput, OverlayEventDetail } from '@ionic/core';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { ProfileHeader } from './components/profile-header';
import { CountryFlags } from './components/country-flags';
import { ProfileSkeleton } from './components/profile-skeleton';
import { ProfileVisibility } from './components/profile-visibility';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { totalBiteCount } from 'utils';

const UNFOLLOW = 'unfollow';
const BLOCK = 'block';
const REPORT = 'report';
const CANCEL = 'cancel';

const PAGE_SIZE = 50;

@Component({
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPopover,
    BiteComponent,
    IonAlert,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProfileHeader,
    CountryFlags,
    ProfileSkeleton,
    ProfileVisibility,
    TranslocoPipe,
  ],
})
export class ProfileComponent {
  transloco = inject(TranslocoService);
  private readonly haptics = inject(HapticsService);

  isAuthenticated = input(false);
  isLoading = input(false, { transform: booleanAttribute });
  user = input<PublicUser | undefined>();
  bites = input<Bite[]>();
  profileMetadata = input<ProfileMetaData>();
  /**
   * The signed-in user blocked this account (GitHub issue #1609). The page then
   * shows only who it is and the way back, never the account's content.
   */
  isBlocked = input(false, { transform: booleanAttribute });
  userId = input<string>();
  displayName = computed((): string => {
    if (this.user() && !this.showsProfileContent()) {
      return this.transloco.translate('anonymous');
    }

    return (
      this.user()?.displayName || this.transloco.translate('no-display-name')
    );
  });
  emptyBitesMessage = computed((): string => {
    return this.transloco.translate('no-bites-yet');
  });
  /**
   * The real name, shown only when it says something the heading does not.
   *
   * Onboarding used to copy the display name into `fullName`, so every account
   * created through it carries the duplicate permanently and read its own name
   * twice. The write is fixed at the source, but accounts created before that
   * can only be repaired here — a stored value equal to the display name is
   * treated as the absence of a real name rather than as a second one. See
   * GitHub issue #1270.
   */
  readonly metaName = computed((): string => {
    const user = this.user();
    const fullName = user?.fullName?.trim() || '';
    const displayName = user?.displayName?.trim() || '';

    return fullName.toLocaleLowerCase() === displayName.toLocaleLowerCase()
      ? ''
      : fullName;
  });

  /**
   * The line under the display name, empty when it has nothing to carry.
   *
   * A profile with no city used to advertise "No location" for something the
   * app never asked the user for, which reads as data that went missing rather
   * than as an optional field nobody filled in. Onboarding collects no city at
   * all today, which is tracked separately in issue #1271.
   */
  readonly profileMeta = computed((): string => {
    if (!this.showsProfileContent()) {
      return '';
    }

    const city = this.user()?.city?.trim() || '';

    return [this.metaName(), city].filter(Boolean).join(', ');
  });
  enableImageRetry = input(false, { transform: booleanAttribute });

  /**
   * The pronouns after the display name, empty when there are none to show.
   *
   * They follow profile visibility (issue #1826): another account sees them on a
   * public profile only, and the owner always sees their own. A profile with no
   * saved choice reads as private, as it does on the visibility status.
   */
  readonly pronouns = computed((): string => {
    const user = this.user();

    if (!user || !this.showsProfileContent()) {
      return '';
    }

    return normalizePronouns(user.pronouns) ?? '';
  });

  /**
   * Whether the page shows what the profile says: always to its owner, and to
   * anybody else only while it is public (issue #1863).
   *
   * Another account cannot read a private profile, so what reaches the page is
   * a stand-in holding the uid alone. The Bites are a separate read, though,
   * and still arrive by the route, so the page has to withhold them itself, as
   * it withholds the name, city, about and flags the stand-in no longer has.
   */
  readonly showsProfileContent = computed((): boolean => {
    const user = this.user();

    return !!user && (this.isOwnProfile() || user.public === true);
  });

  readonly logoutClick = output();
  readonly menuNavigate = output<PageMenuTarget>();
  readonly gotoEditProfile = output();
  /** The own new photo while it uploads, shown blurred (#1953). */
  readonly pendingPhoto = input<string | undefined>();

  /** Sends the own profile photo again after its upload failed (#1953). */
  readonly retryPhotoUpload = output();

  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();
  readonly followButtonClick = output<PublicUser>();
  readonly unfollowButtonClick = output<PublicUser>();
  readonly blockButtonClick = output<PublicUser>();
  readonly unblockButtonClick = output<PublicUser>();
  /** A report on this profile, with the reason picked (GitHub issue #1829). */
  readonly reportProfile = output<{
    user: PublicUser;
    reason: UserReportReason;
  }>();
  readonly followersClick = output<string>();
  readonly followingClick = output<string>();
  /** The profile's user id, to open its countries on a globe (#1787). */
  readonly worldClick = output<string>();
  /** A weekly badge was tapped: the board it was won on (issue #2031). */
  readonly weeklyBadgeClick = output<WeeklyBadgeBoard>();
  readonly retryImageUpload = output<Bite>();

  isOpen = signal(false);
  isBlockConfirmationOpen = signal(false);
  isProfileActionsMenuOpen = signal(false);
  profileActionsMenuEvent = signal<Event | undefined>(undefined);
  isReportDialogOpen = signal(false);
  /** Block was picked in the menu; confirm once the popover has gone. */
  private blockChosenFromMenu = false;
  /** Report was picked in the menu; ask why once the popover has gone. */
  private reportChosenFromMenu = false;
  currentPage = signal<number>(1);

  // Only skeletonize while there is nothing to show. A reload of an already
  // rendered profile keeps the current content in place.
  showSkeleton = computed((): boolean => {
    return this.isLoading() && !this.user();
  });

  /**
   * The buttons of the unfollow and block confirmations, translated when each
   * dialog opens. A profile opened by its URL is built before the translations
   * have loaded, so labels fixed at that moment read as their keys.
   */
  confirmationButtons = signal<AlertButton[]>([]);
  blockConfirmationButtons = signal<AlertButton[]>([]);

  /**
   * One radio per reason. A list rather than a text field, as on a Bite
   * report: one tap past the button, and nothing a reporter submits can itself
   * be text an operator has to read.
   *
   * Translated when the dialog opens rather than when the page is built: a
   * profile opened cold is built before the translations have loaded, and the
   * alert would otherwise show their keys.
   */
  reportReasonInputs = signal<AlertInput[]>([]);
  reportButtons = signal<AlertButton[]>([]);

  followerCount = computed(() => {
    return this.profileMetadata()?.followers;
  });

  followingCount = computed(() => {
    return this.profileMetadata()?.following;
  });

  /**
   * The weekly top-3 badges shown under the globe button (issue #2031), the
   * This week one first. A badge is held for the week after it was won, so
   * the copy says "last week".
   */
  weeklyBadges = computed((): WeeklyBadge[] =>
    this.showsProfileContent()
      ? [...(this.user()?.weeklyBadges ?? [])]
          .filter((badge) => badge.place >= 1 && badge.place <= 3)
          .sort(
            (a, b) =>
              (a.board === 'thisWeek' ? -1 : 0) -
              (b.board === 'thisWeek' ? -1 : 0),
          )
      : [],
  );

  /** Whether the flag row shows anything, and so the globe has something. */
  hasCountries = computed(() =>
    (this.user()?.countryCodes ?? []).some((code) => !!code?.trim()),
  );

  biteCount = computed(() =>
    this.showsProfileContent()
      ? totalBiteCount(this.user()?.biteCount, this.bites()?.length ?? 0)
      : 0,
  );

  displayedBites = computed(() => {
    const allBites = this.bites() || [];
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBites.slice(startIndex, endIndex);
  });

  isUnfollowedUser = computed((): boolean => {
    const currentUserId = this.userId();
    const profileOwner = this.user()?.userId;

    if (!profileOwner) {
      return false;
    }

    return currentUserId !== profileOwner;
  });

  isOwnProfile = computed((): boolean => {
    const currentUserId = this.userId();
    const profileOwner = this.user()?.userId;

    return !!currentUserId && currentUserId === profileOwner;
  });

  // The visibility status is a self-service privacy control, so it only belongs
  // on the signed-in user's own profile.
  showVisibilityStatus = computed((): boolean => {
    return this.isOwnProfile();
  });

  onFollow(): void {
    const user = this.user();
    if (user) {
      this.followButtonClick.emit(user);
    }
  }

  unfollow(): void {
    const user = this.user();
    if (user) {
      this.unfollowButtonClick.emit(user);
    }
  }

  openConfirmationDialog(): void {
    this.confirmationButtons.set([
      { text: this.transloco.translate('cancel'), role: CANCEL },
      {
        text: this.transloco.translate('yes-unfollow'),
        role: UNFOLLOW,
        // Played from the button rather than from the dismissal, so it lands on
        // the release instead of after the alert has animated away. The alert
        // carries `btPressable="release-off"`, so this replaces the shared
        // `release` instead of stacking on it (issues #1636, #1747).
        handler: (): void => {
          void this.haptics.warning();
        },
      },
    ]);
    this.isOpen.set(true);
  }

  handleConfirmationDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === UNFOLLOW) {
      this.unfollow();
    }

    this.isOpen.set(false);
  }

  /**
   * Whether the signed-in user may report this profile (GitHub issue #1829).
   *
   * Any profile that is not their own, blocked or not: blocking protects the
   * person who blocks, and a report is how somebody else is protected too, so
   * the two are often used together. `reportUser` refuses a self-report and a
   * signed-out caller regardless.
   */
  canReport = computed((): boolean => {
    return this.isUnfollowedUser() && !!this.userId();
  });

  /**
   * The header menu belongs to somebody else's profile. Block leaves it once
   * the account is blocked, because Unblock then takes Follow's place; Report
   * stays.
   */
  showProfileActionsMenu = computed((): boolean => {
    return this.isUnfollowedUser() && (!this.isBlocked() || this.canReport());
  });

  openProfileActionsMenu(event: Event): void {
    this.profileActionsMenuEvent.set(event);
    this.isProfileActionsMenuOpen.set(true);
  }

  chooseBlockFromMenu(): void {
    this.blockChosenFromMenu = true;
    this.isProfileActionsMenuOpen.set(false);
  }

  chooseReportFromMenu(): void {
    this.reportChosenFromMenu = true;
    this.isProfileActionsMenuOpen.set(false);
  }

  handleProfileActionsMenuDismiss(): void {
    this.isProfileActionsMenuOpen.set(false);

    if (this.blockChosenFromMenu) {
      this.blockChosenFromMenu = false;
      this.openBlockConfirmationDialog();
    }

    if (this.reportChosenFromMenu) {
      this.reportChosenFromMenu = false;
      this.openReportDialog();
    }
  }

  openReportDialog(): void {
    this.reportReasonInputs.set(
      USER_REPORT_REASONS.map((reason) => ({
        type: 'radio',
        label: this.transloco.translate(`report-profile-reason-${reason}`),
        value: reason,
      })),
    );
    this.reportButtons.set([
      { text: this.transloco.translate('cancel'), role: CANCEL },
      {
        text: this.transloco.translate('report-profile-submit'),
        role: REPORT,
        // Refused until a reason is picked, so the alert stays open.
        handler: (reason: UserReportReason | undefined): boolean => !!reason,
      },
    ]);
    this.isReportDialogOpen.set(true);
  }

  handleReportDialogDismiss(
    event: CustomEvent<OverlayEventDetail<{ values?: UserReportReason }>>,
  ): void {
    const user = this.user();
    const reason = event.detail.data?.values;

    if (event.detail.role === REPORT && user && reason) {
      this.reportProfile.emit({ user, reason });
    }

    this.isReportDialogOpen.set(false);
  }

  openBlockConfirmationDialog(): void {
    this.blockConfirmationButtons.set([
      { text: this.transloco.translate('cancel'), role: CANCEL },
      {
        text: this.transloco.translate('yes-block'),
        role: BLOCK,
        // Destructive and confirmed, like the unfollow.
        handler: (): void => {
          void this.haptics.warning();
        },
      },
    ]);
    this.isBlockConfirmationOpen.set(true);
  }

  handleBlockConfirmationDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const user = this.user();

    if (event.detail.role === BLOCK && user) {
      this.blockButtonClick.emit(user);
    }

    this.isBlockConfirmationOpen.set(false);
  }

  unblock(): void {
    const user = this.user();

    if (user) {
      this.unblockButtonClick.emit(user);
    }
  }

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    this.currentPage.update((curr) => curr + 1);
    event.target.complete();
  }
}
