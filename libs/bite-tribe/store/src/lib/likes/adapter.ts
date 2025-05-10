import { createEntityAdapter, EntityState } from '@ngrx/entity';

const selectId = (like: any): string => {
  return `${like.biteId}-${like.userId}`;
};

export const adapter = createEntityAdapter<any>({
  selectId,
});

export const initialState: EntityState<any> = adapter.getInitialState();
