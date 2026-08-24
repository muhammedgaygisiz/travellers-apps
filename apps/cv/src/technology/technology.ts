import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DurationPipe } from '../app/duration.pipe';
import { Project } from '../app/project';

@Component({
  selector: 'technology',
  template: `
    <div class="technology-box">
      <span>{{ technology() }}: {{ projects() | duration: technology() }}</span>
    </div>
  `,
  styles: [
    `
      @use '../styles.scss' as styles;

      :host {
        font-size: 16px;

        .technology-box {
          padding: 0.6rem;
          margin: 1rem 0;

          @include styles.glass-box;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DurationPipe],
})
export class Technology {
  projects = input<Project[]>([]);
  technology = input('');
}
