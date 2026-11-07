import { catalog, shipping } from './catalog.mjs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const folder = process.env.VOX_DATA || 'data';
mkdirSync(folder, { recursive: true });
const db = new DatabaseSync(folder + '/voxmerch.db');
db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE, secret TEXT);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT, expires INTEGER);
  CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, owner TEXT, published INTEGER, data TEXT);
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, owner TEXT, status TEXT, data TEXT);
`);

const demo = process.env.VOX_DEMO === '1';
const adminKey = process.env.VOX_ADMIN_KEY;
const paymentInstructions = process.env.VOX_PAYMENT_INSTRUCTIONS || '';
const assets = Object.fromEntries(Object.entries({
  '/':['index.html','text/html; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8'],
  '/style.css':['style.css','text/css; charset=utf-8'], '/voxmerch.png':['voxmerch.png','image/png'],
}).map(([url,[file,type]]) => [url,[readFileSync(new URL('./public/' + file, import.meta.url)),type]]));

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function check(condition, message, status) { if (!condition) fail(message, status); }
const run = (sql,...args) => db.prepare(sql).run(...args);
const one = (sql,...args) => db.prepare(sql).get(...args);
const many = (sql,...args) => db.prepare(sql).all(...args);
const unpack = row => ({ ...JSON.parse(row.data), id:row.id, status:row.status, published:Boolean(row.published) });
const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const hash = (password,salt) => scryptSync(password,salt,64).toString('hex');
const str = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 3_200_000) fail('File terlalu besar.',413);
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString()); } catch { fail('Data tidak valid.'); }
  check(data && typeof data === 'object' && !Array.isArray(data),'Data tidak valid.');
  return data;
}

function artwork(value) {
  const match = typeof value === 'string' && /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  check(match && match[2].length <= 2_796_204,'Unggah PNG atau JPG maksimal 2 MB.');
  const image = Buffer.from(match[2],'base64');
  const png = match[1] === 'png';
  check(png ? image.subarray(0,8).toString('hex') === '89504e470d0a1a0a' : image.subarray(0,3).toString('hex') === 'ffd8ff','Format gambar tidak valid.');
  return value;
}

function productFor(id,owner) {
  const row = one('SELECT * FROM products WHERE id=? AND (published=1 OR owner=?)',id,owner || '');
  check(row,'Produk tidak ditemukan.',404);
  return row;
}

function publicProduct(row) {
  const { art, preview, ...product } = unpack(row);
  return { ...product, art:preview };
}

async function api(req,path,query) {
  const method = req.method;
  const token = req.headers.cookie?.match(/(?:^|; )vox_session=([a-f0-9]+)/)?.[1] || '';
  const owner = one('SELECT owner FROM sessions WHERE token=? AND expires>?',token,Date.now())?.owner;
  if (method === 'GET' && path === '/api/config') return { catalog, shipping, demo, paymentInstructions, signedIn:!!owner };
  if (method === 'POST' && ['/api/register','/api/login'].includes(path)) {
    const input = await body(req);
    const email = str(input.email,254).toLowerCase();
    const password = input.password;
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && typeof password === 'string' && password.length >= 8 && password.length <= 128,'Gunakan email yang valid dan kata sandi 8–128 karakter.');
    let user = one('SELECT * FROM accounts WHERE email=?',email);
    if (path === '/api/register') {
      check(!user,'Email sudah terdaftar.',409);
      const salt = randomBytes(16).toString('hex');
      user = { id:randomUUID() };
      run('INSERT INTO accounts VALUES (?,?,?)',user.id,email,salt + ':' + hash(password,salt));
    } else {
      const [salt,digest] = user?.secret.split(':') || ['invalid',''];
      check(equal(hash(password,salt),digest),'Email atau kata sandi salah.',401);
    }
    const session = randomBytes(32).toString('hex');
    run('DELETE FROM sessions WHERE expires<=? OR token=?',Date.now(),token);
    run('INSERT INTO sessions VALUES (?,?,?)',session,user.id,Date.now()+604800000);
    return { cookie:'vox_session=' + session + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800', ok:true };
  }
  if (method === 'POST' && path === '/api/logout') {
    run('DELETE FROM sessions WHERE token=?',token);
    return { cookie:'vox_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',ok:true };
  }
  if (method === 'GET' && path === '/api/shop') return many('SELECT * FROM products WHERE published=1 ORDER BY rowid DESC').map(row => publicProduct(row));
  const productId = path.match(/^\/api\/products\/([a-f0-9-]+)$/)?.[1];
  if (method === 'GET' && productId) {
    if (query.get('edit') === '1') {
      check(owner,'Masuk untuk membuka studio.',401);
      const row = one('SELECT * FROM products WHERE id=? AND owner=?',productId,owner);
      check(row,'Produk tidak ditemukan.',404);
      return unpack(row);
    }
    return publicProduct(productFor(productId));
  }

  if (path === '/api/studio' || path === '/api/products' || (productId && method === 'PUT') || path === '/api/sample') {
    check(owner,'Masuk untuk membuka studio.',401);
    if (method === 'GET' && path === '/api/studio') {
      const orders = many('SELECT * FROM orders WHERE owner=? ORDER BY rowid DESC',owner).map(unpack);
      return {
        products:many('SELECT * FROM products WHERE owner=? ORDER BY rowid DESC',owner).map(unpack),
        orders:orders.map(({id,status,title,sample,earnings,tracking,total}) => ({id,status,title,sample,earnings,tracking,total})),
        earnings:orders.filter(order => order.status === 'Terkirim').reduce((total,order) => total + order.earnings,0),
      };
    }
    if ((method === 'POST' && path === '/api/products') || (method === 'PUT' && productId)) {
      const input = await body(req);
      const base = catalog.find(item => item.id === input.base);
      const name = str(input.name,80);
      check(base && name && Number.isSafeInteger(input.price) && input.price >= base.cost && input.price <= 10000000,'Periksa nama, produk dasar, dan harga jual.');
      check(base.colors.includes(input.color) && [input.x,input.y,input.scale].every(Number.isFinite) && input.scale >= 20 && input.scale <= 100 && input.x >= input.scale/2 && input.x <= 100-input.scale/2 && input.y >= input.scale/2 && input.y <= 100-input.scale/2,'Periksa warna dan posisi desain.');
      check(typeof input.preview === 'string' && input.preview.length <= 300000,'Pratinjau terlalu besar.');
      const data = JSON.stringify({
        name, base:base.id, cost:base.cost, description:str(input.description,500), price:input.price,
        art:artwork(input.art), preview:artwork(input.preview), color:input.color, x:input.x, y:input.y, scale:input.scale,
      });
      const id = productId || randomUUID();
      if (productId) {
        check(run('UPDATE products SET published=?,data=? WHERE id=? AND owner=?',Number(input.published === true),data,id,owner).changes,'Produk tidak ditemukan.',404);
      } else run('INSERT INTO products VALUES (?,?,?,?)',id,owner,Number(input.published === true),data);
      return { id };
    }
  }

  if (method === 'POST' && ['/api/orders','/api/sample'].includes(path)) {
    const input = await body(req);
    const sample = path === '/api/sample';
    const row = productFor(str(input.product,40),sample ? owner : null);
    check(!sample || row.owner === owner,'Produk tidak ditemukan.',404);
    const product = unpack(row);
    const base = catalog.find(item => item.id === product.base);
    const name = str(input.name,100), email = str(input.email,254), address = str(input.address,500);
    check(name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && address.length >= 10,'Lengkapi nama, email, dan alamat pengiriman.');
    check(base.sizes.includes(input.size) && base.colors.includes(input.color) && Number.isInteger(input.qty) && input.qty >= 1 && input.qty <= 20,'Pilih varian dan jumlah yang valid.');
    const id = randomUUID();
    const unit = sample ? product.cost : product.price;
    const total = unit*input.qty + shipping;
    const data = {
      name,email,address,total,sample, title:product.name, product:product.id,
      size:input.size,color:input.color,qty:input.qty,shipping,
      artwork:product.art,placement:{x:product.x,y:product.y,scale:product.scale},base:product.base,
      earnings:sample ? 0 : (unit-product.cost)*input.qty, tracking:'',
    };
    run('INSERT INTO orders VALUES (?,?,?,?)',id,row.owner,'Menunggu pembayaran',JSON.stringify(data));
    return { id,total };
  }

  const orderId = path.match(/^\/api\/orders\/([a-f0-9-]+)(?:\/(pay))?$/);
  if (orderId && method === 'GET' && !orderId[2]) {
    const row = one('SELECT * FROM orders WHERE id=?',orderId[1]);
    check(row,'Pesanan tidak ditemukan.',404);
    const { id,status,title,total,tracking,sample } = unpack(row);
    return { id,status,title,total,tracking,sample };
  }
  if (orderId?.[2] && method === 'POST') {
    check(demo,'Simulasi pembayaran dinonaktifkan.',403);
    check(run("UPDATE orders SET status='Dibayar' WHERE id=? AND status='Menunggu pembayaran'",orderId[1]).changes,'Pesanan tidak bisa dibayar.',409);
    return {ok:true};
  }

  if (path.startsWith('/api/admin/')) {
    check(adminKey && adminKey.length >= 16 && equal(req.headers.authorization,'Bearer ' + adminKey),'Kunci admin salah atau belum diatur.',401);
    if (method === 'GET' && path === '/api/admin/orders') return many('SELECT * FROM orders ORDER BY rowid DESC').map(unpack);
    const id = path.match(/^\/api\/admin\/orders\/([a-f0-9-]+)$/)?.[1];
    if (method === 'PUT' && id) {
      const input = await body(req);
      const row = one('SELECT * FROM orders WHERE id=?',id);
      check(row,'Pesanan tidak ditemukan.',404);
      const transitions = {
        'Menunggu pembayaran':['Dibayar','Dibatalkan'], Dibayar:['Diproduksi','Dibatalkan'],
        Diproduksi:['Dikirim','Perlu ditangani'], Dikirim:['Terkirim','Perlu ditangani'],
        Terkirim:['Perlu ditangani'], 'Perlu ditangani':['Diproduksi','Dibatalkan'],
      };
      check(transitions[row.status]?.includes(input.status),'Perubahan status tidak diizinkan.',409);
      const data = JSON.parse(row.data);
      if (input.status === 'Diproduksi') data.tracking = '';
      if (input.status === 'Dikirim') {
        data.tracking = str(input.tracking,100);
        check(data.tracking,'Masukkan nomor resi.');
      }
      check(run('UPDATE orders SET status=?,data=? WHERE id=? AND status=?',input.status,JSON.stringify(data),id,row.status).changes,'Pesanan sudah diperbarui. Muat ulang.',409);
      return {ok:true};
    }
  }
  fail('Halaman tidak ditemukan.',404);
}

const server = createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'");
  try {
    const url = new URL(req.url,'http://localhost');
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      if (!['GET','HEAD'].includes(req.method) && req.headers['sec-fetch-site'] === 'cross-site') fail('Permintaan ditolak.',403);
      const result = await api(req,path,url.searchParams);
      if (result?.cookie) {
        res.setHeader('Set-Cookie',result.cookie + (process.env.VOX_HTTPS === '1' ? '; Secure' : ''));
        delete result.cookie;
      }
      return res.end(JSON.stringify(result));
    }
    const asset = assets[path];
    if (!asset || req.method !== 'GET') { res.writeHead(404); return res.end('Halaman tidak ditemukan.'); }
    res.writeHead(200,{'Content-Type':asset[1]});
    res.end(asset[0]);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.headersSent) res.writeHead(error.status || 500,{'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({error:error.status ? error.message : 'Terjadi kesalahan pada server.'}));
  }
});
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',() => console.log('Voxmerch http://' + server.address().address + ':' + server.address().port));
