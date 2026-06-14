import { computed, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import type { PublicUser } from 'model';
import { PATH } from 'utils';

const MIN_SEARCH_TEXT_LENGTH = 3;

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly dataAccessService = inject(SearchDataAccessService);
  private readonly navController = inject(NavController);

  readonly users = this.dataAccessService.users;
  readonly hasSearched = computed(
    () =>
      this.dataAccessService.searchText().trim().length >=
      MIN_SEARCH_TEXT_LENGTH,
  );

  searchUsers(searchText: string): void {
    this.dataAccessService.searchText.set(searchText);
  }

  userClicked(user: PublicUser): void {
    void this.navController.navigateForward([PATH.PROFILE, user.userId]);
  }
}
