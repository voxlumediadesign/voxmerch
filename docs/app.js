const main = document.querySelector('main');
const currency = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const rp = amount => currency.format(amount);
const esc = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const options = (items,selected) => items.map(item => `<option ${item === selected ? 'selected' : ''}>${esc(item)}</option>`).join('');
const intro = (tag,title,desc) => `<section class="intro"><div class="eyebrow">${tag}</div><h1>${title}</h1><p>${desc}</p></section>`;
const field = (label,name,attrs='',value='') => `<label>${label}<input name="${name}" ${attrs} value="${esc(value)}"></label>`;
const link = (url,label,style='') => `<a class="button ${style}" href="#${url}">${label}</a>`;
let config;
let adminKey = '';
let revision = 0;

let api = serverApi;
async function serverApi(path,method='GET',data,admin=false) {
  const headers = {};
  if (data) headers['Content-Type'] = 'application/json';
  if (admin) headers.Authorization = 'Bearer ' + adminKey;
  const response = await fetch('/api/' + path,{method,headers,body:data ? JSON.stringify(data) : undefined});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
function form(id,handler) {
  const element = document.getElementById(id);
  element.addEventListener('submit',async event => {
    event.preventDefault();
    const button = event.submitter;
    const note = element.querySelector('.form-note');
    if (button) button.disabled = true;
    note.textContent = '';
    try { await handler(Object.fromEntries(new FormData(element)),button); }
    catch(error) { note.textContent = error.message; }
    finally { if (button) button.disabled = false; }
  });
}
const errorNote = '<p class="form-note error" role="alert"></p>';

function mock(base,color,product={},outline=false) {
  const tote = base === 'tote';
  const fill = color === 'Hitam' ? '#263145' : color === 'Natural' ? '#e8d6b4' : '#fff';
  const shape = tote
    ? '<path d="M76 116V84a54 54 0 0 1 108 0v32" fill="none" stroke="currentColor" stroke-width="17"/><path d="M43 107h174l-12 137H55z" fill="currentColor" stroke="#6b7484" stroke-opacity=".35"/>'
    : '<path d="M97 32q33 32 66 0l30 8 56 43-35 44-27-19v124H73V108l-27 19-35-44 56-43z" fill="currentColor" stroke="#6b7484" stroke-opacity=".35"/><path d="M97 32q33 32 66 0" fill="none" stroke="#6b7484" stroke-opacity=".35" stroke-width="3"/>';
  const image = product.art ? `<img alt="" src="${esc(product.art)}" style="width:${Number(product.scale ?? 70)}%;left:${Number(product.x ?? 50)}%;top:${Number(product.y ?? 50)}%">` : '';
  return `<div class="mock ${outline ? 'outlined' : ''}" role="img" aria-label="Pratinjau ${tote ? 'tote bag' : 'kaos'} ${esc(color)}"><div class="garment ${tote ? 'tote' : ''}" style="color:${fill}"><svg aria-hidden="true" viewBox="0 0 260 260">${shape}</svg><div class="print-zone">${image}</div></div></div>`;
}


const steps = [
  ['Pilih produk','Pilih media cetak, bandingkan harga dasar, dan cek varian yang tersedia.'],
  ['Tambahkan desain','Unggah artwork, atur posisinya di Product Creator, lalu cek mockup.'],
  ['Terbitkan dan jual','Tetapkan harga dan bagikan tautan produk dari etalase Anda.'],
  ['Cetak dan kirim','Pesanan yang dibayar diteruskan ke produksi. Pantau status dan resi dari dashboard.'],
];
const productCards = items => items.map(base => `<article class="card catalog-card"><a class="media-link" href="#base/${base.id}">${mock(base.id,base.colors[0])}<span class="sr-only">Lihat ${base.name}</span></a><div class="card-content"><span class="eyebrow">${base.id === 'tee' ? 'Pakaian' : 'Aksesori'}</span><h3><a href="#base/${base.id}">${base.name}</a></h3><p>${base.colors.length} warna · ${base.sizes.length} pilihan ukuran</p><strong>Mulai ${rp(base.cost)}</strong></div></article>`).join('');
const stepCards = () => `<div class="grid steps">${steps.map(([title,desc],i)=>`<article class="card"><div class="number">0${i+1}</div><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div>`;

function home() {
  main.innerHTML = `<section class="hero"><div><div class="eyebrow">Studio print-on-demand</div><h1>Buat dan jual merch custom.</h1><p>Mulai dari satu desain. Pilih produknya, tetapkan harga, dan cetak setiap kali pesanan masuk.</p><div class="actions">${link('catalog','Mulai desain <span aria-hidden="true">↗</span>')}${link('how','Cara kerja','secondary')}</div></div><div class="visual"><div class="mock-main">${mock('tee','Putih',{art:'./voxmerch.png',scale:92})}</div><div class="mock-inset">${mock('tote','Natural',{art:'./voxmerch.png',scale:90})}</div><span class="visual-caption">PRATINJAU / KOLEKSI DASAR</span></div></section>
    <section class="section"><div class="eyebrow">Dari ide ke etalase</div><h2>Mulai dalam empat langkah</h2>${stepCards()}</section>
    <section class="section"><div class="row"><h2>Temukan produk untuk desainmu</h2>${link('catalog','Lihat katalog','secondary')}</div><div class="grid">${productCards(config.catalog)}</div></section>
    <section class="section card calculator columns"><div><div class="eyebrow">Kalkulator margin</div><h2>Berapa potensi marginmu?</h2><p>Hitung dari harga jual dan biaya dasar. Estimasi 30 hari sebelum ongkir, pajak, dan biaya tambahan.</p><output id="estimate" for="calc-product calc-price calc-sales" class="estimate" aria-live="polite"></output></div><form class="stack" id="calculator"><label>Produk dasar<select id="calc-product">${config.catalog.map(base => `<option value="${base.id}">${base.name}</option>`).join('')}</select></label><label>Harga jual (Rp)<input id="calc-price" type="number" min="0" max="10000000" value="99000"></label><label>Penjualan per hari<input id="calc-sales" type="number" min="0" max="10000" value="1"></label></form></section>`;
  const calc = document.querySelector('#calculator');
  const estimate = () => {
    const base = config.catalog.find(item => item.id === calc.elements['calc-product'].value);
    const price = calc.elements['calc-price'].valueAsNumber;
    const sales = calc.elements['calc-sales'].valueAsNumber;
    const output = document.querySelector('#estimate');
    output.textContent = calc.checkValidity() && Number.isFinite(price) && Number.isFinite(sales) ? rp((price-base.cost)*sales*30) : '—';
  };
  calc.addEventListener('input',estimate);
  calc.addEventListener('submit',event => event.preventDefault());
  estimate();
}
function how() {
  main.innerHTML = intro('Print-on-demand','Cara kerja Voxmerch','Dari memilih produk dasar hingga mengirim pesanan pertama.') + stepCards() + `<div class="section actions">${link('catalog','Pilih produk')}${link('studio','Buka dashboard','secondary')}</div>`;
}
function catalog() {
  main.innerHTML = intro('Katalog produk','Produk dasar','Pilih produk, cek varian dan area cetak, lalu buka Product Creator.') + `<div class="catalog-layout"><aside class="card stack"><label>Cari produk<input id="catalog-search" type="search" placeholder="Kaos, tote…"></label><label>Kategori<select id="catalog-category"><option value="">Semua produk</option><option value="tee">Pakaian</option><option value="tote">Aksesori</option></select></label></aside><section><p id="catalog-count" role="status"></p><div class="grid" id="catalog-results"></div></section></div>`;
  const search = document.querySelector('#catalog-search');
  const category = document.querySelector('#catalog-category');
  const filter = () => {
    const items = config.catalog.filter(item => (!category.value || item.id === category.value) && (item.name + ' ' + item.detail).toLowerCase().includes(search.value.trim().toLowerCase()));
    document.querySelector('#catalog-count').textContent = items.length + ' produk';
    document.querySelector('#catalog-results').innerHTML = productCards(items) || '<p>Tidak ada hasil. Coba kata kunci lain.</p>';
  };
  search.addEventListener('input',filter);
  category.addEventListener('change',filter);
  filter();
}
function baseDetails(base) {
  main.innerHTML = `<p><a href="#catalog">← Kembali ke katalog</a></p>` + intro('Produk dasar',base.name,base.detail) + `<div class="columns"><div id="base-preview">${mock(base.id,base.colors[0],{},true)}</div><section class="card stack"><h2>Spesifikasi produksi</h2><div class="row"><span>Biaya dasar</span><strong>${rp(base.cost)}</strong></div><div class="row"><span>Ukuran</span><strong>${base.sizes.join(', ')}</strong></div><div class="row"><span>Area cetak</span><strong>${base.id === 'tee' ? 'Depan' : 'Satu sisi'}</strong></div><label>Warna pratinjau<select id="base-color">${options(base.colors)}</select></label><div class="actions">${link('edit/' + base.id,'Mulai desain')}</div></section></div>`;
  document.querySelector('#base-color').onchange = event => {
    document.querySelector('#base-preview').innerHTML = mock(base.id,event.target.value,{},true);
  };
}
function auth(next) {
  main.innerHTML = intro('Akun kreator','Masuk ke studio','Kelola desain, produk, sampel, dan pesanan Anda.') + `<form id="auth" class="card stack narrow">${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}${field('Kata sandi','password','type="password" required minlength="8" maxlength="128"')}<div class="actions"><button value="login">Masuk</button><button class="secondary" value="register">Buat akun</button></div>${errorNote}</form>`;
  form('auth',async (data,button) => { await api(button?.value || 'login','POST',data); config.signedIn = true; if (location.hash === '#' + next) render(); else location.hash = next; });
}
function studio(result,showOrders) {
  main.innerHTML = intro('Dashboard kreator',showOrders ? 'Pesanan' : 'Produk saya',showOrders ? 'Pantau pesanan penjualan dan sampel.' : 'Kelola draf dan tautan penjualan dari satu tempat.') + `<nav class="studio-nav" aria-label="Dashboard"><a href="#studio" ${showOrders ? '' : 'aria-current="page"'}>Produk saya</a><a href="#merchant-orders" ${showOrders ? 'aria-current="page"' : ''}>Pesanan</a><a href="#catalog">Katalog</a></nav><div class="actions">${link('catalog','Buat produk')}${config.pages ? '' : '<button id="logout" class="secondary">Keluar</button>'}</div>
    <section class="section" ${showOrders ? 'hidden' : ''}><h2>Produk</h2><div class="grid">${result.products.map(product => `<article class="card">${mock(product.base,product.color,product)}<span class="chip">${product.published ? 'Terbit' : 'Draf'}</span><h3>${esc(product.name)}</h3><p>${rp(product.price)}</p><div class="actions">${link('edit/' + product.id,'Edit','secondary')}${link('sample/' + product.id,'Pesan sampel','secondary')}${product.published ? link('p/' + product.id,'Buka etalase','secondary') : ''}</div></article>`).join('') || '<p>Produk yang Anda simpan akan muncul di sini.</p>'}</div></section>
    <section class="section" ${showOrders ? '' : 'hidden'}><h2>Pesanan</h2><p>Estimasi margin pesanan terkirim <strong>${rp(result.earnings)}</strong></p><div class="card stack">${result.orders.map(order=>`<div class="row"><div><strong>${esc(order.title)}</strong> ${order.sample ? '(sampel)' : ''}<br><small>${esc(order.status)} · ${rp(order.total)} · Margin ${rp(order.earnings)}</small></div>${link('order/' + order.id,'Detail','secondary')}</div>`).join('') || '<p>Belum ada pesanan.</p>'}</div></section>`;
  if (config.pages) return;
  document.getElementById('logout').onclick = async () => { await api('logout','POST'); config.signedIn = false; location.hash = 'home'; };
}

function editor(base,product) {
  const initial = product || {color:base.colors[0],x:50,y:50,scale:70,price:base.cost+30000};
  let art = initial.art || '';
  let artworkPreview = initial.preview || '';
  main.innerHTML = intro('Product Creator',base.name,'Tambahkan artwork, atur area cetak, lalu simpan draf atau terbitkan.') + `<div class="columns"><section class="card"><div id="preview"></div><p>Geser desain dalam area bergaris, atau gunakan kontrol posisi. Pratinjau berbentuk ilustrasi.</p></section><form id="editor" class="card stack">
  ${field('Nama produk','name','required maxlength="80"',initial.name)}
  <label>Deskripsi<textarea name="description" maxlength="500" rows="3">${esc(initial.description)}</textarea></label>
  <label>Warna pratinjau<select name="color">${options(base.colors,initial.color)}</select></label>
  <label>Desain PNG atau JPG, maksimal 2 MB<input name="art" type="file" accept="image/png,image/jpeg"></label><p id="file-state" aria-live="polite">${art ? 'Desain tersimpan.' : ''}</p>
  ${field('Ukuran desain','scale','type="range" min="20" max="100"',initial.scale)}
  ${field('Posisi horizontal','x','type="range"',initial.x)}
  ${field('Posisi vertikal','y','type="range"',initial.y)}
  ${field('Harga jual (Rp)','price',`type="number" min="${base.cost}" max="10000000" required`,initial.price)}
  <p>Biaya dasar ${rp(base.cost)} · Estimasi margin <strong id="margin"></strong></p>
  <div class="actions"><button class="secondary" value="draft">Simpan draf</button><button value="publish">Terbitkan</button></div>${errorNote}</form></div>`;
  const editorForm = document.getElementById('editor');
  const fields = editorForm.elements;
  const placement = () => ({x:Number(fields.x.value),y:Number(fields.y.value),scale:Number(fields.scale.value)});
  function preview() {
    const half = Math.ceil(Number(fields.scale.value)/2);
    for (const axis of [fields.x,fields.y]) { axis.min = half; axis.max = 100-half; }
    document.getElementById('preview').innerHTML = mock(base.id,fields.color.value,{...placement(),art},true);
    document.getElementById('margin').textContent = rp(Number(fields.price.value)-base.cost);
  }
  editorForm.addEventListener('input',preview);
  const surface = document.getElementById('preview');
  let drag;
  surface.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0 || !event.target.matches('.print-zone img')) return;
    const image = event.target;
    const rect = image.parentElement.getBoundingClientRect();
    drag = { id:event.pointerId, image, rect, x:event.clientX, y:event.clientY, origin:placement() };
    surface.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  surface.addEventListener('pointermove',event => {
    if (drag?.id !== event.pointerId) return;
    const x = drag.origin.x + (event.clientX-drag.x)*100/drag.rect.width;
    const y = drag.origin.y + (event.clientY-drag.y)*100/drag.rect.height;
    for (const [field,value] of [[fields.x,x],[fields.y,y]]) {
      field.value = Math.max(Number(field.min),Math.min(Number(field.max),Math.round(value)));
    }
    drag.image.style.left = fields.x.value + '%';
    drag.image.style.top = fields.y.value + '%';
  });
  surface.addEventListener('lostpointercapture',() => { drag = undefined; });
  let pending;
  fields.art.addEventListener('change',() => {
    const file = fields.art.files[0];
    if (!file) return;
    const state = document.getElementById('file-state');
    const upload = (async () => {
      await Promise.resolve();
      try {
        if (!['image/png','image/jpeg'].includes(file.type) || file.size > 2097152) throw new Error('Pilih PNG atau JPG maksimal 2 MB.');
        const url = await new Promise((resolve,reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('File gagal dibaca.'));
          reader.readAsDataURL(file);
        });
        const image = new Image();
        image.src = url;
        await image.decode();
        if (pending !== upload) return;
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1,300 / Math.max(image.naturalWidth,image.naturalHeight));
        canvas.width = Math.max(1,Math.round(image.naturalWidth*ratio));
        canvas.height = Math.max(1,Math.round(image.naturalHeight*ratio));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        artworkPreview = canvas.toDataURL('image/png');
        if (artworkPreview.length > 300000) {
          canvas.width = Math.max(1,Math.round(canvas.width/2));
          canvas.height = Math.max(1,Math.round(canvas.height/2));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          artworkPreview = canvas.toDataURL('image/png');
        }
        art = url;
        state.textContent = `${image.naturalWidth} × ${image.naturalHeight} px · Periksa ketajaman lewat sampel.`;
        preview();
      } catch(error) {
        if (pending !== upload) return;
        art = '';
        state.textContent = error.message;
        preview();
      }
    })();
    pending = upload;
  });
  preview();
  form('editor',async (values,button) => {
    await pending;
    if (!art) throw new Error('Unggah desain sebelum menyimpan.');
    const published = button?.value === 'publish';
    const saved = await api(product ? 'products/' + product.id : 'products',product ? 'PUT' : 'POST',{
      base:base.id,name:values.name,description:values.description,color:values.color,price:Number(values.price),art,preview:artworkPreview,...placement(),published,
    });
    location.hash = published ? 'p/' + saved.id : 'studio';
  });
}
function shop(products) {
  main.innerHTML = intro('Etalase','Merch siap dipesan','Jelajahi produk yang diterbitkan kreator Voxmerch.') + `<div class="grid">${products.map(product=>`<article class="card">${mock(product.base,product.color,product)}<h2>${esc(product.name)}</h2><p class="price">${rp(product.price)}</p>${link('p/' + product.id,'Lihat produk')}</article>`).join('') || '<p>Belum ada produk terbit.</p>'}</div>`;
}

function checkout(product,sample) {
  const base = config.catalog.find(item => item.id === product.base);
  const unit = sample ? product.cost : product.price;
  main.innerHTML = intro(sample ? 'Pesan sampel' : 'Etalase Voxmerch',esc(product.name),esc(product.description || base.detail)) + `<div class="columns"><section class="card"><div id="product-preview"></div><div class="row"><strong class="price">${rp(unit)}</strong>${sample ? '<span class="chip">Harga sampel</span>' : config.pages ? '' : '<button id="copy" class="secondary">Salin tautan</button>'}</div><p id="copy-state" role="status"></p></section>
  <form id="checkout" class="card stack"><h2>Pengiriman</h2><div class="variant"><label>Ukuran<select name="size">${options(base.sizes)}</select></label><label>Warna<select name="color">${options(base.colors,product.color)}</select></label>${field('Jumlah','qty','type="number" min="1" max="20" required',1)}</div>
  ${config.pages ? '<p>Alamat contoh digunakan untuk simulasi.</p>' : `${field('Nama penerima','name','required maxlength="100" autocomplete="name"')}
  ${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}
  <label>Alamat lengkap<textarea name="address" required minlength="10" maxlength="500" rows="3" autocomplete="street-address"></textarea></label>`}
  <div class="row"><span>Ongkir pilot</span><span>${rp(config.shipping)}</span></div>
  <div class="row"><strong>Total</strong><strong id="total"></strong></div>
  <p>${config.demo ? 'Mode demo · pembayaran dapat disimulasikan.' : 'Pembayaran diverifikasi secara manual oleh operator Voxmerch.'}</p>
  <button>Buat pesanan</button>${errorNote}</form></div>`;
  const checkoutForm = document.getElementById('checkout');
  const fields = checkoutForm.elements;
  function preview() {
    document.getElementById('product-preview').innerHTML = mock(base.id,fields.color.value,product);
    document.getElementById('total').textContent = rp(unit*(Number(fields.qty.value) || 1)+config.shipping);
  }
  fields.color.onchange = preview;
  fields.qty.oninput = preview;
  preview();
  if (!sample && !config.pages) document.getElementById('copy').onclick = async () => {
    const state = document.getElementById('copy-state');
    try { await navigator.clipboard.writeText(location.href); state.textContent = 'Tautan disalin.'; }
    catch { state.textContent = 'Salin alamat dari bilah alamat browser.'; }
  };
  form('checkout',async values => {
    const result = await api(sample ? 'sample' : 'orders','POST',{...values,qty:Number(values.qty),product:product.id});
    location.hash = 'order/' + result.id;
  });
}

function track() {
  main.innerHTML = intro('Pelacakan','Lacak pesanan','Gunakan kode yang muncul setelah pesanan dibuat.') + `<form id="track" class="card stack narrow">${field('Kode pesanan','id','required maxlength="36"')}<button>Lacak</button>${errorNote}</form>`;
  form('track',async values => { location.hash = 'order/' + encodeURIComponent(values.id.trim()); });
}
function tracking(order) {
  main.innerHTML = intro('Pesanan',esc(order.title),order.sample ? 'Pesanan sampel' : 'Pesanan pembelian') + `<section class="card stack narrow"><div class="row"><span class="chip">${esc(order.status)}</span><strong>${rp(order.total)}</strong></div><div><strong>Kode pesanan</strong><p class="break">${esc(order.id)}</p></div>${order.tracking ? `<div><strong>Nomor resi</strong><p class="break">${esc(order.tracking)}</p></div>` : ''}${order.status === 'Menunggu pembayaran' ? config.demo ? `<form id="pay" class="stack"><button>Simulasikan pembayaran</button>${errorNote}</form>` : ("<p>" + esc(config.paymentInstructions || "Simpan kode pesanan dan hubungi operator Voxmerch untuk mengatur pembayaran.") + "</p>") : ''}</section>`;
  if (document.getElementById('pay')) form('pay',async () => { await api('orders/' + order.id + '/pay','POST'); render(); });
}
const transitions = {
  'Menunggu pembayaran':['Dibayar','Dibatalkan'], Dibayar:['Diproduksi','Dibatalkan'],
  Diproduksi:['Dikirim','Perlu ditangani'], Dikirim:['Terkirim','Perlu ditangani'],
  Terkirim:['Perlu ditangani'], 'Perlu ditangani':['Diproduksi','Dibatalkan'],
};
function admin(orders) {
  main.innerHTML = intro('Operasional','Antrean produksi','Periksa pembayaran, unduh artwork, lalu perbarui status dan resi.') +
    `<div class="actions"><button id="admin-out" class="secondary">Tutup akses admin</button></div><div class="section stack">${orders.map(order => `<article class="card stack"><div class="row"><h2>${esc(order.title)} ${order.sample ? '(sampel)' : ''}</h2><span class="chip">${esc(order.status)}</span></div>
    <p class="break">${esc(order.id)} · ${rp(order.total)}<br>${esc(order.name)} · ${esc(order.email)}<br>${esc(order.address)}<br>${esc(order.size)} · ${esc(order.color)} · ${order.qty} unit${order.tracking ? '<br>Resi ' + esc(order.tracking) : ''}</p>
    <div class="actions"><a class="button secondary" download="artwork-${order.id}.${order.artwork.startsWith('data:image/png') ? 'png' : 'jpg'}" href="${esc(order.artwork)}">Unduh artwork</a><small>Posisi X ${order.placement.x}% · Y ${order.placement.y}% · Skala ${order.placement.scale}%</small></div>
    ${transitions[order.status] ? `<form class="stack narrow" id="admin-${order.id}"><label>Status berikutnya<select name="status">${options(transitions[order.status])}</select></label>${field('Nomor resi saat dikirim','tracking','maxlength="100"')}<button>Simpan status</button>${errorNote}</form>` : ''}</article>`).join('') || '<p>Belum ada pesanan.</p>'}</div>`;
  document.getElementById('admin-out').onclick = () => { adminKey = ''; render(); };
  for (const order of orders) {
    const id = 'admin-' + order.id;
    if (document.getElementById(id)) form(id,async values => { await api('admin/orders/' + order.id,'PUT',values,true); render(); });
  }
}
function adminAuth() {
  main.innerHTML = intro('Operasional','Akses admin','Gunakan kunci operasional dari konfigurasi server.') + `<form class="card stack narrow" id="admin-auth">${field('Kunci admin','key','type="password" required')}<button>Buka antrean</button>${errorNote}</form>`;
  form('admin-auth',async values => {
    adminKey = values.key;
    try { await api('admin/orders','GET',null,true); } catch (error) { adminKey = ''; throw error; }
    render();
  });
}

async function render() {
  const route = location.hash.slice(1) || 'home';
  const [page,id] = route.split('/');
  if (page === 'main') return;
  const request = ++revision;
  const current = () => request === revision;
  for (const anchor of document.querySelectorAll('nav a')) {
    if (anchor.hash === '#' + page) anchor.setAttribute('aria-current','page');
    else anchor.removeAttribute('aria-current');
  }
  main.innerHTML = '<p role="status">Memuat…</p>';
  try {
    config = await api('config');
    if (!current()) return;
    if (['studio','merchant-orders','edit','sample'].includes(page) && !config.signedIn) return auth(route);
    if (page === 'home') return home();
    if (page === 'catalog') return catalog();
    if (page === 'how') return how();
    if (page === 'base') {
      const base = config.catalog.find(item => item.id === id);
      if (!base) throw new Error('Produk dasar tidak ditemukan.');
      return baseDetails(base);
    }
    if (page === 'track') return track();
    if (page === 'admin' && !adminKey) return adminAuth();
    if (page === 'edit') {
      const base = config.catalog.find(item => item.id === id);
      if (base) return editor(base);
    }
    if (page === 'studio' || page === 'merchant-orders') {
      const data = await api('studio'); if (current()) studio(data,page === 'merchant-orders');
    } else if (page === 'shop') {
      const data = await api('shop'); if (current()) shop(data);
    } else if (['edit','p','sample'].includes(page)) {
      const data = await api('products/' + encodeURIComponent(id || '') + (page === 'p' ? '' : '?edit=1'));
      if (current()) {
        if (page === 'edit') editor(config.catalog.find(item => item.id === data.base),data);
        else checkout(data,page === 'sample');
      }
    } else if (page === 'order') {
      const data = await api('orders/' + encodeURIComponent(id || '')); if (current()) tracking(data);
    } else if (page === 'admin') {
      const data = await api('admin/orders','GET',null,true); if (current()) admin(data);
    } else throw new Error('Halaman tidak ditemukan.');
  } catch(error) {
    if (current()) main.innerHTML = intro('Voxmerch','Halaman tidak dapat dibuka',esc(error.message)) + link('home','Ke beranda');
  }
}
export function start(adapter = serverApi) {
  api = adapter;
  window.addEventListener('hashchange',() => { if (location.hash !== '#main') { render(); main.focus(); } });
  render();
}

if (document.querySelector('script[src="./app.js"]')) start();
