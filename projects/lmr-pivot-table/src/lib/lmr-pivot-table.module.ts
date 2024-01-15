import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {LmrPivotTableComponent} from './lmr-pivot-table.component';
import {PivotDataEmptyPipe} from './pipes/pivot-data-empty.pipe';
import {CellHasValuePipe} from './pipes/cell-has-value.pipe';
import {ContrastColorPipe} from './pipes/contrast-color.pipe';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';
import {LmrSimplePivotTableComponent} from './lmr-simple-pivot-table.component';
import {FilterVisibleCellsPipe} from './pipes/filter-visible-cells.pipe';
import {IsCellExpandablePipe} from './pipes/is-cell-expandable.pipe';
import {IsCellExpandedPipe} from './pipes/is-cell-expanded.pipe';
import {IsCellRowsExpandablePipe} from './pipes/is-cell-rows-expandable.pipe';

@NgModule({
  declarations: [
    LmrPivotTableComponent,
    LmrSimplePivotTableComponent,
    PivotDataEmptyPipe,
    CellHasValuePipe,
    IsCellExpandablePipe,
    IsCellExpandedPipe,
    IsCellRowsExpandablePipe,
    FilterVisibleCellsPipe,
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
