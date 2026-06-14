import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAvatar,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchbarInputEventDetail } from '@ionic/core';
import type { PublicUser } from 'model';

@Component({
  selector: 'search-page',
  templateUrl: 'search.page.html',
  styleUrl: 'search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonAvatar,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class SearchPage {
  users = input<PublicUser[]>([]);
  isLoading = input(false);
  hasSearched = input(false);

  searchTextChange = output<string>();
  userClick = output<PublicUser>();

  imageErroredUserIds = signal<Set<string>>(new Set());
  sortedUsers = computed(() =>
    [...this.users()].sort((a, b) =>
      (a.displayName ?? '').localeCompare(b.displayName ?? ''),
    ),
  );

  searchbarInput(event: CustomEvent<SearchbarInputEventDetail>): void {
    this.searchTextChange.emit(event.detail.value ?? '');
  }

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((ids) => new Set([...ids, userId]));
  }
}
