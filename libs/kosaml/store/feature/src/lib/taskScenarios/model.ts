import { EntityState } from '@ngrx/entity';
import { TaskScenario } from '@travellers-apps/kosaml/model/feature';

export interface TaskScenarioState extends EntityState<TaskScenario> {
  // additional entities state properties
  selectedTaskScenarioId: string;
}
