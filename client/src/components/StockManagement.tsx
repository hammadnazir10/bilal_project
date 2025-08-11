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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

interface Supplier {
  _id: string;
  name: string;
  contact: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface Product {
  _id: string;
  productId: string;  // e.g., A001, A002
  name: string;      // e.g., PX3 CHINA 30 BORE - Full name including origin and caliber
  quantity: number;
  costPrice: number;
  category: 'Pistol' | 'Rifle';
  supplier?: {
    _id: string;
    name: string;
    contact: string;
  };
}

const StockManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    quantity: 0,
    costPrice: 0,
    category: '',
    supplier: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.app/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.apphttp://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    setErrorMessage('');
    setSuccessMessage('');
    setFormData({
      productId: '',
      name: '',
      quantity: 0,
      costPrice: 0,
      category: '',
      supplier: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      if (editingProduct) {
        await axios.put(`https://outstanding-embrace-production-fe7a.up.railway.app/api/products/${editingProduct._id}`, formData);
        setSuccessMessage('Product updated successfully!');
      } else {
        await axios.post('https://outstanding-embrace-production-fe7a.up.railway.app/api/products', formData);
        setSuccessMessage('Product added successfully!');
      }
      fetchProducts();
      handleClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      const message = error.response?.data?.message || 'Failed to save product. Please try again.';
      setErrorMessage(message);
    }
  };
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      productId: product.productId,
      name: product.name,
      quantity: product.quantity,
      costPrice: product.costPrice,
      category: product.category,
      supplier: product.supplier?._id || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`https://outstanding-embrace-production-fe7a.up.railway.app/api/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box p={3}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <TextField
          label="Search products"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add New Product
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>          <TableHead>
            <TableRow>
              <TableCell>Product ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Cost Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>            {filteredProducts.map((product) => (
              <TableRow key={product._id}>
                <TableCell>{product.productId}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.supplier ? product.supplier.name : 'No Supplier'}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{product.costPrice}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(product)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(product._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
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
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Product ID"
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              fullWidth
            />            <TextField
              label="Cost Price"
              name="costPrice"
              type="number"
              value={formData.costPrice}
              onChange={handleInputChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Supplier</InputLabel>
              <Select
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                label="Supplier"
              >
                <MenuItem value="">No Supplier</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingProduct ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockManagement;
