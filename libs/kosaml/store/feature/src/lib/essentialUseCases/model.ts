import { EntityState } from '@ngrx/entity';
import { EssentialUseCase } from '@travellers-apps/kosaml/model/feature';

export interface EssentialUseCaseState extends EntityState<EssentialUseCase> {
  selectedEssentialUseCaseId: string;
}
