import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserManagementComponent } from '../component/user-management.component';
import { UserManagementService } from './user-management.service';

@Component({
  template: `<lib-user-management
    class="ion-page"
    [users]="service.users()"
    [loading]="service.loading()"
    [saving]="service.saving()"
    [savingTier]="service.savingTier()"
    [selected]="service.selected()"
    (selectUser)="service.select($event)"
    (save)="service.save($event.uid, $event.roles)"
    (saveTier)="
      service.saveSubscriptionTier($event.uid, $event.tier, $event.reason)
    "
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserManagementComponent],
})
export class UserManagementContainer {
  readonly service = inject(UserManagementService);
}
