import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { NavController } from '@ionic/angular';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import {
  DeleteMyAccountComponent,
  type DeleteMyAccountRequest,
} from '../components/delete-my-account/delete-my-account.component';
import { DeleteMyAccountService } from 'bite-tribe/account-data-access';

@Component({
  template: `
    <delete-my-account
      class="ion-page"
      [identity]="service.identity()"
      [deleting]="deleting()"
      [failed]="failed()"
      [failure]="service.failure()"
      [passwordRequired]="service.passwordRequired()"
      (deleteAccount)="onDeleteAccount($event)"
      (cancelDelete)="onCancel()"
    />
  `,
  imports: [DeleteMyAccountComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteMyAccountContainer {
  readonly service = inject(DeleteMyAccountService);
  private readonly navController = inject(NavController);

  readonly deleting = computed(() => this.service.state() === 'deleting');
  readonly failed = computed(() => this.service.state() === 'failed');

  ionViewDidEnter(): void {
    this.service.reset();

    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Delete Account',
    });
  }

  onDeleteAccount(request: DeleteMyAccountRequest): void {
    void this.service.deleteAccount({
      confirmedUid: request.uid,
      password: request.password,
    });
  }

  onCancel(): void {
    void this.navController.navigateBack(['settings']);
  }
}
