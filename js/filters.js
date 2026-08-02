/**
 * ============================================================================
 * MOTOR DE FILTRADO, BÚSQUEDA Y PAGINACIÓN (filters.js)
 * ============================================================================
 * 
 * Este módulo contiene toda la lógica pura de filtrado, búsqueda multicampo,
 * ordenamiento y paginación en memoria.
 * Aplica funciones inmutables (no altera el arreglo original de productos).
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 2.0.0
 */

const FilterEngine = {

  /**
   * Realiza una búsqueda instantánea en múltiples campos de un producto.
   * Busca coincidencias en: Nombre, SKU, Categoría, Descripción y Etiquetas.
   * 
   * @param {Array<Object>} products - Lista de productos.
   * @param {string} query - Texto ingresado por el usuario.
   * @returns {Array<Object>} Productos que coinciden con la búsqueda.
   */
  search(products, query) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return products;
    }

    const cleanQuery = query.toLowerCase().trim();

    return products.filter(product => {
      const matchName = product.name.toLowerCase().includes(cleanQuery);
      const matchSku = product.sku.toLowerCase().includes(cleanQuery);
      const matchCategory = product.category.toLowerCase().includes(cleanQuery);
      const matchDesc = product.description.toLowerCase().includes(cleanQuery);
      const matchTag = product.tag.toLowerCase().includes(cleanQuery);

      return matchName || matchSku || matchCategory || matchDesc || matchTag;
    });
  },

  /**
   * Filtra productos por categoría específica.
   * 
   * @param {Array<Object>} products - Lista de productos.
   * @param {string} category - Nombre de la categoría o 'all'.
   * @returns {Array<Object>} Productos filtrados por categoría.
   */
  filterByCategory(products, category) {
    if (!category || category === 'all') return products;
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  },

  /**
   * Filtra productos por rango de precio.
   * 
   * @param {Array<Object>} products - Lista de productos.
   * @param {number|null} minPrice - Precio mínimo.
   * @param {number|null} maxPrice - Precio máximo.
   * @returns {Array<Object>} Productos dentro del rango de precio.
   */
  filterByPrice(products, minPrice, maxPrice) {
    return products.filter(p => {
      const price = p.price;
      const passMin = minPrice === null || isNaN(minPrice) || price >= minPrice;
      const passMax = maxPrice === null || isNaN(maxPrice) || price <= maxPrice;
      return passMin && passMax;
    });
  },

  /**
   * Filtra productos según su disponibilidad en stock.
   * 
   * @param {Array<Object>} products - Lista de productos.
   * @param {string} availability - 'all', 'in-stock', 'out-of-stock'.
   * @returns {Array<Object>} Productos filtrados por stock.
   */
  filterByStock(products, availability) {
    if (!availability || availability === 'all') return products;
    if (availability === 'in-stock') return products.filter(p => p.stock > 0);
    if (availability === 'out-of-stock') return products.filter(p => p.stock === 0);
    return products;
  },

  /**
   * Ordena el arreglo de productos según el criterio especificado.
   * 
   * @param {Array<Object>} products - Lista de productos a ordenar.
   * @param {string} sortBy - Criterio ('newest', 'popularity', 'price-asc', 'price-desc', 'name-asc', 'name-desc').
   * @returns {Array<Object>} Nuevo arreglo ordenado.
   */
  sort(products, sortBy) {
    // Clonamos el arreglo para mantener inmutabilidad
    const copy = [...products];

    switch (sortBy) {
      case 'price-asc':
        return copy.sort((a, b) => a.price - b.price);

      case 'price-desc':
        return copy.sort((a, b) => b.price - a.price);

      case 'name-asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

      case 'name-desc':
        return copy.sort((a, b) => b.name.localeCompare(a.name, 'es', { sensitivity: 'base' }));

      case 'popularity':
      case 'best-sellers':
        return copy.sort((a, b) => b.popularity - a.popularity);

      case 'newest':
        return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      case 'default':
      default:
        return copy;
    }
  },

  /**
   * Aplica de forma combinada todos los filtros y el ordenamiento.
   * 
   * @param {Array<Object>} products - Arreglo base de productos.
   * @param {Object} criteria - Criterios de filtrado.
   * @returns {Array<Object>} Resultado final procesado.
   */
  applyAllFilters(products, criteria = {}) {
    let result = [...products];

    // 1. Filtro por búsqueda de texto
    if (criteria.searchQuery) {
      result = this.search(result, criteria.searchQuery);
    }

    // 2. Filtro por categoría
    if (criteria.category) {
      result = this.filterByCategory(result, criteria.category);
    }

    // 3. Filtro por rango de precio
    result = this.filterByPrice(result, criteria.minPrice, criteria.maxPrice);

    // 4. Filtro por disponibilidad
    if (criteria.availability) {
      result = this.filterByStock(result, criteria.availability);
    }

    // 5. Ordenamiento final
    if (criteria.sortBy) {
      result = this.sort(result, criteria.sortBy);
    }

    return result;
  },

  /**
   * Realiza la paginación de un arreglo de productos.
   * 
   * @param {Array<Object>} products - Arreglo de productos completo o filtrado.
   * @param {number} page - Número de página actual (1-indexed).
   * @param {number} limit - Elementos por página.
   * @returns {Object} Datos de paginación e ítems de la página actual.
   */
  paginate(products, page = 1, limit = CONFIG.PRODUCTS_PER_PAGE) {
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const items = products.slice(startIndex, endIndex);

    return {
      items,
      currentPage,
      totalPages,
      totalItems,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages
    };
  }
};
