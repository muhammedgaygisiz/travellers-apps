import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IonIcon, IonText } from '@ionic/angular/standalone';
import { toMetric } from '../../utils/to-metric';
import { roundDistance } from '../../utils/round-distance';

@Component({
  selector: 'bt-distance',
  templateUrl: './distance.component.html',
  styleUrls: ['./distance.component.scss'],
  imports: [IonIcon, IonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistanceComponent {
  distance = input<string | undefined>();

  roundedMetricDistance = computed(() => {
    const distance = this.distance();
    return toMetric(roundDistance(distance));
  });
}
