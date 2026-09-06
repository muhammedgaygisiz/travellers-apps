import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { Bite } from 'model';

/**
 * Resolves a street address for Bites that carry a position but no address.
 *
 * One Bite at a time: the operator picks the target, unlike the collection
 * migrations that walk a collection on one press.
 */
@Component({
  selector: 'lib-bite-address-backfill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe],
  templateUrl: './bite-address-backfill.html',
  styleUrl: '../migration-page.scss',
})
export class BiteAddressBackfill {
  readonly bites = input<Bite[]>([]);

  readonly backfillBiteAddress = output<Bite>();
  readonly logoutClick = output<void>();

  readonly bitesNeedingAddressBackfill = computed(() =>
    this.bites().filter((bite) => bite.addressStatus !== 'resolved'),
  );
}
