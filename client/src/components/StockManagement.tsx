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
import { FaPlus, FaSearch, FaEdit, FaTrash, FaBoxes, FaEye } from 'react-icons/fa';
import axios from 'axios';

// Icon wrapper component to handle type compatibility
const IconWrapper: React.FC<{ icon: any; className?: string; style?: React.CSSProperties }> = ({ icon: Icon, className, style }) => {
  return <Icon className={className} style={style} />;
};

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
  productId: string;
  name: string;
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
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
     const [formData, setFormData] = useState({
     productId: '',
     name: '',
     quantity: 1,
     costPrice: 1,
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
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setErrorMessage('');
    setSuccessMessage('');
         setFormData({
       productId: '',
       name: '',
       quantity: 1,
       costPrice: 1,
       category: '',
       supplier: '',
     });
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'costPrice' ? Number(value) : value,
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
      handleCloseModal();
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
    setShowModal(true);
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

  const getCategoryBadge = (category: string) => {
    return category === 'Pistol' ? 
      <Badge bg="primary">{category}</Badge> : 
      <Badge bg="success">{category}</Badge>;
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return <Badge bg="danger">Out of Stock</Badge>;
    if (quantity < 10) return <Badge bg="warning">Low Stock</Badge>;
    return <Badge bg="success">In Stock</Badge>;
  };

  return (
    <div className="stock-management">
      <div className="page-header">
        <h1 className="page-title">
          <IconWrapper icon={FaBoxes} className="me-3" />
          Stock Management
        </h1>
        <p className="page-subtitle">Manage your inventory and product catalog</p>
      </div>

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
                  placeholder="Search products by name, ID, or category..."
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
            className="w-100 add-product-btn"
          >
            <IconWrapper icon={FaPlus} className="me-2" />
            Add New Product
          </Button>
        </Col>
      </Row>

      <Card className="products-table-card">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <IconWrapper icon={FaBoxes} className="me-2" />
            Products ({filteredProducts.length})
          </h5>
          <div className="table-actions">
            <Badge bg="info" className="me-2">
              Total: {products.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-responsive">
            <Table className="table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Product ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Quantity</th>
                  <th>Cost Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="product-row">
                    <td>
                      <strong className="text-primary">{product.productId}</strong>
                    </td>
                    <td>
                      <div>
                        <div className="product-name">{product.name}</div>
                      </div>
                    </td>
                    <td>{getCategoryBadge(product.category)}</td>
                    <td>
                      {product.supplier ? (
                        <span className="supplier-name">{product.supplier.name}</span>
                      ) : (
                        <span className="text-muted">No Supplier</span>
                      )}
                    </td>
                    <td>
                      <strong className={product.quantity === 0 ? 'text-danger' : ''}>
                        {product.quantity}
                      </strong>
                    </td>
                    <td>
                                               <strong className="text-success">PKR {product.costPrice.toLocaleString()}</strong>
                    </td>
                    <td>{getStockStatus(product.quantity)}</td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="me-2"
                        >
                          <IconWrapper icon={FaEdit} />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(product._id)}
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

      {/* Add/Edit Product Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                <Form.Label>Product ID *</Form.Label>
                <Form.Control
                  type="text"
                  name="productId"
                  value={formData.productId}
                  onChange={handleInputChange}
                  placeholder="e.g., A001, A002"
                  required
                />
              </Form.Group>
            </Col>
            <Col xl={6} lg={6} md={6} sm={12}>
              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Pistol">Pistol</option>
                  <option value="Rifle">Rifle</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Product Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., PX3 CHINA 30 BORE - Full name including origin and caliber"
              required
            />
          </Form.Group>

                    <Row className="g-3">
            <Col xl={6} lg={6} md={6} sm={12}>
              <Form.Group className="mb-3">
                <Form.Label>Quantity *</Form.Label>
                                 <Form.Control
                   type="number"
                   name="quantity"
                   value={formData.quantity}
                   onChange={handleInputChange}
                   min="1"
                   required
                 />
              </Form.Group>
            </Col>
            <Col xl={6} lg={6} md={6} sm={12}>
              <Form.Group className="mb-3">
                <Form.Label>Cost Price (PKR) *</Form.Label>
                                 <Form.Control
                   type="number"
                   name="costPrice"
                   value={formData.costPrice}
                   onChange={handleInputChange}
                   min="1"
                   step="1"
                   required
                 />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Supplier</Form.Label>
            <Form.Select
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
            >
              <option value="">No Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name} - {supplier.contact}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StockManagement;
