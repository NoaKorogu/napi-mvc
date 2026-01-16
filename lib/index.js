const generator = require('./generator');
const registrar = require('./registrar');
const logger = require('./logger');

module.exports = {
  generateRoute: generator.generateRoute,
  generateModel: generator.generateModel,
  generateController: generator.generateController,
  generateRoutes: generator.generateRoutes,
  registerRoute: registrar.registerRoute,
  logger
};
