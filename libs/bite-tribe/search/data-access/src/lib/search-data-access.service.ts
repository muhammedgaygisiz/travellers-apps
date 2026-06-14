import { Injectable, resource, ResourceLoader, signal } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { PublicUser } from 'model';

const MIN_SEARCH_TEXT_LENGTH = 3;

interface SearchUsersParams {
  searchText: string;
}

@Injectable({ providedIn: 'root' })
export class SearchDataAccessService {
  readonly searchText = signal('');

  usersLoader: ResourceLoader<PublicUser[], SearchUsersParams> = async ({
    params,
  }) => {
    if (params.searchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    const result = await FirebaseFunctions.callByName<
      SearchUsersParams,
      PublicUser[]
    >({
      name: 'searchUsers',
      data: params,
    });
    return result.data;
  };

  readonly users = resource({
    params: () => ({
      searchText: this.searchText().trim(),
    }),
    loader: this.usersLoader.bind(this),
    defaultValue: [],
  });
}
