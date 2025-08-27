import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Nav, 
  Navbar, 
  Offcanvas,
  Button,
  Badge
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import axios from 'axios';

// Import components
import StockManagement from './components/StockManagement';
import SalesInput from './components/SalesInput';
import MonthlyRecord from './components/MonthlyRecord';
import SupplierManagement from './components/SupplierManagement';

// Import icons with proper typing
import { 
  FaBoxes, 
  FaChartLine, 
  FaCalendarAlt, 
  FaTruck, 
  FaBars,
  FaShieldAlt,
  FaHome,
  FaFileExcel,
  FaChartBar
} from 'react-icons/fa';

// Icon wrapper component to handle type compatibility
const IconWrapper: React.FC<{ icon: any; className?: string; style?: React.CSSProperties }> = ({ icon: Icon, className, style }) => {
  return <Icon className={className} style={style} />;
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <MainContent />
      </div>
    </Router>
  );
};

const Sidebar: React.FC = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: FaHome, badge: null },
    { path: '/stock', name: 'Stock Management', icon: FaBoxes, badge: null },
    { path: '/sales', name: 'Sales Input', icon: FaChartLine, badge: null },
    { path: '/monthly-record', name: 'Monthly Records', icon: FaCalendarAlt, badge: null },
    { path: '/suppliers', name: 'Supplier Management', icon: FaTruck, badge: null },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="d-lg-none mobile-toggle">
        <Button variant="outline-primary" onClick={handleShow} className="border-0">
          <IconWrapper icon={FaBars} />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${show ? 'show' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-section">
            <div className="brand-icon">
              <IconWrapper icon={FaShieldAlt} />
            </div>
            <div className="brand-text">
              <h4 className="brand-title">Adil Arms</h4>
              <p className="brand-subtitle">Management System</p>
            </div>
          </div>
        </div>

        <div className="sidebar-menu">
          <Nav className="flex-column">
            {menuItems.map((item, index) => (
              <Nav.Link
                key={index}
                href={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={handleClose}
              >
                <span className="sidebar-icon">
                  <IconWrapper icon={item.icon} />
                </span>
                <span className="sidebar-text">{item.name}</span>
                {item.badge && (
                  <Badge bg="danger" className="ms-auto">{item.badge}</Badge>
                )}
              </Nav.Link>
            ))}
          </Nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <IconWrapper icon={FaShieldAlt} />
            </div>
            <div className="user-details">
              <p className="user-name">Admin User</p>
              <p className="user-role">System Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Offcanvas */}
      <Offcanvas show={show} onHide={handleClose} className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <div className="brand-section">
              <div className="brand-icon">
                <IconWrapper icon={FaShieldAlt} />
              </div>
              <div className="brand-text">
                <h4 className="brand-title">Adil Arms</h4>
                <p className="brand-subtitle">Management System</p>
              </div>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {menuItems.map((item, index) => (
              <Nav.Link
                key={index}
                href={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={handleClose}
              >
                <span className="sidebar-icon">
                  <IconWrapper icon={item.icon} />
                </span>
                <span className="sidebar-text">{item.name}</span>
                {item.badge && (
                  <Badge bg="danger" className="ms-auto">{item.badge}</Badge>
                )}
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

const MainContent: React.FC = () => {
  return (
    <div className="main-content">
      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/sales" element={<SalesInput />} />
          <Route path="/monthly-record" element={<MonthlyRecord />} />
          <Route path="/suppliers" element={<SupplierManagement />} />
        </Routes>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    todaySales: 0,
    monthlyOrders: 0,
    activeSuppliers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.app/api/dashboard/stats');
      setStats(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome to Adil Arms Management System</p>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome to Adil Arms Management System</p>
        </div>
        <div className="alert alert-danger" role="alert">
          {error}
          <Button 
            variant="outline-danger" 
            className="ms-3" 
            onClick={fetchDashboardStats}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to Adil Arms Management System</p>
      </div>
      
      <Row className="g-4">
        <Col xl={3} lg={6} md={6} sm={12}>
          <div className="stat-card">
            <div className="stat-icon stock-icon">
              <IconWrapper icon={FaBoxes} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.totalProducts.toLocaleString()}</h3>
              <p className="stat-label">Total Products</p>
            </div>
          </div>
        </Col>
        
        <Col xl={3} lg={6} md={6} sm={12}>
          <div className="stat-card">
            <div className="stat-icon sales-icon">
              <IconWrapper icon={FaChartLine} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{formatCurrency(stats.todaySales)}</h3>
              <p className="stat-label">Today's Sales</p>
            </div>
          </div>
        </Col>
        
        <Col xl={3} lg={6} md={6} sm={12}>
          <div className="stat-card">
            <div className="stat-icon record-icon">
              <IconWrapper icon={FaCalendarAlt} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.monthlyOrders.toLocaleString()}</h3>
              <p className="stat-label">Monthly Orders</p>
            </div>
          </div>
        </Col>
        
        <Col xl={3} lg={6} md={6} sm={12}>
          <div className="stat-card">
            <div className="stat-icon supplier-icon">
              <IconWrapper icon={FaTruck} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.activeSuppliers.toLocaleString()}</h3>
              <p className="stat-label">Active Suppliers</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mt-5 g-4">
        <Col xl={8} lg={12} md={12} sm={12}>
          <div className="content-card">
            <div className="card-header">
              <h5>Recent Activities</h5>
            </div>
            <div className="card-body">
              <div className="activity-item">
                <div className="activity-icon">
                  <IconWrapper icon={FaBoxes} />
                </div>
                <div className="activity-content">
                  <h6>New product added</h6>
                  <p>Product "AK-47" has been added to inventory</p>
                  <small className="text-muted">2 hours ago</small>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon">
                  <IconWrapper icon={FaChartLine} />
                </div>
                <div className="activity-content">
                  <h6>Sale completed</h6>
                  <p>Sale of PKR 12,500 completed successfully</p>
                  <small className="text-muted">4 hours ago</small>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon">
                  <IconWrapper icon={FaTruck} />
                </div>
                <div className="activity-content">
                  <h6>Supplier updated</h6>
                  <p>Supplier "ABC Arms" information updated</p>
                  <small className="text-muted">1 day ago</small>
                </div>
              </div>
            </div>
          </div>
        </Col>
        
        <Col xl={4} lg={12} md={12} sm={12}>
          <div className="content-card">
            <div className="card-header">
              <h5>Quick Actions</h5>
            </div>
            <div className="card-body">
              <Button variant="primary" className="w-100 mb-2" href="/stock">
                <IconWrapper icon={FaBoxes} className="me-2" />
                Add New Product
              </Button>
              <Button variant="success" className="w-100 mb-2" href="/sales">
                <IconWrapper icon={FaChartLine} className="me-2" />
                Record Sale
              </Button>
              <Button variant="info" className="w-100 mb-2" href="/suppliers">
                <IconWrapper icon={FaTruck} className="me-2" />
                Manage Suppliers
              </Button>
              <Button variant="warning" className="w-100" href="/monthly-record">
                <IconWrapper icon={FaCalendarAlt} className="me-2" />
                View Reports
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default App;
