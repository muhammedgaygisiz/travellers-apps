import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Bank } from 'finances/store';

type DashboardState = {
  banks: Bank[];
};

const initialState: DashboardState = {
  banks: [],
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setBanks(banks: Bank[]) {
      patchState(store, { banks });
    },
  }))
);
