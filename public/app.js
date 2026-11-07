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

async function api(path,method='GET',data,admin=false) {
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

function home() {
  main.innerHTML = `<section class="hero"><div><div class="eyebrow">Print on demand untuk kreator</div><h1>Merch dari idemu.</h1><p>Buat desain, bagikan produk, dan cetak saat pesanan masuk.</p><div class="actions">${link('studio','Buat merch')}${link('catalog','Lihat produk dasar','secondary')}</div></div><div class="visual">${mock('tee','Putih',{art:'/voxmerch.png',scale:95})}</div></section>
  <section class="section"><div class="eyebrow">Cara kerja</div><h2>Dari desain ke pesanan</h2><div class="grid">${[['Pilih produk','Pilih kaos atau tote dan cek biaya dasarnya.'],['Siapkan desain','Unggah artwork dan cek penempatannya pada mockup.'],['Mulai jual','Terbitkan produk, bagikan tautannya, dan pantau pesanan.']].map(([title,desc],index)=>`<article class="card"><div class="number">0${index+1}</div><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div></section>`;
}
function catalog() {
  main.innerHTML = intro('Katalog dasar','Pilih media cetak','Lihat varian dan biaya produksi sebelum membuka editor.') + `<div class="grid">${config.catalog.map(base => `<article class="card">${mock(base.id,base.colors[0])}<h2>${base.name}</h2><p>${base.detail}</p><p>${base.colors.join(' / ')} · ${base.sizes.join(', ')}</p><p class="price">Mulai ${rp(base.cost)}</p>${link('edit/' + base.id,'Desain produk')}</article>`).join('')}</div>`;
}
function auth(next) {
  main.innerHTML = intro('Akun kreator','Masuk ke studio','Kelola desain, produk, sampel, dan pesanan Anda.') + `<form id="auth" class="card stack narrow">${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}${field('Kata sandi','password','type="password" required minlength="8" maxlength="128"')}<div class="actions"><button value="login">Masuk</button><button class="secondary" value="register">Buat akun</button></div>${errorNote}</form>`;
  form('auth',async (data,button) => { await api(button?.value || 'login','POST',data); config.signedIn = true; if (location.hash === '#' + next) render(); else location.hash = next; });
}
function studio(result) {
  main.innerHTML = intro('Studio kreator','Produk saya','Kelola draf dan tautan penjualan dari satu tempat.') + `<div class="actions">${link('catalog','Buat produk')}<button id="logout" class="secondary">Keluar</button></div>
    <section class="section"><h2>Produk</h2><div class="grid">${result.products.map(product => `<article class="card">${mock(product.base,product.color,product)}<span class="chip">${product.published ? 'Terbit' : 'Draf'}</span><h3>${esc(product.name)}</h3><p>${rp(product.price)}</p><div class="actions">${link('edit/' + product.id,'Edit','secondary')}${link('sample/' + product.id,'Pesan sampel','secondary')}${product.published ? link('p/' + product.id,'Buka etalase','secondary') : ''}</div></article>`).join('') || '<p>Produk yang Anda simpan akan muncul di sini.</p>'}</div></section>
    <section class="section"><h2>Pesanan</h2><p>Estimasi margin pesanan terkirim <strong>${rp(result.earnings)}</strong></p><div class="card stack">${result.orders.map(order=>`<div class="row"><div><strong>${esc(order.title)}</strong> ${order.sample ? '(sampel)' : ''}<br><small>${esc(order.status)} · ${rp(order.total)} · Margin ${rp(order.earnings)}</small></div>${link('order/' + order.id,'Detail','secondary')}</div>`).join('') || '<p>Belum ada pesanan.</p>'}</div></section>`;
  document.getElementById('logout').onclick = async () => { await api('logout','POST'); config.signedIn = false; location.hash = 'home'; };
}

function editor(base,product) {
  const initial = product || {color:base.colors[0],x:50,y:50,scale:70,price:base.cost+30000};
  let art = initial.art || '';
  let artworkPreview = initial.preview || '';
  main.innerHTML = intro('Editor produk',base.name,'Atur desain di dalam area cetak, lalu simpan draf atau terbitkan.') + `<div class="columns"><section class="card"><div id="preview"></div><p>Area bergaris menunjukkan batas cetak. Pratinjau berbentuk ilustrasi.</p></section><form id="editor" class="card stack">
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
  main.innerHTML = intro(sample ? 'Pesan sampel' : 'Etalase Voxmerch',esc(product.name),esc(product.description || base.detail)) + `<div class="columns"><section class="card"><div id="product-preview"></div><div class="row"><strong class="price">${rp(unit)}</strong>${sample ? '<span class="chip">Harga sampel</span>' : '<button id="copy" class="secondary">Salin tautan</button>'}</div><p id="copy-state" role="status"></p></section>
  <form id="checkout" class="card stack"><h2>Pengiriman</h2><div class="variant"><label>Ukuran<select name="size">${options(base.sizes)}</select></label><label>Warna<select name="color">${options(base.colors,product.color)}</select></label>${field('Jumlah','qty','type="number" min="1" max="20" required',1)}</div>
  ${field('Nama penerima','name','required maxlength="100" autocomplete="name"')}
  ${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}
  <label>Alamat lengkap<textarea name="address" required minlength="10" maxlength="500" rows="3" autocomplete="street-address"></textarea></label>
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
  if (!sample) document.getElementById('copy').onclick = async () => {
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
    if (['studio','edit','sample'].includes(page) && !config.signedIn) return auth(route);
    if (page === 'home') return home();
    if (page === 'catalog') return catalog();
    if (page === 'track') return track();
    if (page === 'admin' && !adminKey) return adminAuth();
    if (page === 'edit') {
      const base = config.catalog.find(item => item.id === id);
      if (base) return editor(base);
    }
    if (page === 'studio') {
      const data = await api('studio'); if (current()) studio(data);
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
window.addEventListener('hashchange',() => { if (location.hash !== '#main') { render(); main.focus(); } });
render();
