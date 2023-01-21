import { EntityState } from '@ngrx/entity';
import { ConcreteUseCase } from '@travellers-apps/kosaml/model/feature';

export interface ConcreteUseCaseState extends EntityState<ConcreteUseCase> {
  selectedConcreteUseCaseId: string;
}
