import { combineLatest, fromEvent, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  online$ = fromEvent(window, 'online').pipe(
    startWith(null),
    map(() => 'online'),
  );
  offline$ = fromEvent(window, 'offline').pipe(
    startWith(null),
    map(() => 'offline'),
  );

  status$ = combineLatest([this.online$, this.offline$]).pipe(
    map(() => navigator.onLine),
  );

  status = toSignal(this.status$);
}
