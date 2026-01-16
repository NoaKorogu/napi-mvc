const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const registrar = {
  async registerRoute(modelName, options = {}) {
    try {
      const appFilePath = options.appPath || path.join(process.cwd(), 'app.js');
      
      if (!fs.existsSync(appFilePath)) {
        throw new Error(`app.js not found at ${appFilePath}`);
      }

      let appContent = fs.readFileSync(appFilePath, 'utf-8');
      
      const tableName = modelName + 's';
      
      if (appContent.includes(`'/api/v1/${tableName}'`)) {
        logger.success(`Route /api/v1/${tableName} already registered in app.js`);
        return;
      }
      
      const requireRegex = /const \w+Routes = require\('\.\/routes\/\w+\.routes'\);/g;
      const matches = appContent.match(requireRegex);
      
      if (matches) {
        const lastRequire = matches[matches.length - 1];
        appContent = appContent.replace(lastRequire, lastRequire + `\nconst ${modelName}Routes = require('./routes/${modelName}.routes');`);
      }
      
      const routeRegex = /app\.use\('\/api\/v1\/\w+',\s*\w+Routes\);/g;
      const routeMatches = appContent.match(routeRegex);
      
      if (routeMatches) {
        const lastRouteMatch = routeMatches[routeMatches.length - 1];
        const lastRouteUseIndex = appContent.lastIndexOf(lastRouteMatch);
        const lineEnd = appContent.indexOf(';', lastRouteUseIndex) + 1;
        const nextLineStart = appContent.indexOf('\n', lineEnd);
        appContent = appContent.slice(0, nextLineStart) + `\napp.use('/api/v1/${tableName}', ${modelName}Routes);` + appContent.slice(nextLineStart);
      }
      
      fs.writeFileSync(appFilePath, appContent);
      logger.success(`Route registered in app.js: /api/v1/${tableName}`);
      logger.info('Restart server and test on http://localhost:3000/api-docs');
    } catch (err) {
      logger.error(`Error registering route: ${err.message}`);
      throw err;
    }
  }
};

module.exports = registrar;
