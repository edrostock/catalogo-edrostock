/**
 * ============================================================================
 * CONTROLADOR DE LA PÁGINA DE DETALLE DEL PRODUCTO (product-detail.js)
 * ============================================================================
 * 
 * Este archivo gestiona la visualización individual de un producto mediante URL:
 * `producto.html?id=XXX`.
 * 
 * Funcionalidades:
 * - Extracción del parámetro ID desde la URL.
 * - Galería de imágenes interactiva con conmutación de miniaturas.
 * - Inyección dinámicas de Metadatos SEO OpenGraph y marcado Schema.org JSON-LD.
 * - Renderizado de Productos Relacionados de la misma categoría.
 * - Generación de consulta por WhatsApp y Web Share API.
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 2.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🔍 Cargando detalle de producto...");

  // 1. Inicializar Modo Claro / Oscuro
  UI.initThemeToggle();
  initStoreBrand();

  const wrapper = document.getElementById('product-detail-wrapper');
  const breadcrumb = document.getElementById('breadcrumb');

  // 2. Extraer ID del producto desde la URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    renderNotFound(wrapper, "No se especificó ningún código de producto.");
    return;
  }

  // 3. Renderizar Skeleton de Carga Rápida
  renderDetailSkeleton(wrapper);

  try {
    // 4. Consultar productos mediante ApiService
    const products = await ApiService.getProducts();
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
      renderNotFound(wrapper, `El producto con código "${productId}" no existe o fue descontinuado.`);
      return;
    }

    // 5. Actualizar Metadatos SEO y Schema.org
    updateSEOAndSchema(product);

    // 6. Renderizar Breadcrumb
    renderBreadcrumb(breadcrumb, product);

    // 7. Renderizar Ficha Completa del Producto
    renderProductDetail(wrapper, product);

    // 8. Renderizar Productos Relacionados
    renderRelatedProducts(products, product);

  } catch (error) {
    console.error("💥 Error al obtener detalles del producto:", error);
    renderNotFound(wrapper, "Ocurrió un error de conexión al cargar la información.");
  }
});

/**
 * Inicializa marcas y nombres en el pie de página.
 */
function initStoreBrand() {
  const storeNameEl = document.getElementById('store-name-display');
  const footerStoreEl = document.getElementById('footer-store-name');
  const yearEl = document.getElementById('current-year');

  if (storeNameEl) storeNameEl.textContent = CONFIG.STORE_NAME;
  if (footerStoreEl) footerStoreEl.textContent = CONFIG.STORE_NAME;
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/**
 * Actualiza el título de la pestaña, etiquetas OpenGraph y marcado Schema.org Product.
 */
function updateSEOAndSchema(product) {
  document.title = `${product.name} | ${CONFIG.STORE_NAME}`;

  const ogTitle = document.getElementById('og-title');
  const ogDesc = document.getElementById('og-desc');
  const ogImage = document.getElementById('og-image');

  if (ogTitle) ogTitle.content = product.name;
  if (ogDesc) ogDesc.content = product.description;
  if (ogImage) ogImage.content = product.image;

  // Marcado estructurado Schema.org JSON-LD para Google Search
  const schemaScript = document.getElementById('schema-jsonld');
  if (schemaScript) {
    const schemaData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": [product.image, ...product.gallery],
      "description": product.description,
      "sku": product.sku,
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": CONFIG.CURRENCY_CODE,
        "price": product.price,
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };
    schemaScript.textContent = JSON.stringify(schemaData);
  }
}

/**
 * Renderiza el Breadcrumb de navegación.
 */
function renderBreadcrumb(container, product) {
  if (!container) return;
  container.innerHTML = `
    <a href="index.html" style="color: var(--primary-color);">Inicio</a>
    <span style="margin: 0 0.4rem;">/</span>
    <span>${product.category}</span>
    <span style="margin: 0 0.4rem;">/</span>
    <strong style="color: var(--text-main);">${product.name}</strong>
  `;
}

/**
 * Renderiza la ficha técnica completa del producto en el DOM.
 */
function renderProductDetail(container, product) {
  const formattedPrice = UI.formatPrice(product.price);
  const formattedOldPrice = product.oldPrice && product.oldPrice > product.price 
    ? `<span class="product-card__price-old" style="font-size: 1.1rem;">${UI.formatPrice(product.oldPrice)}</span>` 
    : '';

  const badgeGroupHTML = UI.getBadgeGroupHTML(product);
  const whatsappUrl = UI.generateWhatsAppUrl(product);
  const isOutOfStock = product.stock === 0;

  // Renderizar imágenes de la galería
  const thumbnailsHTML = product.gallery.map((imgUrl, index) => `
    <img 
      src="${imgUrl}" 
      alt="Vista ${index + 1} de ${product.name}" 
      class="gallery-thumb ${index === 0 ? 'active' : ''}" 
      data-img="${imgUrl}"
      style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${index === 0 ? 'var(--primary-color)' : 'var(--border-color)'};"
    >
  `).join('');

  // Renderizar tabla de atributos
  let attributesHTML = '';
  const attrEntries = Object.entries(product.attributes);
  if (attrEntries.length > 0) {
    const rows = attrEntries.map(([key, val]) => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-muted); width: 40%;">${key}</td>
        <td style="padding: 0.6rem 0; color: var(--text-main);">${val}</td>
      </tr>
    `).join('');

    attributesHTML = `
      <div style="margin-top: 2rem;">
        <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Especificaciones Técnicas</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2.5rem; background-color: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 2rem;">
      
      <!-- Columna Izquierda: Galería -->
      <div>
        <div style="position: relative; width: 100%; padding-top: 100%; background-color: var(--bg-main); border-radius: var(--border-radius-md); overflow: hidden; margin-bottom: 1rem;">
          ${badgeGroupHTML}
          <img 
            id="main-product-img" 
            src="${product.image}" 
            alt="${product.name}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-normal);"
          >
        </div>
        <div class="gallery-thumbs" style="display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem;">
          ${thumbnailsHTML}
        </div>
      </div>

      <!-- Columna Derecha: Información y Compra -->
      <div style="display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-size: 0.85rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted);">${product.category}</span>
          <span style="font-size: 0.85rem; color: var(--text-light); font-family: monospace;">SKU: ${product.sku}</span>
        </div>

        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.3;">${product.name}</h1>

        <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1.5rem;">
          <span style="font-size: 2rem; font-weight: 800; color: var(--text-main);">${formattedPrice}</span>
          ${formattedOldPrice}
        </div>

        <div style="background-color: var(--bg-main); border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem;">Descripción del Producto</h4>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">${product.description}</p>
        </div>

        ${attributesHTML}

        <!-- Acciones: Botón WhatsApp y Compartir -->
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: auto; padding-top: 1.5rem;">
          <a 
            href="${whatsappUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn btn--whatsapp ${isOutOfStock ? 'disabled' : ''}" 
            style="flex: 1; min-width: 200px; padding: 0.85rem 1.5rem; font-size: 1rem;"
          >
            💬 Consultar por WhatsApp
          </a>

          <button 
            id="share-btn" 
            class="btn btn--icon-only" 
            style="padding: 0.85rem 1.25rem; font-size: 0.95rem;" 
            title="Compartir enlace de este producto"
          >
            🔗 Compartir
          </button>
        </div>
      </div>
    </div>
  `;

  // Configurar interactividad de la galería de miniaturas
  const mainImg = document.getElementById('main-product-img');
  container.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      const newSrc = e.currentTarget.getAttribute('data-img');
      if (mainImg) mainImg.src = newSrc;

      container.querySelectorAll('.gallery-thumb').forEach(t => {
        t.style.borderColor = 'var(--border-color)';
      });
      e.currentTarget.style.borderColor = 'var(--primary-color)';
    });
  });

  // Configurar acción de Compartir
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        UI.showToast("¡Enlace del producto copiado al portapapeles!");
      }
    });
  }
}

/**
 * Renderiza los productos relacionados de la misma categoría.
 */
function renderRelatedProducts(allProducts, currentProduct) {
  const relatedGrid = document.getElementById('related-products-grid');
  const relatedSection = document.getElementById('related-section');

  if (!relatedGrid || !relatedSection) return;

  const related = allProducts
    .filter(p => p.category === currentProduct.category && String(p.id) !== String(currentProduct.id))
    .slice(0, 4);

  if (related.length > 0) {
    relatedSection.classList.remove('hidden');
    UI.renderProducts(relatedGrid, related);
  }
}

/**
 * Muestra pantalla de error / producto no encontrado.
 */
function renderNotFound(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">📦</div>
      <h3 class="empty-state__title">Producto No Encontrado</h3>
      <p class="empty-state__desc">${message}</p>
      <a href="index.html" class="btn btn--primary" style="margin-top: 1.5rem;">
        Volver al Catálogo Principal
      </a>
    </div>
  `;
}

/**
 * Skeleton Loader para el detalle del producto.
 */
function renderDetailSkeleton(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
      <div class="skeleton" style="height: 400px; border-radius: var(--border-radius-lg);"></div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="skeleton" style="height: 20px; width: 30%;"></div>
        <div class="skeleton" style="height: 36px; width: 80%;"></div>
        <div class="skeleton" style="height: 40px; width: 40%;"></div>
        <div class="skeleton" style="height: 120px; width: 100%;"></div>
        <div class="skeleton" style="height: 50px; width: 100%; margin-top: auto;"></div>
      </div>
    </div>
  `;
}
