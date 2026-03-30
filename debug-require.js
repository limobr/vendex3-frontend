// debug-require.js
const Module = require('module');
const originalRequire = Module.prototype.require;
const fs = require('fs');

Module.prototype.require = function(id) {
  if (id.includes('class-properties')) {
    console.log('REQUIRE CALLED FOR:', id);
    console.trace(); // Show stack trace
    fs.writeFileSync(
      'require-debug.log', 
      `Require called for: ${id}\nStack: ${new Error().stack}\n\n`,
      { flag: 'a' }
    );
  }
  return originalRequire.call(this, id);
};

// Then require your metro config
require('./metro.config.js');