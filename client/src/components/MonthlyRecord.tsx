import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Alert
} from 'react-bootstrap';
import { FaCalendarAlt, FaChartBar, FaFileExcel, FaDownload, FaEye } from 'react-icons/fa';
import axios from 'axios';
import * as XLSX from 'xlsx';

// Icon wrapper component to handle type compatibility
const IconWrapper: React.FC<{ icon: any; className?: string; style?: React.CSSProperties }> = ({ icon: Icon, className, style }) => {
  return <Icon className={className} style={style} />;
};

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
  const [loading, setLoading] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchMonthlySales();
  }, [selectedYear, selectedMonth]);

  const fetchMonthlySales = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/sales/monthly/${selectedYear}/${selectedMonth}`
      )
      setSales(response.data.sales);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching monthly sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sales.map((sale) => ({
        'Voucher Number': sale.voucherNumber,
        'Date': new Date(sale.date).toLocaleDateString(),
        'Total Amount (PKR)': sale.totalAmount,
        'Profit (PKR)': sale.profit,
        'Products': sale.products
          .map((p) => `${p.product.name} (${p.quantity} x ${p.salePrice})`)
          .join(', '),
      }))
    );

    const summaryWs = XLSX.utils.json_to_sheet([
      {
        'Total Sales Amount (PKR)': summary.totalSales,
        'Total Profit (PKR)': summary.totalProfit,
        'Number of Sales': summary.numberOfSales,
      },
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

    XLSX.writeFile(workbook, `AdilArms-Sales-PKR-${selectedYear}-${selectedMonth}.xlsx`);
  };

  const getProfitBadge = (profit: number) => {
    if (profit > 0) return <Badge bg="success">+PKR {profit.toFixed(2)}</Badge>;
    if (profit < 0) return <Badge bg="danger">-PKR {Math.abs(profit).toFixed(2)}</Badge>;
    return <Badge bg="secondary">PKR 0.00</Badge>;
  };

  const getMonthColor = (month: number) => {
    const colors = [
      'primary', 'success', 'warning', 'info', 'danger', 'primary',
      'success', 'warning', 'info', 'danger', 'primary', 'success'
    ];
    return colors[month - 1];
  };

  return (
    <div className="monthly-record">
      <div className="page-header">
        <h1 className="page-title">
          <IconWrapper icon={FaCalendarAlt} className="me-3" />
          Monthly Records
        </h1>
        <p className="page-subtitle">View and analyze monthly sales performance</p>
      </div>

      <Row className="g-4 mb-4">
        <Col xl={8} lg={12} md={12} sm={12}>
          <Card className="filters-card">
            <CardHeader className="bg-primary text-white">
              <h5 className="mb-0">
                <IconWrapper icon={FaChartBar} className="me-2" />
                Select Period
              </h5>
            </CardHeader>
            <CardBody>
              <Row className="g-3">
                <Col xl={6} lg={6} md={6} sm={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Year</Form.Label>
                    <Form.Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xl={6} lg={6} md={6} sm={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Month</Form.Label>
                    <Form.Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {months.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} lg={12} md={12} sm={12}>
          <Card className="export-card">
            <CardHeader className="bg-success text-white">
              <h5 className="mb-0">
                <IconWrapper icon={FaFileExcel} className="me-2" />
                Export Data
              </h5>
            </CardHeader>
            <CardBody>
              <Button 
                variant="outline-light" 
                size="lg"
                onClick={exportToExcel}
                className="w-100"
                disabled={sales.length === 0}
              >
                <IconWrapper icon={FaDownload} className="me-2" />
                Export to Excel
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="summary-card total-sales">
            <CardBody className="text-center">
              <div className="summary-icon">
                <IconWrapper icon={FaChartBar} />
              </div>
                                <h3 className="summary-number">PKR {summary.totalSales.toLocaleString()}</h3>
              <p className="summary-label">Total Sales</p>
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="summary-card total-profit">
            <CardBody className="text-center">
              <div className="summary-icon">
                <IconWrapper icon={FaChartBar} />
              </div>
                                <h3 className="summary-number">PKR {summary.totalProfit.toLocaleString()}</h3>
              <p className="summary-label">Total Profit</p>
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="summary-card total-transactions">
            <CardBody className="text-center">
              <div className="summary-icon">
                <IconWrapper icon={FaChartBar} />
              </div>
              <h3 className="summary-number">{summary.numberOfSales}</h3>
              <p className="summary-label">Number of Sales</p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Current Period Display */}
      <Card className="period-display mb-4">
        <CardBody className="text-center">
          <h4 className="mb-2">
            <Badge bg={getMonthColor(selectedMonth)} className="me-2">
              {months[selectedMonth - 1]}
            </Badge>
            {selectedYear}
          </h4>
          <p className="text-muted mb-0">
            Showing {sales.length} sales transactions for the selected period
          </p>
        </CardBody>
      </Card>

      {/* Sales Table */}
      {loading ? (
        <Card>
          <CardBody className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading sales data...</p>
          </CardBody>
        </Card>
      ) : sales.length === 0 ? (
        <Card>
          <CardBody className="text-center py-5">
            <IconWrapper icon={FaCalendarAlt} className="text-muted mb-3" style={{ fontSize: '3rem' }} />
            <h5>No Sales Found</h5>
            <p className="text-muted">
              No sales transactions found for {months[selectedMonth - 1]} {selectedYear}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="sales-table-card">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <IconWrapper icon={FaEye} className="me-2" />
              Sales Transactions ({sales.length})
            </h5>
            <Badge bg="info">
              Period: {months[selectedMonth - 1]} {selectedYear}
            </Badge>
          </CardHeader>
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Voucher Number</th>
                    <th>Date</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id} className="sale-row">
                      <td>
                        <Badge bg="secondary">{sale.voucherNumber}</Badge>
                      </td>
                      <td>
                        <strong>{new Date(sale.date).toLocaleDateString()}</strong>
                      </td>
                      <td>
                        <div className="products-list">
                          {sale.products.map((p, i) => (
                            <div key={i} className="product-item">
                              <Badge bg="light" text="dark" className="me-1">
                                {p.product ? p.product.name : 'Product not found'}
                              </Badge>
                              <small className="text-muted">
                                ({p.quantity} x PKR {p.salePrice})
                              </small>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong className="text-success">
                          PKR {sale.totalAmount.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        {getProfitBadge(sale.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default MonthlyRecord;
