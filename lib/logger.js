class Logger {
  constructor() {
    this.author = "napi-mvc";
    this.version = "2.0.0";
  }

  log(msg) {
    console.log(msg);
  }

  info(msg) {
    console.info(`ℹ️  ${msg}`);
  }

  error(msg) {
    console.error(`❌ ${msg}`);
  }

  success(msg) {
    console.log(`✅ ${msg}`);
  }

  warn(msg) {
    console.warn(`⚠️  ${msg}`);
  }

  debug(msg) {
    if (process.env.DEBUG) {
      console.log(`🐛 [DEBUG] ${msg}`);
    }
  }
}

module.exports = new Logger();
