import { BiteActions } from '../bites/actions';
import { saveNewRestaurant } from '../restaurants/actions';
import { createAction, props } from '@ngrx/store';

const unknownEntity = createAction(
  '[Unknown Entity]',
  props<{ docType: string }>(),
);

export const getActionByDocType = (docType: string, entity: any): any => {
  switch (docType) {
    case 'bite': {
      if (entity.id) {
        return BiteActions.saveExistingBite({ bite: entity });
      }

      return BiteActions.saveNewBite({ bite: entity });
    }
    case 'restaurant': {
      return saveNewRestaurant({ restaurant: entity });
    }
    default: {
      return unknownEntity({ docType });
    }
  }
};
