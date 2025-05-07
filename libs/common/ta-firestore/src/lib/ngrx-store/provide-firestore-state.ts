import { provideState } from '@ngrx/store';
import { EnvironmentProviders } from '@angular/core';
import { key } from './key';
import { reducer } from './reducer';

export const provideFirestoreState = (): EnvironmentProviders[] => [
  provideState(key, reducer),
];
