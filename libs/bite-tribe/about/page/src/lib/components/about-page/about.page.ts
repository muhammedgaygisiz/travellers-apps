import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

declare const process: {
  env: {
    version?: string;
    buildNumber?: string;
  };
};

@Component({
  selector: 'about-page',
  styleUrl: 'about.page.scss',
  templateUrl: 'about.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonText, TranslocoPipe],
})
export class AboutPage {
  protected readonly version = process.env['version'];
  protected readonly buildNumber = process.env['buildNumber'];

  totalNumberBites = input<number>();
  totalNumberUsers = input<number>();
}
