import { createWorld } from './world.js';

const money = value => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value / 100);
const products = {
  matcha: { name: 'Matcha nube', price: 450, description: 'Té matcha · leche · perlas', story: 'Matcha suave, leche cremosa y perlas de tapioca. Lo pequeño también puede ser extraordinario.' },
  taro: { name: 'Taro de ensueño', price: 475, description: 'Taro · leche · perlas', story: 'Taro delicado, leche cremosa y perlas de tapioca. Un momento suave, con un color que enamora.' },
  mango: { name: 'Mango al sol', price: 425, description: 'Té jazmín · mango · perlas', story: 'Mango, té jazmín y perlas de tapioca. Un rayito de sol para disfrutar a tu manera.' }
};
const params = new URLSearchParams(location.search);
const product = Object.hasOwn(products, params.get('producto')) ? params.get('producto') : null;
const capture = params.has('captura') ? Math.max(0, Math.min(4.58, Number(params.get('captura')) || 0)) : null;
if (product || capture !== null) document.body.classList.add('render-mode');

let world, currentChapter = 0;
const chapterElements = [...document.querySelectorAll('[data-chapter]')];
const chapterButtons = [...document.querySelectorAll('.desktop-nav [data-go]')];
function updateStory(progress) {
  const index = Math.max(0, Math.min(4, Math.floor(progress + .17)));
  if (currentChapter !== index) {
    currentChapter = index;
    chapterElements.forEach((element, i) => { element.classList.toggle('is-current', i === index); element.inert = i !== index; });
    chapterButtons.forEach(button => { if (Number(button.dataset.go) === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    document.querySelector('#scene-number').textContent = String(index + 1).padStart(2, '0');
    document.querySelector('#next-chapter').innerHTML = index === 4 ? 'Descubre la carta <span aria-hidden="true">↓</span>' : 'Desliza para descubrir <span aria-hidden="true">↓</span>';
  }
  document.querySelector('#scene-progress').style.transform = 'scaleY(' + Math.max(.04, Math.min(1, progress / 4.58)) + ')';
}
function goTo(index) {
  if (!world) return;
  scrollTo({ top: world.chapterTop(index), behavior: world.isReduced ? 'instant' : 'smooth' });
}
for (const element of document.querySelectorAll('[data-go]')) element.addEventListener('click', () => goTo(Number(element.dataset.go)));
document.querySelector('#next-chapter').addEventListener('click', () => { if (currentChapter === 4) document.querySelector('#coleccion').scrollIntoView({ behavior: world?.isReduced ? 'instant' : 'smooth' }); else goTo(currentChapter + 1); });
document.querySelectorAll('[name="hero-flavor"]').forEach(input => input.addEventListener('change', () => {
  world?.setFlavor(input.value); document.querySelector('#hero-flavor-description').textContent = products[input.value].story;
}));

async function initializeWorld() { try {
  await document.fonts.ready;
  await document.fonts.load('400 160px WindSong', 'bruma.');
  world = await createWorld(document.querySelector('#world-canvas'), { product, capture });
  world.onProgress = updateStory;
  document.querySelector('#loading').classList.add('is-done');
  document.body.dataset.world = 'ready';
  // Read-only diagnostics for repeatable exhibition QA and render capture.
  window.__BRUMA__ = { get progress() { return world.progress; }, get camera() { return world.camera; }, get stats() { return world.stats; }, get motion() { return world.motion; }, get chapter() { return currentChapter; }, get reduced() { return world.isReduced; }, setFlavor: name => world.setFlavor(name) };
} catch (error) {
  console.error('No se pudo abrir el mundo 3D:', error);
  document.querySelector('#loading').classList.add('is-done');
  document.querySelector('#world-error').hidden = false;
  document.body.dataset.world = 'error';
} }
initializeWorld();
const updateHeader = () => document.body.classList.toggle('past-world', document.querySelector('#recorrido').getBoundingClientRect().bottom < innerHeight * .5);
addEventListener('scroll', updateHeader, { passive: true }); updateHeader();

// Store behaviour is independent of WebGL. A shopper can still use the catalogue
// on a browser that cannot render the 3D scene.
let cart = {};
try {
  const stored = JSON.parse(localStorage.getItem('bruma.cart') || '{}');
  for (const [id, quantity] of Object.entries(stored || {})) if (Object.hasOwn(products, id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 30) cart[id] = quantity;
} catch { /* A disabled storage policy must not prevent an order. */ }
const cartDialog = document.querySelector('#cart-dialog'), items = document.querySelector('#cart-items'), summary = document.querySelector('#cart-summary'), success = document.querySelector('#order-success');
const total = () => Object.entries(cart).reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
const count = () => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
const save = () => { try { localStorage.setItem('bruma.cart', JSON.stringify(cart)); } catch { /* Session-only shopping remains usable. */ } };
let toastTimer;
function announce(text) {
  const announcement = document.querySelector('#announcement'); clearTimeout(toastTimer); announcement.textContent = text; announcement.classList.add('show'); toastTimer = setTimeout(() => announcement.classList.remove('show'), 2600);
}
function closeCart() { cartDialog.close(); document.body.classList.remove('cart-open'); }
function openCart() { success.hidden = true; renderCart(); cartDialog.showModal(); document.body.classList.add('cart-open'); }
function renderCart() {
  document.querySelector('#cart-count').textContent = count();
  document.querySelector('#open-cart').setAttribute('aria-label', 'Abrir bolsa de compra, ' + count() + ' bebidas');
  document.querySelector('#cart-total').textContent = money(total());
  summary.hidden = !count() || !success.hidden;
  items.hidden = !success.hidden;
  if (!count()) {
    items.innerHTML = '<div class="empty-cart"><h3>Tu pausa empieza aquí.</h3><p>Elige una bebida y prepara tu primer pedido.</p><button class="button secondary" id="browse-products">Explorar la carta <span aria-hidden="true">↗</span></button></div>';
    document.querySelector('#browse-products').addEventListener('click', () => { closeCart(); document.querySelector('#coleccion').scrollIntoView({ behavior: world?.isReduced ? 'instant' : 'smooth' }); }); return;
  }
  items.innerHTML = Object.entries(cart).map(([id, quantity]) => {
    const p = products[id];
    return '<article class="cart-item"><img src="assets/' + id + '.jpg" width="76" height="100" alt="' + p.name + '"><div><h3>' + p.name + '</h3><span class="cart-item-price">' + money(p.price) + ' / bebida</span><div class="cart-item-controls"><div class="quantity"><button type="button" data-quantity="' + id + '" data-delta="-1" aria-label="Quitar una unidad de ' + p.name + '">−</button><span aria-label="' + quantity + ' unidades">' + quantity + '</span><button type="button" data-quantity="' + id + '" data-delta="1" aria-label="Añadir una unidad de ' + p.name + '"' + (quantity >= 30 ? ' disabled' : '') + '>+</button></div><button class="remove-item" data-remove="' + id + '">Eliminar</button></div></div></article>';
  }).join('');
}
document.querySelector('#open-cart').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', closeCart);
cartDialog.addEventListener('close', () => document.body.classList.remove('cart-open'));
cartDialog.addEventListener('click', event => { if (event.target === cartDialog) { const rect = cartDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right) closeCart(); } });
for (const button of document.querySelectorAll('[data-add]')) button.addEventListener('click', () => {
  const id = button.dataset.add; if (cart[id] >= 30) { announce('Puedes añadir hasta 30 unidades de cada bebida.'); return; } cart[id] = (cart[id] || 0) + 1; success.hidden = true; save(); renderCart(); announce(products[id].name + ' añadido a tu bolsa');
});
items.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.quantity) { const id = button.dataset.quantity; cart[id] = Math.min(30, Math.max(0, cart[id] + Number(button.dataset.delta))); if (!cart[id]) delete cart[id]; }
  else if (button.dataset.remove) delete cart[button.dataset.remove];
  else return;
  save(); renderCart();
  // Retain keyboard focus after the changed row is re-rendered.
  const target = button.dataset.quantity ? items.querySelector('[data-quantity="' + button.dataset.quantity + '"][data-delta="' + button.dataset.delta + '"]') : null;
  if (target) target.focus(); else document.querySelector('#close-cart').focus();
});
const customerName = document.querySelector('#customer-name');
customerName.addEventListener('input', () => customerName.setCustomValidity(''));
document.querySelector('#order-form').addEventListener('submit', event => {
  event.preventDefault(); if (!count()) return;
  const name = customerName.value.trim(); if (!name) { customerName.setCustomValidity('Escribe tu nombre para preparar el pedido.'); customerName.reportValidity(); return; }
  const orderItems = Object.entries(cart).map(([id, quantity]) => ({ name: products[id].name, quantity, subtotal: products[id].price * quantity }));
  const fulfillment = new FormData(event.currentTarget).get('fulfillment');
  const reference = 'DEMO-' + Date.now().toString(36).slice(-6).toUpperCase();
  document.querySelector('#order-message').textContent = name + ', así se vería la confirmación de tu pedido.';
  const ticket = document.querySelector('#order-ticket'); ticket.replaceChildren();
  const referenceElement = document.createElement('strong'); referenceElement.textContent = reference; ticket.append(referenceElement);
  for (const item of orderItems) { const row = document.createElement('p'); row.textContent = item.quantity + ' × ' + item.name + ' — ' + money(item.subtotal); ticket.append(row); }
  const final = document.createElement('p'); final.textContent = fulfillment + ' · Total: ' + money(total()); ticket.append(final);
  cart = {}; save(); success.hidden = false; renderCart(); document.querySelector('#new-order').focus();
});
document.querySelector('#new-order').addEventListener('click', () => { closeCart(); success.hidden = true; renderCart(); });
renderCart();
