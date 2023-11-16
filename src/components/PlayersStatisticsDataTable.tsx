'use client';

import * as React from 'react';
import useStore from '@/store';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Table,
} from '@tanstack/react-table';
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
} from '@/components/ui/select';
import { FPLElement } from '@/data/models';
import { DataTableContent } from '@/components/ui/data-table-content';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { mapPropertyValues, filterWithout, filterBy } from '@/lib/array';
import { useState, useEffect, useRef } from 'react';

export const objectName = 'player';
export const viewWatchList = 'watchlist';
export const viewAllPlayers = 'all_players';
export const defaultViewedBy = viewAllPlayers;
export const defaultSortedBy = 'total_points';

const setSearchedBy = (table: Table<FPLElement>, searchedBy: string) => {
  console.log('setSearchedBy...');
  table.getColumn('web_name')?.setFilterValue(searchedBy);
};

const setSortedBy = (table: Table<FPLElement>, sortedBy: string) => {
  console.log('setSortedBy...');
  //
  // Sorting
  //
  table
    .getAllColumns()
    .filter((column) => column.id === sortedBy && column.getCanSort())
    .map((column) => {
      const element_stat = useStore.getState().getElementStat(column.id);
      const sort_dir = element_stat?.ascending ? 'asc' : 'desc';
      if (column.getIsSorted() !== sort_dir) {
        column.toggleSorting(sort_dir === 'desc'); // true => 'desc'
      }
    });
  //
  // Visibility
  //
  table
    .getAllColumns()
    .filter((column) => column.getCanHide())
    .map((column) => {
      if (column.id === sortedBy) {
        if (!column.getIsVisible()) column.toggleVisibility(true); // true => show
      } else {
        if (column.getIsVisible()) column.toggleVisibility(false); // false => hide
      }
    });
};

const setMaxCost = (table: Table<FPLElement>, maxCost: string) => {
  console.log('setMaxCost...');
  table.getColumn('now_cost')?.setFilterValue(parseInt(maxCost));
};

function SelectMaxCost({ id, table, options }: { id: string; table: Table<FPLElement>; options: number[] }) {
  console.log('SelectMaxCost...');
  // value={options[0].toString()}
  return (
    <Select onValueChange={(value) => setMaxCost(table, value)} defaultValue={options[0]?.toString()}>
      <SelectTrigger id={id} className='w-[200px]'>
        <SelectValue placeholder='Sorted by' />
      </SelectTrigger>
      <SelectContent className='max-h-80'>
        {options.map((option) => (
          <SelectItem key={option.toString()} value={option.toString()}>
            {option / 10}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface PlayersStatisticsDataTableProps {
  data: FPLElement[];
  initialCosts: number[];
  columns: ColumnDef<FPLElement>[];
  sortingState: SortingState;
  visibilityState: VisibilityState;
  className?: string;
}

export function PlayersStatisticsDataTable({
  data,
  initialCosts,
  columns,
  sortingState,
  visibilityState,
  className,
}: PlayersStatisticsDataTableProps) {
  console.log('PlayersStatisticsDataTable...');
  const [costs, setCosts] = useState(initialCosts);
  const [sorting, setSorting] = React.useState<SortingState>(sortingState);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(visibilityState);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  // const effectRan = useRef(false);
  // useEffect(() => {
  //   console.log('mounted PlayersStatisticsDataTable');
  //   if (effectRan.current === false) {
  //     return () => {
  //       console.log('un-mounted PlayersStatisticsDataTable');
  //       effectRan.current = true;
  //     };
  //   }
  // }, []);

  /* Debugging with useEffect

  import { useEffect } from 'react';

  useEffect(() => {
    console.log('mounted: tableStateColumnFilters', table.getState().columnFilters, ' (PlayersStatisticsDataTable)');
    return () => console.log('un-mounted: tableStateColumnFilters', table.getState().columnFilters, ' (PlayersStatisticsDataTable)');
  }, []);

  */

  return (
    <div className={cn('', className)}>
      <div className='flex justify-center gap-5 py-3'>
        <div className=''>
          <Label htmlFor='search' className='p-1 text-sm'>
            Search
          </Label>
          <Input
            id='search'
            type='text'
            onChange={(event) => setSearchedBy(table, event.target.value)}
            placeholder='Search for player...'
            size={30}
          />
        </div>
        <div className=''>
          <Label htmlFor='view' className='p-1 text-sm'>
            View
          </Label>
          <Select
            onValueChange={(value) => {
              console.log('setViewedBy...');
              //
              // Reseting previous `viewedBy` related filtering only
              //
              let columnFilters = table.getState().columnFilters;
              columnFilters = filterWithout(columnFilters, 'id', ['id', 'element_type', 'team']);
              table.setColumnFilters(columnFilters);
              //
              // Filtering and updating <SelectMaxCost />
              //
              let nextCosts: number[] = [];
              switch (value) {
                case viewAllPlayers:
                  // No filtering (display all)
                  setCosts(initialCosts);
                  break;
                case viewWatchList: // TODO: Get list of element.id's from FPLEntry
                  table.getColumn('id')?.setFilterValue(0);
                  setCosts(nextCosts);
                  break;
                default: // 'element_type-*' and 'team-*'
                  const [col, val] = value.split('-');
                  const id = parseInt(val);
                  table.getColumn(col)?.setFilterValue(id);
                  nextCosts = mapPropertyValues(filterBy(data, col, id), 'now_cost');
                  setCosts(nextCosts);
                  break;
              }
            }}
            defaultValue={defaultViewedBy}
          >
            <SelectTrigger id='view' className='w-[180px]'>
              <SelectValue placeholder='All players' />
            </SelectTrigger>
            <SelectContent className='max-h-80'>
              <SelectGroup>
                <SelectLabel>Global</SelectLabel>
                <SelectItem key={viewAllPlayers} value={viewAllPlayers}>
                  All players
                </SelectItem>
                <SelectItem key={viewWatchList} value={viewWatchList}>
                  Watchlist
                </SelectItem>
                <SelectLabel>By Position</SelectLabel>
                {useStore
                  .getState()
                  .getElementTypes()
                  .map((element_type) => (
                    <SelectItem key={element_type.id} value={`element_type-${element_type.id}`}>
                      {element_type.plural_name}
                    </SelectItem>
                  ))}
                <SelectLabel>By Team</SelectLabel>
                {useStore
                  .getState()
                  .getTeams()
                  .map((team) => (
                    <SelectItem key={team.id} value={`team-${team.id}`}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className=''>
          <Label htmlFor='sort' className='p-1 text-sm'>
            Sorted by
          </Label>
          <Select onValueChange={(value) => setSortedBy(table, value)} defaultValue={defaultSortedBy}>
            <SelectTrigger id='sort' className='w-[200px]'>
              <SelectValue placeholder='Sorted by' />
            </SelectTrigger>
            <SelectContent className='max-h-80'>
              {useStore
                .getState()
                .getElementStats()
                .map((element_stat) => (
                  <SelectItem key={element_stat.name} value={element_stat.name}>
                    {element_stat.option_name || element_stat.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className=''>
          <Label htmlFor='max' className='p-1 text-sm'>
            Max cost
          </Label>
          <SelectMaxCost id='max' table={table} options={costs} />
        </div>
      </div>
      <DataTableContent table={table} objectName={objectName} columnsLength={columns.length} />
      <DataTablePagination table={table} objectName={objectName} />
    </div>
  );
}
