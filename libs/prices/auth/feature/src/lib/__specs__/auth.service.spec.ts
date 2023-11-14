import { AuthService } from '../integration/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const initialState = {};
    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    service = TestBed.inject<AuthService>(AuthService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
