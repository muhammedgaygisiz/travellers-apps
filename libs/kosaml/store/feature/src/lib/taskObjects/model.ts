import { EntityState } from '@ngrx/entity';
import { TaskObject } from '@travellers-apps/kosaml/model/feature';

export interface TaskObjectState extends EntityState<TaskObject> {
  selectedTaskObjectId: string;
}
