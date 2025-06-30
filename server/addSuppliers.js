const axios = require('axios');

async function addSuppliers() {
  const suppliers = [
    {
      name: "ABC Arms Supplier",
      contact: "03001234567",
      address: "Karachi, Pakistan",
      paymentTerms: "30 days"
    },
    {
      name: "XYZ Weapons Co",
      contact: "03007654321", 
      address: "Lahore, Pakistan",
      paymentTerms: "15 days"
    }
  ];

  try {
    for (const supplier of suppliers) {
      const response = await axios.post('http://localhost:5000/api/suppliers', supplier);
      console.log('Added supplier:', response.data);
    }
    console.log('All suppliers added successfully!');
  } catch (error) {
    console.error('Error adding suppliers:', error.response?.data || error.message);
  }
}

addSuppliers();
