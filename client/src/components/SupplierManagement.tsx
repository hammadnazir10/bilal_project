import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Modal,
  Alert,
  InputGroup,
  Badge,
  Card,
  CardHeader,
  CardBody
} from 'react-bootstrap';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaTruck, FaUser, FaMapMarkerAlt, FaCreditCard } from 'react-icons/fa';
import axios from 'axios';

// Icon wrapper component to handle type compatibility
const IconWrapper: React.FC<{ icon: any; className?: string; style?: React.CSSProperties }> = ({ icon: Icon, className, style }) => {
  return <Icon className={className} style={style} />;
};

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
  const [showModal, setShowModal] = useState(false);
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
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers');
      setSuppliers(response.data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setErrorMessage('Failed to load suppliers. Please try again.');
    }
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
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

  const handleInputChange = (e: any) => {
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
        await axios.put(`https://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers/${editingSupplier._id}`, formData);
        setSuccessMessage('Supplier updated successfully!');
      } else {
        await axios.post('https://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers', formData);
        setSuccessMessage('Supplier added successfully!');
      }
      fetchSuppliers();
      handleCloseModal();
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
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await axios.delete(`https://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers/${id}`);
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
    <div className="supplier-management">
      <div className="page-header">
        <h1 className="page-title">
          <IconWrapper icon={FaTruck} className="me-3" />
          Supplier Management
        </h1>
        <p className="page-subtitle">Manage your suppliers and vendor relationships</p>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      <Row className="g-4 mb-4">
        <Col xl={8} lg={12} md={12} sm={12}>
          <Card className="search-card">
            <CardBody>
              <InputGroup>
                <InputGroup.Text>
                  <IconWrapper icon={FaSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search suppliers by name or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0"
                />
              </InputGroup>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} lg={12} md={12} sm={12}>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleShowModal}
            className="w-100 add-supplier-btn"
          >
            <IconWrapper icon={FaPlus} className="me-2" />
            Add New Supplier
          </Button>
        </Col>
      </Row>

      <Card className="suppliers-table-card">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <IconWrapper icon={FaTruck} className="me-2" />
            Suppliers ({filteredSuppliers.length})
          </h5>
          <div className="table-actions">
            <Badge bg="info" className="me-2">
              Total: {suppliers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-responsive">
            <Table className="table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Payment Terms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier._id} className="supplier-row">
                    <td>
                      <div className="supplier-name">
                        <IconWrapper icon={FaUser} className="me-2 text-primary" />
                        <strong>{supplier.name}</strong>
                      </div>
                    </td>
                    <td>
                      <Badge bg="secondary">{supplier.contact}</Badge>
                    </td>
                    <td>
                      {supplier.address ? (
                        <div className="supplier-address">
                          <IconWrapper icon={FaMapMarkerAlt} className="me-2 text-muted" />
                          {supplier.address}
                        </div>
                      ) : (
                        <span className="text-muted">No address</span>
                      )}
                    </td>
                    <td>
                      {supplier.paymentTerms ? (
                        <div className="payment-terms">
                          <IconWrapper icon={FaCreditCard} className="me-2 text-muted" />
                          {supplier.paymentTerms}
                        </div>
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                          className="me-2"
                        >
                          <IconWrapper icon={FaEdit} />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(supplier._id)}
                        >
                          <IconWrapper icon={FaTrash} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Add/Edit Supplier Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMessage && (
            <Alert variant="danger" className="mb-3">
              {errorMessage}
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success" className="mb-3">
              {successMessage}
            </Alert>
          )}
          
          <Row className="g-3">
            <Col xl={6} lg={6} md={6} sm={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <IconWrapper icon={FaUser} className="me-2" />
                  Supplier Name *
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter supplier name"
                  required
                />
              </Form.Group>
            </Col>
            <Col xl={6} lg={6} md={6} sm={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <IconWrapper icon={FaUser} className="me-2" />
                  Contact *
                </Form.Label>
                <Form.Control
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="Enter contact information"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>
              <IconWrapper icon={FaMapMarkerAlt} className="me-2" />
              Address
            </Form.Label>
            <Form.Control
              as="textarea"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter supplier address"
              rows={3}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              <IconWrapper icon={FaCreditCard} className="me-2" />
              Payment Terms
            </Form.Label>
            <Form.Control
              type="text"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleInputChange}
              placeholder="e.g., Net 30, Cash on Delivery"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SupplierManagement;
