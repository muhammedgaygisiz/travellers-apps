import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'onboarding-page',
  templateUrl: 'onboarding.page.html',
  styleUrl: 'onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonText, IonButton, TranslocoPipe],
})
export class OnboardingPage {
  dismiss = output<void>();
}
