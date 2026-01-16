#!/usr/bin/env node

const path = require('path');
const generator = require('../lib/generator');
const registrar = require('../lib/registrar');
const logger = require('../lib/logger');

const args = process.argv.slice(2);
const command = args[0];
const action = args[1];
const modelName = args[2];

const helpText = `
╔════════════════════════════════════════════╗
║    Napi-mvc RAD Tool v2.0 - Auto DB Gen    ║
║    Génération complète à partir de la BD   ║
╚════════════════════════════════════════════╝

Usage:
  napi-mvc generate route <modelName>    Générer route + model + controller
  napi-mvc register route <modelName>    Enregistrer la route dans app.js
  napi-mvc help                          Afficher cette aide
  napi-mvc --version                     Afficher la version

Examples:
  napi-mvc generate route product
  napi-mvc register route product
  napi-mvc generate route category

⚠️  IMPORTANT:
  La table doit exister dans votre DB!
  Exemple: pour 'product' → table 'products' doit exister

Ce qui est généré automatiquement:
  ✅ routes/<modelName>.routes.js   (avec Swagger complet et champs de BD)
  ✅ models/<modelName>.model.js    (CRUD complet)
  ✅ controllers/<modelName>.controller.js (endpoints)

Après génération:
  1. Exécuter: napi-mvc register route <modelName>
  2. Redémarrer le serveur
  3. Tester sur http://localhost:3000/api-docs
`;

async function main() {
  if (!command || command === 'help' || command === '--help') {
    console.log(helpText);
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    const pkg = require('../package.json');
    console.log(`napi-mvc v${pkg.version}`);
    process.exit(0);
  }

  if (command === 'generate' && action === 'route') {
    if (!modelName) {
      logger.error('Model name required: napi-mvc generate route <modelName>');
      process.exit(1);
    }
    try {
      await generator.generateRoute(modelName);
      logger.success(`✅ Route générée pour ${modelName}`);
    } catch (err) {
      logger.error(`❌ Erreur: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'register' && action === 'route') {
    if (!modelName) {
      logger.error('Model name required: napi-mvc register route <modelName>');
      process.exit(1);
    }
    try {
      await registrar.registerRoute(modelName);
      logger.success(`✅ Route enregistrée pour ${modelName}`);
    } catch (err) {
      logger.error(`❌ Erreur: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(helpText);
    process.exit(1);
  }
}

main();
