import React, { useMemo, useState, useRef } from "react";
import {
  useTable,
  useFilters,
  useSortBy,
  usePagination,
  Column,
} from "react-table";
import {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";

type Data = Record<string, any>;

type DataTableProps = {
  data: Data;
  columns: Column[];
};

export const ColumnFilter: React.FC<{
  column: Column<Data>;
}> = ({ column }) => {
  const { filterValue, setFilter } = column;

  //@ts-ignore
  const timer = useRef<ReturnType<typeof setTimeout>>(0);

  return (
    <TextField
      defaultValue={filterValue || ""}
      size="small"
      fullWidth
      onChange={(e) => {
        clearTimeout(timer.current);

        timer.current = setTimeout(async () => {
          setFilter((e.target.value || "").trim() || undefined);
        }, 500);
      }}
      placeholder="Filter"
      inputProps={{
        sx: {
          fontSize: "caption.fontSize",
        },
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
};

export default function ({ data, columns: columns }: DataTableProps) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    state,
    setFilter,
    gotoPage,
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageSize: 50, // Number of rows per page
      },
    },
    useFilters,
    useSortBy,
    usePagination
  );

  const { pageIndex, pageSize } = state;

  return (
    <Paper>
      <TableContainer>
        <Table {...getTableProps()}>
          <TableHead>
            {headerGroups.map((headerGroup) => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <TableCell
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    sx={{
                      userSelect: "none",
                      width: column.width ? `${column.width}px` : null,
                      py: 1,
                      px: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <strong>{column.render("Header")}</strong>
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <ArrowDropDownIcon fontSize="small" />
                        ) : (
                          <ArrowDropUpIcon fontSize="small" />
                        )
                      ) : null}
                    </Box>
                    <Box>
                      {column.canFilter ? column.render("Filter") : null}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row);
              return (
                <TableRow {...row.getRowProps()}>
                  {row.cells.map((cell) => {
                    return (
                      <TableCell
                        {...cell.getCellProps()}
                        sx={{
                          py: 1,
                          px: 1,
                        }}
                      >
                        {cell.render("Cell")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[50]}
        component="div"
        count={data.length}
        rowsPerPage={pageSize}
        page={pageIndex}
        onPageChange={(e, newPage) => {
          gotoPage(newPage);
        }}
        onRowsPerPageChange={(e) => {
          // No need to setPageSize here
          setFilter(""); // Reset filters when changing rows per page
          gotoPage(0);
        }}
      />
    </Paper>
  );
}
