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
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

interface Supplier {
  _id: string;
  name: string;
  contact: string;
  address: string;
  paymentTerms: string;
  products: any[];
}

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    paymentTerms: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('http://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers');
      setSuppliers(response.data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setErrorMessage('Failed to load suppliers. Please try again.');
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEditingSupplier(null);
    setErrorMessage('');
    setSuccessMessage('');
    setFormData({
      name: '',
      contact: '',
      address: '',
      paymentTerms: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!formData.name.trim()) {
      setErrorMessage('Supplier name is required');
      return;
    }
    
    if (!formData.contact.trim()) {
      setErrorMessage('Contact is required');
      return;
    }
    
    try {
      if (editingSupplier) {
        await axios.put(`http://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers/${editingSupplier._id}`, formData);
        setSuccessMessage('Supplier updated successfully!');
      } else {
        await axios.post('http://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers', formData);
        setSuccessMessage('Supplier added successfully!');
      }
      fetchSuppliers();
      handleClose();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      const message = error.response?.data?.message || 'Failed to save supplier. Please try again.';
      setErrorMessage(message);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
    });
    setOpen(true);
  };
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await axios.delete(`http://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers/${id}`);
        fetchSuppliers();
        setSuccessMessage('Supplier deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting supplier:', error);
        const message = error.response?.data?.message || 'Failed to delete supplier. Please try again.';
        setErrorMessage(message);
      }
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );
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
      
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <TextField
          label="Search suppliers"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add New Supplier
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Payment Terms</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier._id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.contact}</TableCell>
                <TableCell>{supplier.address}</TableCell>
                <TableCell>{supplier.paymentTerms}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(supplier)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(supplier._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
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
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Contact"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Payment Terms"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleInputChange}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingSupplier ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplierManagement;
