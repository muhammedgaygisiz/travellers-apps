import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'market-place-page',
  styleUrl: 'market-place.page.scss',
  templateUrl: 'market-place.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent],
})
export class MarketPlacePage {}
