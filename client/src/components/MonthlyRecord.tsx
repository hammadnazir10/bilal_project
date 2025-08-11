import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface Sale {
  _id: string;
  voucherNumber: string;
  products: {
    product: {
      productId: string;
      name: string;
    };
    quantity: number;
    salePrice: number;
  }[];
  totalAmount: number;
  profit: number;
  date: string;
}

const MonthlyRecord: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalProfit: 0,
    numberOfSales: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchMonthlySales();
  }, [selectedYear, selectedMonth]);

  const fetchMonthlySales = async () => {
    try {
      const response = await axios.get(
        `http://outstanding-embrace-production-fe7a.up.railway.app/api/sales/monthly/${selectedYear}/${selectedMonth}`
      );
      setSales(response.data.sales);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching monthly sales:', error);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sales.map((sale) => ({
        'Voucher Number': sale.voucherNumber,
        'Date': new Date(sale.date).toLocaleDateString(),
        'Total Amount': sale.totalAmount,
        'Profit': sale.profit,
        'Products': sale.products
          .map((p) => `${p.product.name} (${p.quantity} x ${p.salePrice})`)
          .join(', '),
      }))
    );

    const summaryWs = XLSX.utils.json_to_sheet([
      {
        'Total Sales Amount': summary.totalSales,
        'Total Profit': summary.totalProfit,
        'Number of Sales': summary.numberOfSales,
      },
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

    XLSX.writeFile(workbook, `sales-${selectedYear}-${selectedMonth}.xlsx`);
  };

  return (
    <Box p={3}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap={2}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((month, index) => (
                <MenuItem key={month} value={index + 1}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button variant="contained" color="primary" onClick={exportToExcel}>
          Export to Excel
        </Button>
      </Box>

      <Box mb={3}>
        <Paper sx={{ p: 2, display: 'flex', gap: 4 }}>
          <Typography>
            <strong>Total Sales:</strong> Rs. {summary.totalSales.toFixed(2)}
          </Typography>
          <Typography>
            <strong>Total Profit:</strong> Rs. {summary.totalProfit.toFixed(2)}
          </Typography>
          <Typography>
            <strong>Number of Sales:</strong> {summary.numberOfSales}
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Voucher Number</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Profit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale._id}>
                <TableCell>{sale.voucherNumber}</TableCell>
                <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>                <TableCell>
                  {sale.products.map((p, i) => (
                    <div key={i}>
                      {p.product ? p.product.name : 'Product not found'} ({p.quantity} x {p.salePrice})
                    </div>
                  ))}
                </TableCell>
                <TableCell>Rs. {sale.totalAmount.toFixed(2)}</TableCell>
                <TableCell>Rs. {sale.profit.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MonthlyRecord;
