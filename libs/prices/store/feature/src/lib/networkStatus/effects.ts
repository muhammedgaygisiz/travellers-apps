import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { map, switchMap } from 'rxjs';
import { networkStatusChanged } from './actions';
import { NetworkStatusService } from '@travellers-apps/common/networkstatus/feature';

@Injectable()
export class NetworkEffects {
  checkNetworkStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.networkStatusService.status$),
      map((isOnline) => this.getAction(isOnline))
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly networkStatusService: NetworkStatusService
  ) {}

  private getAction(isOnline: boolean) {
    return networkStatusChanged({ isOnline });
  }
}
