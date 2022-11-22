import { EntityState } from '@ngrx/entity';
import { UseScenario } from '@travellers-apps/kosaml/model/feature';

export interface UseScenarioState extends EntityState<UseScenario> {
  // additional entities state properties
  selectedUseScenarioId: string;
}
