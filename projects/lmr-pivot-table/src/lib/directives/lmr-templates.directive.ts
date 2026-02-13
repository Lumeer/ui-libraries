import {Directive, TemplateRef} from '@angular/core';

@Directive({
    selector: '[lmr-empty-tables-tmp]',
    standalone: false
})
export class LmrEmptyTablesTemplateDirective {
  constructor(public template: TemplateRef<any>) { }
}

@Directive({
    selector: '[lmr-table-cell-tmp]',
    standalone: false
})
export class LmrTableCellTemplateDirective {
  constructor(public template: TemplateRef<any>) { }
}
