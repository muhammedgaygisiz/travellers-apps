import { createReducer, on } from '@ngrx/store';
import { toggleProjectBar } from './actions';
import { SiteState } from './model';
import { dummyStructure } from './dummies';

const initialState: SiteState = {
  isProjectBarOpen: true,
  isToolBarOpen: false,
  loading: false,
  projectStructure: dummyStructure,
  sidebarWidth: '250px',
};

export const reducer = createReducer(
  initialState,
  on(toggleProjectBar, (state) => ({
    ...state,
    isProjectBarOpen: !state.isProjectBarOpen,
  }))
);
