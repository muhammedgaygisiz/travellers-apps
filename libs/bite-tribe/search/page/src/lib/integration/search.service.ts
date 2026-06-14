import { inject, Injectable } from '@angular/core';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly dataAccessService = inject(SearchDataAccessService);

  readonly users = this.dataAccessService.users;

  searchUsers(searchText: string): void {
    this.dataAccessService.searchText.set(searchText);
  }
}
