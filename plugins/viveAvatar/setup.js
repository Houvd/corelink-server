const fs = require('fs');

// destination.txt will be created or overwritten by default.
fs.copyFile('../../../lib/corelink.lib.js', 'corelink.lib.js', (err) => {
  if (err) throw err;
});
