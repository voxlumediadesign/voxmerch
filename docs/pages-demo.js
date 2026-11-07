import config from './demo-config.js';

const products = new Map();
const orders = new Map();

async function demoApi(path,method='GET',data) {
  const [route,query] = path.split('?');
  const [resource,id,action] = route.split('/');
  if (route === 'config') return config;
  if (route === 'shop') return [...products.values()].filter(product => product.published);
  if (route === 'studio') return {products:[...products.values()],orders:[...orders.values()],earnings:0};
  if (route === 'logout') return {ok:true};
  if (resource === 'products') {
    if (method === 'POST' || method === 'PUT') {
      const key = id || crypto.randomUUID();
      const base = config.catalog.find(item => item.id === data.base);
      products.set(key,{...data,id:key,cost:base.cost,currency:'USD'});
      return {id:key};
    }
    const product = products.get(id);
    if (product && (product.published || query === 'edit=1')) return product;
    throw new Error('This demo product is unavailable in this tab.');
  }
  if (method === 'POST' && (route === 'orders' || route === 'sample')) {
    const product = products.get(data.product);
    const sample = route === 'sample';
    if (!product || (!sample && !product.published)) throw new Error('This demo product is unavailable in this tab.');
    const key = crypto.randomUUID();
    const total = (sample ? product.cost : product.price)*data.qty + config.shipping;
    orders.set(key,{id:key,title:product.name,sample,total,currency:'USD',status:'Menunggu pembayaran',earnings:sample ? 0 : (product.price-product.cost)*data.qty});
    return {id:key,total,currency:'USD'};
  }
  if (resource === 'orders') {
    const order = orders.get(id);
    if (!order) throw new Error('This demo order is unavailable in this tab.');
    if (action === 'pay' && method === 'POST') {
      order.status = 'Dibayar';
      return {ok:true};
    }
    return order;
  }
  throw new Error('This feature is available in the full Voxmerch app.');
}

const { start } = await import('./app.js?v=13dfbf8f1e0e');
start(demoApi);
