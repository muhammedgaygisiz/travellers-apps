import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Environment, ModuleForStore } from '@travellers-apps/utils-common';
import { ActionReducer, MetaReducer, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { fromSite } from './site';
import { fromTaskScenarios } from './taskScenarios';
import { fromUseScenarios } from './useScenarios';

const debug = (reducer: ActionReducer<any>): ActionReducer<any> => {
  return (state, action) => {
    console.log('state', state);
    console.log('action', action);

    return reducer(state, action);
  };
};

// Developers can think of meta-reducers as hooks into the action->reducer pipeline.
// Meta-reducers allow developers to pre-process actions before normal reducers are invoked.
// see https://ngrx.io/guide/store/metareducers
const metaReducers: MetaReducer<any>[] = [debug];

@NgModule({
  imports: [CommonModule],
})
export class KosamlStoreFeatureModule {
  static forRoot(environment: Environment): ModuleForStore[] {
    return [
      StoreModule.forRoot(
        {},
        {
          metaReducers: !environment.production ? metaReducers : [],
          runtimeChecks: {
            strictActionImmutability: true,
            strictStateImmutability: true,
          },
        }
      ),
      StoreModule.forFeature(fromSite.key, fromSite.reducer),
      StoreModule.forFeature(fromTaskScenarios.key, fromTaskScenarios.reducer),
      StoreModule.forFeature(fromUseScenarios.key, fromUseScenarios.reducer),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
    ];
  }
}
