import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { catalog, shipping } from '../catalog.mjs';

const docs = new URL('../docs/', import.meta.url);
mkdirSync(docs, { recursive:true });
const source = name => new URL('../public/' + name, import.meta.url);
const target = name => new URL(name, docs);
for (const name of ['app.js','style.css','voxmerch.png','pages-demo.js','hero-model.png','tote-showcase.png','hero-motion.js','three.module.min.js','three.core.min.js','montserrat-latin-wght-normal.woff2','three-LICENSE.txt','montserrat-OFL.txt']) cpSync(source(name),target(name));
// Give browsers a new URL when the styles or demo entry point changes.
const version = createHash('sha256')
  .update(readFileSync(source('style.css')))
  .update(readFileSync(source('app.js')))
  .update(readFileSync(source('pages-demo.js')))
  .digest('hex').slice(0, 12);
const demo = readFileSync(source('pages-demo.js'), 'utf8')
  .replace("'./app.js'", `'./app.js?v=${version}'`);
writeFileSync(target('pages-demo.js'), demo);
const page = readFileSync(source('index.html'),'utf8')
  .replace('./style.css', `./style.css?v=${version}`)
  .replace('./app.js', `./pages-demo.js?v=${version}`)
  .replace('<main id="main"', '<div class="wrap notice" role="note">Interactive demo. Changes stay in this tab. Payments and fulfillment are simulated.</div>\n  <main id="main"')
  .replace('<a href="#admin">Operations</a>', '');
writeFileSync(target('index.html'),page);
writeFileSync(target('demo-config.js'),'export default ' + JSON.stringify({catalog,shipping,demo:true,pages:true,signedIn:true}) + ';\n');
writeFileSync(target('.nojekyll'),'');
