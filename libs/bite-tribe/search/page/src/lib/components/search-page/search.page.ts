import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'search-page',
  templateUrl: 'search.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonSearchbar, TranslocoPipe],
})
export class SearchPage {}
