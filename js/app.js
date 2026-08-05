/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL Y ORQUESTADOR DE LA APLICACIÓN (app.js)
 * ============================================================================
 * 
 * Gestiona el flujo de datos principal, los eventos del DOM, la paginación,
 * los filtros combinados, el ciclo de vida del catálogo y el Service Worker.
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 2.0.0
 */

// Estado Global Centralizado de la Aplicación
const AppState = {
  allProducts: [],         // Lista completa original recibida de Google Apps Script
  filteredProducts: [],    // Productos filtrados según la búsqueda, categoría y filtros
  categories: [],          // Categorías únicas detectadas automáticamente
  
  // Criterios de filtrado actuales
  criteria: {
    searchQuery: '',
    category: 'all',
    availability: 'all',
    minPrice: null,
    maxPrice: null,
    sortBy: 'default'
  },

  // Estado de paginación
  pagination: {
    currentPage: 1,
    limit: CONFIG.PRODUCTS_PER_PAGE
  }
};

/**
 * Evento Principal DOMContentLoaded - Inicialización del catálogo
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Inicializando Mi Catálogo Web Pro...");

  // 1. Inicializar Tema Claro / Oscuro y Sidebar Móvil
  UI.initThemeToggle();
  UI.initMobileSidebar();

  // 2. Configurar la información de la marca desde config.js
  initStoreBrand();

  // 3. Registrar Service Worker para PWA y funcionamiento offline
  registerServiceWorker();

  // 4. Renderizar tarjetas fantasma (Skeletons) mientras carga los datos
  const productsGrid = document.getElementById('products-grid');
  UI.renderSkeletons(productsGrid, CONFIG.SKELETON_COUNT);

  try {
    // 5. Obtener productos mediante ApiService
    const products = await ApiService.getProducts();

    // Guardar en el Estado Global
    AppState.allProducts = products;
    AppState.filteredProducts = [...products];

    // 6. Extraer y renderizar categorías dinámicamente
    AppState.categories = ApiService.getCategories(products);
    renderCategoriesUI();

    // 7. Aplicar filtros iniciales y renderizar catálogo paginado
    applyFiltersAndRender();

    // 8. Configurar todos los Event Listeners (Buscador, Selectores, Botones)
    setupEventListeners();

    console.log(`✨ Catálogo iniciado con ${products.length} productos y ${AppState.categories.length} categorías únicas.`);

  } catch (error) {
    console.error("💥 Error al inicializar el catálogo:", error);
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h3 class="empty-state__title">Error al cargar productos</h3>
          <p class="empty-state__desc">Por favor, verifica la configuración de tu API en config.js o intenta nuevamente.</p>
        </div>
      `;
    }
  }
});

/**
 * Configura textos y marcas de la tienda.
 */
function initStoreBrand() {
  const storeNameEl = document.getElementById('store-name-display');
  const storeDescEl = document.getElementById('store-description-display');
  const footerStoreEl = document.getElementById('footer-store-name');
  const yearEl = document.getElementById('current-year');
  const floatingWa = document.getElementById('floating-whatsapp');

  if (storeNameEl) storeNameEl.textContent = CONFIG.STORE_NAME;
  if (storeDescEl) storeDescEl.textContent = CONFIG.STORE_DESCRIPTION;
  if (footerStoreEl) footerStoreEl.textContent = CONFIG.STORE_NAME;
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (floatingWa) {
    const waUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Vengo desde su catálogo web y deseo consultar sobre sus productos.')}`;
    floatingWa.href = waUrl;
  }
}

/**
 * Renderiza los botones de categorías en el DOM.
 */
function renderCategoriesUI() {
  const categoriesContainer = document.getElementById('categories-container');
  UI.renderCategories(categoriesContainer, AppState.categories, AppState.criteria.category, (selectedCat) => {
    AppState.criteria.category = selectedCat;
    AppState.pagination.currentPage = 1;
    renderCategoriesUI();
    applyFiltersAndRender();
  });
}

/**
 * Aplica los filtros combinados del motor FilterEngine y renderiza la vista paginada.
 */
function applyFiltersAndRender() {
  const productsGrid = document.getElementById('products-grid');
  const paginationContainer = document.getElementById('pagination-container');

  AppState.filteredProducts = FilterEngine.applyAllFilters(AppState.allProducts, AppState.criteria);

  const pageData = FilterEngine.paginate(
    AppState.filteredProducts, 
    AppState.pagination.currentPage, 
    CONFIG.PRODUCTS_PER_PAGE
  );

  UI.renderProducts(productsGrid, pageData.items);

  UI.renderPagination(paginationContainer, pageData, (newPage) => {
    AppState.pagination.currentPage = newPage;
    applyFiltersAndRender();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  });

  UI.updateProductCount(pageData.items.length, AppState.filteredProducts.length);
}

/**
 * Configura los eventos de interacción del usuario.
 */
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const availabilitySelect = document.getElementById('filter-availability');
  const priceMinInput = document.getElementById('filter-price-min');
  const priceMaxInput = document.getElementById('filter-price-max');
  const clearFiltersBtn = document.getElementById('btn-clear-filters');
  const backToTopBtn = document.getElementById('back-to-top');

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        AppState.criteria.searchQuery = e.target.value;
        AppState.pagination.currentPage = 1;
        applyFiltersAndRender();
      }, 200);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.criteria.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  if (availabilitySelect) {
    availabilitySelect.addEventListener('change', (e) => {
      AppState.criteria.availability = e.target.value;
      AppState.pagination.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // Filtros de Rango de Precio (Min / Max)
  const handlePriceChange = () => {
    const minVal = priceMinInput ? parseFloat(priceMinInput.value) : null;
    const maxVal = priceMaxInput ? parseFloat(priceMaxInput.value) : null;
    AppState.criteria.minPrice = !isNaN(minVal) ? minVal : null;
    AppState.criteria.maxPrice = !isNaN(maxVal) ? maxVal : null;
    AppState.pagination.currentPage = 1;
    applyFiltersAndRender();
  };

  let priceDebounceTimer;
  if (priceMinInput) {
    priceMinInput.addEventListener('input', () => {
      clearTimeout(priceDebounceTimer);
      priceDebounceTimer = setTimeout(handlePriceChange, 300);
    });
  }
  if (priceMaxInput) {
    priceMaxInput.addEventListener('input', () => {
      clearTimeout(priceDebounceTimer);
      priceDebounceTimer = setTimeout(handlePriceChange, 300);
    });
  }

  // Botón Limpiar Filtros
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      AppState.criteria = {
        searchQuery: '',
        category: 'all',
        availability: 'all',
        minPrice: null,
        maxPrice: null,
        sortBy: 'default'
      };
      if (searchInput) searchInput.value = '';
      if (availabilitySelect) availabilitySelect.value = 'all';
      if (sortSelect) sortSelect.value = 'default';
      if (priceMinInput) priceMinInput.value = '';
      if (priceMaxInput) priceMaxInput.value = '';
      AppState.pagination.currentPage = 1;
      
      renderCategoriesUI();
      applyFiltersAndRender();
    });
  }

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.remove('hidden');
      } else {
        backToTopBtn.classList.add('hidden');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/**
 * Registra el Service Worker de la PWA.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('📱 Service Worker registrado con éxito:', reg.scope))
        .catch((err) => console.warn('⚠️ No se pudo registrar el Service Worker:', err));
    });
  }
}
