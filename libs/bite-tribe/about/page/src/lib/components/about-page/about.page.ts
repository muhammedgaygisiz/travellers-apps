import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { appRelease } from 'utils';

@Component({
  selector: 'about-page',
  styleUrl: 'about.page.scss',
  templateUrl: 'about.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonText,
    IonItem,
    IonLabel,
    IonIcon,
    TranslocoPipe,
  ],
})
export class AboutPage {
  protected readonly release = appRelease;

  totalNumberBites = input<number>();
  totalNumberUsers = input<number>();

  openPrivacyPolicy = output<void>();
}
