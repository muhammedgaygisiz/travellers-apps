import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UseScenarioState } from './model';
import { key } from './key';
import { adapter } from './reducers';

export const selectUseScenarioState =
  createFeatureSelector<UseScenarioState>(key);

const { selectEntities } = adapter.getSelectors();

export const selectUseScenarioEntities = createSelector(
  selectUseScenarioState,
  selectEntities
);

export const getSelectedUseScenarioId = (state: UseScenarioState) =>
  state.selectedUseScenarioId;

export const selectCurrentUseScenarioId = createSelector(
  selectUseScenarioState,
  getSelectedUseScenarioId
);

export const selectSelectedUseScenario = createSelector(
  selectUseScenarioEntities,
  selectCurrentUseScenarioId,
  (useScenarioEntities, useScenarioId) => useScenarioEntities[useScenarioId]
);
