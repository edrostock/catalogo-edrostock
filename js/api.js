/**
 * ============================================================================
 * MÓDULO API Y MANEJO DE DATOS EN PRODUCCIÓN (api.js)
 * ============================================================================
 * 
 * Gestiona la comunicación asíncrona mediante fetch() con el endpoint de 
 * Google Apps Script en producción.
 * 
 * Normaliza los campos recibidos (titulo, nombre, categorias, visible, popular, etc.)
 * y extrae dinámicamente las categorías únicas sin hardcoding.
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 3.1.0
 */

const ApiService = {

  /**
   * Obtiene y procesa la lista completa de productos desde Google Apps Script.
   * 
   * @returns {Promise<Array<Object>>} Promesa que resuelve a los productos normalizados.
   */
  async getProducts() {
    try {
      console.log("📡 Conectando con la API de Google Apps Script...");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Soportar respuestas como arreglo directo o dentro de un objeto contenedor
      let productsList = [];
      if (Array.isArray(rawData)) {
        productsList = rawData;
      } else if (rawData && Array.isArray(rawData.products)) {
        productsList = rawData.products;
      } else if (rawData && Array.isArray(rawData.data)) {
        productsList = rawData.data;
      }

      // Normalizar objetos y filtrar únicamente los que tengan visible !== false
      return productsList
        .map(product => this.normalizeProduct(product))
        .filter(p => p.visible !== false && p.name !== "Producto sin nombre");

    } catch (error) {
      console.error("❌ Error al obtener los datos de la API:", error.message);

      // Si la bandera USE_MOCK_DATA_ON_FAILURE estuviera activa (deshabilitada en producción)
      if (CONFIG.USE_MOCK_DATA_ON_FAILURE) {
        return this.getMockProducts();
      }

      // En producción propagamos el error para que la UI informe adecuadamente al usuario
      throw error;
    }
  },

  /**
   * Extrae la lista única de categorías desde los productos recibidos.
   * 
   * @param {Array<Object>} products - Arreglo de productos.
   * @returns {Array<string>} Arreglo de nombres de categorías ordenadas.
   */
  getCategories(products) {
    if (!Array.isArray(products)) return [];
    
    const categoriesSet = new Set();
    products.forEach(p => {
      if (p.category && typeof p.category === 'string' && p.category.trim() !== '') {
        p.category.split(',').forEach(c => categoriesSet.add(c.trim()));
      }
    });

    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  },

  /**
   * Normaliza la estructura de un producto proveniente de la API.
   * 
   * @param {Object} raw - Objeto de producto recibido.
   * @returns {Object} Objeto normalizado.
   */
  normalizeProduct(raw) {
    const name = raw.titulo || raw.nombre || raw.name || raw.Nombre || "Producto sin nombre";
    const price = parseFloat(raw.precio || raw.price || raw.Precio || 0);
    const oldPriceRaw = raw.precioAnterior || raw.oldPrice || raw.PrecioAnterior;
    const oldPrice = oldPriceRaw ? parseFloat(oldPriceRaw) : null;

    let discountPercent = 0;
    if (oldPrice && oldPrice > price) {
      discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
    }

    // Normalizar categorías (Array o String)
    let category = "General";
    if (Array.isArray(raw.categorias) && raw.categorias.length > 0) {
      category = raw.categorias.join(', ');
    } else if (Array.isArray(raw.category) && raw.category.length > 0) {
      category = raw.category.join(', ');
    } else if (raw.categoria || raw.category || raw.Categoria) {
      category = String(raw.categoria || raw.category || raw.Categoria);
    }

    const mainImage = raw.imagen || raw.image || raw.Imagen || CONFIG.PLACEHOLDER_IMAGE;

    return {
      id: String(raw.id || raw.ID || Math.random().toString(36).substr(2, 9)),
      name: String(name),
      subtitle: String(raw.subtitulo || raw.subtitle || ""),
      price: price,
      oldPrice: oldPrice,
      discountPercent: discountPercent,
      category: category,
      tag: String(raw.etiqueta || raw.tag || raw.Etiqueta || ""),
      stock: parseInt(raw.stock || raw.Stock || 0, 10),
      description: String(raw.descripcion || raw.description || raw.Descripcion || "Sin descripción disponible."),
      sku: String(raw.sku || raw.SKU || `SKU-${Math.floor(1000 + Math.random() * 9000)}`),
      image: mainImage,
      gallery: this.parseGallery(raw.galeria || raw.gallery || raw.Galeria, mainImage),
      attributes: typeof raw.atributos === 'object' && raw.atributos !== null ? raw.atributos : {},
      status: String(raw.estado || raw.status || raw.Estado || "activo"),
      visible: raw.visible !== undefined ? Boolean(raw.visible) : true,
      popularity: parseInt(raw.popular || raw.popularidad || raw.popularity || 0, 10),
      createdAt: raw.fecha || raw.createdAt || raw.Fecha || new Date().toISOString()
    };
  },

  /**
   * Procesa la galería de imágenes utilizando el placeholder local si es necesario.
   */
  parseGallery(galleryData, mainImage) {
    if (Array.isArray(galleryData) && galleryData.length > 0) {
      return galleryData;
    }
    if (typeof galleryData === "string" && galleryData.trim() !== "") {
      return galleryData.split(",").map(url => url.trim());
    }
    return mainImage ? [mainImage] : [CONFIG.PLACEHOLDER_IMAGE];
  },

  /**
   * Fallback de emergencia (desactivado por omisión en producción).
   */
  getMockProducts() {
    return [];
  }
};
