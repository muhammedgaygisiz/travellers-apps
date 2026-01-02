/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { BiteContainer } from '../bite-container.component';
import { vi } from 'vitest';

vi.mock('heic2any', () => vi.fn());

vi.mock('localization');
addNecessaryIcons();

describe('BiteContainer', () => {
  let component: BiteContainer;
  let fixture: ComponentFixture<BiteContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BiteService,
          useValue: {
            cachedBite: signal(undefined),
            currency: signal(undefined),
            position: signal(undefined),
            image: signal(undefined),
            submitNewBite: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BiteContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
