import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { MyBitesMapContainerComponent } from '../my-bites-map.container.component';
import { MapService } from '../map.service';
import { vi } from 'vitest';

vi.mock('localization');
addNecessaryIcons();

class Mock {}

describe('MyBitesMapContainerComponent', () => {
  let component: MyBitesMapContainerComponent;
  let fixture: ComponentFixture<MyBitesMapContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: MapService,
          useValue: Mock,
        },
      ],
    });

    fixture = TestBed.createComponent(MyBitesMapContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
