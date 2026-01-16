const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('./logger');
require('dotenv').config();

const generator = {
  async generateRoute(modelName, options = {}) {
    try {
      const { columns, foreignKeys } = await this.getTableSchema(modelName, options);
      
      if (columns.length === 0) {
        const tableName = modelName + 's';
        throw new Error(`Table '${tableName}' not found in database`);
      }

      logger.success(`Table '${modelName}s' found with ${columns.length} columns`);
      if (foreignKeys.length > 0) {
        logger.info(`${foreignKeys.length} foreign key(s) detected`);
      }

      const routesDir = options.routesDir || path.join(process.cwd(), 'routes');
      const modelsDir = options.modelsDir || path.join(process.cwd(), 'models');
      const controllersDir = options.controllersDir || path.join(process.cwd(), 'controllers');

      this.generateRouteFile(modelName, columns, foreignKeys, routesDir);
      this.generateModelFile(modelName, columns, foreignKeys, modelsDir);
      this.generateControllerFile(modelName, columns, foreignKeys, controllersDir);

      logger.success('All files generated!');
      logger.info('Next steps:');
      logger.log(`  1. Register route: napi-mvc register route ${modelName}`);
      logger.log(`  2. Restart server`);
      logger.log(`  3. Test on http://localhost:3000/api-docs`);
    } catch (err) {
      logger.error(err.message);
      throw err;
    }
  },

  async getTableSchema(modelName, options = {}) {
    const pool = mysql.createPool({
      host: options.host || process.env.DB_HOST || 'localhost',
      user: options.user || process.env.DB_USER || 'root',
      password: options.password || process.env.DB_PASSWORD || '',
      database: options.database || process.env.DB_NAME || 'api_mvc'
    });

    const connection = await pool.getConnection();
    
    try {
      const tableName = modelName + 's';
      const dbName = options.database || process.env.DB_NAME || 'api_mvc';

      const [columns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?`,
        [tableName, dbName]
      );

      const [foreignKeys] = await connection.query(
        `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [tableName, dbName]
      );

      return { columns, foreignKeys };
    } finally {
      connection.release();
      pool.end();
    }
  },

  generateRouteFile(modelName, columns, foreignKeys, routesDir) {
    const routeFile = path.join(routesDir, `${modelName}.routes.js`);

    if (fs.existsSync(routeFile)) {
      throw new Error(`Route ${modelName}.routes.js already exists`);
    }

    const modelNameCapital = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const tableName = modelName + 's';
    
    const schemaProperties = this.generateSwaggerProperties(columns, foreignKeys);
    const requiredFields = this.generateRequiredFields(columns, foreignKeys);
    
    const routeContent = `const express = require('express');
const router = express.Router();
const ${modelNameCapital}Controller = require('../controllers/${modelName}.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const logger = require('../middlewares/logger.middleware');

/**
 * @swagger
 * /api/v1/${tableName}:
 *   get:
 *     summary: Get all ${tableName}
 *     tags:
 *       - ${modelNameCapital}s
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ${tableName}
 *       401:
 *         description: Not authenticated
 *   post:
 *     summary: Create new ${modelName}
 *     tags:
 *       - ${modelNameCapital}s
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
${schemaProperties}${requiredFields}
 *     responses:
 *       201:
 *         description: ${modelNameCapital} created
 */
router.get('/', authMiddleware, logger, ${modelNameCapital}Controller.getAll);
router.post('/', authMiddleware, logger, ${modelNameCapital}Controller.create);

/**
 * @swagger
 * /api/v1/${tableName}/{id}:
 *   get:
 *     summary: Get ${modelName} by ID
 *     tags:
 *       - ${modelNameCapital}s
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ${modelNameCapital} found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update ${modelName}
 *     tags:
 *       - ${modelNameCapital}s
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
${schemaProperties}${requiredFields}
 *     responses:
 *       200:
 *         description: ${modelNameCapital} updated
 *   delete:
 *     summary: Delete ${modelName}
 *     tags:
 *       - ${modelNameCapital}s
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ${modelNameCapital} deleted
 */
router.get('/:id', authMiddleware, logger, ${modelNameCapital}Controller.getById);
router.put('/:id', authMiddleware, logger, ${modelNameCapital}Controller.update);
router.delete('/:id', authMiddleware, logger, ${modelNameCapital}Controller.delete);

module.exports = router;
`;

    if (!fs.existsSync(routesDir)) {
      fs.mkdirSync(routesDir, { recursive: true });
    }

    fs.writeFileSync(routeFile, routeContent);
    logger.success(`Route created: ${routeFile}`);
  },

  generateModelFile(modelName, columns, foreignKeys, modelsDir) {
    const modelFile = path.join(modelsDir, `${modelName}.model.js`);

    if (fs.existsSync(modelFile)) {
      throw new Error(`Model ${modelName}.model.js already exists`);
    }

    const tableName = modelName + 's';
    const hasUserId = columns.some(col => col.COLUMN_NAME === 'user_id');
    
    const fkMap = {};
    foreignKeys.forEach(fk => {
      fkMap[fk.COLUMN_NAME] = {
        table: fk.REFERENCED_TABLE_NAME,
        column: fk.REFERENCED_COLUMN_NAME
      };
    });

    const fkValidations = Object.keys(fkMap).filter(fk => fk !== 'user_id').map(fk => `    // Validate ${fk} exists
    const [${fk}Check] = await connection.query('SELECT id FROM ${fkMap[fk].table} WHERE id = ?', [data.${fk}]);
    if (${fk}Check.length === 0) {
      throw new Error('${fk} invalid or not found');
    }
`).join('');

    const fkUpdateValidations = Object.keys(fkMap).filter(fk => fk !== 'user_id').map(fk => `    // Validate ${fk} if provided
    if (data.${fk}) {
      const [${fk}Check] = await connection.query('SELECT id FROM ${fkMap[fk].table} WHERE id = ?', [data.${fk}]);
      if (${fk}Check.length === 0) {
        throw new Error('${fk} invalid or not found');
      }
    }
`).join('');

    const modelContent = `const pool = require('../config/db');

exports.findAll = async (userId = null) => {
  const connection = await pool.getConnection();
  try {
${hasUserId ? `    let query = 'SELECT * FROM ${tableName} WHERE user_id = ?';
    const [rows] = await connection.query(query, [userId]);` : `    const [rows] = await connection.query('SELECT * FROM ${tableName}');`}
    return rows;
  } finally {
    connection.release();
  }
};

exports.findById = async (id, userId = null) => {
  const connection = await pool.getConnection();
  try {
${hasUserId ? `    let query = 'SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?';
    const [rows] = await connection.query(query, [id, userId]);` : `    const [rows] = await connection.query('SELECT * FROM ${tableName} WHERE id = ?', [id]);`}
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
};

exports.create = async (data, userId = null) => {
  const connection = await pool.getConnection();
  try {
${hasUserId ? `    // Auto-fill user_id from authenticated user
    data.user_id = userId;` : ''}
    ${fkValidations}
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const [result] = await connection.query(
      \`INSERT INTO ${tableName} (\${fields}) VALUES (\${placeholders})\`,
      values
    );
    
    return { id: result.insertId, ...data };
  } finally {
    connection.release();
  }
};

exports.update = async (id, data, userId = null) => {
  const connection = await pool.getConnection();
  try {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

${fkUpdateValidations}
    const fields = Object.keys(data).map(k => \`\${k} = ?\`).join(', ');
    const values = [...Object.values(data), id];

    await connection.query(
      \`UPDATE ${tableName} SET \${fields} WHERE id = ?\`,
      values
    );

    return { id, ...data };
  } finally {
    connection.release();
  }
};

exports.delete = async (id, userId = null) => {
  const connection = await pool.getConnection();
  try {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    await connection.query('DELETE FROM ${tableName} WHERE id = ?', [id]);
    return existing;
  } finally {
    connection.release();
  }
};
`;

    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    fs.writeFileSync(modelFile, modelContent);
    logger.success(`Model created: ${modelFile}`);
  },

  generateControllerFile(modelName, columns, foreignKeys, controllersDir) {
    const controllerFile = path.join(controllersDir, `${modelName}.controller.js`);

    if (fs.existsSync(controllerFile)) {
      throw new Error(`Controller ${modelName}.controller.js already exists`);
    }

    const modelNameCapital = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const hasUserId = columns.some(col => col.COLUMN_NAME === 'user_id');

    const controllerContent = `const ${modelNameCapital} = require('../models/${modelName}.model');

exports.getAll = async (req, res) => {
  try {
${hasUserId ? `    const items = await ${modelNameCapital}.findAll(req.user?.id);` : `    const items = await ${modelNameCapital}.findAll();`}
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
${hasUserId ? `    const item = await ${modelNameCapital}.findById(req.params.id, req.user?.id);` : `    const item = await ${modelNameCapital}.findById(req.params.id);`}
    if (!item) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
${hasUserId ? `    const newItem = await ${modelNameCapital}.create(req.body, req.user?.id);` : `    const newItem = await ${modelNameCapital}.create(req.body);`}
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
${hasUserId ? `    const updated = await ${modelNameCapital}.update(req.params.id, req.body, req.user?.id);` : `    const updated = await ${modelNameCapital}.update(req.params.id, req.body);`}
    if (!updated) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
${hasUserId ? `    const deleted = await ${modelNameCapital}.delete(req.params.id, req.user?.id);` : `    const deleted = await ${modelNameCapital}.delete(req.params.id);`}
    if (!deleted) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    res.json({ message: '${modelName} deleted', item: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
`;

    if (!fs.existsSync(controllersDir)) {
      fs.mkdirSync(controllersDir, { recursive: true });
    }

    fs.writeFileSync(controllerFile, controllerContent);
    logger.success(`Controller created: ${controllerFile}`);
  },

  generateSwaggerProperties(columns, foreignKeys = []) {
    const properties = [];
    const fkColumns = foreignKeys.map(fk => fk.COLUMN_NAME);
    
    columns.forEach(col => {
      const colName = col.COLUMN_NAME;
      if (colName === 'id' || colName === 'created_at' || colName === 'updated_at' || colName === 'user_id' || colName === 'sell_date' || colName === 'sells_date' || fkColumns.includes(colName)) {
        return;
      }
      
      let swaggerType = 'string';
      let example = 'example value';
      
      const dataType = col.DATA_TYPE.toLowerCase();
      if (dataType.includes('int')) {
        swaggerType = 'integer';
        example = 1;
      } else if (dataType.includes('float') || dataType.includes('decimal')) {
        swaggerType = 'number';
        example = 99.99;
      } else if (dataType.includes('text')) {
        swaggerType = 'string';
        example = 'Long text';
      } else if (dataType.includes('date')) {
        swaggerType = 'string';
        example = '2024-01-16';
      } else if (dataType.includes('time')) {
        swaggerType = 'string';
        example = '10:30:00';
      }
      
      properties.push(`             ${colName}:`);
      properties.push(`               type: ${swaggerType}`);
      properties.push(`               example: ${typeof example === 'string' ? `"${example}"` : example}`);
    });
    
    foreignKeys.forEach(fk => {
      if (fk.COLUMN_NAME !== 'user_id') {
        properties.push(`             ${fk.COLUMN_NAME}:`);
        properties.push(`               type: integer`);
        properties.push(`               example: 1`);
      }
    });
    
    return properties.length > 0 ? '\n *             properties:\n *               ' + properties.join('\n *               ') : '';
  },

  generateRequiredFields(columns, foreignKeys = []) {
    const required = [];
    const fkColumns = foreignKeys.map(fk => fk.COLUMN_NAME);
    
    columns.forEach(col => {
      const colName = col.COLUMN_NAME;
      if (colName !== 'id' && colName !== 'created_at' && colName !== 'updated_at' && colName !== 'user_id' && col.IS_NULLABLE === 'NO' && !fkColumns.includes(colName)) {
        required.push(colName);
      }
    });
    
    foreignKeys.forEach(fk => {
      if (fk.COLUMN_NAME !== 'user_id') {
        required.push(fk.COLUMN_NAME);
      }
    });
    
    return required.length > 0 ? '\n *             required:\n *               - ' + required.join('\n *               - ') : '';
  }
};

module.exports = generator;
