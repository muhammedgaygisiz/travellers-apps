import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { ConcreteUseCase } from '@travellers-apps/kosaml/model/feature';
import { selectConcreteUseCase } from './actions';

export const selectConcreteUseCaseId = (cuc: ConcreteUseCase) => cuc?.id || '';

export const adapter: EntityAdapter<ConcreteUseCase> =
  createEntityAdapter<ConcreteUseCase>({
    selectId: selectConcreteUseCaseId,
  });

export const initialState = adapter.getInitialState({
  selectedConcreteUseCaseId: '',
});

const initialStateWithDummy = adapter.upsertMany(
  [
    {
      id: '1',
      concreteUseCase: [
        {
          userAction: `The academic enters one or more of the search parameters
          for the CD-ROM: title, year and platform`,
          systemResponse: 'The system displays the search results',
        },
        {
          userAction: 'The academic selects a search result',
          systemResponse: `The system displays the full details of the CD-ROM
          and the contact details for its owner who is a research student`,
        },
        {
          userAction: 'The academic choses the e-mail address',
          systemResponse: `The system displays a message area`,
        },
        {
          userAction: 'The academic writes and sends the e-mail request',
          systemResponse: `The system confirms the sending of the request`,
        },
      ],
    },
  ],
  initialState
);

export const reducer = createReducer(
  initialStateWithDummy,
  on(selectConcreteUseCase, (state, { id }) => ({
    ...state,
    selectedConcreteUseCaseId: id,
  }))
);
