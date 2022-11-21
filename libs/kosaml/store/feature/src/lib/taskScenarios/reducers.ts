import { createReducer } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { TaskScenario } from '@travellers-apps/kosaml/model/feature';

export const selectedTaskScenarioId = (ts: TaskScenario) => ts?.id || '';

export const adapter: EntityAdapter<TaskScenario> =
  createEntityAdapter<TaskScenario>({
    selectId: selectedTaskScenarioId,
  });

export const initialState = adapter.getInitialState({
  // additional entity state properties
  selectedTaskScenarioId: null,
});

export const reducer = createReducer(initialState);
