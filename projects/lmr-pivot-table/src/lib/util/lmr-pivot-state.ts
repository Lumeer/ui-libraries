import {LmrPivotTable, LmrPivotTableCell} from './lmr-pivot-table';
import {isNullOrUndefined} from '@lumeer/utils';

export interface LmrPivotTableState {
  cells?: LmrPivotTableCellState[][]
}

export interface LmrPivotTableCellState {
  expanded?: boolean;
}

export function isCellExpandable(cell: LmrPivotTableCell): boolean {
  return isCellColumnsExpandable(cell) || isCellRowsExpandable(cell);
}

export function isCellColumnsExpandable(cell: LmrPivotTableCell): boolean {
  return cell.childIndexes?.length > 1;
}

export function isCellRowsExpandable(cell: LmrPivotTableCell): boolean {
  return cell.rowIndexes?.length > 1;
}

export function toggleExpanded(cell: LmrPivotTableCell, columnIndex: number, table: LmrPivotTable, state: LmrPivotTableState): LmrPivotTableState {
  const tableRowIndex = table.cells.findIndex(row => areCellsSame(row[columnIndex], cell))
  return toggleExpandedState(state, tableRowIndex, columnIndex)
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
  rowCopy[columnIndex] = {...rowCopy[columnIndex], expanded: !rowCopy[columnIndex]?.expanded}
  cellsCopy[rowIndex] = rowCopy
  return {...state, cells: cellsCopy}
}

export function filterVisibleCells(cells: LmrPivotTableCell[][], state: LmrPivotTableCellState[][]): LmrPivotTableCell[][] {
  const cellsChildIndexesMap = createCellsChildIndexesMap(cells);
  const firstColumnHeaderIndex = takeIf(cells?.[0].findIndex(cell=> cell?.isHeader), index => index >= 0) ?? 1
  return cells.reduce<LmrPivotTableCell[][]>((currentRows, row, index) => {
    const firstCell = row[0]
    if (!firstCell) {
      return currentRows
    }
    if (firstCell.isAttributeHeader || firstCell.isSummary || (!firstCell.isAttributeHeader && !firstCell.isHeader && !firstCell.isSummary)) {
      currentRows.push(row)
      return currentRows
    }

    if (isRowVisible(index, cellsChildIndexesMap, 0, state)) {
      if (firstCell.childIndexes?.length > 1) {
        const isExpanded = state?.[index]?.[0].expanded
        if (isExpanded) {
          const nestedCells = sliceMatrix(cells, index, index + firstCell.childIndexes.length - 1, 1, cells[0].length - 1)
          const nestedState = sliceMatrix(state, index, index + firstCell.childIndexes.length - 1, 1, cells[0].length - 1)
          const nestedFilteredRows = filterVisibleCells(nestedCells, nestedState)
          const changedCell = {
            ...row[0],
            rowSpan: nestedFilteredRows.length
          }
          const newRows = appendCellToMatrix(changedCell, nestedFilteredRows);
          currentRows.push(...newRows)
        } else {
          const rowCopy = [...row]
          rowCopy[0] = {
            ...row[0],
            colSpan: firstColumnHeaderIndex,
            rowSpan: 1
          }
          for (let i = 1; i < firstColumnHeaderIndex; i++) {
            rowCopy[i] = undefined
          }
          currentRows.push(rowCopy)
        }
      } else {
        currentRows.push(row)
      }
    }

    return currentRows
  }, [])
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
  return !childIndexes.length ||  childIndexes.some(childIndex => state?.[childIndex]?.[columnIndex]?.expanded)
}
