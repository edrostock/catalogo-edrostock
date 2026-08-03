/**
 * ============================================================================
 * MÓDULO DE INTERFAZ DE USUARIO (ui.js)
 * ============================================================================
 * 
 * Gestiona la renderización completa del DOM:
 * - Tarjetas de producto enriquecidas con porcentajes de descuento, SKU y stock.
 * - Categorías dinámicas derivadas automáticamenate de los datos.
 * - IntersectionObserver para Lazy Loading real de imágenes.
 * - Modo Claro / Oscuro con almacenamiento en localStorage.
 * - Paginación e interacciones sociales (WhatsApp y Web Share API).
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 2.0.0
 */

const UI = {

  // Instancia global del IntersectionObserver para Lazy Loading
  imageObserver: null,
  // Almacén local de productos renderizados actualmente
  currentProducts: [],

  /**
   * Inicializa el gestor de Tema Claro / Oscuro.
   */
  initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || CONFIG.DEFAULT_THEME;

    this.setTheme(savedTheme);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
      });
    }
  },

  /**
   * Aplica un tema determinado ('light' o 'dark').
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },

  /**
   * Formatea un número como valor monetario.
   */
  formatPrice(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return `${CONFIG.CURRENCY_SYMBOL}0.00`;
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: CONFIG.CURRENCY_CODE,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Renderiza Skeletons de carga.
   */
  renderSkeletons(container, count = CONFIG.SKELETON_COUNT) {
    if (!container) return;

    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
      skeletonHTML += `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton skeleton-card__img"></div>
          <div class="skeleton-card__body">
            <div class="skeleton skeleton-card__text--short"></div>
            <div class="skeleton skeleton-card__text"></div>
            <div class="skeleton skeleton-card__text--short"></div>
            <div class="skeleton skeleton-card__button"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = skeletonHTML;
  },

  /**
   * Renderiza los botones de categorías dinámicas en la barra de navegación.
   * 
   * @param {HTMLElement} container - Contenedor `#categories-container`.
   * @param {Array<string>} categories - Lista de nombres de categorías.
   * @param {string} activeCategory - Categoría seleccionada actualmente.
   * @param {Function} onSelectCallback - Callback al hacer clic en una categoría.
   */
  renderCategories(container, categories, activeCategory = 'all', onSelectCallback) {
    if (!container) return;

    const allCategories = ['all', ...categories];

    const buttonsHTML = allCategories.map(cat => {
      const isAll = cat === 'all';
      const label = isAll ? 'Todas' : cat;
      const isActive = activeCategory.toLowerCase() === cat.toLowerCase();

      return `
        <button 
          class="category-btn ${isActive ? 'active' : ''}" 
          data-category="${cat}"
        >
          ${label}
        </button>
      `;
    }).join('');

    container.innerHTML = buttonsHTML;

    // Asignar listeners
    if (typeof onSelectCallback === 'function') {
      container.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const selectedCat = e.currentTarget.getAttribute('data-category');
          onSelectCallback(selectedCat);
        });
      });
    }
  },

  /**
   * Genera el marcado de insignias (Badges) para el producto.
   */
  getBadgeGroupHTML(product) {
    let html = '<div class="product-card__badge-group">';

    // Badge de Descuento (ej: -25%)
    if (product.discountPercent > 0) {
      html += `<span class="product-card__badge product-card__badge--discount">-${product.discountPercent}%</span>`;
    }

    // Badge de Estado / Stock
    if (product.stock === 0 || product.tag.toLowerCase() === 'agotado') {
      html += `<span class="product-card__badge product-card__badge--out">Agotado</span>`;
    } else if (product.stock === 1 || product.tag.toLowerCase() === 'última unidad') {
      html += `<span class="product-card__badge product-card__badge--last">Última unidad</span>`;
    } else if (product.oldPrice && product.oldPrice > product.price || product.tag.toLowerCase() === 'oferta') {
      html += `<span class="product-card__badge product-card__badge--sale">Oferta</span>`;
    } else if (product.tag.toLowerCase() === 'nuevo') {
      html += `<span class="product-card__badge product-card__badge--new">Nuevo</span>`;
    } else if (product.tag) {
      html += `<span class="product-card__badge product-card__badge--new">${product.tag}</span>`;
    }

    html += '</div>';
    return html;
  },

  /**
   * Genera el HTML del botón o control de cantidad según el estado en el carrito.
   */
  renderProductActionButton(product) {
    const isOutOfStock = product.stock === 0;
    const qty = typeof Cart !== 'undefined' ? Cart.getItemQuantity(product.id) : 0;

    if (qty > 0) {
      const isMaxStock = product.stock && qty >= product.stock;
      return `
        <div class="card-qty-control" data-id="${product.id}">
          <button class="btn-qty-minus card-qty-btn" data-id="${product.id}" aria-label="Restar">-</button>
          <span class="card-qty-value">${qty}</span>
          <button class="btn-qty-plus card-qty-btn ${isMaxStock ? 'disabled' : ''}" data-id="${product.id}" aria-label="Sumar" ${isMaxStock ? 'disabled' : ''}>+</button>
        </div>
      `;
    }

    return `
      <button 
        class="btn btn--whatsapp btn-add-cart ${isOutOfStock ? 'disabled' : ''}"
        data-id="${product.id}"
        ${isOutOfStock ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}
      >
        Agregar al Carrito
      </button>
    `;
  },

  /**
   * Renderiza la lista de tarjetas de producto en la grilla.
   * 
   * @param {HTMLElement} container - Elemento `#products-grid`.
   * @param {Array<Object>} products - Arreglo de productos a renderizar.
   */
  renderProducts(container, products) {
    if (!container) return;

    this.currentProducts = products || [];

    if (!products || products.length === 0) {
      container.innerHTML = '';
      this.toggleEmptyState(true);
      return;
    }

    this.toggleEmptyState(false);

    const cardsHTML = products.map(product => {
      const badgeGroupHTML = this.getBadgeGroupHTML(product);
      const formattedPrice = this.formatPrice(product.price);
      const formattedOldPrice = product.oldPrice && product.oldPrice > product.price 
        ? `<span class="product-card__price-old">${this.formatPrice(product.oldPrice)}</span>` 
        : '';

      const detailUrl = `producto.html?id=${encodeURIComponent(product.id)}`;
      const actionButtonHTML = this.renderProductActionButton(product);

      return `
        <article class="product-card" data-id="${product.id}">
          <div class="product-card__image-wrapper">
            ${badgeGroupHTML}
            <a href="${detailUrl}" aria-label="Ver detalles de ${product.name}">
              <img 
                data-src="${product.image}" 
                src="${CONFIG.PLACEHOLDER_IMAGE}"
                alt="${product.name}" 
                class="product-card__image lazy-img"
                onerror="this.onerror=null; this.src='${CONFIG.PLACEHOLDER_IMAGE}';"
              >
            </a>
          </div>

          <div class="product-card__content">
            <div class="product-card__meta-top">
              <span class="product-card__category">${product.category}</span>
              <span class="product-card__sku">${product.sku}</span>
            </div>

            <h2 class="product-card__title">
              <a href="${detailUrl}">${product.name}</a>
            </h2>
            
            <div class="product-card__price-container">
              <span class="product-card__price">${formattedPrice}</span>
              ${formattedOldPrice}
            </div>

            <div class="product-card__actions">
              <a href="${detailUrl}" class="btn btn--primary">
                Ver Más
              </a>
              <div class="card-action-wrapper" data-id="${product.id}">
                ${actionButtonHTML}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = cardsHTML;

    // Inicializar IntersectionObserver para las nuevas imágenes cargadas
    this.initIntersectionObserver(container);

    // Event Delegation para botones de tarjetas (Agregar, +, -)
    if (!container.dataset.hasCartListeners) {
      container.dataset.hasCartListeners = "true";
      container.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.btn-add-cart');
        const plusBtn = e.target.closest('.btn-qty-plus');
        const minusBtn = e.target.closest('.btn-qty-minus');

        if (addBtn) {
          e.preventDefault();
          const id = addBtn.getAttribute('data-id');
          const product = this.currentProducts.find(p => String(p.id) === String(id));
          if (product && typeof Cart !== 'undefined') {
            Cart.addItem(product);
          }
        } else if (plusBtn) {
          e.preventDefault();
          const id = plusBtn.getAttribute('data-id');
          if (typeof Cart !== 'undefined') {
            const currentQty = Cart.getItemQuantity(id);
            Cart.updateQuantity(id, currentQty + 1);
          }
        } else if (minusBtn) {
          e.preventDefault();
          const id = minusBtn.getAttribute('data-id');
          if (typeof Cart !== 'undefined') {
            const currentQty = Cart.getItemQuantity(id);
            Cart.updateQuantity(id, currentQty - 1);
          }
        }
      });
    }
  },

  /**
   * Actualiza el HTML de los controles de acción en las tarjetas sin re-renderizar la grilla.
   */
  updateCardActions() {
    document.querySelectorAll('.card-action-wrapper').forEach(wrapper => {
      const id = wrapper.getAttribute('data-id');
      if (id && this.currentProducts) {
        const product = this.currentProducts.find(p => String(p.id) === String(id));
        if (product) {
          wrapper.innerHTML = this.renderProductActionButton(product);
        }
      }
    });

    // Actualizar también en la ficha técnica si estamos en producto.html
    const detailWrapper = document.getElementById('detail-action-wrapper');
    if (detailWrapper && typeof currentDetailProduct !== 'undefined') {
      detailWrapper.innerHTML = this.renderProductActionButton(currentDetailProduct);
    }
  },

  /**
   * Implementa Lazy Loading real mediante IntersectionObserver para máximo rendimiento.
   */
  initIntersectionObserver(container) {
    const lazyImages = container.querySelectorAll('.lazy-img');

    if ('IntersectionObserver' in window) {
      if (this.imageObserver) this.imageObserver.disconnect();

      this.imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const realSrc = img.getAttribute('data-src');
            if (realSrc) {
              img.src = realSrc;
              img.classList.remove('lazy-img');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px 0px' });

      lazyImages.forEach(img => this.imageObserver.observe(img));
    } else {
      // Fallback para navegadores antiguos
      lazyImages.forEach(img => {
        const realSrc = img.getAttribute('data-src');
        if (realSrc) img.src = realSrc;
      });
    }
  },

  /**
   * Genera el enlace directo a WhatsApp con el mensaje formateado.
   */
  generateWhatsAppUrl(product) {
    const currentUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}producto.html?id=${product.id}`;
    let message = CONFIG.WHATSAPP_MESSAGE_TEMPLATE
      .replace('{PRODUCT}', product.name)
      .replace('{SKU}', product.sku)
      .replace('{URL}', currentUrl);

    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Renderiza los controles de paginación.
   */
  renderPagination(container, paginationData, onPageChangeCallback) {
    if (!container) return;

    const { currentPage, totalPages, hasPrev, hasNext } = paginationData;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let buttonsHTML = `
      <button class="pagination__btn" id="prev-page" ${!hasPrev ? 'disabled' : ''} aria-label="Página anterior">&laquo;</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      buttonsHTML += `
        <button class="pagination__btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
      `;
    }

    buttonsHTML += `
      <button class="pagination__btn" id="next-page" ${!hasNext ? 'disabled' : ''} aria-label="Página siguiente">&raquo;</button>
    `;

    container.innerHTML = buttonsHTML;

    // Listeners
    if (typeof onPageChangeCallback === 'function') {
      container.querySelectorAll('.pagination__btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget;
          if (target.disabled) return;

          if (target.id === 'prev-page') {
            onPageChangeCallback(currentPage - 1);
          } else if (target.id === 'next-page') {
            onPageChangeCallback(currentPage + 1);
          } else {
            const pageNum = parseInt(target.getAttribute('data-page'), 10);
            onPageChangeCallback(pageNum);
          }
        });
      });
    }
  },

  /**
   * Muestra notificaciones flotantes (Toast).
   */
  showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  },

  /**
   * Muestra u oculta el estado vacío.
   */
  toggleEmptyState(show) {
    const emptyStateEl = document.getElementById('empty-state');
    if (emptyStateEl) {
      emptyStateEl.classList.toggle('hidden', !show);
    }
  },

  /**
   * Actualiza el contador de productos.
   */
  updateProductCount(showingCount, totalCount) {
    const countEl = document.getElementById('product-count');
    if (countEl) {
      countEl.textContent = showingCount === totalCount
        ? `Mostrando ${totalCount} productos`
        : `Mostrando ${showingCount} de ${totalCount} productos`;
    }
  }
};
