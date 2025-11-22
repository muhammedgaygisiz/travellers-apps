import { createReducer, on } from '@ngrx/store';
import { AppActions } from './actions';
import { AppSlice } from './app-slice.model';
import { BiteActions } from '../bites/actions';
import { fromAuth } from 'ta-firestore';

const initialState: AppSlice = {
  profile: undefined,
  settings: {
    pushNotifications: false,
    emailUpdates: false,
    theme: 'light',
    currency: 'EUR',
    nearby: 2000,
  },
  loading: {
    home: true,
  },
  sortingAndFiltering: {
    sorting: {
      home: 'distance',
      myBites: 'distance',
      bucketlists: 'distance',
    },
    filtering: {
      home: {
        filters: [],
        distance: undefined,
        maxPrice: 0,
      },
    },
  },
  exchangeRates: { EUR: 1 },
  errorLoadingGpsPosition: false,
};

export const reducer = createReducer<AppSlice>(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, () => initialState),
  on(BiteActions.loadedFromAPI, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: false,
    },
  })),
  on(fromAuth.AuthActions.loginSucceeded, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: true,
    },
  })),
  on(AppActions.reloadGPSPosition, (state) => {
    return {
      ...state,
      reloading: {
        home: true,
      },
    };
  }),
  on(AppActions.errorLoadingGPSPosition, (state) => ({
    ...state,
    reloading: {
      home: false,
    },
    errorLoadingGpsPosition: true,
  })),
  on(AppActions.clearGPSError, (state) => ({
    ...state,
    errorLoadingGpsPosition: false,
  })),
  on(AppActions.loadedGPSPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
      reloading: {
        home: false,
      },
      errorLoadingGpsPosition: false,
    };
  }),
  on(AppActions.loadedSettingsFromAPI, (state, { settings }) => {
    return {
      ...state,
      settings,
    };
  }),
  on(AppActions.setPublicProfile, (state, { profile }) => {
    return {
      ...state,
      profile,
    };
  }),
  on(AppActions.goPrivate, (state) => ({
    ...state,
    profile: undefined,
  })),
  on(AppActions.setHomeFilters, (state, { filters }) => ({
    ...state,
    sortingAndFiltering: {
      ...state.sortingAndFiltering,
      filtering: {
        ...state.sortingAndFiltering?.filtering,
        home: {
          filters: filters.tagFilters,
          distance: +filters.distanceFilter,
          maxPrice: filters.priceFilter,
        },
      },
    },
  })),
  on(AppActions.clearHomeFilters, (state) => ({
    ...state,
    sortingAndFiltering: {
      ...state.sortingAndFiltering,
      filtering: {
        ...state.sortingAndFiltering?.filtering,
        home: {
          filters: [],
          distance: undefined,
          maxPrice: 0,
        },
      },
    },
  })),
  on(AppActions.loadedExchangeRatesFromAPI, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
  on(AppActions.setHomeSorting, (state, { sorting }) => ({
    ...state,
    sortingAndFiltering: {
      ...state.sortingAndFiltering,
      sorting: {
        ...state.sortingAndFiltering?.sorting,
        home: sorting,
      },
    },
  })),
  on(AppActions.setMyBitesSorting, (state, { sorting }) => ({
    ...state,
    sortingAndFiltering: {
      ...state.sortingAndFiltering,
      sorting: {
        ...state.sortingAndFiltering?.sorting,
        myBites: sorting,
      },
    },
  })),
  on(AppActions.setBucketlistSorting, (state, { sorting }) => ({
    ...state,
    sortingAndFiltering: {
      ...state.sortingAndFiltering,
      sorting: {
        ...state.sortingAndFiltering?.sorting,
        bucketlists: sorting,
      },
    },
  })),
);
