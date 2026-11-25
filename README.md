# BRUMA · Un pequeño mundo de té

Tienda 3D independiente creada para Expo Colegio. Todo el recorrido se modela y renderiza con Three.js: no hay videos, modelos descargados ni imágenes externas en las escenas. Este repositorio contiene únicamente el proyecto BRUMA.

## Abrir

~~~bash
git clone git@github.com:Famiitry/expo-cole-1-.git
cd expo-cole-1-
npm run dev
~~~

Abre **http://127.0.0.1:3001**. Necesitas Node.js 20 o posterior. Las librerías, fuentes e imágenes ya están incluidas; no se necesita Internet ni instalar paquetes para abrir la tienda. Para otro puerto: `PORT=3011 npm run dev`.

Puede ejecutarse por separado; no necesita el menú de Expo Colegio ni los otros repositorios.

## Qué se puede mostrar en la exposición

- Cinco escenarios conectados: cultivo, taller, tienda, reparto y bebida.
- Una cámara real que se desplaza por el mundo al hacer scroll.
- Personajes articulados que cosechan, preparan bebidas, sirven, saludan y caminan, con movimientos distintos en cada escena.
- Hojas 3D que caen con balanceo y rotación alrededor del vaso. Se dibujan con una sola instancia de renderizado y se pausan fuera de pantalla.
- Escenarios con texturas procedurales, materiales PBR, reflejos de estudio, sombras e iluminación uniforme.
- Selector de matcha, taro y mango que modifica el material de la bebida en tiempo real.
- Imágenes del catálogo renderizadas desde el mismo modelo 3D y con un encuadre común.
- Carrito con cantidades, eliminación de productos, total y persistencia local.
- Nombre, modalidad de recogida y confirmación de un pedido de prueba.
- Vistas para escritorio, móvil y movimiento reducido. Si WebGL falla, el catálogo y el carrito continúan funcionando.

BRUMA es una marca conceptual. Los precios y pedidos son ilustrativos; no se cobran ni se envían pedidos reales. La dirección de arte toma como referencia los dioramas del video, pero esta es una nueva implementación con geometría propia.

## Dónde cambiar cada parte

| Archivo | Contenido |
| --- | --- |
| index.html | Textos en español, capítulos, catálogo y estructura |
| src/style.css | Diseño, colores, tipografía y adaptación a pantallas |
| src/models.js | Vegetación, edificios, personajes, bicicleta y bebida |
| src/world.js | Cámara, luces, sombras y agrupación de geometrías |
| src/motion.js | Caída y balanceo de hojas instanciadas |
| src/app.js | Sabores, catálogo, carrito y pedidos de demostración |
| assets/ | Marca, fuentes e imágenes renderizadas |
| vendor/ | Three.js 0.170.0 y utilidades locales |

Para convertir la idea en una tienda real, el siguiente proyecto puede añadir un servidor de pedidos, inventario y un proveedor de pagos. La demostración actual mantiene esos pasos simulados para poder presentar el sistema sin contratar servicios.

## Renderizar y verificar

Para las herramientas de desarrollo, instala las dependencias de este proyecto con `npm ci`. Si no tienes Brave o Chrome, ejecuta `npx playwright install chromium`.

Las librerías del navegador están incluidas en vendor/. Para volver a copiarlas desde las dependencias instaladas, ejecuta `npm run vendor`; las fuentes e imágenes versionadas se conservan.

Con el servidor abierto en otra terminal:

~~~bash
npm run check
npm run render
npm run verify
~~~

`render` genera tres fotografías de producto y los cinco escenarios con el mismo motor que utiliza la página. Los JPG del catálogo se guardan en assets/; las demás capturas, en .renders/.

`verify` comprueba los cinco capítulos en cuatro tamaños de pantalla, cambio de sabor, totales, persistencia, confirmación, movimiento reducido y funcionamiento del catálogo sin WebGL. Bloquea las peticiones externas durante las pruebas principales.

Puedes especificar otro servidor con `BRUMA_URL=http://127.0.0.1:3011 npm run verify` y un navegador con `BROWSER_PATH=/ruta/al/navegador`.

Three.js conserva su licencia en vendor/THREE-LICENSE.txt. El logotipo utiliza WindSong, una caligrafía inspirada en la referencia de estilo Yolan, aplicada también a los letreros y las etiquetas de producto. Se incluye de forma local con su licencia SIL OFL en assets/fonts/WindSong-OFL.txt. Fuente: [proyecto oficial WindSong](https://github.com/googlefonts/windsong). La interfaz conserva sus fuentes locales de lectura.
