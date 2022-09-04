import {ModuleWithProviders} from '@angular/core';
import {ActionReducer, createReducer, MetaReducer, StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {StoreDevtoolsModule} from "@ngrx/store-devtools";
import {StoreRootModule} from "@ngrx/store/src/store_module";
import {fromMostSearched} from "./mostSearched";

type Environment = { production: boolean };

type ModuleForStore = ModuleWithProviders<StoreRootModule> | any[];

const debug = (reducer: ActionReducer<any>): ActionReducer<any> => {
  return (state, action) => {
    console.log('state', state);
    console.log('action', action);

    return reducer(state, action);
  }
};

// Developers can think of meta-reducers as hooks into the action->reducer pipeline.
// Meta-reducers allow developers to pre-process actions before normal reducers are invoked.
// see https://ngrx.io/guide/store/metareducers
const metaReducers: MetaReducer<any>[] = [debug];

export class PricesStoreModule {
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
      StoreModule.forFeature(fromMostSearched.key, fromMostSearched.reducer),
      EffectsModule.forRoot([]),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
    ];
  }
}
