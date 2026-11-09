import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DeploymentStage, resolveDeploymentStage } from './deployment-stage';

const STAGE_LABEL: Record<Exclude<DeploymentStage, 'production'>, string> = {
  dev: 'DEV',
  qa: 'QA',
};

/**
 * A corner ribbon naming the stage of a non-production build, so a dev or QA
 * build is never mistaken for production. In production it renders nothing.
 *
 * It sits above everything and ignores pointer events, so it changes no layout
 * and blocks no tap. The label is not translated on purpose: it names an
 * environment, not a product concept, and has to read the same to everyone.
 */
@Component({
  selector: 'bite-stage-ribbon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as text) {
      <div
        class="stage-ribbon"
        [class.stage-ribbon--dev]="stage() === 'dev'"
        [class.stage-ribbon--qa]="stage() === 'qa'"
        aria-hidden="true"
      >
        {{ text }}
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 100000;
      width: 96px;
      height: calc(96px + env(safe-area-inset-top, 0px));
      overflow: hidden;
      pointer-events: none;
    }

    .stage-ribbon {
      position: absolute;
      top: calc(18px + env(safe-area-inset-top, 0px));
      right: -34px;
      width: 136px;
      padding: 3px 0;
      transform: rotate(45deg);
      color: #ffffff;
      font:
        700 12px/1.2 system-ui,
        sans-serif;
      letter-spacing: 0.12em;
      text-align: center;
      box-shadow: 0 1px 4px rgb(0 0 0 / 35%);
    }

    .stage-ribbon--dev {
      background: #6d28d9;
    }

    .stage-ribbon--qa {
      background: #c2410c;
    }
  `,
})
export class StageRibbonComponent {
  /** The resolved stage; an input only so tests and stories can pin it. */
  readonly stage = input<DeploymentStage>(resolveDeploymentStage());

  protected label(): string | null {
    const stage = this.stage();
    return stage === 'production' ? null : STAGE_LABEL[stage];
  }
}
