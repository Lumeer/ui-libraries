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
import {
  Attribute,
  AggregatedDataMap,
  AggregatedDataValues,
  AggregatedMapData,
  Constraint,
  ConstraintData,
  ConstraintType,
  DataAggregationType,
  DataAggregator,
  DataAggregatorAttribute,
  DataValue,
  DocumentsAndLinksData,
  UnknownConstraint,
  aggregateDataResources,
  dataAggregationConstraint, QueryStem, Collection, LinkType, DataResource, Query, AttributesResourceType, attributesResourcesAttributesMap,
} from '@lumeer/data-filters';
import {deepObjectsEquals, flattenMatrix, flattenValues, isArray, isNotNullOrUndefined, uniqueValues} from '@lumeer/utils';
import {LmrPivotAttribute, LmrPivotConfig, LmrPivotRowColumnAttribute, LmrPivotStemConfig, LmrPivotTransform, LmrPivotValueAttribute} from './lmr-pivot-config';
import {LmrPivotData, LmrPivotDataHeader, LmrPivotDimensionConfig, LmrPivotHeaderAttribute, LmrPivotStemData} from './lmr-pivot-data';
import {pivotStemConfigIsEmpty} from './pivot-util';

interface PivotMergeData {
  configs: LmrPivotStemConfig[];
  stems: QueryStem[];
  stemsIndexes: number[];
  type: PivotConfigType;
}

enum PivotConfigType {
  Values,
  Rows,
  Columns,
  RowsAndColumns,
}

interface PivotColors {
  rows: string[];
  columns: string[];
  values: string[];
}

interface PivotConfigData {
  rowsConfig: LmrPivotDimensionConfig[];
  rowShowHeaderAttributes: boolean[];
  columnsConfig: LmrPivotDimensionConfig[];
  columnShowHeaderAttributes: boolean[];
  rowAttributes: Attribute[];
  columnAttributes: Attribute[];
}

export class PivotDataConverter {
  private collections: Collection[];
  private linkTypes: LinkType[];
  private collectionsAttributesMap: Record<string, Record<string, Attribute>>;
  private linkTypesAttributesMap: Record<string, Record<string, Attribute>>;
  private data: DocumentsAndLinksData;
  private config: LmrPivotConfig;
  private transform: LmrPivotTransform;
  private constraintData: ConstraintData;

  private dataAggregator: DataAggregator;

  constructor() {
    this.dataAggregator = new DataAggregator((value, constraint, data, aggregatorAttribute) =>
      this.formatPivotValue(value, constraint, data, aggregatorAttribute)
    );
  }

  private formatPivotValue(
    value: any,
    constraint: Constraint,
    constraintData: ConstraintData,
    aggregatorAttribute: DataAggregatorAttribute
  ): any {
    const pivotConstraint = aggregatorAttribute.data && (aggregatorAttribute.data as Constraint);
    const overrideConstraint =
      pivotConstraint && this.transform?.checkValidConstraintOverride?.(constraint, pivotConstraint);
    const finalConstraint = overrideConstraint || constraint || new UnknownConstraint();
    const serializedValue = (constraint || new UnknownConstraint()).createDataValue(value, constraintData).serialize()
    return this.formatDataValue(finalConstraint.createDataValue(serializedValue, constraintData), finalConstraint);
  }

  private formatDataValue(dataValue: DataValue, constraint: Constraint): any {
    switch (constraint.type) {
      case ConstraintType.DateTime:
        return dataValue.format();
      default:
        return dataValue.serialize();
    }
  }

  private updateData(
    config: LmrPivotConfig,
    transform: LmrPivotTransform,
    collections: Collection[],
    linkTypes: LinkType[],
    data: DocumentsAndLinksData,
    constraintData: ConstraintData
  ) {
    this.config = config;
    this.transform = transform;
    this.collections = collections;
    this.linkTypes = linkTypes;
    this.collectionsAttributesMap = attributesResourcesAttributesMap(collections);
    this.linkTypesAttributesMap = attributesResourcesAttributesMap(linkTypes);
    this.data = data;
    this.constraintData = constraintData;
  }

  public createData(
    config: LmrPivotConfig,
    transform: LmrPivotTransform,
    collections: Collection[],
    linkTypes: LinkType[],
    data: DocumentsAndLinksData,
    query: Query,
    constraintData?: ConstraintData
  ): LmrPivotData {
    this.updateData(config, transform, collections, linkTypes, data, constraintData);

    const {stemsConfigs, stems} = this.filterEmptyConfigs(config, query);

    const mergeData = this.createPivotMergeData(config.mergeTables, stemsConfigs, stems);
    const ableToMerge = mergeData.length <= 1;
    const pivotData = this.mergePivotData(mergeData);
    return {data: pivotData, constraintData, ableToMerge, mergeTables: config.mergeTables};
  }

  private filterEmptyConfigs(config: LmrPivotConfig, query: Query): {stemsConfigs: LmrPivotStemConfig[]; stems: QueryStem[]} {
    return (config.stemsConfigs || []).reduce(
      ({stemsConfigs, stems}, stemConfig, index) => {
        if (!pivotStemConfigIsEmpty(stemConfig)) {
          const stem = (query.stems || [])[index];
          stemsConfigs.push(stemConfig);
          stems.push(stem);
        }

        return {stemsConfigs, stems};
      },
      {stemsConfigs: [], stems: []}
    );
  }

  private createPivotMergeData(
    mergeTables: boolean,
    stemsConfigs: LmrPivotStemConfig[],
    stems: QueryStem[]
  ): PivotMergeData[] {
    return stemsConfigs.reduce((mergeData: PivotMergeData[], stemConfig, index) => {
      const configType = getPivotStemConfigType(stemConfig);
      const mergeDataIndex = mergeData.findIndex(
        data => data.type === configType && canMergeConfigsByType(data.type, data.configs[0], stemConfig)
      );
      if (mergeTables && mergeDataIndex >= 0) {
        mergeData[mergeDataIndex].configs.push(stemConfig);
        mergeData[mergeDataIndex].stems.push(stems[index]);
        mergeData[mergeDataIndex].stemsIndexes.push(index);
      } else {
        mergeData.push({configs: [stemConfig], stems: [stems[index]], stemsIndexes: [index], type: configType});
      }

      return mergeData;
    }, []);
  }

  private mergePivotData(mergeData: PivotMergeData[]): LmrPivotStemData[] {
    return mergeData.reduce((stemData, data) => {
      if (data.type === PivotConfigType.Values) {
        stemData.push(this.convertValueAttributes(data.configs, data.stems, data.stemsIndexes));
      } else {
        stemData.push(this.transformStems(data.configs, data.stems, data.stemsIndexes));
      }
      return stemData;
    }, []);
  }

  private transformStems(configs: LmrPivotStemConfig[], queryStems: QueryStem[], stemsIndexes: number[]): LmrPivotStemData {
    const pivotColors: PivotColors = {rows: [], columns: [], values: []};
    const mergedValueAttributes: LmrPivotValueAttribute[] = [];
    let mergedAggregatedData: AggregatedMapData = null;
    let additionalData: PivotConfigData;

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const queryStem = queryStems[i];
      const stemIndex = stemsIndexes[i];
      const stemData = this.data?.dataByStems?.[stemIndex];

      this.dataAggregator.updateData(
        this.collections,
        stemData?.documents || [],
        this.linkTypes,
        stemData?.linkInstances || [],
        queryStem,
        this.constraintData
      );
      const rowAttributes = (config.rowAttributes || []).map(attribute =>
        this.convertPivotRowColumnAttribute(attribute)
      );
      const columnAttributes = (config.columnAttributes || []).map(attribute =>
        this.convertPivotRowColumnAttribute(attribute)
      );
      const valueAttributes = (config.valueAttributes || []).map(attribute => this.convertPivotAttribute(attribute));

      pivotColors.rows.push(...this.getAttributesColors(config.rowAttributes));
      pivotColors.columns.push(...this.getAttributesColors(config.columnAttributes));
      pivotColors.values.push(...this.getAttributesColors(config.valueAttributes));

      const aggregatedData = this.dataAggregator.aggregate(rowAttributes, columnAttributes, valueAttributes);
      mergedAggregatedData = this.mergeAggregatedData(mergedAggregatedData, aggregatedData);

      const filteredValueAttributes = (config.valueAttributes || []).filter(
        valueAttr => !mergedValueAttributes.some(merAttr => deepObjectsEquals(valueAttr, merAttr))
      );
      mergedValueAttributes.push(...filteredValueAttributes);

      if (!additionalData) {
        const rowSticky = this.mapStickyValues((config.rowAttributes || []).map(attr => attr.sticky));
        const columnSticky = this.mapStickyValues((config.columnAttributes || []).map(attr => attr.sticky));
        additionalData = {
          rowsConfig: (config.rowAttributes || []).map((attr, index) => ({showSums: attr.showSums, sort: attr.sort, expressions: attr.expressions, sticky: rowSticky[index]})),
          columnsConfig: (config.columnAttributes || []).map((attr, index) => ({showSums: attr.showSums, sort: attr.sort, expressions: attr.expressions, sticky: columnSticky[index]})),
          rowShowHeaderAttributes: (config.rowAttributes || []).map(attr => attr.showHeader),
          rowAttributes: (config.rowAttributes || []).map(attr => this.pivotAttributeAttribute(attr)),
          columnShowHeaderAttributes: (config.columnAttributes || []).map(attr => false),
          columnAttributes: (config.columnAttributes || []).map(attr => this.pivotAttributeAttribute(attr)),
        };
      }
    }

    return this.convertAggregatedData(mergedAggregatedData, mergedValueAttributes, pivotColors, additionalData);
  }

  private mapStickyValues(values: boolean[]): boolean[] {
    // we support only sticky rows/columns in a row
    return values.reduce((stickyValues, sticky, index) => {
      stickyValues.push(sticky && (index === 0 || stickyValues[index - 1]));
      return stickyValues;
    }, []);
  }

  private pivotAttributeConstraint(pivotAttribute: LmrPivotAttribute): Constraint | undefined {
    const attribute = this.findAttributeByPivotAttribute(pivotAttribute);
    const constraint = attribute && attribute.constraint;
    const overrideConstraint =
      pivotAttribute.constraint &&
      this.transform?.checkValidConstraintOverride?.(constraint, pivotAttribute.constraint);
    return overrideConstraint || constraint;
  }

  private pivotAttributeAttribute(pivotAttribute: LmrPivotAttribute): Attribute | undefined {
    const attribute = this.findAttributeByPivotAttribute(pivotAttribute);
    if (attribute) {
      const constraint = attribute?.constraint;
      const overrideConstraint =
        pivotAttribute.constraint &&
        this.transform?.checkValidConstraintOverride?.(constraint, pivotAttribute.constraint);
      return {...attribute, constraint: overrideConstraint || constraint || new UnknownConstraint()};
    }
    return undefined;
  }

  private mergeAggregatedData(a1: AggregatedMapData, a2: AggregatedMapData): AggregatedMapData {
    if (!a1 || !a2) {
      return a1 || a2;
    }

    this.mergeMaps(a1.map, a2.map);
    this.mergeMaps(a1.columnsMap, a2.columnsMap);
    return {
      map: a1.map,
      columnsMap: a1.columnsMap,
      rowLevels: Math.max(a1.rowLevels, a2.rowLevels),
      columnLevels: Math.max(a1.columnLevels, a2.columnLevels),
    };
  }

  private mergeMaps(m1: Record<string, any>, m2: Record<string, any>) {
    Object.keys(m2).forEach(key => {
      if (m1[key]) {
        if (isArray(m1[key]) && isArray(m2[key])) {
          m1[key].push(...m2[key]);
        } else if (!isArray(m1[key]) && !isArray(m2[key])) {
          this.mergeMaps(m1[key], m2[key]);
        }
      } else {
        m1[key] = m2[key];
      }
    });
  }

  private getAttributesColors(attributes: LmrPivotAttribute[]): string[] {
    return (attributes || []).map(attribute => {
      const resource = this.dataAggregator.getNextCollectionResource(attribute.resourceIndex);
      return resource && (<Collection>resource).color;
    });
  }

  private convertPivotRowColumnAttribute(pivotAttribute: LmrPivotRowColumnAttribute): DataAggregatorAttribute {
    return {...this.convertPivotAttribute(pivotAttribute), data: pivotAttribute.constraint};
  }

  private convertPivotAttribute(pivotAttribute: LmrPivotAttribute): DataAggregatorAttribute {
    return {resourceIndex: pivotAttribute.resourceIndex, attributeId: pivotAttribute.attributeId};
  }

  private convertValueAttributes(
    configs: LmrPivotStemConfig[],
    stems: QueryStem[],
    stemsIndexes: number[]
  ): LmrPivotStemData {
    const data = configs.reduce(
      (allData, config, index) => {
        const stem = stems[index];
        const stemIndex = stemsIndexes[index];

        const stemData = this.data?.dataByStems?.[stemIndex];
        this.dataAggregator.updateData(
          this.collections,
          stemData?.documents || [],
          this.linkTypes,
          stemData?.linkInstances || [],
          stem,
          this.constraintData
        );

        const valueAttributes = config.valueAttributes || [];
        allData.valueTypes.push(...valueAttributes.map(attr => attr.valueType));
        const valueColors = this.getAttributesColors(valueAttributes);

        const {titles, constraints} = this.createValueTitles(valueAttributes);
        allData.titles.push(...titles);
        allData.constraints.push(...constraints);

        const {headers} = this.convertMapToPivotDataHeader({}, 0, [], valueColors, [], titles, allData.headers.length);
        allData.headers.push(...headers);

        allData.aggregations = [...(valueAttributes || []).map(valueAttribute => valueAttribute.aggregation)];

        const {values, dataResources} = (valueAttributes || []).reduce<{values: any[]; dataResources: DataResource[][]}>(
          (aggregator, valueAttribute, index) => {
            const dataResources = this.findDataResourcesByPivotAttribute(valueAttribute);
            const attribute = this.findAttributeByPivotAttribute(valueAttribute);
            const value = aggregateDataResources(valueAttribute.aggregation, dataResources, attribute, true);
            aggregator.values.push(value);
            aggregator.dataResources.push(dataResources);
            return aggregator;
          },
          {values: [], dataResources: []}
        );

        allData.values.push(...values);
        allData.dataResources.push(...dataResources);
        return allData;
      },
      {titles: [], constraints: [], headers: [], values: [], dataResources: [], valueTypes: [], aggregations: []}
    );

    return {
      columnHeaders: data.headers,
      columnHeaderAttributes: [],
      rowHeaders: [],
      rowHeaderAttributes: [],
      valueTitles: data.titles,
      values: [data.values],
      dataResources: [data.dataResources],
      valuesConstraints: data.constraints,
      valueTypes: data.valueTypes,
      valueAggregations: data.aggregations,

      rowsConfig: [],
      columnsConfig: [],

      hasAdditionalColumnLevel: true,
    };
  }

  private findDataResourcesByPivotAttribute(pivotAttribute: LmrPivotAttribute): DataResource[] {
    if (pivotAttribute.resourceType === AttributesResourceType.Collection) {
      return (this.data?.uniqueDocuments || []).filter(document => document.collectionId === pivotAttribute.resourceId);
    } else if (pivotAttribute.resourceType === AttributesResourceType.LinkType) {
      return (this.data?.uniqueLinkInstances || []).filter(link => link.linkTypeId === pivotAttribute.resourceId);
    }
    return [];
  }

  private convertAggregatedData(
    aggregatedData: AggregatedMapData,
    valueAttributes: LmrPivotValueAttribute[],
    pivotColors: PivotColors,
    additionalData: PivotConfigData
  ): LmrPivotStemData {
    const rowData = this.convertMapToPivotDataHeader(
      aggregatedData.map,
      aggregatedData.rowLevels,
      pivotColors.rows,
      pivotColors.values,
      additionalData.rowAttributes
    );
    const rowHeaderAttributes: LmrPivotHeaderAttribute[] = (additionalData.rowAttributes || [])
      .map((attribute, index) => additionalData.rowShowHeaderAttributes?.[index] ? ({title: attribute.name, color: pivotColors.rows?.[index]}) : undefined)

    const {titles: valueTitles, constraints: valuesConstraints} = this.createValueTitles(valueAttributes);
    const columnData = this.convertMapToPivotDataHeader(
      aggregatedData.rowLevels > 0 ? aggregatedData.columnsMap : aggregatedData.map,
      aggregatedData.columnLevels,
      pivotColors.columns,
      pivotColors.values,
      additionalData.columnAttributes,
      valueTitles
    );
    const columnHeaderAttributes: LmrPivotHeaderAttribute[] = (additionalData.columnAttributes || [])
      .map((attribute, index) =>  additionalData.columnShowHeaderAttributes?.[index] ? ({title: attribute.name, color: pivotColors.columns?.[index]}) : undefined)

    const values = this.initMatrix<number>(rowData.maxIndex + 1, columnData.maxIndex + 1);
    const dataResources = this.initMatrix<DataResource[]>(rowData.maxIndex + 1, columnData.maxIndex + 1);
    if ((valueAttributes || []).length > 0) {
      this.fillValues(values, dataResources, rowData.headers, columnData.headers, valueAttributes, aggregatedData);
    }

    const valueAggregations = (valueAttributes || []).map(valueAttribute => valueAttribute.aggregation);

    const hasAdditionalColumnLevel =
      (aggregatedData.columnLevels === 0 && valueTitles.length > 0) ||
      (aggregatedData.columnLevels > 0 && valueTitles.length > 1);
    return {
      rowHeaders: rowData.headers,
      rowHeaderAttributes,
      columnHeaders: columnData.headers,
      columnHeaderAttributes,
      valueTitles,
      values,
      dataResources,
      valuesConstraints,
      valueAggregations,

      ...additionalData,

      valueTypes: valueAttributes.map(attr => attr.valueType!),
      hasAdditionalColumnLevel,
    };
  }

  private convertMapToPivotDataHeader(
    map: Record<string, any>,
    levels: number,
    colors: string[],
    valueColors: string[],
    attributes: Attribute[],
    valueTitles?: string[],
    additionalNum: number = 0
  ): {headers: LmrPivotDataHeader[]; maxIndex: number} {
    const headers: LmrPivotDataHeader[] = [];
    const data = {maxIndex: 0};
    if (levels === 0) {
      if ((valueTitles || []).length > 0) {
        headers.push(
          ...valueTitles!.map((title, index) => ({
            title,
            targetIndex: index + additionalNum,
            color: valueColors[index],
            isValueHeader: true,
          }))
        );
        data.maxIndex = valueTitles!.length - 1 + additionalNum;
      }
    } else {
      let currentIndex = additionalNum;
      Object.keys(map).forEach((title, index) => {
        const attribute = attributes && attributes[0];
        if (levels === 1 && (valueTitles || []).length <= 1) {
          headers.push({
            title,
            targetIndex: currentIndex,
            color: colors[0],
            constraint: attribute?.constraint || new UnknownConstraint(),
            isValueHeader: false,
            attributeName: attribute?.name,
          });
          data.maxIndex = Math.max(data.maxIndex, currentIndex);
        } else {
          headers.push({
            title,
            color: colors[0],
            constraint: attribute?.constraint || new UnknownConstraint(),
            isValueHeader: false,
            attributeName: attribute?.name,
          });
        }

        this.iterateThroughPivotDataHeader(
          map[title],
          headers[index],
          currentIndex,
          1,
          levels,
          colors,
          valueColors,
          valueTitles || [],
          attributes,
          data
        );
        currentIndex += this.numChildren(map[title], levels - 1, (valueTitles && valueTitles.length) || 1);
      });
    }

    return {headers, maxIndex: data.maxIndex};
  }

  private iterateThroughPivotDataHeader(
    currentMap: Record<string, any>,
    header: LmrPivotDataHeader,
    headerIndex: number,
    level: number,
    maxLevels: number,
    colors: string[],
    valueColors: string[],
    valueTitles: string[],
    attributes: Attribute[],
    additionalData: {maxIndex: number}
  ) {
    if (level === maxLevels) {
      if ((valueTitles || []).length > 1) {
        header.children = valueTitles.map((title, index) => ({
          title,
          targetIndex: headerIndex + index,
          color: valueColors[index],
          isValueHeader: true,
        }));
        additionalData.maxIndex = Math.max(additionalData.maxIndex, headerIndex + valueTitles.length - 1);
      }
      return;
    }

    header.children = [];
    let currentIndex = headerIndex;
    Object.keys(currentMap).forEach((title, index) => {
      const attribute = attributes && attributes[level];
      if (level + 1 === maxLevels && (valueTitles || []).length <= 1) {
        header.children!.push({
          title,
          targetIndex: currentIndex,
          color: colors[level],
          constraint: attribute?.constraint || new UnknownConstraint(),
          isValueHeader: false,
          attributeName: attribute?.name,
        });
        additionalData.maxIndex = Math.max(additionalData.maxIndex, currentIndex);
      } else {
        header.children!.push({
          title,
          color: colors[level],
          constraint: attribute?.constraint || new UnknownConstraint(),
          isValueHeader: false,
          attributeName: attribute?.name,
        });
      }

      this.iterateThroughPivotDataHeader(
        currentMap[title],
        header.children?.[index],
        currentIndex,
        level + 1,
        maxLevels,
        colors,
        valueColors,
        valueTitles,
        attributes,
        additionalData
      );

      currentIndex += this.numChildren(
        currentMap[title],
        maxLevels - (level + 1),
        (valueTitles && valueTitles.length) || 1
      );
    });
  }

  private numChildren(map: Record<string, any>, maxLevels: number, numTitles: number): number {
    if (maxLevels === 0) {
      return numTitles;
    }

    const keys = Object.keys(map || {});
    if (maxLevels === 1) {
      return keys.length * numTitles;
    }

    const count = keys.reduce((sum, key) => sum + this.numChildrenRecursive(map[key], 1, maxLevels), 0);
    return count * numTitles;
  }

  private numChildrenRecursive(map: Record<string, any>, level: number, maxLevels: number): number {
    if (level >= maxLevels) {
      return 0;
    }

    const keys = Object.keys(map || {});
    if (level + 1 === maxLevels) {
      return keys.length;
    }

    return keys.reduce((sum, key) => sum + this.numChildrenRecursive(map[key], level + 1, maxLevels), 0);
  }

  private createValueTitles(valueAttributes: LmrPivotValueAttribute[]): {titles: string[]; constraints: Constraint[]} {
    return (valueAttributes || []).reduce<{titles: string[]; constraints: Constraint[]}>(
      ({titles, constraints}, pivotAttribute) => {
        const attribute = this.findAttributeByPivotAttribute(pivotAttribute);
        constraints.push(
          dataAggregationConstraint(pivotAttribute.aggregation) || this.pivotAttributeConstraint(pivotAttribute)
        );

        const title = this.createValueTitle(pivotAttribute.aggregation, attribute?.name || '');
        titles.push(title);

        return {titles, constraints};
      },
      {titles: [], constraints: []}
    );
  }

  public createValueTitle(aggregation: DataAggregationType, attributeName: string): string {
    const valueAggregationTitle = this.transform?.formatAggregation?.(aggregation) || aggregation.toString();
    return `${valueAggregationTitle} ${attributeName || ''}`.trim();
  }

  private initMatrix<T>(rows: number, columns: number): T[][] {
    const matrix: T[][] = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < columns; j++) {
        matrix[i][j] = undefined;
      }
    }

    return matrix;
  }

  private fillValues(
    values: number[][],
    dataResources: DataResource[][][],
    rowHeaders: LmrPivotDataHeader[],
    columnHeaders: LmrPivotDataHeader[],
    valueAttributes: LmrPivotValueAttribute[],
    aggregatedData: AggregatedMapData
  ) {
    if (rowHeaders.length > 0) {
      this.iterateThroughRowHeaders(
        values,
        dataResources,
        rowHeaders,
        columnHeaders,
        valueAttributes,
        aggregatedData.map
      );
    } else {
      this.iterateThroughColumnHeaders(values, dataResources, columnHeaders, 0, valueAttributes, aggregatedData.map);
    }
  }

  private iterateThroughRowHeaders(
    values: number[][],
    dataResources: DataResource[][][],
    rowHeaders: LmrPivotDataHeader[],
    columnHeaders: LmrPivotDataHeader[],
    valueAttributes: LmrPivotValueAttribute[],
    currentMap: AggregatedDataMap
  ) {
    for (const rowHeader of rowHeaders) {
      const rowHeaderMap = currentMap[rowHeader.title] || {};

      if (rowHeader.children) {
        this.iterateThroughRowHeaders(
          values,
          dataResources,
          rowHeader.children,
          columnHeaders,
          valueAttributes,
          rowHeaderMap
        );
      } else if (isNotNullOrUndefined(rowHeader.targetIndex) && columnHeaders.length > 0) {
        this.iterateThroughColumnHeaders(
          values,
          dataResources,
          columnHeaders,
          rowHeader.targetIndex!,
          valueAttributes,
          rowHeaderMap
        );
      }
    }
  }

  private iterateThroughColumnHeaders(
    values: number[][],
    dataResources: DataResource[][][],
    columnHeaders: LmrPivotDataHeader[],
    rowIndex: number,
    valueAttributes: LmrPivotValueAttribute[],
    currentMap: AggregatedDataMap | AggregatedDataValues[]
  ) {
    for (const columnHeader of columnHeaders) {
      if (columnHeader.children) {
        this.iterateThroughColumnHeaders(
          values,
          dataResources,
          columnHeader.children,
          rowIndex,
          valueAttributes,
          currentMap[columnHeader.title] || {}
        );
      } else if (isNotNullOrUndefined(columnHeader.targetIndex)) {
        const aggregatedDataValues = isArray(currentMap) ? currentMap : currentMap[columnHeader.title];

        if (valueAttributes.length) {
          const valueIndex = columnHeader.targetIndex! % valueAttributes.length;
          const {value, dataResources: aggregatedDataResources} = this.aggregateValue(
            valueAttributes[valueIndex],
            aggregatedDataValues
          );
          values[rowIndex][columnHeader.targetIndex!] = value;
          dataResources[rowIndex][columnHeader.targetIndex!] = aggregatedDataResources || [];
        }
      }
    }
  }

  private aggregateValue(
    valueAttribute: LmrPivotValueAttribute,
    aggregatedDataValues: AggregatedDataValues[]
  ): {value?: any; dataResources?: DataResource[]} {
    const resourceAggregatedDataValues = (aggregatedDataValues || []).filter(
      agg => agg.resourceId === valueAttribute.resourceId && agg.type === valueAttribute.resourceType
    );
    if (resourceAggregatedDataValues.length) {
      const dataResources = flattenMatrix(resourceAggregatedDataValues.map(val => val.objects));
      const attribute = this.pivotAttributeAttribute(valueAttribute);
      if (valueAttribute.aggregation === DataAggregationType.Join) {
        // values will be joined in pivot-table-converter
        const values = (dataResources || []).map((resource: DataResource) => resource.data?.[attribute?.id || '']);
        return {value: uniqueValues(flattenValues(values)), dataResources};
      }

      const value = attribute && aggregateDataResources(valueAttribute.aggregation, dataResources, attribute, true);
      return {value, dataResources};
    }

    return {};
  }

  private findAttributeByPivotAttribute(valueAttribute: LmrPivotAttribute): Attribute | undefined {
    if (valueAttribute.resourceType === AttributesResourceType.Collection) {
      return this.collectionsAttributesMap?.[valueAttribute.resourceId]?.[valueAttribute.attributeId];
    } else if (valueAttribute.resourceType === AttributesResourceType.LinkType) {
      return this.linkTypesAttributesMap?.[valueAttribute.resourceId]?.[valueAttribute.attributeId];
    }
    return undefined
  }
}

function getPivotStemConfigType(stemConfig: LmrPivotStemConfig): PivotConfigType {
  const rowLength = (stemConfig.rowAttributes || []).length;
  const columnLength = (stemConfig.columnAttributes || []).length;

  if (rowLength > 0 && columnLength > 0) {
    return PivotConfigType.RowsAndColumns;
  } else if (rowLength > 0) {
    return PivotConfigType.Rows;
  } else if (columnLength > 0) {
    return PivotConfigType.Columns;
  }
  return PivotConfigType.Values;
}

function canMergeConfigsByType(type: PivotConfigType, c1: LmrPivotStemConfig, c2: LmrPivotStemConfig): boolean {
  if (type === PivotConfigType.Rows) {
    return (c1.rowAttributes || []).length === (c2.rowAttributes || []).length;
  } else if (type === PivotConfigType.Columns) {
    return (c1.columnAttributes || []).length === (c2.columnAttributes || []).length;
  }
  return (
    (c1.rowAttributes || []).length === (c2.rowAttributes || []).length &&
    (c1.columnAttributes || []).length === (c2.columnAttributes || []).length
  );
}
