import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { catalog, shipping } from '../catalog.mjs';

const docs = new URL('../docs/', import.meta.url);
mkdirSync(docs, { recursive:true });
const source = name => new URL('../public/' + name, import.meta.url);
const target = name => new URL(name, docs);
for (const name of ['app.js','style.css','voxmerch.png','pages-demo.js','hero-model.png','tote-showcase.png','hero-motion.js','three.module.min.js','three.core.min.js','montserrat-latin-wght-normal.woff2','three-LICENSE.txt','montserrat-OFL.txt']) cpSync(source(name),target(name));
const page = readFileSync(source('index.html'),'utf8')
  .replace('<script type="module" src="./app.js"></script>','<script type="module" src="./pages-demo.js"></script>')
  .replace('<main id="main"', '<div class="wrap notice" role="note">Interactive demo. Changes stay in this tab. Payments and fulfillment are simulated.</div>\n  <main id="main"')
  .replace('<a href="#admin">Operations</a>', '');
writeFileSync(target('index.html'),page);
writeFileSync(target('demo-config.js'),'export default ' + JSON.stringify({catalog,shipping,demo:true,pages:true,signedIn:true}) + ';\n');
writeFileSync(target('.nojekyll'),'');
