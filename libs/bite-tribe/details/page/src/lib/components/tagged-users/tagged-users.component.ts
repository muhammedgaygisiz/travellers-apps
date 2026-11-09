import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PublicUser } from 'model';

/** How many names show before the rest fold into "+N". */
export const VISIBLE_TAGGED_USERS = 2;

/**
 * "Ate with" on the Bite details (GitHub issue #1918): the people the creator
 * tagged, each name a link to that profile.
 *
 * Presentational only. The list arrives already filtered to what this viewer
 * may see; an empty list renders nothing. A label followed by names rather
 * than a sentence, so no language has to fit names into one word order.
 */
@Component({
  selector: 'bt-tagged-users',
  templateUrl: './tagged-users.component.html',
  styleUrl: './tagged-users.component.scss',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaggedUsersComponent {
  users = input<PublicUser[]>([]);

  readonly openProfile = output<PublicUser>();

  readonly expanded = signal(false);

  readonly shownUsers = computed(() =>
    this.expanded()
      ? this.users()
      : this.users().slice(0, VISIBLE_TAGGED_USERS),
  );

  readonly hiddenCount = computed(() =>
    this.expanded()
      ? 0
      : Math.max(0, this.users().length - VISIBLE_TAGGED_USERS),
  );
}
