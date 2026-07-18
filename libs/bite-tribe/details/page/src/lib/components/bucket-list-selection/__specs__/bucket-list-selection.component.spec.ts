import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BucketListSelectionComponent } from '../bucket-list-selection.component';
import { Bite, Bucketlist } from 'model';
import { GetBucketlistIconPipe } from '../../../pipes/get-bucketlist-icon.pipe';
import {
  IonAlert,
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
        IonAlert,
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

  it('should call onNewList with input value when alert is dismissed', () => {
    const newListName = 'New List';
    const spy = jest.spyOn(component, 'onNewList');
    component.onAlertDidDismiss([newListName]);
    expect(spy).toHaveBeenCalledWith(newListName);
  });

  it('should have correct alert inputs configuration', () => {
    expect(component.newListInputs).toEqual([
      {
        placeholder: 'Name',
      },
    ]);
  });

  it('should have correct save button configuration', () => {
    expect(component.saveButton).toHaveLength(2);
    const saveButton = component.saveButton[0];
    expect(saveButton).toEqual(
      expect.objectContaining({ text: 'Save', handler: expect.any(Function) }),
    );
  });
});
