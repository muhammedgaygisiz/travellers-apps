import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EssentialUseCaseState } from './model';
import { key } from './key';
import { adapter } from './reducers';

const essentialUseCaseSlice = createFeatureSelector<EssentialUseCaseState>(key);

const { selectEntities } = adapter.getSelectors();

const selectEssentialUseCaseEntities = createSelector(
  essentialUseCaseSlice,
  selectEntities
);

const getSelectedEssentialUseCase = (slice: EssentialUseCaseState) =>
  slice.selectedEssentialUseCaseId;

const selectCurrentEssentialUseCase = createSelector(
  essentialUseCaseSlice,
  getSelectedEssentialUseCase
);

export const selectSelectedEssentialUseCase = createSelector(
  selectEssentialUseCaseEntities,
  selectCurrentEssentialUseCase,
  (essentialUseCaseEntities, essentialUseCaseId) =>
    essentialUseCaseEntities[essentialUseCaseId]?.essentialUseCase
);
