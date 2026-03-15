import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent } from '@ionic/angular/standalone';
import type { BiteTrail } from 'model';
import { BiteTrailComponent } from 'bite-trail';

@Component({
  selector: 'market-place-page',
  styleUrl: 'market-place.page.scss',
  templateUrl: 'market-place.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, BiteTrailComponent],
})
export class MarketPlacePage {
  biteTrails = input<BiteTrail[] | undefined>();
}
