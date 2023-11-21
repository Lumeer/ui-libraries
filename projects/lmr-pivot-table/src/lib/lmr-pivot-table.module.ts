import { NgModule } from '@angular/core';
import { LmrPivotTableComponent } from './lmr-pivot-table.component';
import { PivotTablesComponent } from './pivot-tables/pivot-tables.component';
import {PivotDataEmptyPipe} from './pipes/pivot-data-empty.pipe';
import {PivotTableCellHasValuePipe} from './pipes/pivot-table-value.pipe';
import {CommonModule} from '@angular/common';
import {ContrastColorPipe} from './pipes/contrast-color.pipe';



@NgModule({
  declarations: [
    LmrPivotTableComponent,
    PivotTablesComponent,
    PivotDataEmptyPipe,
    PivotTableCellHasValuePipe,
    ContrastColorPipe,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    LmrPivotTableComponent
  ]
})
export class LmrPivotTableModule { }
