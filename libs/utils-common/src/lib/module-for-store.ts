import { ModuleWithProviders } from '@angular/core';
import { StoreRootModule } from '@ngrx/store/src/store_module';

export type ModuleForStore = ModuleWithProviders<StoreRootModule> | any[];
