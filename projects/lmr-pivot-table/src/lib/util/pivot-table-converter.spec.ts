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
import {PercentageConstraint, PercentageConstraintConfig} from '@lumeer/data-filters';

import {LmrPivotData} from './lmr-pivot-data';
import {PivotTableConverter} from './pivot-table-converter';
import {COLOR_GRAY100, COLOR_GRAY200} from './lmr-pivot-constants';
import {LmrPivotPosition, LmrPivotTransform} from './lmr-pivot-config';

describe('Pivot table converter', () => {
  const headerSummaryString = 'H';
  const summaryString = 'S';
  const transform: LmrPivotTransform = {
    formatSummaryHeader: (header, level) => ({
      title: header?.title,
      summary: level ? headerSummaryString : summaryString
    })
  }
  const converter: PivotTableConverter = new PivotTableConverter();

  it('should return empty rows', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: [],
          rowHeaders: [],
          rowHeaderAttributes: [],
          columnHeaders: [],
          columnHeaderAttributes: [],
          values: [],
          dataResources: [],
          rowsConfig: [],
          columnsConfig: [],
          valueTypes: [],
        },
      ],
    };
    expect(converter.createTables(data, transform)).toEqual([{cells: []}]);
  });

  it('should return table by only values', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['A', 'B', 'C'],
          rowHeaders: [],
          rowHeaderAttributes: [],
          columnHeaders: [
            {title: 'A', targetIndex: 0, color: undefined, isValueHeader: false},
            {title: 'B', targetIndex: 1, color: undefined, isValueHeader: false},
            {title: 'C', targetIndex: 2, color: undefined, isValueHeader: false},
          ],
          columnHeaderAttributes: [],
          values: [[10, 20, 30]],
          dataResources: [],
          rowsConfig: [],
          columnsConfig: [],
          hasAdditionalColumnLevel: true,
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells.length).toEqual(2);
    expect(pivotTable.cells[0].length).toEqual(3);
    expect(pivotTable.cells[1].length).toEqual(3);
    expect(pivotTable.cells[0][0]).toEqual({
      value: 'A',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][1]).toEqual({
      value: 'B',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][2]).toEqual({
      value: 'C',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][0]).toEqual({
      value: '10',
      dataResources: [],
      rowSpan: 1,
      colSpan: 1,
      cssClass: PivotTableConverter.dataClass,
      isValue: true,
    });
    expect(pivotTable.cells[1][1]).toEqual({
      value: '20',
      dataResources: [],
      rowSpan: 1,
      colSpan: 1,
      cssClass: PivotTableConverter.dataClass,
      isValue: true,
    });
    expect(pivotTable.cells[1][2]).toEqual({
      value: '30',
      dataResources: [],
      rowSpan: 1,
      colSpan: 1,
      cssClass: PivotTableConverter.dataClass,
      isValue: true,
    });
  });

  it('should return table by only rows', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: [],
          rowHeaders: [
            {
              title: 'A',
              children: [
                {title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 1, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [{title: 'a1', targetIndex: 2, color: undefined, isValueHeader: false}],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'C',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
                {title: 'a4', targetIndex: 5, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          rowHeaderAttributes: [],
          columnHeaders: [],
          columnHeaderAttributes: [],
          values: [],
          dataResources: [],
          rowsConfig: [{showSums: true}, {showSums: true}],
          columnsConfig: [],
          hasAdditionalColumnLevel: false,
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells.length).toEqual(10);
    expect(pivotTable.cells[0][0]).toEqual({
      value: 'A',
      rowSpan: 2,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [0, 1],
      expandable: true,
    });
    expect(pivotTable.cells[0][1]).toEqual({
      value: 'a1',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [0],
      expandable: true,
    });
    expect(pivotTable.cells[1][0]).toEqual(undefined);
    expect(pivotTable.cells[1][1]).toEqual({
      value: 'a2',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [1],
      expandable: true,
    });
    expect(pivotTable.cells[2][0]).toEqual({
      value: 'A',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });
    expect(pivotTable.cells[2][1]).toEqual(undefined);

    expect(pivotTable.cells[3][0]).toEqual({
      value: 'B',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [3],
      expandable: true,
    });
    expect(pivotTable.cells[3][1]).toEqual({
      value: 'a1',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [3],
      expandable: true,
    });
    expect(pivotTable.cells[4][0]).toEqual({
      value: 'B',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      background: COLOR_GRAY200,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });
    expect(pivotTable.cells[4][1]).toEqual(undefined);

    expect(pivotTable.cells[5][0]).toEqual({
      value: 'C',
      rowSpan: 3,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [5, 6, 7],
      expandable: true,
    });
    expect(pivotTable.cells[5][1]).toEqual({
      value: 'a2',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [5],
      expandable: true,
    });
    expect(pivotTable.cells[6][0]).toEqual(undefined);
    expect(pivotTable.cells[6][1]).toEqual({
      value: 'a3',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [6],
      expandable: true,
    });
    expect(pivotTable.cells[7][0]).toEqual(undefined);
    expect(pivotTable.cells[7][1]).toEqual({
      value: 'a4',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [7],
      expandable: true,
    });
    expect(pivotTable.cells[8][0]).toEqual({
      value: 'C',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });
    expect(pivotTable.cells[8][1]).toEqual(undefined);
    expect(pivotTable.cells[9][0]).toEqual({
      value: undefined,
      summary: summaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });
    expect(pivotTable.cells[9][1]).toEqual(undefined);

    const dataWithoutSums: LmrPivotData = {...data, data: [{...data.data[0], rowsConfig: [{}, {}]}]};
    const pivotTableWithoutSums = converter.createTables(dataWithoutSums, transform)[0];
    expect(pivotTableWithoutSums.cells.length).toEqual(6);
  });

  it('should return table by only columns', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: [],
          rowHeaders: [],
          rowHeaderAttributes: [],
          columnHeaders: [
            {
              title: 'X',
              children: [{title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false}],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'Y',
              children: [
                {title: 'a1', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'Z',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          columnHeaderAttributes: [],
          values: [],
          dataResources: [],
          rowsConfig: [],
          columnsConfig: [{showSums: true}, {showSums: true}],
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells.length).toEqual(2);
    expect(pivotTable.cells[0].length).toEqual(9);
    expect(pivotTable.cells[0][0]).toEqual({
      value: 'X',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][0]).toEqual({
      value: 'a1',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][1]).toEqual({
      value: 'X',
      summary: headerSummaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][1]).toEqual(undefined);

    expect(pivotTable.cells[0][2]).toEqual({
      value: 'Y',
      rowSpan: 1,
      colSpan: 2,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][3]).toEqual(undefined);
    expect(pivotTable.cells[1][2]).toEqual({
      value: 'a1',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][3]).toEqual({
      value: 'a2',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][4]).toEqual({
      value: 'Y',
      summary: headerSummaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][4]).toEqual(undefined);

    expect(pivotTable.cells[0][5]).toEqual({
      value: 'Z',
      rowSpan: 1,
      colSpan: 2,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][6]).toEqual(undefined);
    expect(pivotTable.cells[1][5]).toEqual({
      value: 'a2',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][6]).toEqual({
      value: 'a3',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][7]).toEqual({
      value: 'Z',
      summary: headerSummaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][7]).toEqual(undefined);
    expect(pivotTable.cells[0][8]).toEqual({
      value: undefined,
      summary: summaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][8]).toEqual(undefined);

    const dataWithoutSums: LmrPivotData = {...data, data: [{...data.data[0], columnsConfig: [{}, {}]}]};
    const pivotTableWithoutSums = converter.createTables(dataWithoutSums, transform)[0];
    expect(pivotTableWithoutSums.cells.length).toEqual(2);
    expect(pivotTableWithoutSums.cells[0].length).toEqual(5);
  });

  it('should return table by row and values', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['X', 'Y'],
          rowHeaders: [
            {
              title: 'A',
              children: [
                {title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'C',
              children: [{title: 'a1', targetIndex: 5, color: undefined, isValueHeader: false}],
              color: undefined,
              isValueHeader: false,
            },
          ],
          rowHeaderAttributes: [
            {title: 'H1', color: '#ff0000'}
          ],
          columnHeaders: [
            {title: 'X', targetIndex: 0, color: undefined, isValueHeader: false},
            {title: 'Y', targetIndex: 1, color: undefined, isValueHeader: false},
          ],
          columnHeaderAttributes: [],
          values: [
            [1, 2],
            [2, null],
            [3, 5],
            [8, 9],
            [1, 9],
            [null, 4],
          ],
          dataResources: [],
          rowsConfig: [{showSums: true}, {showSums: true}],
          columnsConfig: [],
          hasAdditionalColumnLevel: true,
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells.length).toEqual(11);
    expect(pivotTable.cells[0].length).toEqual(4);
    expect(pivotTable.cells[0][0]).toEqual({
      value: 'H1',
      rowSpan: 1,
      colSpan: 1,
      isAttributeHeader: true,
      cssClass: PivotTableConverter.rowAttributeHeaderClass,
      stickyTop: undefined,
      stickyStart: undefined,
      background: '#ff0000',
    });
    expect(pivotTable.cells[0][2]).toEqual({
      value: 'X',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][3]).toEqual({
      value: 'Y',
      rowSpan: 1,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });

    expect(pivotTable.cells[1][2].value).toEqual('1');
    expect(pivotTable.cells[1][3].value).toEqual('2');
    expect(pivotTable.cells[2][2].value).toEqual('2');
    expect(pivotTable.cells[2][3].value).toEqual('');
    expect(pivotTable.cells[4][2].value).toEqual('6');
    expect(pivotTable.cells[4][3].value).toEqual('7');

    expect(pivotTable.cells[7][2].value).toEqual('9');
    expect(pivotTable.cells[7][3].value).toEqual('18');

    expect(pivotTable.cells[8][2].value).toEqual('');
    expect(pivotTable.cells[8][3].value).toEqual('4');
    expect(pivotTable.cells[9][2].value).toEqual('0');
    expect(pivotTable.cells[9][3].value).toEqual('4');

    expect(pivotTable.cells[10][2].value).toEqual('15');
    expect(pivotTable.cells[10][3].value).toEqual('29');
  });

  it('should return table by column and values percentage', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['X', 'Y'],
          rowHeaders: [
            {
              title: 'A',
              children: [
                {title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'C',
              children: [{title: 'a1', targetIndex: 5, color: undefined, isValueHeader: false}],
              color: undefined,
              isValueHeader: false,
            },
          ],
          rowHeaderAttributes: [{
            title: 'H1', color: '#ff0000',
          }],
          columnHeaders: [
            {title: 'X', targetIndex: 0, color: undefined, isValueHeader: false},
            {title: 'Y', targetIndex: 1, color: undefined, isValueHeader: false},
          ],
          values: [
            ['10%', '20%'],
            ['20%', null],
            ['30%', '50%'],
            ['80%', '90%'],
            ['10%', '90%'],
            [null, '40%'],
          ],
          dataResources: [],
          valuesConstraints: [
            new PercentageConstraint({} as PercentageConstraintConfig),
            new PercentageConstraint({} as PercentageConstraintConfig),
          ],
          rowsConfig: [{showSums: true}, {showSums: true}],
          columnsConfig: [],
          columnHeaderAttributes: [],
          hasAdditionalColumnLevel: true,
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];

    expect(pivotTable.cells[0][0].value).toEqual('H1');
    expect(pivotTable.cells[1][2].value).toEqual('10%');
    expect(pivotTable.cells[1][3].value).toEqual('20%');
    expect(pivotTable.cells[2][2].value).toEqual('20%');
    expect(pivotTable.cells[2][3].value).toEqual('');
    expect(pivotTable.cells[4][2].value).toEqual('60%');
    expect(pivotTable.cells[4][3].value).toEqual('70%');

    expect(pivotTable.cells[7][2].value).toEqual('90%');
    expect(pivotTable.cells[7][3].value).toEqual('180%');

    expect(pivotTable.cells[8][2].value).toEqual('');
    expect(pivotTable.cells[8][3].value).toEqual('40%');
    expect(pivotTable.cells[9][2].value).toEqual('0%');
    expect(pivotTable.cells[9][3].value).toEqual('40%');

    expect(pivotTable.cells[10][2].value).toEqual('150%');
    expect(pivotTable.cells[10][3].value).toEqual('290%');
  });

  it('should return table by column and values', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['X', 'Y', 'Z'],
          rowHeaders: [],
          rowHeaderAttributes: [],
          columnHeaders: [
            {
              title: 'A',
              children: [
                {title: 'X', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'Y', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'Z', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [
                {title: 'X', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'Y', targetIndex: 4, color: undefined, isValueHeader: false},
                {title: 'Z', targetIndex: 5, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'C',
              children: [
                {title: 'X', targetIndex: 6, color: undefined, isValueHeader: false},
                {title: 'Y', targetIndex: 7, color: undefined, isValueHeader: false},
                {title: 'Z', targetIndex: 8, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          values: [[1, 5, 6, 2, null, 1, 4, 5, null]],
          columnHeaderAttributes: [],
          dataResources: [],
          rowsConfig: [],
          columnsConfig: [{showSums: true}],
          hasAdditionalColumnLevel: true,
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells[0][0]).toEqual({
      value: 'A',
      isHeader: true,
      colSpan: 3,
      rowSpan: 1,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][3]).toEqual({
      value: 'B',
      isHeader: true,
      colSpan: 3,
      rowSpan: 1,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][6]).toEqual({
      value: 'C',
      isHeader: true,
      colSpan: 3,
      rowSpan: 1,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][9]).toEqual({
      value: undefined,
      summary: summaryString,
      colSpan: 3,
      rowSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyTop: undefined,
    });

    expect(pivotTable.cells[1][9]).toEqual({
      value: 'X',
      colSpan: 1,
      rowSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      background: COLOR_GRAY100,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][10]).toEqual({
      value: 'Y',
      colSpan: 1,
      rowSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      background: COLOR_GRAY100,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[1][11]).toEqual({
      value: 'Z',
      colSpan: 1,
      rowSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      background: COLOR_GRAY100,
      stickyTop: undefined,
    });

    expect(pivotTable.cells[2][0].value).toEqual('1');
    expect(pivotTable.cells[2][1].value).toEqual('5');
    expect(pivotTable.cells[2][2].value).toEqual('6');
    expect(pivotTable.cells[2][3].value).toEqual('2');
    expect(pivotTable.cells[2][4].value).toEqual('');
    expect(pivotTable.cells[2][5].value).toEqual('1');
    expect(pivotTable.cells[2][6].value).toEqual('4');
    expect(pivotTable.cells[2][7].value).toEqual('5');
    expect(pivotTable.cells[2][8].value).toEqual('');
    expect(pivotTable.cells[2][9].value).toEqual('7');
    expect(pivotTable.cells[2][10].value).toEqual('10');
    expect(pivotTable.cells[2][11].value).toEqual('7');
  });

  it('should return table by rows and columns and values', () => {
    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['V'],
          rowHeaders: [
            {
              title: 'A',
              children: [
                {title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          rowHeaderAttributes: [undefined, {
            title: 'H2', color: '#ff0000',
          }],
          columnHeaders: [
            {
              title: 'X',
              children: [
                {title: 'x1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'x2', targetIndex: 1, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'Y',
              children: [
                {title: 'x2', targetIndex: 2, color: undefined, isValueHeader: false},
                {title: 'x3', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'x4', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          values: [
            [1, 2, 4, 1, 2],
            [4, 3, 3, 3, 3],
            [5, 0, 1, 2, 2],
            [2, 4, 7, 1, 3],
            [1, 0, 1, 1, 2],
          ],
          columnHeaderAttributes: [],
          dataResources: [],
          rowsConfig: [{}, {showSums: true}],
          columnsConfig: [{showSums: true}, {showSums: true}],
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];
    expect(pivotTable.cells[0][0]).toEqual({
      value: '',
      rowSpan: 1,
      colSpan: 1,
      isHeader: false,
      cssClass: PivotTableConverter.emptyClass,
      stickyTop: undefined,
      stickyStart: undefined,
    });
    expect(pivotTable.cells[0][1]).toEqual({
      value: 'H2',
      rowSpan: 2,
      colSpan: 1,
      isAttributeHeader: true,
      cssClass: PivotTableConverter.rowAttributeHeaderClass,
      stickyTop: undefined,
      stickyStart: undefined,
      background: '#ff0000',
    });

    expect(pivotTable.cells[5][0]).toEqual({
      value: 'A',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });
    expect(pivotTable.cells[6][0]).toEqual({
      value: 'B',
      rowSpan: 2,
      colSpan: 1,
      isHeader: true,
      cssClass: PivotTableConverter.rowHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyStart: undefined,
      childIndexes: [6, 7],
      expandable: true,
    });
    expect(pivotTable.cells[8][0]).toEqual({
      value: 'B',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });

    expect(pivotTable.cells[0][2]).toEqual({
      value: 'X',
      rowSpan: 1,
      colSpan: 2,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][5]).toEqual({
      value: 'Y',
      rowSpan: 1,
      colSpan: 3,
      isHeader: true,
      cssClass: PivotTableConverter.columnHeaderClass,
      background: undefined,
      constraint: undefined,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][4]).toEqual({
      value: 'X',
      summary: headerSummaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][8]).toEqual({
      value: 'Y',
      summary: headerSummaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyTop: undefined,
    });
    expect(pivotTable.cells[0][9]).toEqual({
      value: undefined,
      summary: summaryString,
      rowSpan: 2,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.columnGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyTop: undefined,
    });

    expect(pivotTable.cells[2].slice(2).map(v => v.value)).toEqual(['1', '2', '3', '4', '1', '2', '7', '10']);
    expect(pivotTable.cells[3].slice(2).map(v => v.value)).toEqual(['4', '3', '7', '3', '3', '3', '9', '16']);
    expect(pivotTable.cells[4].slice(2).map(v => v.value)).toEqual(['5', '0', '5', '1', '2', '2', '5', '10']);
    expect(pivotTable.cells[5].slice(2).map(v => v.value)).toEqual(['10', '5', '15', '8', '6', '7', '21', '36']);
    expect(pivotTable.cells[6].slice(2).map(v => v.value)).toEqual(['2', '4', '6', '7', '1', '3', '11', '17']);
    expect(pivotTable.cells[7].slice(2).map(v => v.value)).toEqual(['1', '0', '1', '1', '1', '2', '4', '5']);
    expect(pivotTable.cells[8].slice(2).map(v => v.value)).toEqual(['3', '4', '7', '8', '2', '5', '15', '22']);
  });

  it('should return table with rows expressions', () => {
    const expression1Title = 'A + B'
    const expression2Title = 'a2 * a3'

    const data: LmrPivotData = {
      data: [
        {
          valueTitles: ['V'],
          rowHeaders: [
            {
              title: 'A',
              children: [
                {title: 'a1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'a2', targetIndex: 1, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 2, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'B',
              children: [
                {title: 'a2', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'C',
              children: [
                {title: 'a2', targetIndex: 5, color: undefined, isValueHeader: false},
                {title: 'a3', targetIndex: 6, color: undefined, isValueHeader: false},
                {title: 'a4', targetIndex: 7, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          rowHeaderAttributes: [],
          columnHeaders: [
            {
              title: 'X',
              children: [
                {title: 'x1', targetIndex: 0, color: undefined, isValueHeader: false},
                {title: 'x2', targetIndex: 1, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
            {
              title: 'Y',
              children: [
                {title: 'x2', targetIndex: 2, color: undefined, isValueHeader: false},
                {title: 'x3', targetIndex: 3, color: undefined, isValueHeader: false},
                {title: 'x4', targetIndex: 4, color: undefined, isValueHeader: false},
              ],
              color: undefined,
              isValueHeader: false,
            },
          ],
          values: [
            [4, 3, 5, 2, 8], // A -> a1
            [9, 2, 4, 7, 2], // A -> a2
            [2, 2, 4, 3, 1], // A -> a3
            [3, 4, 7, 1, 3], // B -> a2
            [4, 2, 3, 4, 2], // B -> a3
            [8, 2, 2, 5, 3], // C -> a2
            [7, 3, 1, 6, 5], // C -> a3
            [2, 5, 4, 7, 8], // C -> a4
          ],
          columnHeaderAttributes: [],
          dataResources: [],
          rowsConfig: [
            {
              showSums: true, expressions: [{
                operation: 'add',
                title: expression1Title,
                type: 'expression',
                operands: [{type: 'header', value: 'A'}, {type: 'header', value: 'B'}],
                expandable: true,
                position: LmrPivotPosition.BeforeHeader,
              }]
            },
            {
              showSums: true, expressions: [{
                operation: 'multiply',
                title: expression2Title,
                type: 'expression',
                operands: [{type: 'header', value: 'a2'}, {type: 'header', value: 'a3'}],
                expandable: true,
                position: LmrPivotPosition.BeforeHeader,
              }]
            },
          ],
          columnsConfig: [{}, {}],
        },
      ],
    };

    const pivotTable = converter.createTables(data, transform)[0];

    expect(pivotTable.cells.length).toEqual(18)

    expect(pivotTable.cells[2][0]).toEqual({
      value: undefined,
      summary: expression1Title,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [2, 3, 5, 6, 9, 10],
      expandable: true,
    });

    expect(pivotTable.cells[4][1]).toEqual({
      value: undefined,
      summary: expression2Title,
      rowSpan: 1,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [4, 5, 6],
      expandable: true
    });

    expect(pivotTable.cells[7][0]).toEqual({
      value: 'A',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });

    expect(pivotTable.cells[8][1]).toEqual({
      value: undefined,
      summary: expression2Title,
      rowSpan: 1,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [8, 9, 10],
      expandable: true,
    });

    expect(pivotTable.cells[12][1]).toEqual({
      value: undefined,
      summary: expression2Title,
      rowSpan: 1,
      colSpan: 1,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [12, 13, 14],
      expandable: true,
    });
    expect(pivotTable.cells[16][0]).toEqual({
      value: 'C',
      summary: headerSummaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY200,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });

    expect(pivotTable.cells[17][0]).toEqual({
      value: undefined,
      summary: summaryString,
      rowSpan: 1,
      colSpan: 2,
      isSummary: true,
      cssClass: PivotTableConverter.rowGroupHeaderClass,
      constraint: undefined,
      background: COLOR_GRAY100,
      label: undefined,
      stickyStart: undefined,
      rowIndexes: [],
      expandable: false,
    });

    expect(pivotTable.cells[2].slice(2).map(v => v.value)).toEqual(['22', '13', '23', '17', '16']);
    expect(pivotTable.cells[3].slice(2).map(v => v.value)).toEqual(['4', '3', '5', '2', '8']);
    expect(pivotTable.cells[4].slice(2).map(v => v.value)).toEqual(['18', '4', '16', '21', '2']);
    expect(pivotTable.cells[5].slice(2).map(v => v.value)).toEqual(['9', '2', '4', '7', '2']);
    expect(pivotTable.cells[6].slice(2).map(v => v.value)).toEqual(['2', '2', '4', '3', '1']);
    expect(pivotTable.cells[7].slice(2).map(v => v.value)).toEqual(['15', '7', '13', '12', '11']);
    expect(pivotTable.cells[8].slice(2).map(v => v.value)).toEqual(['12', '8', '21', '4', '6']);
    expect(pivotTable.cells[9].slice(2).map(v => v.value)).toEqual(['3', '4', '7', '1', '3']);
    expect(pivotTable.cells[10].slice(2).map(v => v.value)).toEqual(['4', '2', '3', '4', '2']);
    expect(pivotTable.cells[11].slice(2).map(v => v.value)).toEqual(['7', '6', '10', '5', '5']);
    expect(pivotTable.cells[12].slice(2).map(v => v.value)).toEqual(['56', '6', '2', '30', '15']);
    expect(pivotTable.cells[13].slice(2).map(v => v.value)).toEqual(['8', '2', '2', '5', '3']);
    expect(pivotTable.cells[14].slice(2).map(v => v.value)).toEqual(['7', '3', '1', '6', '5']);
    expect(pivotTable.cells[15].slice(2).map(v => v.value)).toEqual(['2', '5', '4', '7', '8']);
    expect(pivotTable.cells[16].slice(2).map(v => v.value)).toEqual(['17', '10', '7', '18', '16']);
    expect(pivotTable.cells[17].slice(2).map(v => v.value)).toEqual(['39', '23', '30', '35', '32']);
  });
});
