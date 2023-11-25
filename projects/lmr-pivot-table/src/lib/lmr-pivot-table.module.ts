import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LmrPivotTableComponent} from './lmr-pivot-table.component';
import {PivotDataEmptyPipe} from './pipes/pivot-data-empty.pipe';
import {PivotTableCellHasValuePipe} from './pipes/pivot-table-value.pipe';
import {ContrastColorPipe} from './pipes/contrast-color.pipe';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';

@NgModule({
  declarations: [
    LmrPivotTableComponent,
    PivotDataEmptyPipe,
    PivotTableCellHasValuePipe,
    ContrastColorPipe,
    LmrEmptyTablesTemplateDirective,
    LmrTableCellTemplateDirective,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    LmrPivotTableComponent,
    LmrEmptyTablesTemplateDirective,
    LmrTableCellTemplateDirective,
  ]
})
export class LmrPivotTableModule {
}
