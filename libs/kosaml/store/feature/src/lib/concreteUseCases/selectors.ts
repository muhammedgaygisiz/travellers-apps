import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ConcreteUseCaseState } from './model';
import { key } from './key';
import { adapter } from './reducers';

const concreteUseCaseSlice = createFeatureSelector<ConcreteUseCaseState>(key);

const { selectEntities } = adapter.getSelectors();

const selectConcreteUseCaseEntities = createSelector(
  concreteUseCaseSlice,
  selectEntities
);

const getSelectedConcreteUseCase = (slice: ConcreteUseCaseState) =>
  slice.selectedConcreteUseCaseId;

const selectCurrentConcreteUseCase = createSelector(
  concreteUseCaseSlice,
  getSelectedConcreteUseCase
);

export const selectSelectedConcreteUseCase = createSelector(
  selectConcreteUseCaseEntities,
  selectCurrentConcreteUseCase,
  (concreteUseCaseEntities, concreteUseCaseId) =>
    concreteUseCaseEntities[concreteUseCaseId]?.concreteUseCase
);
