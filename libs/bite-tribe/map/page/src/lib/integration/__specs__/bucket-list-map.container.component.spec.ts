import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { MapService } from '../map.service';
import { BucketListMapContainerComponent } from '../bucket-list-map.container.component';
import { vi } from 'vitest';

vi.mock('localization');
addNecessaryIcons();

class Mock {}

describe('BucketListMapContainerComponent', () => {
  let component: BucketListMapContainerComponent;
  let fixture: ComponentFixture<BucketListMapContainerComponent>;

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

    fixture = TestBed.createComponent(BucketListMapContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
