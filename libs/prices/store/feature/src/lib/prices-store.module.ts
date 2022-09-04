import {ModuleWithProviders} from '@angular/core';
import {StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {StoreDevtoolsModule} from "@ngrx/store-devtools";
import {StoreRootModule} from "@ngrx/store/src/store_module";
import {fromApp} from './store';

type Environment = { production: boolean };

type ModuleForStore = ModuleWithProviders<StoreRootModule> | any[];

export class PricesStoreModule {
  static forRoot(environment: Environment): ModuleForStore[] {
    return [
      StoreModule.forRoot(
        fromApp.ROOT_REDUCERS,
        {
          metaReducers: fromApp.getMetaReducers(environment),
          runtimeChecks: {
            strictActionImmutability: true,
            strictStateImmutability: true,
          },
        }
      ),
      EffectsModule.forRoot([]),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
    ];
  }
}
