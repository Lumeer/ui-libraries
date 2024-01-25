import {LmrPivotTable, LmrPivotTableCell} from './lmr-pivot-table';
import {isNullOrUndefined} from '@lumeer/utils';

export interface LmrPivotTableState {
  cells?: LmrPivotTableCellState[][]
}

export interface LmrPivotTableCellState {
  collapsed?: boolean;
}

export function isCellExpandable(cell: LmrPivotTableCell): boolean {
  return isCellColumnsExpandable(cell) || isCellRowsExpandable(cell);
}

export function isCellColumnsExpandable(cell: LmrPivotTableCell): boolean {
  return cell?.childIndexes?.length > 1;
}

export function isCellRowsExpandable(cell: LmrPivotTableCell): boolean {
  return cell?.rowIndexes?.length > 1;
}

export function toggleExpanded(cell: LmrPivotTableCell, columnIndex: number, state: LmrPivotTableState): LmrPivotTableState {
  if (cell.originalRowIndex) {
    return toggleExpandedState(state, cell.originalRowIndex, columnIndex)
  }
  return state
}

export function areCellsSame(c1: LmrPivotTableCell, c2: LmrPivotTableCell): boolean {
  return c1?.summary === c2?.summary && c1?.value === c2?.value
}

function toggleExpandedState(state: LmrPivotTableState, rowIndex: number, columnIndex: number): LmrPivotTableState {
  if (isNullOrUndefined(rowIndex) || isNullOrUndefined(columnIndex) || rowIndex < 0 || columnIndex < 0) {
    return state
  }

  const cellsCopy = [...(state?.cells || [])]
  const rowCopy = [...(cellsCopy[rowIndex] || [])]
  rowCopy[columnIndex] = {...rowCopy[columnIndex], collapsed: !rowCopy[columnIndex]?.collapsed}
  cellsCopy[rowIndex] = rowCopy
  return {...state, cells: cellsCopy}
}

export function filterVisibleCells(cells: LmrPivotTableCell[][], state: LmrPivotTableCellState[][], parentIndex: number = 0): LmrPivotTableCell[][] {
  const cellsChildIndexesMap = createCellsChildIndexesMap(cells);
  return cells.reduce<LmrPivotTableCell[][]>((currentRows, row, index) => {
    const firstCell = row[0]
    if (!firstCell) {
      return currentRows
    }
    const originalRowIndex = parentIndex + index
    if (firstCell.isAttributeHeader || firstCell.isSummary || firstCell.isValue) {
      currentRows.push(setOriginalRowIndexForHeaders(row, originalRowIndex))
      return currentRows
    }

    if (isRowVisible(index, cellsChildIndexesMap, 0, state)) {
      if (row.some(cell => isCellColumnsExpandable(cell))) {
        const isCollapsed = state?.[index]?.[0]?.collapsed
        if (isCollapsed) {
          const firstDataHeaderIndex = takeIf(row.findIndex(cell => cell.isValue), result => result >= 0) ?? 1
          const rowCopy = [...row]
          rowCopy[0] = {
            ...row[0],
            colSpan: firstDataHeaderIndex,
            rowSpan: 1,
            originalRowIndex,
          }
          for (let i = 1; i < firstDataHeaderIndex; i++) {
            rowCopy[i] = undefined
          }
          currentRows.push(rowCopy)
        } else {
          const nestedCells = sliceMatrix(cells, index, index + firstCell.rowSpan - 1, 1, cells[0].length - 1)
          const nestedState = sliceMatrix(state, index, index + firstCell.rowSpan - 1, 1, cells[0].length - 1)
          const nestedFilteredRows = filterVisibleCells(nestedCells, nestedState, originalRowIndex)
          const changedCell = {
            ...row[0],
            rowSpan: nestedFilteredRows.length,
            originalRowIndex,
          }
          const newRows = appendCellToMatrix(changedCell, nestedFilteredRows);
          currentRows.push(...newRows)
        }
      } else {
        currentRows.push(setOriginalRowIndexForHeaders(row, originalRowIndex))
        for (let i = 1; i < firstCell.rowSpan; i++) {
          currentRows.push(setOriginalRowIndexForHeaders(cells[index + i], originalRowIndex + i))
        }
      }
    }

    return currentRows
  }, [])
}

function setOriginalRowIndexForHeaders(row: LmrPivotTableCell[], originalRowIndex: number): LmrPivotTableCell[] {
  const newRow = [];
  for (let i = 0; i < row.length; i++) {
    const cell = row[i];
    if (!cell) {
      newRow.push(cell);
    } else if (cell.isValue) {
      return [...newRow, ...row.slice(i)];
    } else {
      newRow.push({...cell, originalRowIndex})
    }
  }
  return newRow
}

function appendCellToMatrix(cell: LmrPivotTableCell, rows: LmrPivotTableCell[][]): LmrPivotTableCell[][] {
  return rows.map((row, index) => index > 0 ? [undefined, ...row] : [cell, ...row])
}

function takeIf<T>(value: T, predicate: (v: T) => boolean): T | undefined {
  return predicate(value) ? value : undefined
}

function sliceMatrix<T>(cells: T[][], fromRow: number, toRow: number, fromColumn: number, toColumn: number): T[][] {
  const slicedMatrix: T[][] = [];
  for (let i = fromRow; i <= toRow; i++) {
    const row: T[] = (cells?.[i] || []).slice(fromColumn, toColumn + 1);
    slicedMatrix.push(row);
  }

  return slicedMatrix;
}

function createCellsChildIndexesMap(rowCells: LmrPivotTableCell[][]): number[][] {
  const firstCells = rowCells.map(rowCells => rowCells[0]);
  return createRowsChildIndexesMap(firstCells);
}

function createRowsChildIndexesMap(rowCells: LmrPivotTableCell[]): number[][] {
  return (rowCells || []).reduce((map, cell, index) => {
    for (const childIndex of (cell?.rowIndexes || [])) {
      if (!map[childIndex])
        map[childIndex] = []
      map[childIndex].push(index)
    }

    return map;
  }, []);
}

function isRowVisible(index: number, childIndexesMap: number[][], columnIndex: number, state: LmrPivotTableCellState[][]): boolean {
  const childIndexes = childIndexesMap?.[index] || []
  return !childIndexes.length || childIndexes.some(childIndex => !state?.[childIndex]?.[columnIndex]?.collapsed)
}

export function collapseAllCells(table: LmrPivotTable): LmrPivotTableState {
  const cells: LmrPivotTableCellState[][] = [];
  const tableCells = table?.cells || [];
  for (let i = 0; i < tableCells.length; i++) {
    const row = tableCells[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell?.isValue || cell?.isAttributeHeader || cell?.isHeader) {
        break;
      }
      if (isCellExpandable(cell)) {
        if (!cells[i]) {
          cells[i] = [];
        }
        cells[i][j] = {collapsed: true};
      }
    }
  }
  return {cells}
}
