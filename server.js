require('dotenv').config(); 
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ValidationError } = require('./errors');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database
let products = [
  {
    id: uuidv4(),
    name: "Laptop",
    description: "High performance laptop",
    price: 999.99,
    category: "Electronics",
    inStock: true
  },
  {
    id: uuidv4(),
    name: "Smartphone",
    description: "Latest model smartphone",
    price: 699.99,
    category: "Electronics",
    inStock: true
  },
  {
    id: uuidv4(),
    name: "Desk Chair",
    description: "Ergonomic office chair",
    price: 199.99,
    category: "Furniture",
    inStock: false
  }
];

// Middleware
app.use(express.json());

// Custom logger middleware
const logger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};
app.use(logger);

// Authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Validation middleware
const validateProduct = (req, res, next) => {
  if (!req.body.name || !req.body.price || !req.body.category) {
    return next(new ValidationError('Name, price, and category are required'));
  }
  if (typeof req.body.price !== 'number' || req.body.price <= 0) {
    return next(new ValidationError('Price must be a positive number'));
  }
  next();
};

// Routes

// Root endpoint
app.get('/', (req, res) => {
  res.send('Welcome to the Products API');
});

// Get all products with filtering and pagination
app.get('/api/products', (req, res) => {
  const { category, page = 1, limit = 10 } = req.query;
  let filteredProducts = products;
  
  if (category) {
    filteredProducts = products.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    total: filteredProducts.length,
    page: parseInt(page),
    limit: parseInt(limit),
    products: paginatedProducts
  });
});

// Search products
app.get('/api/products/search', (req, res, next) => {
  const { q } = req.query;
  if (!q) return next(new ValidationError('Search query is required'));
  
  const searchResults = products.filter(p => 
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.description.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json(searchResults);
});

// Get product statistics
app.get('/api/products/stats', (req, res) => {
  const stats = {};
  
  products.forEach(product => {
    if (!stats[product.category]) {
      stats[product.category] = 0;
    }
    stats[product.category]++;
  });
  
  res.json(stats);
});

// Get single product
app.get('/api/products/:id', (req, res, next) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return next(new NotFoundError('Product not found'));
  res.json(product);
});

// Create new product
app.post('/api/products', authenticate, validateProduct, (req, res) => {
  const product = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    category: req.body.category,
    inStock: req.body.inStock || true
  };
  products.push(product);
  res.status(201).json(product);
});

// Update product
app.put('/api/products/:id', authenticate, validateProduct, (req, res, next) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return next(new NotFoundError('Product not found'));
  
  products[index] = { ...products[index], ...req.body };
  res.json(products[index]);
});

// Delete product
app.delete('/api/products/:id', authenticate, (req, res, next) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return next(new NotFoundError('Product not found'));
  
  products.splice(index, 1);
  res.status(204).end();
});

// 404 handler
app.use((req, res, next) => {
  next(new NotFoundError('Endpoint not found'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});