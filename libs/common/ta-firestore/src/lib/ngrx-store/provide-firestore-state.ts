import { provideState } from '@ngrx/store';
import { EnvironmentProviders } from '@angular/core';
import { key } from './key';
import { reducer } from './reducer';
import { provideEffects } from '@ngrx/effects';
import { AuthEffects } from './effects';

export const provideFirestoreState = (): EnvironmentProviders[] => [
  provideState(key, reducer),
  provideEffects(AuthEffects),
];
