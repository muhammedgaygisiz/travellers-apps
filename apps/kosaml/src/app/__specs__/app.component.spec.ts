import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from '../app.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { fromSite } from '@travellers-apps/kosaml/store/feature';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'kosaml'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('kosaml');
  });

  describe('onToggleProjectBar', () => {
    it('should dispatch toggleProjectBar', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      component.onToggleProjectBar();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(fromSite.toggleProjectBar());
    });
  });
});
