import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'kosaml-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  imports: [LoadingSpinnerComponent, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  isLoading = false;
}
