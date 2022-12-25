import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskObjectState } from './model';
import { key } from './key';
import { adapter } from './reducers';

const taskObjectSlice = createFeatureSelector<TaskObjectState>(key);

const { selectEntities } = adapter.getSelectors();

const selectTaskObjectEntities = createSelector(
  taskObjectSlice,
  selectEntities
);

const getSelectedTaskObject = (slice: TaskObjectState) =>
  slice.selectedTaskObjectId;

const selectCurrentTaskObject = createSelector(
  taskObjectSlice,
  getSelectedTaskObject
);

export const selectSelectedTaskObject = createSelector(
  selectTaskObjectEntities,
  selectCurrentTaskObject,
  (taskObjectEntities, taskObjectId) =>
    taskObjectEntities[taskObjectId]?.taskObject
);
