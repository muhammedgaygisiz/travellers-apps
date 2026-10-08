import { EditBucketlistPage } from '../edit-bucketlist.page';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Bite, Bucketlist } from 'model';

const tr = {
  'edit-bucket-list': 'Yapılacaklar Listesini Düzenle',
  bites: "Bite'ler",
  delete: 'Sil',
};

describe(EditBucketlistPage.name, () => {
  let comp: EditBucketlistPage;
  let fixture: ComponentFixture<EditBucketlistPage>;
  let compRef: ComponentRef<EditBucketlistPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { tr },
          translocoConfig: { availableLangs: ['tr'], defaultLang: 'tr' },
          preloadLangs: true,
        }),
      ],
      providers: [provideIonicAngular()],
    });
    fixture = TestBed.createComponent(EditBucketlistPage);
    comp = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(comp).toBeTruthy();
  });

  /** Turkish is the one catalog that translates `bites` (issue #1613). */
  it('should render its copy in the active language', () => {
    compRef.setInput('bites', [{ id: 'b1', name: 'Mantı' } as Bite]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Yapılacaklar Listesini Düzenle');
    expect(text).toContain("Bite'ler");
    expect(text).toContain('Sil');
    expect(text).not.toContain('Edit Bucket List');
  });

  describe('setNameControlFromBucketlistInput', () => {
    it('should set name control value from bucketlist input', () => {
      const bucketlist = {
        id: '1',
        name: 'Test Bucketlist',
        bites: [],
      };
      compRef.setInput('bucketlist', bucketlist);
      compRef.changeDetectorRef.detectChanges();

      expect(comp.titleFormGroup.get('name')?.value).toBe(bucketlist.name);
    });
  });

  describe('onSaveTitle', () => {
    describe('given title form group is invalid', () => {
      it('should not emit saveTitle output', () => {
        const saveTitleEmitSpy = jest.spyOn(comp.saveTitle, 'emit');

        comp.titleFormGroup.get('name')?.setValue('');
        comp.onSaveTitle();
        expect(saveTitleEmitSpy).not.toHaveBeenCalled();
      });
    });

    describe('given title form group is valid', () => {
      describe('and the value is empty', () => {
        it('should not emit saveTitle output', () => {
          const saveTitleEmitSpy = jest.spyOn(comp.saveTitle, 'emit');

          comp.titleFormGroup.get('name')?.setValue('');
          comp.onSaveTitle();
          expect(saveTitleEmitSpy).not.toHaveBeenCalled();
        });
      });

      describe('and the value is a real title', () => {
        it('should emit saveTitle output with the title', () => {
          const saveTitleEmitSpy = jest.spyOn(comp.saveTitle, 'emit');
          const title = 'New Bucketlist Title';

          comp.titleFormGroup.get('name')?.setValue(title);
          comp.onSaveTitle();
          expect(saveTitleEmitSpy).toHaveBeenCalledWith(title);
        });
      });
    });
  });

  describe('openRemoveBiteConfirmation', () => {
    it('should set biteToRemove signal with the given bite id and open the remove bite alert', () => {
      const biteId = 'bite-123';
      const event = new Event('click');

      comp.openRemoveBiteConfirmation(biteId, event);

      expect(comp.biteToRemove()).toBe(biteId);
      expect(comp.isRemoveBiteAlertOpen()).toBe(true);
    });
  });

  describe('handleRemoveBiteDismiss', () => {
    describe('given dismiss without click on delete', () => {
      it('should not emit removeBite output', () => {
        const removeBiteEmitSpy = jest.spyOn(comp.removeBite, 'emit');
        const event = new CustomEvent('dismiss', {
          detail: { role: 'cancel' },
        });

        comp.handleRemoveBiteDismiss(event);
        expect(removeBiteEmitSpy).not.toHaveBeenCalled();
      });
    });

    describe('given dismiss with click on delete', () => {
      it('should emit removeBite output with bite id and bucketlist id', () => {
        const removeBiteEmitSpy = jest.spyOn(comp.removeBite, 'emit');
        const biteId = 'bite-123';
        const bucketlistId = 'bucketlist-456';
        comp.biteToRemove.set(biteId);
        compRef.setInput('bucketlist', {
          id: bucketlistId,
        } as unknown as Bucketlist);

        const event = new CustomEvent('dismiss', {
          detail: { role: 'delete' },
        });

        comp.handleRemoveBiteDismiss(event);
        expect(removeBiteEmitSpy).toHaveBeenCalledWith({
          biteId,
          bucketlistId,
        });
      });
    });
  });
});
