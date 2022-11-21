import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { TaskScenario } from '@travellers-apps/kosaml/model/feature';
import { selectTaskScenario } from './actions';

export const selectedTaskScenarioId = (ts: TaskScenario) => ts?.id || '';

export const adapter: EntityAdapter<TaskScenario> =
  createEntityAdapter<TaskScenario>({
    selectId: selectedTaskScenarioId,
  });

export const initialState = adapter.getInitialState({
  // additional entity state properties
  selectedTaskScenarioId: '',
});

const initialStateWithDummy = adapter.upsertOne(
  {
    description: 'Lorem ipsum',
    id: '1',
    title: 'Task Scenario 1',
  },
  initialState
);

export const reducer = createReducer(
  initialStateWithDummy,
  on(selectTaskScenario, (state, { id }) => ({
    ...state,
    selectedTaskScenarioId: id,
  }))
);
