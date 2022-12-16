import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { EssentialUseCase } from '@travellers-apps/kosaml/model/feature';
import { selectEssentialUseScenario } from './actions';

export const selectEssentialUseCaseId = (euc: EssentialUseCase) =>
  euc?.id || '';

export const adapter: EntityAdapter<EssentialUseCase> =
  createEntityAdapter<EssentialUseCase>({
    selectId: selectEssentialUseCaseId,
  });

export const initialState = adapter.getInitialState({
  selectedEssentialUseCaseId: '',
});

const initialStateWithDummy = adapter.upsertMany(
  [
    {
      id: '1',
      essentialUseCase: [
        {
          usersPurpose: 'Enter search parameters',
          systemResponsibility: 'Show results',
        },
        {
          usersPurpose: 'Select a resource',
          systemResponsibility:
            'Show the contact details of the owner of the selected resource',
        },
        {
          usersPurpose: 'Send an e-mail',
          systemResponsibility: 'Confirm the send',
        },
      ],
    },
  ],
  initialState
);

export const reducer = createReducer(
  initialStateWithDummy,
  on(selectEssentialUseScenario, (state, { id }) => ({
    ...state,
    selectedEssentialUseCaseId: id,
  }))
);
