import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { PATH } from 'utils';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Workflow for the placeholder onboarding page. Dismissing releases the entry
 * gate for the current session and sends the user into the app. The real
 * assistant (with the completion flag write) arrives in a follow-up issue.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly dataAccess = inject(OnboardingDataAccessService);
  private readonly navController = inject(NavController);

  dismiss(): void {
    this.dataAccess.dismissForSession();
    void this.navController.navigateRoot([`/${PATH.HOME}`]);
  }
}
