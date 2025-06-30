import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import StockManagement from './components/StockManagement';
import SalesInput from './components/SalesInput';
import MonthlyRecord from './components/MonthlyRecord';
import SupplierManagement from './components/SupplierManagement';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Shop Management System
              </Typography>
              <Button color="inherit" component={Link} to="/">
                Stock
              </Button>
              <Button color="inherit" component={Link} to="/sales">
                Sales
              </Button>
              <Button color="inherit" component={Link} to="/monthly-record">
                Monthly Record
              </Button>
              <Button color="inherit" component={Link} to="/suppliers">
                Suppliers
              </Button>
            </Toolbar>
          </AppBar>

          <Container>
            <Routes>
              <Route path="/" element={<StockManagement />} />
              <Route path="/sales" element={<SalesInput />} />
              <Route path="/monthly-record" element={<MonthlyRecord />} />
              <Route path="/suppliers" element={<SupplierManagement />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
