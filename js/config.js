/**
 * ============================================================================
 * ARCHIVO DE CONFIGURACIÓN GLOBAL DEFINITIVO DE PRODUCCIÓN (config.js)
 * ============================================================================
 * 
 * Centraliza toda la configuración del comercio.
 * 
 * Comercio: Mi Catálogo
 * Ubicación: Charata, Chaco, Argentina
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 3.1.0
 */

/**
 * URL Definitiva de la API en Google Apps Script.
 */
const API_URL = "https://script.google.com/macros/s/AKfycbwoqeHYiSRB3GWST-_GAWO-mF1nxVlmah55weS-8X_525525CxIWGbn3fXA3PJBtifh/exec";

/**
 * URL Documental de la Hoja de Cálculo en Google Sheets (Referencia).
 */
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1kWK_t5H2rSN_3DhWUBbwoJQOLw0SVmbMhBngOKg8FJw/edit";

/**
 * Objeto Principal de Configuración.
 */
const CONFIG = {
  // Información del Comercio
  STORE_NAME: "Mi Catálogo",
  STORE_DESCRIPTION: "Catálogo de productos de Mi Catálogo - Charata, Chaco, Argentina. Consultas directas por WhatsApp.",
  STORE_CITY: "Charata",
  STORE_PROVINCE: "Chaco",
  STORE_COUNTRY: "Argentina",

  // Datos de Contacto y Mensajería
  WHATSAPP_NUMBER: "5493731515594",
  DEFAULT_WHATSAPP_MESSAGE: "Hola. Vi este producto en tu catálogo web y quisiera más información.",
  WHATSAPP_MESSAGE_TEMPLATE: "Hola. Vi el producto *{PRODUCT}* (SKU: {SKU}) en tu catálogo web y quisiera más información. Enlace: {URL}",

  // Moneda e Idioma
  CURRENCY: "Peso Argentino",
  CURRENCY_SYMBOL: "$",
  CURRENCY_CODE: "ARS",
  LANGUAGE: "es-AR",
  TIMEZONE: "America/Argentina/Cordoba",

  // Recursos Locales de Marca (Sin dependencias externas)
  LOGO_PATH: "assets/logo.png",
  FAVICON_PATH: "assets/favicon.ico",
  PLACEHOLDER_IMAGE: "assets/placeholder.png",

  // Parámetros de Rendimiento e Interfaz
  PRODUCTS_PER_PAGE: 12,
  SKELETON_COUNT: 8,
  THEME_DEFAULT: "light",
  THEME_STORAGE_KEY: "catalogo_theme_preference",

  // Redes Sociales (Eliminadas las ficticias por solicitud)
  SOCIAL_LINKS: null,

  // Configuración de Seguridad en Producción (Desactivar datos ficticios en caso de error)
  USE_MOCK_DATA_ON_FAILURE: false
};
