import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Autocomplete,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

interface Product {
  _id: string;
  productId: string;
  name: string;
  costPrice: number;
  quantity: number;
}

interface SaleItem {
  product: Product;
  quantity: number;
  salePrice: number;
}

const SalesInput: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('https://railway.com/project/e2630761-d2b8-48bc-adf0-ef0c9cf1f8b8/service/3779b358-2b01-49e9-9636-c73bce03f63b?environmentId=6a3f90de-ffe7-4053-b34a-5932e4685d35/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product);
    // Don't auto-fill sale price - user will enter it manually
    setSalePrice(0);
  };
  const handleAddItem = () => {
    setErrorMessage('');
    
    if (!selectedProduct) {
      setErrorMessage('Please select a product');
      return;
    }
    
    if (quantity <= 0) {
      setErrorMessage('Quantity must be greater than 0');
      return;
    }
    
    if (salePrice <= 0) {
      setErrorMessage('Sale price must be greater than 0');
      return;
    }
    
    if (quantity > selectedProduct.quantity) {
      setErrorMessage(`Not enough stock available! Available: ${selectedProduct.quantity}, Requested: ${quantity}`);
      return;
    }

    setSaleItems((prev) => [
      ...prev,
      {
        product: selectedProduct,
        quantity,
        salePrice,
      },
    ]);

    setSelectedProduct(null);
    setQuantity(1);
    setSalePrice(0);
    setSuccessMessage('Item added to sale');
  };

  const handleRemoveItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => total + item.quantity * item.salePrice, 0);
  };
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!voucherNumber.trim()) {
      setErrorMessage('Please enter a voucher number!');
      return;
    }

    if (saleItems.length === 0) {
      setErrorMessage('Please add at least one item!');
      return;
    }

    try {
      await axios.post('https://railway.com/project/e2630761-d2b8-48bc-adf0-ef0c9cf1f8b8/service/3779b358-2b01-49e9-9636-c73bce03f63b?environmentId=6a3f90de-ffe7-4053-b34a-5932e4685d35/api/sales', {
        voucherNumber: voucherNumber.trim(),
        products: saleItems.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
      });

      // Clear form
      setVoucherNumber('');
      setSaleItems([]);
      fetchProducts(); // Refresh products to get updated quantities
      setSuccessMessage('Sale recorded successfully!');
    } catch (error: any) {
      console.error('Error recording sale:', error);
      const message = error.response?.data?.message || 'Error recording sale. Please try again.';
      setErrorMessage(message);
    }
  };
  return (
    <Box p={3}>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      <Box mb={3}>
        <TextField
          label="Voucher Number"
          value={voucherNumber}
          onChange={(e) => setVoucherNumber(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={2} mb={2}>
          <Autocomplete
            options={products}
            getOptionLabel={(product) => `${product.productId} - ${product.name}`}
            value={selectedProduct}
            onChange={(_, newValue) => handleProductSelect(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Select Product" sx={{ width: 300 }} />
            )}
          />
          <TextField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            sx={{ width: 150 }}
          />
          <TextField
            label="Sale Price"
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            sx={{ width: 150 }}
          />
          <Button variant="contained" onClick={handleAddItem}>
            Add Item
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {saleItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.product.productId}</TableCell>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.salePrice}</TableCell>
                  <TableCell>{item.quantity * item.salePrice}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleRemoveItem(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <strong>Total Amount:</strong>
                </TableCell>
                <TableCell colSpan={2}>
                  <strong>{calculateTotal()}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Record Sale
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SalesInput;
