import { inject, Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from '../bites/selectors';
import { userId } from '../router/selectors';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);

  bite = toSignal(this.store.select(bite));
  userId = toSignal(this.store.select(userId));
}
