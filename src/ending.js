const concepts = {
  cafe: {
    name: 'Cafetería', brand: 'bruma.', headline: 'Tu pausa, a un clic.', description: 'Elige algo rico. Prepara tu pequeño momento.',
    items: [{ name: 'Matcha nube', price: 450, image: 'matcha.jpg', detail: 'Cremoso y con perlas' }, { name: 'Mango al sol', price: 425, image: 'mango.jpg', detail: 'Fresco y afrutado' }],
    challenge: 'Crea una cafetería con su propia marca y una carta de bebidas.',
    extra: 'Añade un selector de sabores o tamaños.'
  },
  bakery: {
    name: 'Panadería', brand: 'miga.', headline: 'Del horno a tu pedido.', description: 'Pan del día y algo dulce para compartir.',
    items: [{ name: 'Croissant', price: 250, image: 'showcase-croissant.jpg', detail: 'Hojaldrado de mantequilla' }, { name: 'Pan de campo', price: 450, image: 'showcase-bread.jpg', detail: 'Una hogaza para compartir' }],
    challenge: 'Crea una panadería en la que se pueda elegir pan y preparar un pedido.',
    extra: 'Añade una opción para elegir la hora de recogida.'
  },
  tech: {
    name: 'Tecnología', brand: 'nodo.', headline: 'Conecta con lo que te gusta.', description: 'Pequeños favoritos para tus grandes ideas.',
    items: [{ name: 'Audífonos Aura', price: 4900, image: 'showcase-headphones.jpg', detail: 'Tu música, tu momento' }, { name: 'Control Nova', price: 3500, image: 'showcase-controller.jpg', detail: 'Una partida más' }],
    challenge: 'Crea una tienda de tecnología con un catálogo y un carrito de accesorios.',
    extra: 'Añade un selector de colores y un filtro de precios.'
  }
};

const root = document.querySelector('#tu-proyecto');
if (root) {
  const currency = cents => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const shop = root.querySelector('#venture-shop'), products = root.querySelector('#venture-products');
  const catalog = root.querySelector('#venture-catalog'), receipt = root.querySelector('#venture-receipt');
  const checkout = root.querySelector('#venture-checkout'), status = root.querySelector('#venture-shop-status');
  let selected = 'cafe', quantities = [0, 0], orderNumber = 0;
  const count = () => quantities.reduce((sum, quantity) => sum + quantity, 0);
  const total = () => quantities.reduce((sum, quantity, i) => sum + quantity * concepts[selected].items[i].price, 0);
  function updateOrder() {
    root.querySelector('#venture-cart-count').textContent = count();
    root.querySelector('#venture-total').textContent = currency(total());
    checkout.disabled = !count();
    status.textContent = count() ? count() + (count() === 1 ? ' producto añadido. ' : ' productos añadidos. ') + 'Ya puedes confirmar tu pedido de ejemplo.' : 'Prueba a añadir un producto a tu pedido.';
  }
  function selectConcept(id) {
    selected = id; quantities = [0, 0]; catalog.hidden = false; receipt.hidden = true;
    const concept = concepts[id]; shop.dataset.concept = id;
    root.querySelectorAll('[data-venture]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.venture === id)));
    root.querySelector('#venture-shop-brand').textContent = concept.brand;
    root.querySelector('#venture-shop-title').textContent = concept.headline;
    root.querySelector('#venture-shop-description').textContent = concept.description;
    products.innerHTML = concept.items.map((item, i) => '<article class="venture-product"><div class="venture-product-image"><img src="assets/' + item.image + '" width="800" height="800" alt="' + item.name + ' modelado en 3D" loading="lazy"></div><div class="venture-product-details"><h4>' + item.name + '</h4><p>' + item.detail + '</p><div><strong>' + currency(item.price) + '</strong><button type="button" data-preview-add="' + i + '" aria-label="Añadir ' + item.name + ' al pedido de ejemplo">Añadir <span aria-hidden="true">+</span></button></div></div></article>').join('');
    root.querySelector('#venture-download').setAttribute('aria-label', 'Descargar guía para crear una ' + concept.name.toLowerCase());
    updateOrder();
  }
  root.querySelectorAll('[data-venture]').forEach(button => button.addEventListener('click', () => selectConcept(button.dataset.venture)));
  products.addEventListener('click', event => {
    const button = event.target.closest('[data-preview-add]'); if (!button) return;
    const index = Number(button.dataset.previewAdd);
    if (quantities[index] >= 10) { status.textContent = 'Puedes probar con hasta 10 unidades de cada producto.'; return; }
    quantities[index]++; updateOrder();
    button.dataset.added = 'true';
    setTimeout(() => { delete button.dataset.added; }, 550);
  });
  checkout.addEventListener('click', () => {
    if (!count()) return;
    orderNumber++;
    root.querySelector('#venture-receipt-message').textContent = 'Pedido de prueba #' + String(orderNumber).padStart(3, '0') + ': ' + count() + (count() === 1 ? ' producto de ' : ' productos de ') + concepts[selected].brand + ' Un catálogo y un carrito ya se convirtieron en un pedido.';
    root.querySelector('#venture-receipt-total').textContent = currency(total());
    catalog.hidden = true; receipt.hidden = false; receipt.focus({ preventScroll: true });
  });
  root.querySelector('#venture-restart').addEventListener('click', () => { selectConcept(selected); root.querySelector('[data-preview-add]').focus({ preventScroll: true }); });
  root.querySelector('#venture-download').addEventListener('click', () => {
    const concept = concepts[selected];
    const lines = [
      'MI PRIMER PROYECTO: ' + concept.name.toUpperCase(),
      'Una idea para crear con tu equipo después de la exposición BRUMA.',
      'BRUMA · Diseño y desarrollo por Famiitry.',
      '', 'EL RETO', concept.challenge,
      '', '1. DISEÑA TU MARCA', 'Elige un nombre, dos colores y a quién le vas a vender. Dibuja cómo se verá tu página.',
      '', '2. PROGRAMA TU TIENDA', 'Empieza con tres productos. Cada uno necesita un nombre, una imagen y un precio. Crea botones para añadir, quitar y calcular el total.',
      '', '3. HAZ TU PRIMER PEDIDO', 'Pide un nombre, muestra el resumen y genera una confirmación de prueba. Revisa el total y pruébalo también en un teléfono.',
      '', 'UN RETO EXTRA', concept.extra,
      '', 'PARA EMPEZAR', 'HTML para la estructura. CSS para el diseño. JavaScript para los botones, el carrito y los cálculos.',
      'La demostración funciona sin servidor de pedidos ni cobros. Puedes añadir esas funciones como una siguiente etapa.',
      '', 'CÓDIGO DE BRUMA', 'https://github.com/Famiitry/expo-cole-1-',
      '', 'Precios de referencia del ejemplo:',
      ...concept.items.map(item => '- ' + item.name + ': ' + currency(item.price)),
      '', 'Ponle tu estilo, prueba con tus compañeros y presenta lo que construiste.'
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mi-proyecto-' + selected + '.txt';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    root.querySelector('#venture-announcement').textContent = 'Tu guía de ' + concept.name.toLowerCase() + ' está lista. ¡Empieza con tu equipo!';
  });
  selectConcept(selected);
}
