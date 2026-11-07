const main = document.querySelector('main');
const dollars = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const rupiah = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const money = (amount,currency='USD') => currency === 'IDR' ? rupiah.format(amount) : dollars.format(amount/100);
// Older records stored whole rupiah and did not include a currency code.
const recordCurrency = record => record.currency || 'IDR';
const esc = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const labels = {
  Putih:'White', Hitam:'Black', Reguler:'One size', 'Menunggu pembayaran':'Awaiting payment',
  Dibayar:'Paid', Diproduksi:'In production', Dikirim:'Shipped', Terkirim:'Delivered',
  'Perlu ditangani':'Needs attention', Dibatalkan:'Canceled',
};
const label = value => labels[value] || value;
const options = (items,selected) => items.map(item => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(label(item))}</option>`).join('');
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
  return `<div class="mock ${outline ? 'outlined' : ''}" role="img" aria-label="Preview of ${tote ? 'tote bag' : 'T-shirt'} in ${esc(label(color))}"><div class="garment ${tote ? 'tote' : ''}" style="color:${fill}"><svg aria-hidden="true" viewBox="0 0 260 260">${shape}</svg><div class="print-zone">${image}</div></div></div>`;
}


const steps = [
  ['Choose a product','Compare base prices, colors, and sizes before you start.'],
  ['Add your design','Upload your artwork, position it, and preview the result.'],
  ['Publish and sell','Set your price and share your product page.'],
  ['Print and ship','Once an order is paid, follow production and shipping from your dashboard.'],
];
const productCards = items => items.map(base => `<article class="card catalog-card"><a class="media-link" href="#base/${base.id}">${mock(base.id,base.colors[0])}<span class="sr-only">View ${base.name}</span></a><div class="card-content"><span class="eyebrow">${base.id === 'tee' ? 'Apparel' : 'Accessories'}</span><h3><a href="#base/${base.id}">${base.name}</a></h3><p>${base.colors.length} colors · ${base.sizes.length} ${base.sizes.length === 1 ? 'size' : 'sizes'}</p><strong>From ${money(base.cost)}</strong></div></article>`).join('');
const stepCards = () => `<div class="grid steps">${steps.map(([title,desc],i)=>`<article class="card"><div class="number">0${i+1}</div><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div>`;

function home() {
  main.innerHTML = `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-stage">
      <p class="hero-kicker">VOXMERCH STUDIO <span></span> PRINT ON DEMAND</p>
      <h1 id="hero-title" class="hero-title" aria-label="Make your own merch.">
        <span class="hero-make" aria-hidden="true">Make</span>
        <span class="hero-your" aria-hidden="true">your<i></i><i></i><i></i><i></i></span>
        <span class="hero-own" aria-hidden="true">own</span>
        <span class="hero-merch" aria-hidden="true">merch.</span>
      </h1>
      <img class="hero-model" src="./hero-model.png" alt="Model wearing a printed T-shirt and carrying a canvas tote" width="1445" height="1555" fetchpriority="high">
    </div>
    <div class="hero-footer"><p>Put your design on products people will wear and carry. Print each one when it sells.</p><div class="actions">${link('catalog','Start designing <span aria-hidden="true">↗</span>')}${link('how','See how it works','secondary')}</div></div>
  </section>
    <section class="section"><div class="eyebrow">From idea to storefront</div><h2>From design to delivery in four steps</h2>${stepCards()}</section>
    <section class="section"><div class="row"><h2>Find the right blank for your design</h2>${link('catalog','Browse the catalog','secondary')}</div><div class="grid">${productCards(config.catalog)}</div></section>
    <section class="section card calculator columns"><div><div class="eyebrow">Margin calculator</div><h2>What could you earn?</h2><p>Estimate your gross margin over 30 days based on your price and daily sales. Shipping, taxes, and fees are excluded.</p><output id="estimate" for="calc-product calc-price calc-sales" class="estimate" aria-live="polite"></output></div><form class="stack" id="calculator"><label>Base product<select id="calc-product">${config.catalog.map(base => `<option value="${base.id}">${base.name}</option>`).join('')}</select></label><label>Retail price (USD)<input id="calc-price" type="number" min="0" max="100000" step="0.01" value="6.50"></label><label>Units sold per day<input id="calc-sales" type="number" min="0" max="10000" value="1"></label></form></section>`;
  const calc = document.querySelector('#calculator');
  const estimate = () => {
    const base = config.catalog.find(item => item.id === calc.elements['calc-product'].value);
    const price = calc.elements['calc-price'].valueAsNumber;
    const sales = calc.elements['calc-sales'].valueAsNumber;
    const output = document.querySelector('#estimate');
    output.textContent = calc.checkValidity() && Number.isFinite(price) && Number.isFinite(sales) ? money((Math.round(price*100)-base.cost)*sales*30) : '—';
  };
  calc.addEventListener('input',estimate);
  calc.addEventListener('submit',event => event.preventDefault());
  estimate();
}
function how() {
  main.innerHTML = intro('Print-on-demand','How Voxmerch works','See how a blank product becomes an order ready to ship.') + stepCards() + `<div class="section actions">${link('catalog','Choose a product')}${link('studio','Open dashboard','secondary')}</div>`;
}
function catalog() {
  main.innerHTML = intro('Print on demand','Product catalog','Check the available colors, sizes, and print area before you start designing.') + `<div class="catalog-layout"><aside class="card stack"><label>Search products<input id="catalog-search" type="search" placeholder="T-shirts, totes…"></label><label>Category<select id="catalog-category"><option value="">All products</option><option value="tee">Apparel</option><option value="tote">Accessories</option></select></label></aside><section><p id="catalog-count" role="status"></p><div class="grid" id="catalog-results"></div></section></div>`;
  const search = document.querySelector('#catalog-search');
  const category = document.querySelector('#catalog-category');
  const filter = () => {
    const items = config.catalog.filter(item => (!category.value || item.id === category.value) && (item.name + ' ' + item.detail).toLowerCase().includes(search.value.trim().toLowerCase()));
    document.querySelector('#catalog-count').textContent = items.length + (items.length === 1 ? ' product' : ' products');
    document.querySelector('#catalog-results').innerHTML = productCards(items) || '<p>No products match. Try a different search.</p>';
  };
  search.addEventListener('input',filter);
  category.addEventListener('change',filter);
  filter();
}
function baseDetails(base) {
  main.innerHTML = `<p><a href="#catalog">← Back to catalog</a></p>` + intro('Base product',base.name,base.detail) + `<div class="columns"><div id="base-preview">${mock(base.id,base.colors[0],{},true)}</div><section class="card stack"><h2>Product specifications</h2><div class="row"><span>Base cost</span><strong>${money(base.cost)}</strong></div><div class="row"><span>Size</span><strong>${base.sizes.map(label).join(', ')}</strong></div><div class="row"><span>Print area</span><strong>${base.id === 'tee' ? 'Front' : 'One side'}</strong></div><label>Preview color<select id="base-color">${options(base.colors)}</select></label><div class="actions">${link('edit/' + base.id,'Start designing')}</div></section></div>`;
  document.querySelector('#base-color').onchange = event => {
    document.querySelector('#base-preview').innerHTML = mock(base.id,event.target.value,{},true);
  };
}
function auth(next) {
  main.innerHTML = intro('Creator account','Sign in to your studio','Manage your designs, products, samples, and orders in one place.') + `<form id="auth" class="card stack narrow">${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}${field('Password','password','type="password" required minlength="8" maxlength="128"')}<div class="actions"><button value="login">Sign in</button><button class="secondary" value="register">Create an account</button></div>${errorNote}</form>`;
  form('auth',async (data,button) => { await api(button?.value || 'login','POST',data); config.signedIn = true; if (location.hash === '#' + next) render(); else location.hash = next; });
}
function studio(result,showOrders) {
  main.innerHTML = intro('Creator dashboard',showOrders ? 'Orders' : 'My products',showOrders ? 'Track customer orders and samples.' : 'Manage drafts and published products.') + `<nav class="studio-nav" aria-label="Dashboard"><a href="#studio" ${showOrders ? '' : 'aria-current="page"'}>My products</a><a href="#merchant-orders" ${showOrders ? 'aria-current="page"' : ''}>Orders</a><a href="#catalog">Catalog</a></nav><div class="actions">${link('catalog','Create a product')}${config.pages ? '' : '<button id="logout" class="secondary">Sign out</button>'}</div>
    <section class="section" ${showOrders ? 'hidden' : ''}><h2>Products</h2><div class="grid">${result.products.map(product => `<article class="card">${mock(product.base,product.color,product)}<span class="chip">${product.published ? 'Published' : 'Draft'}</span><h3>${esc(product.name)}</h3><p>${money(product.price,recordCurrency(product))}</p><div class="actions">${link('edit/' + product.id,'Edit','secondary')}${link('sample/' + product.id,'Order a sample','secondary')}${product.published ? link('p/' + product.id,'View listing','secondary') : ''}</div></article>`).join('') || '<p>Your saved products will appear here.</p>'}</div></section>
    <section class="section" ${showOrders ? '' : 'hidden'}><h2>Orders</h2><p>Estimated margin on delivered orders <strong>${money(result.earnings)}</strong>${result.legacyEarnings ? ` · <strong>${money(result.legacyEarnings,'IDR')}</strong>` : ''}</p><div class="card stack">${result.orders.map(order=>`<div class="row"><div><strong>${esc(order.title)}</strong> ${order.sample ? '(sample)' : ''}<br><small>${esc(label(order.status))} · ${money(order.total,recordCurrency(order))} · Margin ${money(order.earnings,recordCurrency(order))}</small></div>${link('order/' + order.id,'View order','secondary')}</div>`).join('') || '<p>No orders yet.</p>'}</div></section>`;
  if (config.pages) return;
  document.getElementById('logout').onclick = async () => { await api('logout','POST'); config.signedIn = false; location.hash = 'home'; };
}

function editor(base,product) {
  const initial = product || {color:base.colors[0],x:50,y:50,scale:70,price:base.cost+200};
  const currency = product ? recordCurrency(product) : 'USD';
  const cost = product?.cost ?? base.cost;
  const units = currency === 'USD' ? 100 : 1;
  let art = initial.art || '';
  let artworkPreview = initial.preview || '';
  main.innerHTML = intro('Product Creator',base.name,'Upload your artwork and place it in the print area. Save a draft or publish when you are ready.') + `<div class="columns"><section class="card"><div id="preview"></div><p>Drag your artwork inside the outlined print area or use the position sliders. This mockup is illustrative.</p></section><form id="editor" class="card stack">
  ${field('Product name','name','required maxlength="80"',initial.name)}
  <label>Description<textarea name="description" maxlength="500" rows="3">${esc(initial.description)}</textarea></label>
  <label>Preview color<select name="color">${options(base.colors,initial.color)}</select></label>
  <label>Artwork (PNG or JPG, up to 2 MB)<input name="art" type="file" accept="image/png,image/jpeg"></label><p id="file-state" aria-live="polite">${art ? 'Artwork saved.' : ''}</p>
  ${field('Design size','scale','type="range" min="20" max="100"',initial.scale)}
  ${field('Horizontal position','x','type="range"',initial.x)}
  ${field('Vertical position','y','type="range"',initial.y)}
  ${field('Retail price (' + currency + ')','price',`type="number" min="${cost/units}" max="${10000000/units}" step="${1/units}" required`,initial.price/units)}
  <p>Base cost ${money(cost,currency)} · Estimated margin <strong id="margin"></strong></p>
  <div class="actions"><button class="secondary" value="draft">Save draft</button><button value="publish">Publish</button></div>${errorNote}</form></div>`;
  const editorForm = document.getElementById('editor');
  const fields = editorForm.elements;
  const placement = () => ({x:Number(fields.x.value),y:Number(fields.y.value),scale:Number(fields.scale.value)});
  function preview() {
    const half = Math.ceil(Number(fields.scale.value)/2);
    for (const axis of [fields.x,fields.y]) { axis.min = half; axis.max = 100-half; }
    document.getElementById('preview').innerHTML = mock(base.id,fields.color.value,{...placement(),art},true);
    document.getElementById('margin').textContent = money(Math.round(Number(fields.price.value)*units)-cost,currency);
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
        if (!['image/png','image/jpeg'].includes(file.type) || file.size > 2097152) throw new Error('Choose a PNG or JPG under 2 MB.');
        const url = await new Promise((resolve,reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('We could not read that file.'));
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
        state.textContent = `${image.naturalWidth} × ${image.naturalHeight} px · Order a sample to check print quality.`;
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
    if (!art) throw new Error('Upload artwork before saving.');
    const published = button?.value === 'publish';
    const saved = await api(product ? 'products/' + product.id : 'products',product ? 'PUT' : 'POST',{
      base:base.id,name:values.name,description:values.description,color:values.color,price:Math.round(Number(values.price)*units),art,preview:artworkPreview,...placement(),published,
    });
    location.hash = published ? 'p/' + saved.id : 'studio';
  });
}
function shop(products) {
  main.innerHTML = intro('Storefront','Shop creator merch','Browse products published by Voxmerch creators.') + `<div class="grid">${products.map(product=>`<article class="card">${mock(product.base,product.color,product)}<h2>${esc(product.name)}</h2><p class="price">${money(product.price,recordCurrency(product))}</p>${link('p/' + product.id,'View product')}</article>`).join('') || '<p>No products have been published yet.</p>'}</div>`;
}

function checkout(product,sample) {
  const base = config.catalog.find(item => item.id === product.base);
  const unit = sample ? product.cost : product.price;
  const currency = recordCurrency(product);
  const shipping = currency === 'USD' ? config.shipping : config.legacyShipping;
  main.innerHTML = intro(sample ? 'Order a sample' : 'Voxmerch storefront',esc(product.name),esc(product.description || base.detail)) + `<div class="columns"><section class="card"><div id="product-preview"></div><div class="row"><strong class="price">${money(unit,currency)}</strong>${sample ? '<span class="chip">Sample price</span>' : config.pages ? '' : '<button id="copy" class="secondary">Copy link</button>'}</div><p id="copy-state" role="status"></p></section>
  <form id="checkout" class="card stack"><h2>Shipping</h2><div class="variant"><label>Size<select name="size">${options(base.sizes)}</select></label><label>Color<select name="color">${options(base.colors,product.color)}</select></label>${field('Quantity','qty','type="number" min="1" max="20" required',1)}</div>
  ${config.pages ? '<p>This demo uses a sample shipping address.</p>' : `${field('Recipient name','name','required maxlength="100" autocomplete="name"')}
  ${field('Email','email','type="email" required maxlength="254" autocomplete="email"')}
  <label>Shipping address<textarea name="address" required minlength="10" maxlength="500" rows="3" autocomplete="street-address"></textarea></label>`}
  <div class="row"><span>Shipping fee</span><span>${money(shipping,currency)}</span></div>
  <div class="row"><strong>Total</strong><strong id="total"></strong></div>
  <p>${config.demo ? 'Demo checkout. No money will be collected.' : 'The Voxmerch team verifies payments manually.'}</p>
  <button>Place order</button>${errorNote}</form></div>`;
  const checkoutForm = document.getElementById('checkout');
  const fields = checkoutForm.elements;
  function preview() {
    document.getElementById('product-preview').innerHTML = mock(base.id,fields.color.value,product);
    document.getElementById('total').textContent = money(unit*(Number(fields.qty.value) || 1)+shipping,currency);
  }
  fields.color.onchange = preview;
  fields.qty.oninput = preview;
  preview();
  if (!sample && !config.pages) document.getElementById('copy').onclick = async () => {
    const state = document.getElementById('copy-state');
    try { await navigator.clipboard.writeText(location.href); state.textContent = 'Link copied.'; }
    catch { state.textContent = 'Copy the link from your browser’s address bar.'; }
  };
  form('checkout',async values => {
    const result = await api(sample ? 'sample' : 'orders','POST',{...values,qty:Number(values.qty),product:product.id});
    location.hash = 'order/' + result.id;
  });
}

function track() {
  main.innerHTML = intro('Tracking','Track your order','Enter the order ID you received at checkout.') + `<form id="track" class="card stack narrow">${field('Order ID','id','required maxlength="36"')}<button>Track order</button>${errorNote}</form>`;
  form('track',async values => { location.hash = 'order/' + encodeURIComponent(values.id.trim()); });
}
function tracking(order) {
  main.innerHTML = intro('Order',esc(order.title),order.sample ? 'Sample order' : 'Customer order') + `<section class="card stack narrow"><div class="row"><span class="chip">${esc(label(order.status))}</span><strong>${money(order.total,recordCurrency(order))}</strong></div><div><strong>Order ID</strong><p class="break">${esc(order.id)}</p></div>${order.tracking ? `<div><strong>Tracking number</strong><p class="break">${esc(order.tracking)}</p></div>` : ''}${order.status === 'Menunggu pembayaran' ? config.demo ? `<form id="pay" class="stack"><button>Simulate payment</button>${errorNote}</form>` : ("<p>" + esc(config.paymentInstructions || "Save your order ID and contact Voxmerch to arrange payment.") + "</p>") : ''}</section>`;
  if (document.getElementById('pay')) form('pay',async () => { await api('orders/' + order.id + '/pay','POST'); render(); });
}
const transitions = {
  'Menunggu pembayaran':['Dibayar','Dibatalkan'], Dibayar:['Diproduksi','Dibatalkan'],
  Diproduksi:['Dikirim','Perlu ditangani'], Dikirim:['Terkirim','Perlu ditangani'],
  Terkirim:['Perlu ditangani'], 'Perlu ditangani':['Diproduksi','Dibatalkan'],
};
function admin(orders) {
  main.innerHTML = intro('Operations','Production queue','Verify payments, download artwork, and update order status and tracking.') +
    `<div class="actions"><button id="admin-out" class="secondary">Exit admin</button></div><div class="section stack">${orders.map(order => `<article class="card stack"><div class="row"><h2>${esc(order.title)} ${order.sample ? '(sample)' : ''}</h2><span class="chip">${esc(label(order.status))}</span></div>
    <p class="break">${esc(order.id)} · ${money(order.total,recordCurrency(order))}<br>${esc(order.name)} · ${esc(order.email)}<br>${esc(order.address)}<br>${esc(label(order.size))} · ${esc(label(order.color))} · ${order.qty} unit${order.tracking ? '<br>Tracking: ' + esc(order.tracking) : ''}</p>
    <div class="actions"><a class="button secondary" download="artwork-${order.id}.${order.artwork.startsWith('data:image/png') ? 'png' : 'jpg'}" href="${esc(order.artwork)}">Download artwork</a><small>X position ${order.placement.x}% · Y ${order.placement.y}% · Scale ${order.placement.scale}%</small></div>
    ${transitions[order.status] ? `<form class="stack narrow" id="admin-${order.id}"><label>Next status<select name="status">${options(transitions[order.status])}</select></label>${field('Tracking number (required when shipping)','tracking','maxlength="100"')}<button>Update status</button>${errorNote}</form>` : ''}</article>`).join('') || '<p>No orders yet.</p>'}</div>`;
  document.getElementById('admin-out').onclick = () => { adminKey = ''; render(); };
  for (const order of orders) {
    const id = 'admin-' + order.id;
    if (document.getElementById(id)) form(id,async values => { await api('admin/orders/' + order.id,'PUT',values,true); render(); });
  }
}
function adminAuth() {
  main.innerHTML = intro('Operations','Admin access','Enter your admin key to open the production queue.') + `<form class="card stack narrow" id="admin-auth">${field('Admin key','key','type="password" required')}<button>Open queue</button>${errorNote}</form>`;
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
  main.innerHTML = '<p role="status">Loading…</p>';
  try {
    config = await api('config');
    if (!current()) return;
    if (['studio','merchant-orders','edit','sample'].includes(page) && !config.signedIn) return auth(route);
    if (page === 'home') return home();
    if (page === 'catalog') return catalog();
    if (page === 'how') return how();
    if (page === 'base') {
      const base = config.catalog.find(item => item.id === id);
      if (!base) throw new Error('Base product not found.');
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
    } else throw new Error('Page not found.');
  } catch(error) {
    if (current()) main.innerHTML = intro('Voxmerch','We couldn’t open this page',esc(error.message)) + link('home','Back to home');
  }
}
export function start(adapter = serverApi) {
  api = adapter;
  window.addEventListener('hashchange',() => { if (location.hash !== '#main') { render(); main.focus(); } });
  render();
}

if (document.querySelector('script[src="./app.js"]')) start();
