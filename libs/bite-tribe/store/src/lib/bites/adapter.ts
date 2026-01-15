import { createEntityAdapter } from '@ngrx/entity';
import type { Bite } from 'model';

export const adapter = createEntityAdapter<Bite>();

export const initialState = adapter.getInitialState();
