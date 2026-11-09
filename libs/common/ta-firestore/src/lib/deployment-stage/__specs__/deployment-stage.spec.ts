import { TestBed } from '@angular/core/testing';
import {
  QA_FIREBASE_PROJECT_ID,
  resolveDeploymentStage,
} from '../deployment-stage';
import { StageRibbonComponent } from '../stage-ribbon.component';

describe(resolveDeploymentStage.name, () => {
  it('is dev when the build routes at the emulators', () => {
    expect(
      resolveDeploymentStage({
        NX_APP_BITE_TRIBE_IS_DEV: 'true',
        NX_APP_BITE_TRIBE_PROJECT_ID: 'bite-tribe',
      }),
    ).toBe('dev');
  });

  it('is qa when the build targets the QA project', () => {
    expect(
      resolveDeploymentStage({
        NX_APP_BITE_TRIBE_PROJECT_ID: QA_FIREBASE_PROJECT_ID,
      }),
    ).toBe('qa');
  });

  it('is production for the production project, with IS_DEV stripped', () => {
    expect(
      resolveDeploymentStage({ NX_APP_BITE_TRIBE_PROJECT_ID: 'bite-tribe' }),
    ).toBe('production');
  });

  it('treats any IS_DEV value other than "true" as not dev', () => {
    expect(
      resolveDeploymentStage({
        NX_APP_BITE_TRIBE_IS_DEV: 'false',
        NX_APP_BITE_TRIBE_PROJECT_ID: 'bite-tribe',
      }),
    ).toBe('production');
  });
});

describe(StageRibbonComponent.name, () => {
  const render = (stage: 'dev' | 'qa' | 'production'): HTMLElement => {
    const fixture = TestBed.createComponent(StageRibbonComponent);
    fixture.componentRef.setInput('stage', stage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders nothing in production', () => {
    expect(render('production').querySelector('.stage-ribbon')).toBeNull();
  });

  it.each([
    ['dev', 'DEV', 'stage-ribbon--dev'],
    ['qa', 'QA', 'stage-ribbon--qa'],
  ] as const)('labels %s as %s', (stage, label, modifier) => {
    const ribbon = render(stage).querySelector('.stage-ribbon');

    expect(ribbon?.textContent?.trim()).toBe(label);
    expect(ribbon?.classList).toContain(modifier);
  });
});
