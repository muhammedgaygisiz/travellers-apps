import { provideState, provideStore } from '@ngrx/store';
import { Environment, getMetaReducers } from '@travellers-apps/utils-common';
import { fromSite } from './site';
import { fromTaskScenarios } from './taskScenarios';
import { fromUseScenarios } from './useScenarios';
import { fromEssentialUseCases } from './essentialUseCases';
import { fromConcreteUseCases } from './concreteUseCases';
import { fromTaskObjects } from './taskObjects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const provideKosamlStoreFeature = (environment: Environment) => [
  provideStore(
    {},
    {
      metaReducers: getMetaReducers(environment),
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true,
      },
    }
  ),
  provideState(fromSite.key, fromSite.reducer),
  provideState(fromTaskScenarios.key, fromTaskScenarios.reducer),
  provideState(fromUseScenarios.key, fromUseScenarios.reducer),
  provideState(fromEssentialUseCases.key, fromEssentialUseCases.reducer),
  provideState(fromConcreteUseCases.key, fromConcreteUseCases.reducer),
  provideState(fromTaskObjects.key, fromTaskObjects.reducer),
  !environment.production ? provideStoreDevtools() : [],
];
