const axios = require('axios');

async function addTestProduct() {
  try {
    // Get suppliers first to use one for the product
    const suppliersResponse = await axios.get('http://outstanding-embrace-production-fe7a.up.railway.app/api/suppliers');
    const supplier = suppliersResponse.data[0]; // Use first supplier

    const productData = {
      productId: 'A001',
      name: 'PX3 CHINA 30 BORE',
      quantity: 10,
      costPrice: 35000,
      category: 'Pistol',
      supplier: supplier._id
    };

    console.log('Adding product:', productData);

    const response = await axios.post('http://outstanding-embrace-production-fe7a.up.railway.app/api/products', productData);
    console.log('Product added:', response.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

addTestProduct();
