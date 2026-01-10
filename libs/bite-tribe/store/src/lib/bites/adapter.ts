import { createEntityAdapter } from '@ngrx/entity';
import { Bite } from 'model';

export const adapter = createEntityAdapter<Bite>();

export const initialState = adapter.getInitialState();
