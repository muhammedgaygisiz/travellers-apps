import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { AdminTableSession } from 'bite-tribe-admin/restaurants-data-access';

/**
 * Every table session in BiteTribe, most recently active first (GitHub issue
 * #1629).
 *
 * The operator's view of a thing each restaurant also sees for itself. The
 * business app's list answers "who is in my room", which is a service question
 * and is therefore live and trimmed to the sessions that have not ended; this
 * one answers "what happened at a table", which is support - so it keeps the
 * ended sessions, spans every restaurant, and is read once rather than
 * watched.
 */
@Component({
  selector: 'lib-table-sessions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    TranslocoPipe,
  ],
  templateUrl: './table-sessions.html',
  styles: `
    /* The measure every other operator list uses, so moving between them
       keeps one column width. */
    .table-sessions {
      margin: 0 auto;
      max-width: 40rem;
    }
  `,
})
export class TableSessions {
  readonly sessions = input<AdminTableSession[]>([]);

  readonly logoutClick = output<void>();

  /** When the guest was last doing something, as a local timestamp. */
  protected lastActive(session: AdminTableSession): string {
    return new Date(session.lastActiveAt).toLocaleString();
  }

  /** The table the party is sitting at now, where staff moved them. */
  protected movedTo(session: AdminTableSession): string | undefined {
    return session.currentTableId && session.currentTableId !== session.tableId
      ? (session.currentTableLabel ?? session.currentTableId)
      : undefined;
  }
}
