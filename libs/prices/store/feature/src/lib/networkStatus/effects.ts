import { inject, Injectable } from '@angular/core';
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
  private readonly actions$ = inject(Actions);
  private readonly networkStatusService = inject(NetworkStatusService);

  checkNetworkStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.networkStatusService.status$),
      map((isOnline) => this.getAction(isOnline))
    )
  );

  private getAction(isOnline: boolean): any {
    return networkStatusChanged({ isOnline });
  }
}
