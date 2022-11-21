import { createReducer, on } from '@ngrx/store';
import { toggleProjectBar } from './actions';
import { SiteState } from './model';

const initialState: SiteState = {
  isProjectBarOpen: true,
  isToolBarOpen: false,
  loading: false,
  projectStructure: [],
  sidebarWidth: '250px',
};

export const reducer = createReducer(
  initialState,
  on(toggleProjectBar, (state) => ({
    ...state,
    isProjectBarOpen: !state.isProjectBarOpen,
  }))
);
