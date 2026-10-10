import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAlert,
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import type { FollowSuggestion, PublicUser } from 'model';
import { FollowSuggestionsComponent } from 'bite-tribe/follow-suggestions-ui';
import { PATH } from 'utils';
import { PageComponent } from 'common/ui/page';
import { HapticsService } from 'haptics';
import { OverlayEventDetail } from '@ionic/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ImageErroredPipe } from './pipes/image-errored.pipe';

const UNFOLLOW = 'unfollow';
const CANCEL = 'cancel';

@Component({
  selector: 'followers-list',
  standalone: true,
  imports: [
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonAvatar,
    PageComponent,
    IonSpinner,
    IonAlert,
    IonIcon,
    TranslocoPipe,
    ImageErroredPipe,
    FollowSuggestionsComponent,
  ],
  templateUrl: 'followers-list.component.html',
  styleUrls: ['followers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersListComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly haptics = inject(HapticsService);

  users = input.required<PublicUser[] | undefined>();
  type = input.required<'followers' | 'following'>();
  loggedInUserId = input<string>();
  isLoading = input<boolean>(false);
  /** The read failed, which is not the same as having no followers (#1232). */
  hasError = input(false, { transform: booleanAttribute });
  profileOwnerid = input<string>();
  followSuggestions = input<FollowSuggestion[]>([]);
  followSuggestionsPending = input<ReadonlySet<string>>(new Set());
  followSuggestionsLoading = input(false);

  userClick = output<PublicUser>();
  unfollowClick = output<PublicUser>();
  retryClick = output<void>();
  followSuggestion = output<FollowSuggestion>();
  followSuggestionsShown = output<number>();
  suggestionClick = output<string>();

  /**
   * Only the user's own Following list offers people to follow, empty or not
   * (issue #1708). Someone else's list says nothing about what the viewer
   * should do next.
   */
  protected readonly offersFollowSuggestions = computed(
    () =>
      this.type() === 'following' &&
      !!this.loggedInUserId() &&
      this.loggedInUserId() === this.profileOwnerid(),
  );

  protected readonly showsFollowSuggestions = computed(
    () =>
      this.offersFollowSuggestions() &&
      (this.followSuggestionsLoading() || this.followSuggestions().length > 0),
  );

  protected readonly isEmptyList = computed(
    () => (this.users()?.length ?? 0) === 0,
  );

  /**
   * Whether the list has finished its first read. Suggestions wait for it, so
   * they never sit under the loading spinner of a page that has not said yet
   * what the list holds - and once shown they stay through the reload a
   * follow from them triggers, rather than unmounting with the list.
   */
  private readonly listSettled = signal(false);

  private readonly settleList = effect(() => {
    if (!this.isLoading()) {
      this.listSettled.set(true);
    }
  });

  protected readonly showsFollowSuggestionsSection = computed(
    () =>
      this.showsFollowSuggestions() && !this.hasError() && this.listSettled(),
  );

  /**
   * The row whose unfollow is awaiting confirmation, rather than a boolean.
   * A boolean was shared by every row, so one alert per row was constructed up
   * front and a click on any row opened all of them at once — the topmost being
   * the last row's, which is the one that got unfollowed. See GitHub issue
   * #1334.
   */
  userPendingUnfollow = signal<PublicUser | undefined>(undefined);
  imageErroredUserIds = signal<Set<string>>(new Set());

  sortedUsers = computed(() =>
    [...(this.users() ?? [])].sort((a, b) =>
      (a.displayName ?? '').localeCompare(b.displayName ?? ''),
    ),
  );

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  /**
   * The title's translation key, translated by the pipe in the template. A
   * `translate()` call here ran once, before the translations had loaded, so
   * the page could show the raw lower-case key, and never followed a language
   * change after that.
   */
  titleKey = computed((): 'followers' | 'following' =>
    this.type() === 'followers' ? 'followers' : 'following',
  );

  confirmationButtons = [
    {
      text: this.transloco.translate('cancel'),
      role: CANCEL,
    },
    {
      text: this.transloco.translate('yes-unfollow'),
      role: UNFOLLOW,
    },
  ];

  readonly defaultHref = `/${PATH.MY_PROFILE}`;

  openConfirmationDialog(
    event: Pick<Event, 'stopPropagation'>,
    user: PublicUser,
  ): void {
    event.stopPropagation();
    this.userPendingUnfollow.set(user);
  }

  handleConfirmationDismiss(
    event: CustomEvent<OverlayEventDetail>,
    user: PublicUser,
  ): void {
    const role = event.detail.role;

    if (role === UNFOLLOW) {
      // The confirming tap on a destructive alert gets the `warning` intent
      // reserved for exactly that. Cancelling, and opening the alert, stay
      // silent. See GitHub issue #1636.
      void this.haptics.warning();

      this.unfollow(user);
    }

    this.userPendingUnfollow.set(undefined);
  }

  unfollow(user: PublicUser): void {
    if (user) {
      this.unfollowClick.emit(user);
    }
  }
}
