import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'about-page',
  styleUrl: 'about.page.scss',
  templateUrl: 'about.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonText],
})
export class AboutPage {
  totalNumberBites = input<number>();
  totalNumberUsers = input<number>();
}
