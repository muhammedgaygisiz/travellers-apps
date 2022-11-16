// import {TestScheduler} from "rxjs/internal/testing/TestScheduler";
import { AuthService } from '../integration/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

// const assertDeepEqual = (actual: any, expected: any) => {
//   expect(actual).toEqual(expected);
// };

describe('AuthService', () => {
  // let scheduler: TestScheduler;
  let service: AuthService;

  beforeEach(async () => {
    // scheduler = new TestScheduler(assertDeepEqual);

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
