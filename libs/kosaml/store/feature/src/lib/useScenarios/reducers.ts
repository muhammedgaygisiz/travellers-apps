import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { UseScenario } from '@travellers-apps/kosaml/model/feature';
import { selectUseScenario } from './actions';

export const selectedUseScenarioId = (us: UseScenario) => us?.id || '';

export const adapter: EntityAdapter<UseScenario> =
  createEntityAdapter<UseScenario>({
    selectId: selectedUseScenarioId,
  });

export const initialState = adapter.getInitialState({
  // additional entity state properties
  selectedUseScenarioId: '',
});

const initialStateWithDummy = adapter.upsertMany(
  [
    {
      description: 'Lorem ipsum',
      id: '1',
      title: 'Use Scenario 1',
    },
    {
      description: 'Lorem ipsum',
      id: '2',
      title: 'Use Scenario 2',
    },
  ],
  initialState
);

export const reducer = createReducer(
  initialStateWithDummy,
  on(selectUseScenario, (state, { id }) => ({
    ...state,
    selectedUseScenarioId: id,
  }))
);
