import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BucketListSelectionComponent } from '../bucket-list-selection.component';
import { Bite, Bucketlist } from 'model';
import { GetBucketlistIconPipe } from '../../../pipes/get-bucketlist-icon.pipe';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { ComponentRef } from '@angular/core';
import { addNecessaryIcons } from 'utils';

addNecessaryIcons();

describe('BucketListSelectionComponent', () => {
  let component: BucketListSelectionComponent;
  let fixture: ComponentFixture<BucketListSelectionComponent>;
  let componentRef: ComponentRef<BucketListSelectionComponent>;

  const mockBite: Bite = {
    id: '1',
    name: 'Test Bite',
    position: { latitude: 0, longitude: 0 },
    tags: [],
  } as unknown as Bite;

  const mockBucketlists: Bucketlist[] = [
    {
      id: '1',
      name: 'List 1',
      biteIds: ['1'],
      userId: 'user1',
    },
    {
      id: '2',
      name: 'List 2',
      biteIds: [],
      userId: 'user1',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BucketListSelectionComponent,
        IonList,
        IonItem,
        IonIcon,
        IonContent,
        GetBucketlistIconPipe,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BucketListSelectionComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('bucketLists', mockBucketlists);
    componentRef.setInput('bite', mockBite);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render bucketlists', () => {
    const items = fixture.nativeElement.querySelectorAll('ion-item');
    // Add 1 for the "Create New List" item
    expect(items.length).toBe(mockBucketlists.length + 1);
  });

  it('should emit removeBiteFromBucketlist when selecting a list that contains the bite', () => {
    const spy = jest.spyOn(component.removeBiteFromBucketlist, 'emit');
    component.onBucketlistSelected(mockBucketlists[0]);
    expect(spy).toHaveBeenCalledWith({
      bucketlistId: '1',
      biteId: '1',
    });
  });

  it('should emit selectList when selecting a list that does not contain the bite', () => {
    const spy = jest.spyOn(component.selectList, 'emit');
    component.onBucketlistSelected(mockBucketlists[1]);
    expect(spy).toHaveBeenCalledWith(mockBucketlists[1]);
  });

  // The popover is created with `dismissOnSelect`, so it is destroyed by the
  // same tap that asks for a new list. Delegating to the host page keeps the
  // name prompt alive. See GitHub issue #1231.
  it('should delegate asking for a new list to the host page', () => {
    const requestNewList = jest.fn();
    component.requestNewList = requestNewList;
    fixture.detectChanges();

    const items: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ion-item'),
    );
    items[items.length - 1].click();

    expect(requestNewList).toHaveBeenCalledTimes(1);
  });

  it('should not declare an overlay of its own', () => {
    expect(fixture.nativeElement.querySelector('ion-alert')).toBeFalsy();
  });
});
