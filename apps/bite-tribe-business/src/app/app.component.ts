import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { ConnectionStatus, Network } from '@capacitor/network';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NetworkStatusService } from 'common/networkstatus';
import { AppCheckGateComponent, AppCheckReadinessService } from 'ta-firestore';
import { addNecessaryIcons } from 'bite-tribe-business/shell';

@Component({
  selector: 'bt-business-root',
  template: `
    <ion-app>
      @if (appCheckReadiness.isBlocked()) {
        <bite-app-check-gate />
      } @else {
        <ion-router-outlet />
      }
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet, AppCheckGateComponent],
})
export class AppComponent implements OnDestroy {
  title = 'bite-tribe-business';

  readonly appCheckReadiness = inject(AppCheckReadinessService);
  private readonly networkStatusService = inject(NetworkStatusService);

  constructor() {
    addNecessaryIcons();

    this.initNetworkStatusHandler();
  }

  ngOnDestroy(): void {
    void Network.removeAllListeners();
  }

  /**
   * Keeps `NetworkStatusService` current in this app too
   * (GitHub issue #1096).
   *
   * The service reads the status once at startup and is otherwise fed entirely
   * by this listener, which until now only the consumer app registered - so in
   * the business app it answered "connected" for the whole of a session
   * whatever the wifi did. The staff table view decides whether to send a
   * transition or write it down off that answer, and a staff view that never
   * learns it is offline is a staff view that waits out a timeout per seating.
   *
   * Deliberately the same mechanism rather than a second one: the issue is
   * explicit that the existing network-state capability in `libs/common` is
   * what this reuses.
   */
  private initNetworkStatusHandler(): void {
    void Network.addListener(
      'networkStatusChange',
      (event: ConnectionStatus) => {
        this.networkStatusService.setNetworkStatus(event);
      },
    );
  }
}
