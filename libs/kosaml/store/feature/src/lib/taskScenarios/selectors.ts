import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskScenarioState } from './model';
import { key } from './key';
import { adapter } from './reducers';

export const selectTaskScenarioState =
  createFeatureSelector<TaskScenarioState>(key);

const { selectEntities } = adapter.getSelectors();

export const selectTaskScenarioEntities = createSelector(
  selectTaskScenarioState,
  selectEntities
);

export const getSelectedTaskScenarioId = (state: TaskScenarioState) =>
  state.selectedTaskScenarioId;

export const selectCurrentTaskScenarioId = createSelector(
  selectTaskScenarioState,
  getSelectedTaskScenarioId
);

export const selectSelectedTaskScenario = createSelector(
  selectTaskScenarioEntities,
  selectCurrentTaskScenarioId,
  (taskScenarioEntities, taskScenarioId) => taskScenarioEntities[taskScenarioId]
);
