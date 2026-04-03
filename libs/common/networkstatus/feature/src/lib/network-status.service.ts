import { Injectable, linkedSignal } from '@angular/core';
import { Network } from '@capacitor/network';
import { from } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  _status = toSignal(from(Network.getStatus()));

  status = linkedSignal(this._status);

  setNetworkStatus(networkStatusEvent: any): void {
    this.status.set(networkStatusEvent);
  }
}
