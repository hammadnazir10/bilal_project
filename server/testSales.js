const axios = require('axios');

async function testSales() {
  try {
    // First, let's check current products
    console.log('=== CHECKING CURRENT PRODUCTS ===');
    const productsResponse = await axios.get('http://localhost:5000/api/products');
    console.log('Products:', productsResponse.data.map(p => ({
      id: p._id,
      name: p.name,
      quantity: p.quantity
    })));

    // Find the PX3 CHINA product
    const px3Product = productsResponse.data.find(p => p.name.includes('PX3 CHINA'));
    if (!px3Product) {
      console.log('PX3 CHINA product not found!');
      return;
    }

    console.log(`\n=== TESTING SALE FOR ${px3Product.name} ===`);
    console.log(`Current quantity: ${px3Product.quantity}`);

    // Create a test sale
    const saleData = {
      voucherNumber: `TEST-${Date.now()}`,
      products: [{
        product: px3Product._id,
        quantity: 3,
        salePrice: 50000
      }]
    };

    console.log('Sale data:', saleData);

    const saleResponse = await axios.post('http://localhost:5000/api/sales', saleData);
    console.log('Sale created:', saleResponse.data);

    // Check products again to see the updated quantity
    console.log('\n=== CHECKING PRODUCTS AFTER SALE ===');
    const updatedProductsResponse = await axios.get('http://localhost:5000/api/products');
    const updatedPx3Product = updatedProductsResponse.data.find(p => p._id === px3Product._id);
    console.log(`Updated quantity: ${updatedPx3Product.quantity}`);
    console.log(`Expected quantity: ${px3Product.quantity - 3}`);
    console.log(`Decrease amount: ${px3Product.quantity - updatedPx3Product.quantity}`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSales();
