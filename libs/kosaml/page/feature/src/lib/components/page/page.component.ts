import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  standalone: true,
  selector: 'kosaml-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  imports: [LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  isLoading = false;
}
