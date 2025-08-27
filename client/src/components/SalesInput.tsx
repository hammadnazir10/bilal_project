import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Alert,
  Card,
  CardHeader,
  CardBody,
  InputGroup,
  Badge
} from 'react-bootstrap';
import { FaPlus, FaTrash, FaChartLine, FaReceipt, FaCalculator } from 'react-icons/fa';
import axios from 'axios';

// Icon wrapper component to handle type compatibility
const IconWrapper: React.FC<{ icon: any; className?: string; style?: React.CSSProperties }> = ({ icon: Icon, className, style }) => {
  return <Icon className={className} style={style} />;
};

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
     const [salePrice, setSalePrice] = useState<number>(1);
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products from local server...');
      const response = await axios.get('https://outstanding-embrace-production-fe7a.up.railway.app/api/products');
      console.log('Products fetched:', response.data);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    const product = products.find(p => p._id === productId);
    setSelectedProduct(product || null);
    setSalePrice(0);
  };

  const handleAddItem = () => {
    setErrorMessage('');
    
    if (!selectedProduct) {
      setErrorMessage('Please select a product');
      return;
    }
    
         if (quantity < 1) {
       setErrorMessage('Quantity must be 1 or above');
       return;
     }
    
         if (salePrice < 1) {
       setErrorMessage('Sale price must be 1 or above');
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
     setSalePrice(1);
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
      await axios.post('https://outstanding-embrace-production-fe7a.up.railway.app/api/sales', {
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
    <div className="sales-input">
      <div className="page-header">
        <h1 className="page-title">
          <IconWrapper icon={FaChartLine} className="me-3" />
          Sales Input
        </h1>
        <p className="page-subtitle">Record new sales and manage transactions</p>
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

            <Row className="g-4">
        <Col xl={8} lg={12} md={12} sm={12}>
          <Card className="sale-form-card">
            <CardHeader className="bg-primary text-white">
              <h5 className="mb-0">
                <IconWrapper icon={FaReceipt} className="me-2" />
                Sale Information
              </h5>
            </CardHeader>
            <CardBody>
              <Form.Group className="mb-3">
                <Form.Label>Voucher Number *</Form.Label>
                <Form.Control
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="Enter voucher number"
                  required
                />
              </Form.Group>

              <Row className="g-3">
                <Col xl={6} lg={6} md={12} sm={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Product *</Form.Label>
                    <Form.Select
                      value={selectedProduct?._id || ''}
                      onChange={handleProductSelect}
                      required
                    >
                      <option value="">Choose a product...</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.productId} - {product.name} (Stock: {product.quantity})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xl={3} lg={3} md={6} sm={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min="1"
                      max={selectedProduct?.quantity || 999}
                      required
                    />
                  </Form.Group>
                </Col>
                                 <Col xl={3} lg={3} md={6} sm={6}>
                   <Form.Group className="mb-3">
                     <Form.Label>Sale Price (PKR) *</Form.Label>
                     <Form.Control
                       type="number"
                       value={salePrice}
                       onChange={(e) => setSalePrice(Number(e.target.value))}
                       min="1"
                       step="1"
                       required
                     />
                   </Form.Group>
                 </Col>
              </Row>

              <Button 
                variant="success" 
                onClick={handleAddItem}
                className="w-100"
                                 disabled={!selectedProduct || quantity < 1 || salePrice < 1}
              >
                <IconWrapper icon={FaPlus} className="me-2" />
                Add Item to Sale
              </Button>
            </CardBody>
          </Card>
        </Col>

        <Col xl={4} lg={12} md={12} sm={12}>
          <Card className="sale-summary-card">
            <CardHeader className="bg-info text-white">
              <h5 className="mb-0">
                <IconWrapper icon={FaCalculator} className="me-2" />
                Sale Summary
              </h5>
            </CardHeader>
            <CardBody>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Items:</span>
                  <Badge bg="primary" className="stat-value">{saleItems.length}</Badge>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Amount:</span>
                  <span className="stat-value total-amount">PKR {calculateTotal().toLocaleString()}</span>
                </div>
              </div>
              
              <Button 
                variant="primary" 
                size="lg"
                onClick={handleSubmit}
                className="w-100 mt-3"
                disabled={saleItems.length === 0 || !voucherNumber.trim()}
              >
                <IconWrapper icon={FaReceipt} className="me-2" />
                Record Sale
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {saleItems.length > 0 && (
        <Card className="sale-items-card mt-4">
          <CardHeader className="bg-dark text-white">
            <h5 className="mb-0">
              <IconWrapper icon={FaChartLine} className="me-2" />
              Sale Items ({saleItems.length})
            </h5>
          </CardHeader>
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product ID</th>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>Sale Price</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, index) => (
                    <tr key={index} className="sale-item-row">
                      <td>
                        <Badge bg="secondary">{item.product.productId}</Badge>
                      </td>
                      <td>
                        <div className="product-name">{item.product.name}</div>
                      </td>
                      <td>
                        <Badge bg="info">{item.quantity}</Badge>
                      </td>
                      <td>
                                                 <strong className="text-success">PKR {item.salePrice.toLocaleString()}</strong>
                      </td>
                      <td>
                                                 <strong className="text-primary">PKR {(item.quantity * item.salePrice).toLocaleString()}</strong>
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <IconWrapper icon={FaTrash} />
                        </Button>
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

export default SalesInput;
