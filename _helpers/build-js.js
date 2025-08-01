// Bundle and minify the site's JavaScript using esbuild. The resulting file is
// written to the public assets directory.

import { build } from 'esbuild';
import { join } from 'path';

// Path to the main browser script.
const entry = join('scripts', 'main.js');
// Destination for the bundled file that will be loaded by the site.
const outfile = join('public', 'assets', 'scripts', 'bundle.js');

// Run esbuild with a simple configuration. If an error occurs, log it and exit
// with a failure code so CI or the terminal knows something went wrong.
build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
