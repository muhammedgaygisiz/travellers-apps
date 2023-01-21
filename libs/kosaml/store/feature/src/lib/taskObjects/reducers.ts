import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { TaskObject } from '@travellers-apps/kosaml/model/feature';
import { selectTaskObject } from './actions';

export const selectTaskObjectId = (cuc: TaskObject) => cuc?.id || '';

export const adapter: EntityAdapter<TaskObject> =
  createEntityAdapter<TaskObject>({
    selectId: selectTaskObjectId,
  });

export const initialState = adapter.getInitialState({
  selectedTaskObjectId: '',
});

const initialStateWithDummy = adapter.upsertMany(
  [
    {
      id: '1',
      taskObject: [
        {
          taskObject: 'CD-ROM',
          attributes: [
            'Keywords',
            'Title',
            'Author',
            'Year',
            'Platform',
            'Owned by (academic, researcher, or research student)',
          ],
          actions: [
            'View',
            'Add',
            'Print',
            'Delete',
            'Save',
            'Reserve',
            'Edit',
          ],
        },
      ],
    },
  ],
  initialState
);

export const reducer = createReducer(
  initialStateWithDummy,
  on(selectTaskObject, (state, { id }) => ({
    ...state,
    selectedTaskObjectId: id,
  }))
);
