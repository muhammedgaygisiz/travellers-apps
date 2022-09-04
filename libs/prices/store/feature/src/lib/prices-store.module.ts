import {ModuleWithProviders} from '@angular/core';
import {StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {StoreDevtoolsModule} from "@ngrx/store-devtools";
import {StoreRootModule} from "@ngrx/store/src/store_module";

type Environment = { production: boolean };

type ModuleForStore = ModuleWithProviders<StoreRootModule> | any[];

export class PricesStoreModule {
  static forRoot(environment: Environment): ModuleForStore[] {
    return [
      StoreModule.forRoot({}),
      EffectsModule.forRoot([]),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
    ];
  }
}
