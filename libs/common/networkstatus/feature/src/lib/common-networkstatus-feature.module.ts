import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkStatusService } from './network-status.service';

@NgModule({
  imports: [CommonModule],
  providers: [NetworkStatusService],
})
export class CommonNetworkstatusFeatureModule {}
