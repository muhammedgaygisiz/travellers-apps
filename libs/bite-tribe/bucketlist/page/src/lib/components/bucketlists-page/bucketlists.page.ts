import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bucketlist } from 'model';
import {
  IonAlert,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { CountPipe } from '../../pipes/count.pipe';

@Component({
  selector: 'bucketlists-page',
  templateUrl: 'bucketlists.page.html',
  styleUrl: 'bucketlists.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonList,
    IonItem,
    IonLabel,
    IonContent,
    IonIcon,
    CountPipe,
    IonBadge,
    IonButton,
    IonAlert,
  ],
})
export class BucketlistsPage {
  bucketlists = input<Bucketlist[]>([]);

  gotoBucketlistDetails = output<string>();
  newList = output<string>();

  public newListInputs = [
    {
      placeholder: 'Name',
    },
  ];

  public saveButton = [
    {
      text: 'Save',
      handler: this.onNewList.bind(this),
    },
    'Cancel',
  ];

  onNewList(alertResult: string): void {
    const newListName = alertResult[0];

    this.newList.emit(newListName);
  }
}
