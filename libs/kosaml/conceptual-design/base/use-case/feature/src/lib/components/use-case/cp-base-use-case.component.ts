import { Component, Input, OnInit } from '@angular/core';
import { ConceptualDesignUseCaseTypes } from './api/types';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
  standalone: true,
  selector: 'kosaml-cp-base-use-case',
  templateUrl: './cp-base-use-case.component.html',
  styleUrls: ['./cp-base-use-case.component.scss'],
  imports: [CommonModule, MatTableModule],
})
export class CpBaseUseCaseComponent implements OnInit {
  @Input()
  type?: ConceptualDesignUseCaseTypes;

  @Input()
  dataSource: any;

  displayedColumns?: string[];

  ngOnInit() {
    this.displayedColumns = this.initializeDisplayedColumns(this.type);
  }

  private initializeDisplayedColumns(
    type: ConceptualDesignUseCaseTypes | undefined
  ) {
    if (type === ConceptualDesignUseCaseTypes.ESSENTIAL) {
      return ['usersPurpose', 'systemResponsibility'];
    }

    if (type === ConceptualDesignUseCaseTypes.CONCRETE) {
      return ['userAction', 'systemResponse'];
    }

    return [];
  }

  getColumnName(column: string) {
    if (column === 'usersPurpose') {
      return "User's purpose";
    }

    if (column === 'systemResponsibility') {
      return 'System responsibility';
    }

    if (column === 'userAction') {
      return 'User action';
    }

    if (column === 'systemResponse') {
      return 'System response';
    }

    return column;
  }
}
