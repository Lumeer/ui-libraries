import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {LmrPivotTableComponent} from './lmr-pivot-table.component';
import {PivotDataEmptyPipe} from './pipes/pivot-data-empty.pipe';
import {PivotTableCellHasValuePipe} from './pipes/pivot-table-value.pipe';
import {ContrastColorPipe} from './pipes/contrast-color.pipe';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';
import {LmrSimplePivotTableComponent} from './lmr-simple-pivot-table.component';

@NgModule({
  declarations: [
    LmrPivotTableComponent,
    LmrSimplePivotTableComponent,
    PivotDataEmptyPipe,
    PivotTableCellHasValuePipe,
    ContrastColorPipe,
    LmrEmptyTablesTemplateDirective,
    LmrTableCellTemplateDirective,
  ],
  imports: [
    CommonModule,
    ScrollingModule,
  ],
  exports: [
    LmrPivotTableComponent,
    LmrSimplePivotTableComponent,
    LmrEmptyTablesTemplateDirective,
    LmrTableCellTemplateDirective,
  ]
})
export class LmrPivotTableModule {
}
