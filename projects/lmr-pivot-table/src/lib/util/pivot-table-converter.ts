/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {aggregateDataValues, Constraint, ConstraintData, DataAggregationType, DataResource, isValueAggregation, NumberConstraint, PercentageConstraint, UnknownConstraint,} from '@lumeer/data-filters';
import {createRange, deepObjectCopy, isArray, isNotNullOrUndefined, isNullOrUndefined, isNumeric, shadeColor, toNumber, uniqueValues,} from '@lumeer/utils';

import {LmrPivotData, LmrPivotDataHeader, LmrPivotDataHeaderExpression, LmrPivotDataHeaderOperand, LmrPivotDimensionConfig, LmrPivotStemData} from './lmr-pivot-data';
import {LmrPivotTable, LmrPivotTableCell} from './lmr-pivot-table';
import {LmrPivotExpression, LmrPivotHeaderOperand, LmrPivotOperand, LmrPivotSort, LmrPivotTransform, LmrPivotValueType} from './lmr-pivot-config';
import {COLOR_GRAY100, COLOR_GRAY200, COLOR_GRAY300, COLOR_GRAY400, COLOR_GRAY500} from './lmr-pivot-constants';

interface HeaderGroupInfo {
  background: string;
  indexes: number[];
  expression?: LmrPivotDataHeaderExpression;
  level: number;
}

interface ValueTypeInfo {
  sum?: number;
  sumsRows?: number[];
  sumsColumns?: number[];
  defaultConstraint?: Constraint;
}

export class PivotTableConverter {
  public static readonly emptyClass = 'pivot-empty-cell';
  public static readonly dataClass = 'pivot-data-cell';
  public static readonly groupDataClass = 'pivot-data-group-cell';
  public static readonly rowHeaderClass = 'pivot-row-header-cell';
  public static readonly rowGroupHeaderClass = 'pivot-row-group-header-cell';
  public static readonly rowAttributeHeaderClass = 'pivot-row-attribute-header-cell';
  public static readonly columnHeaderClass = 'pivot-column-header-cell';
  public static readonly columnGroupHeaderClass = 'pivot-column-group-header-cell';

  private readonly groupColors = [COLOR_GRAY100, COLOR_GRAY200, COLOR_GRAY300, COLOR_GRAY400, COLOR_GRAY500];

  private readonly percentageConstraint = new PercentageConstraint({decimals: 2});

  private data: LmrPivotStemData;
  private transform: LmrPivotTransform;
  private values: any[][];
  private dataResources: DataResource[][][];
  private constraintData: ConstraintData;
  private rowLevels: number;
  private rowsTransformationArray: number[];
  private columnLevels: number;
  private columnsTransformationArray: number[];
  private valueTypeInfo: ValueTypeInfo[];
  private nonStickyRowIndex: number;
  private nonStickyColumnIndex: number;

  public createTables(pivotData: LmrPivotData, transform: LmrPivotTransform): LmrPivotTable[] {
    if (!pivotData) {
      return [{cells: []}];
    }

    this.transform = transform;
    this.constraintData = pivotData.constraintData;

    return (pivotData.data || []).map(d => {
      if (this.dataAreEmpty(d)) {
        return {cells: []};
      }
      this.updateData(d);
      return this.transformData();
    });
  }

  private dataAreEmpty(data: LmrPivotStemData): boolean {
    return (data.rowHeaders || []).length === 0 && (data.columnHeaders || []).length === 0;
  }

  private updateData(data: LmrPivotStemData) {
    const numberOfSums = Math.max(1, (data.valueTitles || []).length);
    this.valueTypeInfo = getValuesTypeInfo(data.values, data.valueTypes, numberOfSums);
    this.data = preparePivotData(data, this.constraintData, this.valueTypeInfo);
    this.values = data.values || [];
    this.dataResources = data.dataResources || [];
    this.rowLevels = (data.rowsConfig || []).length;
    this.columnLevels = (data.columnsConfig || []).length + (data.hasAdditionalColumnLevel ? 1 : 0);
    const rowAllSticky = this.data.rowsConfig?.length && this.data.rowsConfig.every(config => !!config?.sticky)
    this.nonStickyRowIndex = Math.max(rowAllSticky ? this.rowLevels : (this.data.rowsConfig?.findIndex(config => !config?.sticky) || 0), 0);
    const columnAllSticky = this.data.columnsConfig?.length && this.data.columnsConfig.every(config => !!config?.sticky)
    this.nonStickyColumnIndex = Math.max(columnAllSticky ? this.columnLevels : (this.data.columnsConfig?.findIndex(config => !config?.sticky) || 0), 0);
    const hasValue = (data.valueTitles || []).length > 0;
    if ((this.data.rowHeaders || []).length > 0) {
      this.rowsTransformationArray = createTransformationMap(
        this.data.rowHeaders,
        this.rowShowSums,
        this.columnLevels,
        1
      );
    } else {
      this.rowsTransformationArray = hasValue ? [this.columnLevels] : [];
    }

    if ((this.data.columnHeaders || []).length > 0) {
      this.columnsTransformationArray = createTransformationMap(
        this.data.columnHeaders,
        this.columnShowSums,
        this.rowLevels,
        numberOfSums
      );
    } else {
      this.columnsTransformationArray = hasValue ? [this.rowLevels] : [];
    }
  }

  private get rowShowSums(): boolean[] {
    return (this.data.rowsConfig || []).map(config => config.showSums);
  }

  private get columnShowSums(): boolean[] {
    return (this.data.columnsConfig || []).map(config => config.showSums);
  }

  private transformData(): LmrPivotTable {
    const cells = this.initCells();
    const rowGroups = this.fillCellsByRows(cells);
    const columnGroups = this.fillCellsByColumns(cells);
    this.fillCellsByGroupIntersection(cells, rowGroups, columnGroups);
    return {cells};
  }

  private fillCellsByRows(cells: LmrPivotTableCell[][]): HeaderGroupInfo[] {
    const rowGroups = [];
    this.iterateAndFillCellsByRows(cells, rowGroups, this.data.rowHeaders, this.columnLevels, this.rowShowSums, 0);
    return rowGroups;
  }

  private iterateAndFillCellsByRows(
    cells: LmrPivotTableCell[][],
    rowGroupsInfo: HeaderGroupInfo[],
    headers: LmrPivotDataHeader[],
    startIndex: number,
    showSums: boolean[],
    level: number,
    parentHeader?: LmrPivotDataHeader
  ) {
    let currentIndex = startIndex;
    for (const header of headers) {
      const rowSpan = getDirectHeaderChildCount(header, level, showSums);
      cells[currentIndex][level] = {
        value: this.formatRowHeader(header.title, level),
        cssClass: PivotTableConverter.rowHeaderClass,
        isHeader: true,
        stickyStart: this.isRowLevelSticky(level),
        rowSpan,
        colSpan: 1,
        background: this.getHeaderBackground(header, level),
        constraint: header.constraint,
        label: header.attributeName,
        childIndexes: createRange(currentIndex, currentIndex + (header.children?.length || 1))
      };

      if (header.children) {
        this.iterateAndFillCellsByRows(
          cells,
          rowGroupsInfo,
          header.children,
          currentIndex,
          showSums,
          level + 1,
          header
        );
      } else if (isNotNullOrUndefined(header.targetIndex)) {
        this.fillCellsForRow(cells, header.targetIndex);
      }

      currentIndex += getHeaderChildCount(header, level, showSums);

      const expressions = header.expressions || []
      for (let i = 0; i < expressions.length; i++) {
        const expressionIndex = currentIndex - (expressions.length - i)
        const background = this.getSummaryBackground(level);
        const {indexes} = this.fillCellsForExpressionRow(cells, expressions[i], expressionIndex, background)
        this.splitRowGroupHeader(cells, level, expressionIndex, background, expressions[i].title, indexes)
        rowGroupsInfo[expressionIndex] = {background, indexes: [], expression: expressions[i], level};
      }
    }

    if (showSums[level]) {
      const { title, summary } = this.formatSummaryHeader(parentHeader, level)
      const background = this.getSummaryBackground(level);
      const columnIndex = Math.max(level - 1, 0);
      this.splitRowGroupHeader(cells, columnIndex, currentIndex, background, summary, [], title, parentHeader?.constraint, parentHeader?.attributeName)

      const rowIndexes = getTargetIndexesForHeaders(headers);
      const transformedRowIndexes = this.transformRowIndexes(rowIndexes);
      rowGroupsInfo[currentIndex] = {background, indexes: transformedRowIndexes, level};

      this.fillCellsForGroupedRow(cells, rowIndexes, currentIndex, background);
    }
  }

  private splitRowGroupHeader(cells: LmrPivotTableCell[][], columnIndex: number, currentIndex: number, background: string, summary: string, rowIndexes: number[], title?: string, constraint?: Constraint, label?: string) {
    let colSpan = this.rowLevels - columnIndex;
    const stickyStart = this.isRowLevelSticky(columnIndex);

    // split row group header cell because of correct sticky scroll
    if (stickyStart && this.nonStickyRowIndex > 0 && this.nonStickyRowIndex < this.rowLevels && colSpan > 1) {
      const newColspan = this.nonStickyRowIndex - columnIndex;

      cells[currentIndex][this.nonStickyRowIndex] = {
        value: undefined,
        constraint: undefined,
        label: undefined,
        cssClass: PivotTableConverter.rowGroupHeaderClass,
        isSummary: true,
        rowSpan: 1,
        colSpan: colSpan - newColspan,
        background,
        summary: undefined,
      };

      colSpan = newColspan;
    }

    cells[currentIndex][columnIndex] = {
      value: title,
      constraint,
      label,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      isSummary: true,
      stickyStart,
      rowSpan: 1,
      colSpan,
      background,
      summary,
      rowIndexes,
    };
  }

  private formatSummaryHeader(header: LmrPivotDataHeader, level: number): {title?: string; summary: string} {
    return this.transform.formatSummaryHeader?.(header, level) || {
      title: header?.title,
      summary: '',
    }
  }

  private formatRowHeader(title: string, level: number): string {
    return this.transform?.formatRowHeader?.(title, level) || title
  }

  private formatColumnHeader(title: string, level: number): string {
    return this.transform?.formatColumnHeader?.(title, level) || title
  }

  private getHeaderBackground(header: { color: string }, level: number): string {
    if (header?.color) {
      return shadeColor(header.color, this.getLevelOpacity(level));
    }

    return undefined;
  }

  private getLevelOpacity(level: number): number {
    return Math.min(80, 50 + level * 5) / 100;
  }

  private isRowLevelSticky(level: number): boolean {
    return this.data?.rowsConfig?.[level]?.sticky;
  }

  private isColumnLevelSticky(level: number): boolean {
    const maxLevel = Math.min(level, (this.data?.columnsConfig?.length ?? Number.MAX_SAFE_INTEGER) - 1);
    return this.data?.columnsConfig?.[maxLevel]?.sticky;
  }

  private getSummaryBackground(level: number): string {
    const index = Math.min(level, this.groupColors.length - 1);
    return this.groupColors[index];
  }

  private fillCellsForRow(cells: LmrPivotTableCell[][], row: number) {
    const rowIndexInCells = this.rowsTransformationArray[row];
    if (isNotNullOrUndefined(rowIndexInCells)) {
      for (let column = 0; column < this.columnsTransformationArray.length; column++) {
        const columnIndexInCells = this.columnsTransformationArray[column];
        if (isNotNullOrUndefined(columnIndexInCells)) {
          const value = this.data.values[row][column];
          const dataResources = this.dataResources?.[row]?.[column] || [];
          const formattedValue = this.aggregateOrFormatSingleValue(value, column);
          const stringValue = isNotNullOrUndefined(formattedValue) ? String(formattedValue) : '';
          cells[rowIndexInCells][columnIndexInCells] = {
            value: stringValue,
            dataResources,
            rowSpan: 1,
            colSpan: 1,
            cssClass: PivotTableConverter.dataClass,
            isValue: true,
          };
        }
      }
    }
  }

  private getValueIndexForColumns(columns: number[]): number {
    return columns[0] % this.data.valueTitles.length;
  }

  private formatValueByValueType(value: any, valueIndex: number): any {
    const valueType = (this.data.valueTypes || [])[valueIndex];
    if (!valueType || valueType === LmrPivotValueType.Default) {
      return this.formatValueByConstraint(value, valueIndex);
    }

    if (
      [LmrPivotValueType.AllPercentage, LmrPivotValueType.ColumnPercentage, LmrPivotValueType.RowPercentage].includes(valueType)
    ) {
      return this.formatValueByPercentage(value);
    }

    return this.formatValueByConstraint(value, valueIndex);
  }

  private formatGroupedValueByValueType(value: any, rows: number[], columns: number[]): any {
    const valueIndex = columns[0] % this.data.valueTitles.length;
    const valueType = this.data.valueTypes && this.data.valueTypes[valueIndex];
    const valueTypeInfo = this.valueTypeInfo[valueIndex];
    if (!valueTypeInfo || !valueType || valueType === LmrPivotValueType.Default) {
      return this.formatValueByConstraint(value, valueIndex);
    }

    if (valueType === LmrPivotValueType.AllPercentage) {
      return this.formatValueByPercentage(divideValues(value, valueTypeInfo.sum));
    } else if (valueType === LmrPivotValueType.ColumnPercentage) {
      const columnsDividers = columns.reduce((dividers, column) => {
        dividers.push(valueTypeInfo.sumsColumns[column]);
        return dividers;
      }, []);
      const columnsDivider = aggregateDataValues(DataAggregationType.Sum, columnsDividers);
      return this.formatValueByPercentage(divideValues(value, columnsDivider));
    } else if (valueType === LmrPivotValueType.RowPercentage) {
      const rowsDividers = rows.reduce((dividers, row) => {
        dividers.push(valueTypeInfo.sumsRows[row]);
        return dividers;
      }, []);
      const rowsDivider = aggregateDataValues(DataAggregationType.Sum, rowsDividers);
      return this.formatValueByPercentage(divideValues(value, rowsDivider));
    }

    return this.formatValueByConstraint(value, valueIndex);
  }

  private formatValueByPercentage(value: any): string {
    return this.percentageConstraint.createDataValue(value).format();
  }

  private formatValueByConstraint(value: any, valueIndex: number): any {
    const constraint = this.data.valuesConstraints?.[valueIndex] || this.valueTypeInfo[valueIndex]?.defaultConstraint;
    if (constraint) {
      return constraint.createDataValue(value, this.constraintData).preview();
    }
    return value;
  }

  private fillCellsForGroupedRow(
    cells: LmrPivotTableCell[][],
    rows: number[],
    rowIndexInCells: number,
    background: string
  ) {
    for (let column = 0; column < this.columnsTransformationArray.length; column++) {
      const columnIndexInCells = this.columnsTransformationArray[column];
      if (isNotNullOrUndefined(columnIndexInCells)) {
        const {values, dataResources} = this.getGroupedValuesForRowsAndCols(rows, [column]);
        const formattedValue = this.aggregateAndFormatDataValues(values, rows, [column]);
        cells[rowIndexInCells][columnIndexInCells] = {
          value: String(formattedValue),
          dataResources,
          colSpan: 1,
          rowSpan: 1,
          cssClass: PivotTableConverter.groupDataClass,
          background,
          isValue: true,
        };
      }
    }
  }

  private fillCellsForExpressionRow(
    cells: LmrPivotTableCell[][],
    expression: LmrPivotDataHeaderExpression,
    rowIndexInCells: number,
    background: string
  ):{indexes: number[]} {
    let rowIndexes: number[] = [];
    for (let column = 0; column < this.columnsTransformationArray.length; column++) {
      const columnIndexInCells = this.columnsTransformationArray[column];
      if (isNotNullOrUndefined(columnIndexInCells)) {
        const {value, dataResources, indexes} = this.evaluateExpression(expression, [column]);
        rowIndexes = indexes
        const valueIndex = column % this.data.valueTitles.length;
        const formattedValue = this.formatValueByConstraint(value, valueIndex);
        cells[rowIndexInCells][columnIndexInCells] = {
          value: String(formattedValue),
          dataResources,
          colSpan: 1,
          rowSpan: 1,
          cssClass: PivotTableConverter.groupDataClass,
          background,
          isValue: true,
        };
      }
    }
    return {indexes: uniqueValues([...rowIndexes, rowIndexInCells])}
  }

  private evaluateExpression(expression: LmrPivotDataHeaderExpression, columns: number[]): {value: number; dataResources: DataResource[]; indexes: number[]  } {
    return (expression.operands || []).reduce((result, operand, index) => {
      const {value, dataResources, indexes } = this.evaluateOperand(operand, columns)
      result.dataResources.push(...dataResources)
      result.indexes.push(...indexes)
      switch (expression.operation) {
        case 'add':
          result.value += value
          break;
        case 'subtract':
          result.value = (index === 0 ? value : result.value - value)
          break;
        case 'multiply':
          result.value = index === 0 ? value : result.value * value
          break;
        case 'divide':
          result.value = index === 0 ? value : value ? result.value / value : result.value
          break;
      }

      return result
    } , {value: 0, dataResources: [], indexes: []})
  }

  private evaluateOperand(operand: LmrPivotDataHeaderOperand, columns: number[]): {value: number; dataResources: DataResource[]; indexes: number[] } {
    switch (operand.type) {
      case 'expression': return this.evaluateExpression(operand, columns)
      case 'value': return {value: operand.value, dataResources: [], indexes: []}
      case 'header': {
        const rows = getTargetIndexesForHeaders(operand.headers);
        const {values, dataResources} = this.getGroupedValuesForRowsAndCols(rows, columns);
        const {value} = this.aggregateDataValues(values, columns);
        return {value, dataResources, indexes: this.transformRowIndexes(rows)}
      }
    }
  }

  private transformRowIndexes(rows: number[]): number[] {
    return rows
      .map(v => this.rowsTransformationArray[v])
      .filter(v => isNotNullOrUndefined(v));
  }

  private getGroupedValuesForRowsAndCols(
    rows: number[],
    columns: number[]
  ): { values: any[]; dataResources: DataResource[] } {
    const values = [];
    const dataResources = [];
    for (const row of rows) {
      for (const column of columns) {
        const rowColumnValue = this.values[row][column];
        if (isArray(rowColumnValue)) {
          values.push(...rowColumnValue);
        } else {
          values.push(rowColumnValue);
        }
        dataResources.push(...(this.dataResources?.[row]?.[column] || []));
      }
    }
    return {values, dataResources};
  }

  private fillCellsByColumns(cells: LmrPivotTableCell[][]): HeaderGroupInfo[] {
    const columnGroups = [];
    this.iterateAndFillCellsByColumns(
      cells,
      columnGroups,
      this.data.columnHeaders,
      this.rowLevels,
      this.columnShowSums,
      0
    );
    return columnGroups;
  }

  private iterateAndFillCellsByColumns(
    cells: LmrPivotTableCell[][],
    columnGroupsInfo: HeaderGroupInfo[],
    headers: LmrPivotDataHeader[],
    startIndex: number,
    showSums: boolean[],
    level: number,
    parentHeader?: LmrPivotDataHeader
  ) {
    let currentIndex = startIndex;
    const numberOfSums = Math.max(1, this.data.valueTitles.length);
    for (const header of headers) {
      const colSpan = getDirectHeaderChildCount(header, level, showSums, numberOfSums);
      cells[level][currentIndex] = {
        value: this.formatColumnHeader(header.title, level),
        cssClass: PivotTableConverter.columnHeaderClass,
        isHeader: true,
        rowSpan: 1,
        colSpan,
        stickyTop: this.isColumnLevelSticky(level),
        background: this.getHeaderBackground(header, level),
        constraint: header.constraint,
        label: header.attributeName,
      };

      if (header.children) {
        this.iterateAndFillCellsByColumns(
          cells,
          columnGroupsInfo,
          header.children,
          currentIndex,
          showSums,
          level + 1,
          header
        );
      } else if (isNotNullOrUndefined(header.targetIndex)) {
        this.fillCellsForColumn(cells, header.targetIndex);
      }

      currentIndex += getHeaderChildCount(header, level, showSums, numberOfSums);
    }

    if (showSums[level]) {
      const background = this.getSummaryBackground(level);
      const { title, summary } = this.formatSummaryHeader(parentHeader, level)
      const numberOfValues = this.data.valueTitles.length;
      const rowIndex = Math.max(level - 1, 0);
      const shouldAddValueHeaders = numberOfValues > 1;

      cells[rowIndex][currentIndex] = {
        value: title,
        constraint: parentHeader?.constraint,
        label: parentHeader?.attributeName,
        cssClass: PivotTableConverter.columnGroupHeaderClass,
        isSummary: true,
        stickyTop: this.isColumnLevelSticky(level),
        rowSpan: this.columnLevels - rowIndex - (shouldAddValueHeaders ? 1 : 0),
        colSpan: numberOfSums,
        background,
        summary,
      };

      if (numberOfValues > 0) {
        for (let i = 0; i < numberOfValues; i++) {
          const columnIndexInCells = currentIndex + i;
          if (shouldAddValueHeaders) {
            const valueTitle = this.data.valueTitles[i];
            cells[this.columnLevels - 1][columnIndexInCells] = {
              value: valueTitle,
              cssClass: PivotTableConverter.columnGroupHeaderClass,
              isSummary: true,
              stickyTop: this.isColumnLevelSticky(level),
              rowSpan: 1,
              colSpan: 1,
              background,
            };
          }

          const columnsIndexes = getTargetIndexesForHeaders(headers);
          const valueColumnsIndexes = columnsIndexes.filter(index => index % numberOfValues === i);
          const transformedColumnIndexes = valueColumnsIndexes
            .map(v => this.columnsTransformationArray[v])
            .filter(v => isNotNullOrUndefined(v));
          columnGroupsInfo[columnIndexInCells] = {background, indexes: transformedColumnIndexes, level};

          this.fillCellsForGroupedColumn(cells, valueColumnsIndexes, columnIndexInCells, background);
        }
      } else {
        columnGroupsInfo[currentIndex] = {background, indexes: [], level};
      }
    }
  }

  private fillCellsForGroupedColumn(
    cells: LmrPivotTableCell[][],
    columns: number[],
    columnIndexInCells: number,
    background: string
  ) {
    for (let row = 0; row < this.rowsTransformationArray.length; row++) {
      const rowIndexInCells = this.rowsTransformationArray[row];
      if (isNotNullOrUndefined(rowIndexInCells)) {
        const {values, dataResources} = this.getGroupedValuesForRowsAndCols([row], columns);
        const formattedValue = this.aggregateAndFormatDataValues(values, [row], columns);
        cells[rowIndexInCells][columnIndexInCells] = {
          value: String(formattedValue),
          dataResources,
          colSpan: 1,
          rowSpan: 1,
          cssClass: PivotTableConverter.groupDataClass,
          background,
          isValue: true,
        };
      }
    }
  }

  private aggregateAndFormatDataValues(values: any[], rows: number[], columns: number[]): any {
    const {value, aggregation} = this.aggregateDataValues(values, columns);
    return aggregation === DataAggregationType.Join ? value : this.formatGroupedValueByValueType(value, rows, columns)
  }

  private aggregateDataValues(values: any[], columns: number[]): {value: any; aggregation: DataAggregationType} {
    const aggregation = this.aggregationByColumns(columns);
    if (aggregation === DataAggregationType.Join) {
      const valueIndex = this.getValueIndexForColumns(columns);
      const constraint = this.data.valuesConstraints?.[valueIndex] || this.valueTypeInfo[valueIndex]?.defaultConstraint;
      return {value: aggregateDataValues(aggregation, values, constraint, false, this.constraintData), aggregation};
    }
    return {value: aggregateDataValues(aggregation, values), aggregation};
  }

  private aggregationByColumns(columns: number[]): DataAggregationType {
    const valueIndex = columns[0] % this.data.valueTitles.length;
    const aggregation = this.data.valueAggregations?.[valueIndex];
    return isValueAggregation(aggregation) ? aggregation : DataAggregationType.Sum;
  }

  private fillCellsForColumn(cells: LmrPivotTableCell[][], column: number) {
    const columnIndexInCells = this.columnsTransformationArray[column];
    if (isNotNullOrUndefined(columnIndexInCells)) {
      for (let row = 0; row < this.rowsTransformationArray.length; row++) {
        const rowIndexInCells = this.rowsTransformationArray[row];
        if (isNotNullOrUndefined(rowIndexInCells)) {
          const value = this.data.values[row][column];
          const dataResources = this.dataResources?.[row]?.[column] || [];
          const formattedValue = this.aggregateOrFormatSingleValue(value, column);
          const stringValue = isNotNullOrUndefined(formattedValue) ? String(formattedValue) : '';
          cells[rowIndexInCells][columnIndexInCells] = {
            value: stringValue,
            dataResources,
            rowSpan: 1,
            colSpan: 1,
            cssClass: PivotTableConverter.dataClass,
            isValue: true,
          };
        }
      }
    }
  }

  private aggregateOrFormatSingleValue(value: any, column: number): any {
    const aggregation = this.aggregationByColumns([column]);
    const valueIndex = this.getValueIndexForColumns([column]);
    if (aggregation === DataAggregationType.Join) {
      const constraint = this.data.valuesConstraints?.[valueIndex] || this.valueTypeInfo[valueIndex]?.defaultConstraint;
      return aggregateDataValues(aggregation, [value], constraint, false, this.constraintData);
    }
    return this.formatValueByValueType(value, valueIndex);
  }

  private fillCellsByGroupIntersection(
    cells: LmrPivotTableCell[][],
    rowGroupsInfo: HeaderGroupInfo[],
    columnGroupsInfo: HeaderGroupInfo[]
  ) {
    const rowsCount = cells.length;
    const columnsCount = cells[0]?.length || 0;

    for (let i = 0; i < rowGroupsInfo.length; i++) {
      const rowGroupInfo = rowGroupsInfo[i];
      if (!rowGroupInfo) {
        continue
      }

      for (let j = 0; j < columnGroupsInfo.length; j++) {
        if (!columnGroupsInfo[j]) {
          continue
        }

        const columns = columnGroupsInfo[j].indexes
        const {rowsIndexes, columnsIndexes} = this.getValuesIndexesFromCellsIndexes(
          rowGroupInfo.indexes,
          columns
        );
        let formattedValue: string;
        let dataResources: DataResource[];
        if (rowGroupInfo.expression) {
          const result = this.evaluateExpression(rowGroupInfo.expression, columnsIndexes);
          const valueIndex = columnsIndexes[0] % this.data.valueTitles.length;
          formattedValue = this.formatValueByConstraint(result.value, valueIndex);
          dataResources = result.dataResources
        } else {
          // it's enough to fill group values only from row side
          const result = this.getGroupedValuesForRowsAndCols(rowsIndexes, columnsIndexes);
          formattedValue = this.aggregateAndFormatDataValues(result.values, rowsIndexes, columnsIndexes);
          dataResources = result.dataResources
        }
        cells[i][j] = {
          value: String(formattedValue),
          dataResources,
          colSpan: 1,
          rowSpan: 1,
          cssClass: PivotTableConverter.groupDataClass,
          isValue: true,
        };

      }

      this.fillRowWithColor(cells, i, rowGroupInfo, columnsCount);
    }

    for (let j = 0; j < columnGroupsInfo.length; j++) {
      if (columnGroupsInfo[j]) {
        this.fillColumnWithColor(cells, j, columnGroupsInfo[j], rowGroupsInfo, rowsCount);
      }
    }
  }

  private getValuesIndexesFromCellsIndexes(
    rows: number[],
    columns: number[]
  ): { rowsIndexes: number[]; columnsIndexes: number[] } {
    const rowsIndexes = rows
      .map(row => this.rowsTransformationArray.findIndex(tRow => tRow === row))
      .filter(index => index >= 0);
    const columnsIndexes = columns
      .map(column => this.columnsTransformationArray.findIndex(tColumn => tColumn === column))
      .filter(index => index >= 0);
    return {rowsIndexes, columnsIndexes};
  }

  private fillRowWithColor(
    cells: LmrPivotTableCell[][],
    row: number,
    rowGroupInfo: HeaderGroupInfo,
    columnsCount: number
  ) {
    for (let i = this.rowLevels; i < columnsCount; i++) {
      cells[row][i] && (cells[row][i].background = rowGroupInfo.background);
    }
  }

  private fillColumnWithColor(
    cells: LmrPivotTableCell[][],
    column: number,
    columnGroupInfo: HeaderGroupInfo,
    rowGroupsInfo: HeaderGroupInfo[],
    rowCount: number
  ) {
    for (let i = this.columnLevels; i < rowCount; i++) {
      const rowGroupInfo = rowGroupsInfo[i];
      if (!rowGroupInfo || rowGroupInfo.level > columnGroupInfo.level) {
        cells[i][column] && (cells[i][column].background = columnGroupInfo.background);
      }
    }
  }

  private initCells(): LmrPivotTableCell[][] {
    const rows = this.getRowsCount() + this.columnLevels;
    const columns = this.getColumnsCount() + this.rowLevels;

    const matrix: LmrPivotTableCell[][] = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < columns; j++) {
        if (i >= this.columnLevels && j >= this.rowLevels) {
          const isDataClass = this.rowsTransformationArray.includes(i) && this.columnsTransformationArray.includes(j);
          matrix[i][j] = {
            value: '',
            dataResources: [],
            cssClass: isDataClass ? PivotTableConverter.dataClass : PivotTableConverter.groupDataClass,
            rowSpan: 1,
            colSpan: 1,
            isValue: true,
          };
        } else {
          matrix[i][j] = undefined;
        }
      }
    }

    if (this.rowLevels > 0 && this.columnLevels > 0) {
      for (let j = 0; j < this.rowLevels; j++) {
        const rowHeaderAttribute = this.data.rowHeaderAttributes[j];
        if (rowHeaderAttribute) {
          const titleRowSpan = this.nonStickyColumnIndex || this.columnLevels
          matrix[0][j] = {
            value: rowHeaderAttribute.title,
            cssClass: PivotTableConverter.rowAttributeHeaderClass,
            isAttributeHeader: true,
            rowSpan: titleRowSpan,
            colSpan: 1,
            stickyTop: this.isColumnLevelSticky(0),
            stickyStart: this.isRowLevelSticky(j),
            background: rowHeaderAttribute.color,
          };

          if (this.columnLevels - titleRowSpan > 0) {
            matrix[this.nonStickyColumnIndex][j] = {
              value: '',
              cssClass: PivotTableConverter.rowAttributeHeaderClass,
              isAttributeHeader: true,
              rowSpan: this.columnLevels - titleRowSpan,
              colSpan: 1,
              background: rowHeaderAttribute.color,
              stickyStart: this.isRowLevelSticky(j),
            };
          }

        } else {
          for (let i = 0; i < this.columnLevels; i++) {
            matrix[i][j] = {
              value: '',
              cssClass: PivotTableConverter.emptyClass,
              rowSpan: 1,
              colSpan: 1,
              stickyStart: this.isRowLevelSticky(j),
              stickyTop: this.isColumnLevelSticky(i),
              isHeader: false,
            }
          }
        }
      }
    }

    return matrix;
  }

  private getRowsCount(): number {
    if (this.data.rowHeaders.length === 0 && (this.data.valueTitles || []).length > 0) {
      return 1;
    }
    return getHeadersChildCount(this.data.rowHeaders, this.rowShowSums);
  }

  private getColumnsCount(): number {
    if (this.data.columnHeaders.length === 0 && (this.data.valueTitles || []).length > 0) {
      return 1;
    }
    const numberOfSums = Math.max(1, (this.data.valueTitles || []).length);
    return getHeadersChildCount(this.data.columnHeaders, this.columnShowSums, numberOfSums);
  }
}

function preparePivotData(
  data: LmrPivotStemData,
  constraintData: ConstraintData,
  valueTypeInfo: ValueTypeInfo[]
): LmrPivotStemData {
  const numberOfSums = Math.max(1, (data.valueTitles || []).length);
  const values = computeValuesByValueType(data.values, data.valueTypes, numberOfSums, valueTypeInfo);
  const sorted = sortPivotData({...data, values}, constraintData);
  return fillExpressionsToData(sorted)
}

function fillExpressionsToData(data: LmrPivotStemData): LmrPivotStemData {
  return {
    ...data,
    rowHeaders: fillExpressionsToHeaders(data.rowHeaders, data.rowsConfig, 0),
    columnHeaders: fillExpressionsToHeaders(data.columnHeaders, data.columnsConfig, 0),
  }
}

function fillExpressionsToHeaders(headers: LmrPivotDataHeader[], configs: LmrPivotDimensionConfig[], index: number): LmrPivotDataHeader[] {
  const expressions = configs?.[index]?.expressions || []
  const headersCopy = [...(headers || [])]
  for (const expression of expressions) {
    const dataHeaderExpression = extendPivotExpression(expression, headers)
    if (dataHeaderExpression.lastHeaderIndex >= 0) {
      const lastHeaderIndex = dataHeaderExpression.lastHeaderIndex
      const newHeader: LmrPivotDataHeader = {...headersCopy[lastHeaderIndex], expressions: [...(headersCopy[lastHeaderIndex].expressions || []), dataHeaderExpression]}
      headersCopy.splice(lastHeaderIndex, 1, newHeader)
    }
  }

  if (configs?.[index + 1]) {
    for (let i = 0; i < headersCopy.length; i++) {
      headersCopy.splice(i, 1, {...headersCopy[i], children: fillExpressionsToHeaders(headersCopy[i].children, configs, index + 1)})
    }
  }

  return headersCopy
}

function extendPivotExpression(expression: LmrPivotExpression, headers: LmrPivotDataHeader[]): LmrPivotDataHeaderExpression {
  const dataHeaderOperands: LmrPivotDataHeaderOperand[] = [];
  let lastHeaderIndex: number = -1

  function traverse(operands: LmrPivotOperand[]): void {
    for (const operand of operands){
      if (operand.type === 'header') {
        const indexes = getOperandIndexesInHeaders(operand, headers)
        lastHeaderIndex = Math.max(lastHeaderIndex, ...indexes)
        const operandHeaders = indexes.map(index => headers[index])
        dataHeaderOperands.push({...operand, headers: operandHeaders});
      } else if (operand.type === 'expression') {
        traverse(operand.operands);
      } else {
        dataHeaderOperands.push(operand)
      }
    }
  }

  traverse(expression.operands);

  return {...expression, lastHeaderIndex, operands: dataHeaderOperands};
}

function getOperandIndexesInHeaders(operand: LmrPivotHeaderOperand, headers: LmrPivotDataHeader[]): number[] {
  return (headers || []).reduce<number[]>((indexes, header, index) => {
    if (operandContainsHeader(operand, header)) {
      indexes.push(index)
    }
    return indexes
  }, [])
}

function operandContainsHeader(operand: LmrPivotHeaderOperand, header: LmrPivotDataHeader): boolean {
  return header.title.match(new RegExp(operand.value))?.length > 0
}

function computeValuesByValueType(
  values: any[][],
  valueTypes: LmrPivotValueType[],
  numValues: number,
  valueTypeInfo: ValueTypeInfo[]
): any[][] {
  const rowsIndexes = [...Array(values.length).keys()];
  const modifiedValues = deepObjectCopy(values);

  for (let i = 0; i < numValues; i++) {
    const valueType = valueTypes && valueTypes[i];
    if (!valueType || valueType === LmrPivotValueType.Default) {
      continue;
    }

    const columnsCount = (values[0] && values[0].length) || 0;
    const columnIndexes = [...Array(columnsCount).keys()].filter(key => key % numValues === i);
    const info = valueTypeInfo[i];

    for (const row of rowsIndexes) {
      for (const column of columnIndexes) {
        if (valueType === LmrPivotValueType.AllPercentage) {
          modifiedValues[row][column] = divideValues(values[row][column], info.sum);
        } else if (valueType === LmrPivotValueType.RowPercentage) {
          modifiedValues[row][column] = divideValues(values[row][column], info.sumsRows[row]);
        } else if (valueType === LmrPivotValueType.ColumnPercentage) {
          modifiedValues[row][column] = divideValues(values[row][column], info.sumsColumns[column]);
        }
      }
    }
  }

  return modifiedValues;
}

function getValuesTypeInfo(values: any[][], valueTypes: LmrPivotValueType[], numValues: number): ValueTypeInfo[] {
  const valueTypeInfo = [];
  const rowsIndexes = [...Array(values.length).keys()];

  for (let i = 0; i < numValues; i++) {
    const valueType = valueTypes && valueTypes[i];
    const columnsCount = (values[0] && values[0].length) || 0;
    const columnIndexes = [...Array(columnsCount).keys()].filter(key => key % numValues === i);

    valueTypeInfo[i] = getValueTypeInfo(values, valueType, rowsIndexes, columnIndexes);
  }

  return valueTypeInfo;
}

function getValueTypeInfo(values: any[][], type: LmrPivotValueType, rows: number[], columns: number[]): ValueTypeInfo {
  const containsDecimal = containsDecimalValue(values, rows, columns);
  const valueTypeInfo: ValueTypeInfo = {
    defaultConstraint: containsDecimal ? new NumberConstraint({decimals: 2}) : null,
  };

  if (type === LmrPivotValueType.AllPercentage) {
    return {...valueTypeInfo, sum: getNumericValuesSummary(values, rows, columns)};
  } else if (type === LmrPivotValueType.RowPercentage) {
    return {
      ...valueTypeInfo,
      sumsRows: rows.reduce((arr, row) => {
        arr[row] = getNumericValuesSummary(values, [row], columns);
        return arr;
      }, []),
    };
  } else if (type === LmrPivotValueType.ColumnPercentage) {
    return {
      ...valueTypeInfo,
      sumsColumns: columns.reduce((arr, column) => {
        arr[column] = getNumericValuesSummary(values, rows, [column]);
        return arr;
      }, []),
    };
  }

  return {...valueTypeInfo};
}

function containsDecimalValue(values: any[][], rows: number[], columns: number[]): boolean {
  for (const row of rows) {
    for (const column of columns) {
      if (isValueDecimal(values[row][column])) {
        return true;
      }
    }
  }
  return false;
}

function isValueDecimal(value: string): boolean {
  if (isNullOrUndefined(value)) {
    return false;
  }

  if (isNumeric(value)) {
    return toNumber(value) % 1 !== 0;
  }
  return false;
}

function createTransformationMap(
  headers: LmrPivotDataHeader[],
  showSums: boolean[],
  additionalNum: number,
  numberOfSums: number
): number[] {
  const array = [];
  iterateThroughTransformationMap(headers, additionalNum, array, 0, showSums, numberOfSums);
  return array;
}

function iterateThroughTransformationMap(
  headers: LmrPivotDataHeader[],
  additionalNum: number,
  array: number[],
  level: number,
  showSums: boolean[],
  numberOfSums: number
) {
  let additional = additionalNum;
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header.children) {
      iterateThroughTransformationMap(header.children, additional, array, level + 1, showSums, numberOfSums);
      additional += getHeaderChildCount(header, level, showSums, numberOfSums);
    } else if (isNotNullOrUndefined(header.targetIndex)) {
      array[header.targetIndex] = i + additional;
      additional += (header.expressions || []).length;
    }
  }
}

function getTargetIndexesForHeaders(headers: LmrPivotDataHeader[]): number[] {
  const allRows = (headers || []).reduce((rows, header) => {
    rows.push(...getTargetIndexesForHeader(header));
    return rows;
  }, []);
  return uniqueValues<number>(allRows);
}

function getTargetIndexesForHeader(pivotDataHeader: LmrPivotDataHeader): number[] {
  if (pivotDataHeader.children) {
    return pivotDataHeader.children.reduce((rows, header) => {
      rows.push(...getTargetIndexesForHeader(header));
      return rows;
    }, []);
  }
  return [pivotDataHeader.targetIndex];
}

function getHeadersChildCount(headers: LmrPivotDataHeader[], showSums: boolean[], numberOfSums = 1): number {
  return (headers || []).reduce(
    (sum, header) => sum + getHeaderChildCount(header, 0, showSums, numberOfSums),
    showSums[0] ? numberOfSums : 0
  );
}

function getHeaderChildCount(
  pivotDataHeader: LmrPivotDataHeader,
  level: number,
  showSums: boolean[],
  numberOfSums = 1,
): number {
  const numExpressions = (pivotDataHeader.expressions || []).length
  if (pivotDataHeader.children) {
    return pivotDataHeader.children.reduce(
      (sum, header) => sum + getHeaderChildCount(header, level + 1, showSums, numberOfSums),
      (showSums[level + 1] ? numberOfSums : 0) + numExpressions
    );
  }
  return 1 + numExpressions;
}

function getDirectHeaderChildCount(
  pivotDataHeader: LmrPivotDataHeader,
  level: number,
  showSums: boolean[],
  numberOfSums = 1
): number {
  if (pivotDataHeader.children) {
    return pivotDataHeader.children.reduce(
      (sum, header) => sum + getHeaderChildCount(header, level + 1, showSums, numberOfSums),
      0
    );
  }
  return 1;
}

export function sortPivotData(data: LmrPivotStemData, constraintData: ConstraintData): LmrPivotStemData {
  const rowSorts = (data.rowsConfig || []).map(config => config.sort)
  const columnSorts = (data.columnsConfig || []).map(config => config.sort)
  return {
    ...data,
    rowHeaders: sortPivotRowDataHeaders(data.rowHeaders, rowSorts, data, constraintData),
    columnHeaders: sortPivotColumnDataHeaders(data.columnHeaders, columnSorts, data, constraintData),
  };
}

function sortPivotRowDataHeaders(
  rowHeaders: LmrPivotDataHeader[],
  rowSorts: LmrPivotSort[],
  pivotData: LmrPivotStemData,
  constraintData: ConstraintData
): LmrPivotDataHeader[] {
  return sortPivotDataHeadersRecursive(
    rowHeaders,
    0,
    rowSorts,
    pivotData.columnHeaders,
    pivotData.values,
    pivotData.valueTitles || [],
    true,
    constraintData
  );
}

function sortPivotColumnDataHeaders(
  columnHeaders: LmrPivotDataHeader[],
  columnSorts: LmrPivotSort[],
  pivotData: LmrPivotStemData,
  constraintData: ConstraintData
): LmrPivotDataHeader[] {
  return sortPivotDataHeadersRecursive(
    columnHeaders,
    0,
    columnSorts,
    pivotData.rowHeaders,
    pivotData.values,
    pivotData.valueTitles || [],
    false,
    constraintData
  );
}

function sortPivotDataHeadersRecursive(
  headers: LmrPivotDataHeader[],
  index: number,
  sorts: LmrPivotSort[],
  otherSideHeaders: LmrPivotDataHeader[],
  values: any[][],
  valueTitles: string[],
  isRows: boolean,
  constraintData: ConstraintData
): LmrPivotDataHeader[] {
  // we don't want to sort values headers
  if (!isRows && isValuesHeaders(headers, valueTitles)) {
    return headers;
  }
  const sort = sorts && sorts[index];
  const constraint = getConstraintForSort(sort, headers);
  const valuesMap = createHeadersValuesMap(headers, sort, otherSideHeaders, values, valueTitles, isRows);
  return headers
    .map(header => ({
      ...header,
      children:
        header.children &&
        sortPivotDataHeadersRecursive(
          header.children,
          index + 1,
          sorts,
          otherSideHeaders,
          values,
          valueTitles,
          isRows,
          constraintData
        ),
    }))
    .sort((r1, r2) => {
      const r1Value = constraint.createDataValue(valuesMap[r1.title], constraintData);
      const r2Value = constraint.createDataValue(valuesMap[r2.title], constraintData);
      const multiplier = !sort || sort.asc ? 1 : -1;
      return r1Value.compareTo(r2Value) * multiplier;
    });
}

function getConstraintForSort(sort: LmrPivotSort, headers: LmrPivotDataHeader[]): Constraint {
  if ((sort?.list?.values || []).length > 0) {
    // sort is done by values in columns
    return new NumberConstraint({});
  }
  return ((headers || [])[0] && (headers || [])[0].constraint) || new UnknownConstraint();
}

function isValuesHeaders(headers: LmrPivotDataHeader[], valueTitles: string[]): boolean {
  return (
    valueTitles.length > 1 &&
    (headers || []).every(
      (header, index) => isNotNullOrUndefined(header.targetIndex) && header.title === valueTitles[index]
    )
  );
}

function createHeadersValuesMap(
  headers: LmrPivotDataHeader[],
  sort: LmrPivotSort,
  otherSideHeaders: LmrPivotDataHeader[],
  values: any[][],
  valueTitles: string[],
  isRows: boolean
): Record<string, any> {
  const sortTargetIndexes = sortValueTargetIndexes(sort, otherSideHeaders, valueTitles);
  if (!sortTargetIndexes) {
    return (headers || []).reduce((valuesMap, header) => {
      valuesMap[header.title] = header.title;
      return valuesMap;
    }, {});
  }

  return (headers || []).reduce((valuesMap, header) => {
    const rows = isRows ? getTargetIndexesForHeader(header) : sortTargetIndexes;
    const columns = isRows ? sortTargetIndexes : getTargetIndexesForHeader(header);
    valuesMap[header.title] = getNumericValuesSummary(values, rows, columns);
    return valuesMap;
  }, {});
}

function getNumericValuesSummary(values: any[][], rows: number[], columns: number[]): number {
  let sum = 0;
  for (const row of rows) {
    for (const column of columns) {
      const value = values[row][column];
      if (isNotNullOrUndefined(value) && isNumeric(value)) {
        sum += toNumber(value);
      }
    }
  }
  return sum;
}

function sortValueTargetIndexes(
  sort: LmrPivotSort,
  otherSideHeaders: LmrPivotDataHeader[],
  valueTitles: string[]
): number[] | null {
  if (sort && sort.list) {
    let valueIndex = valueTitles.findIndex(title => title === sort.list.valueTitle);
    if (valueIndex === -1) {
      if (valueTitles.length === 1) {
        valueIndex = 0;
      } else {
        return null;
      }
    }

    let pivotHeader: LmrPivotDataHeader = null;
    let currentOtherSideHeaders = otherSideHeaders;
    for (const value of sort.list.values || []) {
      if (value.isSummary) {
        const indexes = getTargetIndexesForHeaders(currentOtherSideHeaders || []) || [];
        return filterIndexesByMod(indexes, valueTitles.length, valueIndex);
      }

      pivotHeader = (currentOtherSideHeaders || []).find(header => header.title === value.title);
      if (!pivotHeader) {
        break;
      }

      currentOtherSideHeaders = pivotHeader.children || [];
    }

    if (pivotHeader) {
      const targetIndexes = isNotNullOrUndefined(pivotHeader.targetIndex)
        ? [pivotHeader.targetIndex]
        : getTargetIndexesForHeaders(currentOtherSideHeaders);
      return filterIndexesByMod(targetIndexes, valueTitles.length, valueIndex);
    }
  }

  return null;
}

function filterIndexesByMod(indexes: number[], mod: number, value: number): number[] {
  return (indexes || []).filter(index => index % mod === value);
}

function divideValues(value: any, divider: any): number {
  if (isNullOrUndefined(value)) {
    return null;
  }

  if (isNumeric(value) && isNumeric(divider)) {
    if (divider !== 0) {
      return value / divider;
    } else {
      return 0;
    }
  }

  return null;
}
