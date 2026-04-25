import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { EditMenuContainer } from '../edit-menu-container.component';
import { EditMenuService } from '../edit-menu.service';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(EditMenuContainer.name, () => {
  let component: EditMenuContainer;
  let fixture: ComponentFixture<EditMenuContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: EditMenuService,
          useValue: {
            restaurant: () => undefined,
            menu: () => undefined,
            saveMenu: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(EditMenuContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
