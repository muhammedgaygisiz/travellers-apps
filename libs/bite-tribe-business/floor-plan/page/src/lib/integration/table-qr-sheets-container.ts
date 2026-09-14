import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TableQrSheetsComponent } from '../component/table-qr-sheets.component';
import { TableQrSheetsService } from './table-qr-sheets.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableQrSheetsComponent],
  template: `
    <bt-business-table-qr-sheets
      class="ion-page"
      [restaurantName]="service.restaurantName()"
      [layout]="service.layout()"
      [room]="service.room()"
      [filterRooms]="service.filterRooms()"
      [visibleRows]="service.visibleRows()"
      [selectedRows]="service.selectedRows()"
      [selectedIds]="service.selectedIds()"
      [missingTokenLabels]="service.missingTokenLabels()"
      [disabledLabels]="service.disabledLabels()"
      [loading]="service.loading()"
      [loadFailed]="service.loadFailed()"
      [confirmingRotation]="service.confirmingRotation()"
      [rotating]="service.rotating()"
      [isAuthenticated]="service.isAuthenticated()"
      (layoutChange)="service.setLayout($event)"
      (roomChange)="service.setRoom($event)"
      (toggleTable)="service.toggleTable($event)"
      (selectAll)="service.selectAll($event)"
      (printRequest)="service.print()"
      (rotateRequest)="service.askToRotate()"
      (rotateConfirm)="service.rotateSelected()"
      (rotateCancel)="service.cancelRotation()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class TableQrSheetsContainer {
  service = inject(TableQrSheetsService);
}
