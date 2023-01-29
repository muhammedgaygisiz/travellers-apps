import { Provider } from '@angular/core';
import { NetworkStatusService } from './network-status.service';

export const provideNetworkStatus = (): Provider => ({
  provide: NetworkStatusService,
});
