# 🛍️ Mi Catálogo Web Profesional (Vanilla JS & Google Sheets)

Catálogo web profesional, modular, ultra rápido y adaptable a cualquier rubro comercial (ropa, electrónica, herramientas, repuestos, etc.). 

**Publicado sin costo en GitHub Pages** y administrado en tiempo real desde **Google Sheets** mediante **Google Apps Script**.

---

## 🌟 Características Principales

- 🚀 **100% Vanilla Web**: Sin frameworks pesados ni dependencias (HTML5, CSS3, ES6+ JS).
- 📱 **Progressive Web App (PWA)**: Instalable como aplicación nativa en celulares y PC, con soporte offline mediante `sw.js`.
- 🌙 **Modo Oscuro / Claro**: Cambia de tema con persistencia automática en el navegador (`localStorage`).
- ⚡ **Buscador en Tiempo Real Multicampo**: Busca instantáneamente por Nombre, SKU, Categoría, Descripción o Etiquetas.
- 🏷️ **Categorías 100% Automáticas**: Se leen dinámicamente desde Google Sheets sin escribir categorías a mano.
- 📊 **Filtros y Ordenamiento Múltiples**: Filtro por stock, precio, ordenamiento A-Z/Z-A, más recientes, popularidad.
- 🖼️ **Lazy Loading Real**: Precarga inteligente de imágenes mediante `IntersectionObserver`.
- 📄 **Página de Detalle Independiente (`producto.html?id=XXX`)**: Con migas de pan (Breadcrumbs), galería interactiva con miniaturas, tabla de especificaciones técnicas y productos relacionados.
- 💬 **Integración WhatsApp Directa**: Generación automática de mensajes formateados con nombre del producto, SKU y enlace.
- 🔍 **SEO & Marcado Schema.org (`JSON-LD`)**: Prepara tus productos para aparecer destacados en los resultados de Google.

---

## 📂 Estructura del Proyecto

```
Mi Catálogo Web/
│
├── index.html            # Vista principal del catálogo
├── producto.html         # Vista independiente de detalle del producto
│
├── css/
│   └── style.css         # Estilos principales, variables CSS y Modo Oscuro
│
├── js/
│   ├── config.js         # Configuración global de la tienda (Único archivo a editar)
│   ├── api.js            # Conector asíncrono con Google Apps Script y normalización
│   ├── ui.js             # Renderizador visual (Tarjetas, Paginación, Toast)
│   ├── filters.js        # Motor inmutable de búsqueda, filtrado y paginación
│   ├── app.js            # Orquestador principal de la app e inicialización PWA
│   └── product-detail.js # Controlador de la página producto.html
│
├── assets/               # Imágenes, logotipos y recursos multimedia
├── manifest.json         # Manifiesto para instalación PWA
├── sw.js                 # Service Worker para almacenamiento en caché
├── robots.txt            # Instrucciones para buscadores SEO
├── sitemap.xml           # Mapa del sitio XML
└── README.md             # Guía completa de uso y despliegue
```

---

## 📊 PASO 1: Configurar la Base de Datos en Google Sheets

1. Crea una nueva hoja de cálculo en [Google Sheets](https://sheets.google.com).
2. En la **primera fila (Fila 1)**, coloca exactamente los siguientes nombres de columna en el encabezado:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **ID** | **Nombre** | **Precio** | **PrecioAnterior** | **Stock** | **Categoria** | **Etiqueta** | **Descripcion** | **SKU** | **Imagen** | **Galeria** | **Atributos** | **Estado** | **Popularidad** |

### 💡 Ejemplo de filas de prueba:

- **ID**: `prod-101`
- **Nombre**: `Zapatilla Running Nitro`
- **Precio**: `89.99`
- **PrecioAnterior**: `120.00`
- **Stock**: `10`
- **Categoria**: `Calzado`
- **Etiqueta**: `Oferta`
- **Descripcion**: `Zapatilla ultraligera para carreras de larga distancia.`
- **SKU**: `ZAP-001`
- **Imagen**: `https://images.unsplash.com/photo-1542291026-7eec264c27ff`
- **Galeria**: `https://url-foto1.jpg, https://url-foto2.jpg`
- **Atributos**: `Talla: 42; Material: Malla respirable`
- **Estado**: `activo`
- **Popularidad**: `95`

---

## ⚙️ PASO 2: Crear el Endpoint con Google Apps Script

1. En tu Google Sheet, ve al menú superior: **Extensiones > Apps Script**.
2. Borra todo el código que aparezca y pega el siguiente script completo:

```javascript
/**
 * API WEB PARA CATÁLOGO WEB EN GOOGLE APPS SCRIPT
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return responseJSON([]);
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const products = rows.map(row => {
      let product = {};
      headers.forEach((header, index) => {
        product[header] = row[index];
      });
      return product;
    }).filter(p => p.Estado !== 'inactivo' && p.Nombre !== '');
    
    return responseJSON(products);
    
  } catch (error) {
    return responseJSON({ error: error.message });
  }
}

function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Guarda el proyecto haciendo clic en el icono del **Disco 💾**.
4. Haz clic en el botón azul **Desplegar > Nuevo despliegue**.
5. En el icono de engranaje ⚙️ junto a *"Seleccionar tipo"*, elige **Aplicación web**.
6. Configura los parámetros:
   - **Descripción**: `API Catálogo v1`
   - **Ejecutar como**: `Yo (tu correo)`
   - **Quién tiene acceso**: **`Cualquier persona`** *(IMPORTANTE: Debe ser Cualquier persona)*.
7. Haz clic en **Desplegar**, otorga los permisos requeridos y **copia la URL de la aplicación web** (debe terminar en `/exec`).

---

## 🔧 PASO 3: Conectar el Catálogo con tu API

Abre el archivo `js/config.js` de tu proyecto y pega la URL obtenida en la constante `API_URL`:

```javascript
const API_URL = "https://script.google.com/macros/s/TU_SCRIPT_ID/exec";
```

¡Listo! A partir de este momento, **cada vez que agregues o edites un producto en tu Google Sheet**, tu sitio web se actualizará automáticamente sin modificar el código.

---

## 🚀 PASO 4: Publicar gratis en GitHub Pages

1. Sube tu proyecto a un repositorio en **GitHub**.
2. Ve a **Settings > Pages** en tu repositorio.
3. En **Source**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
4. Haz clic en **Save**.
5. En pocos segundos, GitHub te proporcionará tu enlace público gratis (ej: `https://tu-usuario.github.io/mi-catalogo-web/`).

---

## ⚡ Licencia y Mantención

Este proyecto está diseñado bajo principios SOLID para ser completamente limpio, modular y extensible. Puedes adaptarlo a cualquier comercio simplemente modificando los valores dentro de `js/config.js`.
