import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bank } from '../model/bank';

export const adapter = createEntityAdapter<Bank>();

export const initialState: EntityState<Bank> = adapter.getInitialState({
  ids: ['1', '2'],
  entities: {
    '1': { id: '1', name: 'ING' },
    '2': { id: '2', name: 'Postfinance' },
  },
});
