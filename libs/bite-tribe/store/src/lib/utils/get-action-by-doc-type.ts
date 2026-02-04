import { BiteActions } from '../bites/actions';
import { saveNewRestaurant } from '../restaurants/actions';
import { createAction, props } from '@ngrx/store';
import { Bite, Restaurant } from 'model';

const unknownEntity = createAction(
  '[Unknown Entity]',
  props<{ docType: string }>(),
);

export const getActionByDocType = (
  docType: string,
  entity: Bite | Restaurant,
): any => {
  switch (docType) {
    case 'bite': {
      if (entity.id) {
        return BiteActions.saveExistingBite({ bite: entity as Bite });
      }

      return BiteActions.saveNewBite({ bite: entity as Bite });
    }
    case 'restaurant': {
      return saveNewRestaurant({ restaurant: entity });
    }
    default: {
      return unknownEntity({ docType });
    }
  }
};
