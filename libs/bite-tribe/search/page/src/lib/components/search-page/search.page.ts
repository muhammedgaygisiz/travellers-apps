import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchbarInputEventDetail } from '@ionic/core';

@Component({
  selector: 'search-page',
  templateUrl: 'search.page.html',
  styleUrl: 'search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonSearchbar, TranslocoPipe],
})
export class SearchPage {
  searchTextChange = output<string>();

  searchbarInput(event: CustomEvent<SearchbarInputEventDetail>): void {
    this.searchTextChange.emit(event.detail.value ?? '');
  }
}
