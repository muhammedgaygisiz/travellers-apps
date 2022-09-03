import {ModuleWithProviders, NgModule} from '@angular/core';
import { CommonModule } from '@angular/common';
import {StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {StoreDevtoolsModule} from "@ngrx/store-devtools";

// StoreModule.forRoot(
//   {},
//   {
//     metaReducers: !environment.production ? [] : [],
//     runtimeChecks: {
//       strictActionImmutability: true,
//       strictStateImmutability: true,
//     },
//   }
// ),
// EffectsModule.forRoot([]),
// !environment.production ? StoreDevtoolsModule.instrument() : [],

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forRoot(
      {},
      {
        metaReducers: [],
        runtimeChecks: {
          strictActionImmutability: true,
          strictStateImmutability: true,
        }
      }
    ),
    EffectsModule.forRoot([]),
    StoreDevtoolsModule.instrument()
  ],
})
export class PricesStoreModule { }
