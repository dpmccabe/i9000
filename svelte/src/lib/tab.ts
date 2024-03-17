/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return,
  @typescript-eslint/no-unsafe-argument
*/
import {
  camelToScreamingSnakeCase,
  db,
  type GroupedAggregate,
} from '../internal';

export type TabRangeType = 'int' | 'float' | 'date' | 'datetime' | 'duration';

export interface TabField {
  dbCols: string[];
  displayed: boolean;
  mobileDisplayed?: boolean;
  displayName: string;
  truncatable: boolean;
  numeric: boolean;
  sortable: boolean;
  aggregatable: boolean;
  aggregateFlat?: boolean;
  isEnum?: boolean;
  filterType?: 'text' | 'range';
  sortCols?: string[];
  sortReverse?: boolean;
  formatter?: (x: any) => string;
  rangeType?: TabRangeType;
  fake?: boolean;
}

export type TabFieldOverride = Omit<
  TabField,
  'dbCols' | 'numeric' | 'isEnum'
>;

export interface TabSort {
  col: string;
  asc: boolean;
}

interface TabAggFilter {
  values?: Set<string>;
}

interface TabTextFilter {
  text?: string;
}

interface TabNumberRangeFilter {
  min?: number;
  max?: number;
}

type TabFilter = TabAggFilter | TabTextFilter | TabNumberRangeFilter;

export interface TabResults<T> {
  results: T[];
  count: number;
  statsContent: string;
}

export interface TabSettingsQueryParam {
  gqlType: string;
  value: any;
}

interface TabSettingsInit {
  tabFields: Record<string, TabField>;
  tabName: string;
  sortBy: TabSort;
  queryName: string;
  queryParams?: Map<string, TabSettingsQueryParam>;
  filters?: Map<string, TabFilter>;
  staticAggs?: string;
}

export const noneAggKey = '(none)';

function tokenizeText(searchText: string): string[] {
  let theSearchText: string = searchText.trim();
  theSearchText = theSearchText.replaceAll(/[&.,;/]/g, ' ');
  theSearchText = theSearchText.replaceAll(/\s{2,}/g, ' ');

  let tokens: string[] = [];

  const quotedParts: IterableIterator<RegExpMatchArray> =
    searchText.matchAll(/"[^"]+"/g);

  for (const m of quotedParts) {
    theSearchText = theSearchText.replace(m[0], '');
    tokens.push('' + m[0].replaceAll('"', ''));
  }

  theSearchText = theSearchText.trim();

  if (theSearchText.length > 0) {
    const otherWords: string[] = theSearchText.split(/\s+/);

    for (const w of otherWords) {
      if (w.match(/[\p{L}\p{N}]/u)) {
        tokens = tokens.concat('' + w);
      }
    }
  }

  return tokens;
}

export abstract class TabSettings<T> {
  public tabFields: Record<string, TabField>;
  public tabName: string;
  public sortBy: TabSort;
  public queryName: string;
  public queryParams: Map<string, TabSettingsQueryParam>;
  public filters: Map<string, TabFilter>;
  public staticAggs: string;
  public allDbCols: string[];

  protected constructor(init: TabSettingsInit) {
    this.tabFields = init.tabFields;
    this.tabName = init.tabName;
    this.sortBy = init.sortBy;
    this.tabName = init.tabName;
    this.queryName = init.queryName;
    this.queryParams =
      init.queryParams ?? new Map<string, TabSettingsQueryParam>();
    this.filters = init.filters ?? new Map<string, TabFilter>();
    this.staticAggs = init.staticAggs ?? '';

    this.allDbCols = Object.values(this.tabFields).reduce(
      (acc: string[], field: TabField): string[] => {
        acc = acc.concat(field.dbCols);
        return acc;
      },
      ['id']
    );
  }

  abstract recordCreator(r: Record<string, any>): T;
  abstract statsContentCreator(resp: any): string;

  tabNameTitle(): string {
    return this.tabName.charAt(0).toUpperCase() + this.tabName.slice(1);
  }

  tabNameTitlePlural(): string {
    return this.tabNameTitle() + 's';
  }

  async getResults<T>(first: number, offset: number): Promise<TabResults<T>> {
    const resp: any = await db(
      this.query(),
      Object.fromEntries(this.apiArgs(first, offset))
    );

    return {
      results: resp[this.queryName].nodes.map((r: Record<string, any>) => {
        return this.recordCreator(r);
      }),
      count: resp[this.queryName].totalCount,
      statsContent: this.statsContentCreator(resp),
    };
  }

  query(): string {
    return `
      query get${this.tabNameTitlePlural()}(${this.queryArgs().join(', ')}) {
        ${this.queryName}(${this.callArgs().join(', ')}) {
          nodes {
            ${this.allDbCols.join('\n')}
          }
          
          totalCount
          ${this.staticAggs}
        }
      }
    `;
  }

  queryParamsQueryArgs(): string[] {
    const arr: string[] = [];

    for (const [k, x] of this.queryParams) {
      arr.push(`$${k}: ${x.gqlType}`);
    }

    return arr;
  }

  queryArgs(): string[] {
    return [
      '$first: Int',
      '$offset: Int',
      `$orderBy: [${this.tabNameTitlePlural()}OrderBy!]`,
      `$filter: ${this.tabNameTitle()}Filter!`,
      ...this.queryParamsQueryArgs(),
    ];
  }

  orderBy(): string[] {
    return this.tabFields[this.sortBy.col]
      .sortCols!.map((x: string): string => {
        return this.sortBy.asc
          ? `${camelToScreamingSnakeCase(x)}_ASC`
          : `${camelToScreamingSnakeCase(x)}_DESC`;
      })
      .concat(['ID_ASC']);
  }

  queryParamsCallArgs(): string[] {
    const arr: string[] = [];

    for (const k of this.queryParams.keys()) {
      arr.push(`${k}: $${k}`);
    }

    return arr;
  }

  callArgs(): string[] {
    return [
      'first: $first',
      'offset: $offset',
      'orderBy: $orderBy',
      'filter: $filter',
      ...this.queryParamsCallArgs(),
    ];
  }

  apiArgs(first: number, offset: number): Map<string, any> {
    const apiArgs = new Map<string, any>();
    apiArgs.set('first', first);
    apiArgs.set('offset', offset);
    apiArgs.set('orderBy', this.orderBy());
    apiArgs.set('filter', { and: this.filterArgs() });

    for (const [k, x] of this.queryParams) {
      apiArgs.set(k, x.value);
    }

    return apiArgs;
  }

  filterArgs(aggField?: string): Record<string, any>[] {
    const theFilterArgs: Record<string, any>[] = [];

    for (const [k, v] of this.filters) {
      if (k === aggField) continue;

      if ('min' in v) {
        theFilterArgs.push(
          {
            [k]: { greaterThanOrEqualTo: v.min },
          },
          {
            [k]: { lessThanOrEqualTo: v.max },
          }
        );
      } else if ('values' in v && v.values!.size > 0) {
        const rawValues: string[] = [...v.values!];
        const nonNullRawValues: string[] = rawValues.filter(
          (x: string): boolean => x !== noneAggKey
        );

        const maybeNullFilters: {
          or: (
            | Record<string, { isNull: boolean }>
            | Record<string, { in: (string | number)[] }>
            | Record<string, { overlaps: (string | number)[] }>
          )[];
        } = { or: [] };

        if (nonNullRawValues.length < rawValues.length) {
          maybeNullFilters['or'].push({ [k]: { isNull: true } });
        }

        if (nonNullRawValues.length > 0) {
          let values: (string | number)[];

          if (this.tabFields[k].isEnum) {
            values = nonNullRawValues.map((v: string): string =>
              v.toUpperCase()
            );
          } else if (this.tabFields[k].numeric) {
            values = nonNullRawValues.map((v: string): number => parseInt(v));
          } else {
            values = nonNullRawValues;
          }

          if (this.tabFields[k].aggregateFlat) {
            maybeNullFilters['or'].push({
              [k]: { overlaps: values },
            });
          } else {
            maybeNullFilters['or'].push({
              [k]: { in: values },
            });
          }
        }

        theFilterArgs.push(maybeNullFilters);
      } else if ('text' in v) {
        for (const token of tokenizeText(v.text!)) {
          theFilterArgs.push({
            [k]: { matchUnaccentInsensitive: `\\m${token}` },
          });
        }
      }
    }

    return theFilterArgs;
  }

  aggQuery(aggField: string): string {
    const groupBy: string = camelToScreamingSnakeCase(aggField);

    const aggQueryArgs: string[] = [
      `$filter: ${this.tabNameTitle()}Filter!`,
      ...this.queryParamsQueryArgs(),
    ];

    const aggCallArgs: string[] = [
      'filter: $filter',
      ...this.queryParamsCallArgs(),
    ];

    return `
      query agg${this.tabNameTitlePlural()}(${aggQueryArgs.join(', ')}) {
        ${this.queryName}(${aggCallArgs.join(', ')}) {
          groupedAggregates(groupBy: ${groupBy}) {
            keys
            distinctCount {
              id
            }
          }
        }
      }
    `;
  }

  async getAgg(
    aggField: string,
    aggregateFlat = false
  ): Promise<Record<string, number>> {
    const aggApiArgs = new Map<string, any>();
    const filterArgs: Record<string, any>[] = this.filterArgs(aggField);

    aggApiArgs.set('filter', { and: filterArgs });

    for (const [k, x] of this.queryParams) {
      aggApiArgs.set(k, x.value);
    }

    const resp: any = await db(
      this.aggQuery(aggField),
      Object.fromEntries(aggApiArgs)
    );

    const aggs: GroupedAggregate[] = resp[this.queryName].groupedAggregates;

    if (aggregateFlat) {
      const aggCounts: Record<string, number> = {};

      for (const kv of aggs) {
        const types: string[] = kv.keys[0].slice(1, -1).split(',');

        for (const t of types) {
          const tClean: string = t.replaceAll(/(^")|("$)/g, '');
          aggCounts[tClean] ||= 0;
          aggCounts[tClean] += parseInt(kv.distinctCount.id);
        }
      }

      return aggCounts;
    } else {
      return aggs.reduce(
        (
          acc: Record<string, number>,
          r: GroupedAggregate
        ): Record<string, number> => {
          acc[r.keys == null ? noneAggKey : r.keys[0]] = parseInt(
            r.distinctCount.id
          );
          return acc;
        },
        {}
      );
    }
  }

  decilesQuery(rangeField: string): string {
    return `
      query range${this.tabNameTitlePlural()}($filter: ${this.tabNameTitle()}Filter!) {
        ${this.queryName}(filter: $filter) {
          aggregates {
            deciles_disc {
              ${rangeField}
            }
          }
        }
      }
    `;
  }

  async getPercentiles(
    rangeField: string,
    rangeType: TabRangeType
  ): Promise<number[]> {
    const rangeApiArgs = new Map<string, any>();
    const filterArgs: Record<string, any>[] = this.filterArgs(rangeField);

    rangeApiArgs.set('filter', { and: filterArgs });

    const resp: any = await db(
      this.decilesQuery(rangeField),
      Object.fromEntries(rangeApiArgs)
    );

    const rangeVals: string[] =
      resp[this.queryName].aggregates.deciles_disc[rangeField].split(',');

    let rangeNums: number[];

    if (rangeType === 'date' || rangeType === 'datetime') {
      rangeNums = rangeVals.map((x: string): number => Number(BigInt(x)));
    } else {
      rangeNums = rangeVals.map((x: string): number => parseFloat(x));
    }

    return [...new Set<number>(rangeNums)];
  }

  reSort(fieldName: string, asc?: boolean): TabSort {
    document.getElementById('view')!.scrollTop = 0;

    let newSortAsc: boolean;

    if (asc != undefined) {
      newSortAsc = asc;
    } else if (this.sortBy.col === fieldName) {
      // changing direction
      newSortAsc = !this.sortBy.asc;
    } else {
      newSortAsc = !this.tabFields[fieldName].sortReverse;
    }

    return { col: fieldName, asc: newSortAsc };
  }
}
