import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { Bite } from 'model';

/**
 * Moves a Bite's inline base64 image into Storage and points the document at
 * the uploaded object instead.
 *
 * The upload itself lives in data-access rather than here: this page picks the
 * target and shows the before/after, which is all a page component owns.
 */
@Component({
  selector: 'lib-image-migration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonButton, IonText, TranslocoPipe],
  templateUrl: './image-migration.html',
  styleUrl: '../migration-page.scss',
})
export class ImageMigration {
  readonly bites = input<Bite[]>([]);

  readonly migrateImage = output<Bite>();
  readonly logoutClick = output<void>();

  readonly bitesNeedingMigration = computed(() =>
    this.bites().filter((bite) => !bite.imagePath || bite.image),
  );
}
