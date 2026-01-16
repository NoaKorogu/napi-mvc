# 🚀 Napi-MVC - RAD Tool for Express APIs

A powerful RAD (Rapid Application Development) tool that automatically generates CRUD routes, models, and controllers from your MySQL database schema.

## ✨ Features

- **Auto-generate CRUD** — REST endpoints automatically created from database tables
- **Smart Detection** — Automatically detects foreign keys and generates validation
- **Swagger Integration** — Auto-generated OpenAPI/Swagger documentation
- **Role-Based Auth** — Built-in JWT authentication with role-based access control
- **CLI Tool** — Easy command-line interface for generation
- **Zero Config** — Works out of the box with sensible defaults

## 📦 Installation

```bash
npm install napi-mvc
```

Or install globally to use the CLI anywhere:

```bash
npm install -g napi-mvc
```

## 🚀 Quick Start

### 1. Use with CLI

```bash
# Generate CRUD for a table
napi-mvc generate route users

# Register the route in your app.js
napi-mvc register route users
```

### 2. Use as a Module

```javascript
const napiMvc = require('napi-mvc');

// Generate routes programmatically
napiMvc.generateRoute('users', {
  host: 'localhost',
  user: 'root',
  database: 'myapp'
});
```

## 📝 Usage

### Prerequisites

1. **MySQL database** with tables defined
2. **Express.js** application setup
3. **dotenv** configuration

### Setup

```bash
# Create your table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2),
  description TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

# Generate CRUD
napi-mvc generate route product

# Register in your app.js
napi-mvc register route product

# Restart server
npm start
```

### What Gets Generated

#### ✅ Route (`routes/product.routes.js`)
- GET `/api/v1/products` — List all
- GET `/api/v1/products/:id` — Get one
- POST `/api/v1/products` — Create
- PUT `/api/v1/products/:id` — Update
- DELETE `/api/v1/products/:id` — Delete
- Auto-generated Swagger documentation

#### ✅ Model (`models/product.model.js`)
- `findAll()` — Get all records
- `findById(id)` — Get by ID
- `create(data)` — Insert new record
- `update(id, data)` — Update record
- `delete(id)` — Delete record
- **Auto FK Validation** — Validates foreign key existence
- **Auto User ID** — Auto-fills user_id from authenticated user

#### ✅ Controller (`controllers/product.controller.js`)
- `getAll(req, res)` — Handle GET /
- `getById(req, res)` — Handle GET /:id
- `create(req, res)` — Handle POST /
- `update(req, res)` — Handle PUT /:id
- `delete(req, res)` — Handle DELETE /:id
- **Error handling** — Built-in error responses
- **Auth passing** — Passes req.user.id to model

## 🔐 Authentication & Authorization

Napi-MVC integrates with JWT authentication:

```javascript
const authMiddleware = require('./middlewares/auth');
const authorize = require('./middlewares/authorize');

// Apply auth to routes
router.post('/', authMiddleware, authorize('admin'), Controller.create);
```

### Supported Roles
- `user` — Regular user
- `admin` — Administrator

## 📚 Advanced Usage

### Exclude Fields from CRUD

The generator automatically excludes these fields:
- `id` — Primary key
- `created_at` — Auto-timestamp
- `updated_at` — Auto-timestamp
- `user_id` — Auto-filled from auth
- `*_date` fields — Auto-set to current date

### Custom Configuration

Create a `.napi-mvc.json` in your project root:

```json
{
  "host": "localhost",
  "user": "root",
  "password": "secret",
  "database": "myapp",
  "exclude": ["deleted_at", "internal_id"]
}
```

### Use in Tests

```javascript
const { generateRoute, generateModel } = require('napi-mvc');

describe('Product CRUD', () => {
  test('should generate valid model', async () => {
    const model = await generateModel('products');
    expect(model).toHaveProperty('create');
    expect(model).toHaveProperty('findAll');
  });
});
```

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/yourusername/napi-mvc.git
cd napi-mvc

# Install dependencies
npm install

# Run tests
npm test

# Publish to npm
npm publish
```

## 📋 Command Reference

```bash
# Generate route + model + controller
napi-mvc generate route <tableName>

# Register route in app.js
napi-mvc register route <tableName>

# Show help
napi-mvc help

# Show version
napi-mvc --version
```

## 🐛 Troubleshooting

### Table not found
```bash
# Make sure the table exists in MySQL
SHOW TABLES;

# Then try generating again
napi-mvc generate route tablename
```

### Module not found
```bash
# Make sure you've registered the route
napi-mvc register route tablename

# Then restart your server
npm start
```

### Port already in use
```bash
# Kill the process using port 3000
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -ti :3000 | xargs kill -9
```

## 📄 License

MIT

## 👤 Author

Your Name <your-email@example.com>

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 📖 [Documentation](https://github.com/yourusername/napi-mvc)
- 🐛 [Report Issues](https://github.com/yourusername/napi-mvc/issues)
- 💬 [Discussions](https://github.com/yourusername/napi-mvc/discussions)

---

**Made with ❤️ for rapid API development**
