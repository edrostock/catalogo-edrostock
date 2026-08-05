/**
 * ============================================================================
 * MÓDULO DEL CARRITO DE COMPRAS (cart.js)
 * ============================================================================
 * 
 * Gestiona el estado del carrito, persistencia en localStorage, 
 * renderizado del panel del carrito y el envío por WhatsApp.
 * 
 * @version 1.0.0
 */

const Cart = {
  items: [],
  appliedCoupon: null,
  deliveryMethod: 'pickup', // 'pickup' | 'delivery'
  shippingCost: 1500,
  coupons: [
    { code: 'RAMON', tipo: 'porcentaje', valor: 25, montoMinimo: 0, activo: true },
    { code: 'PABLO', tipo: 'porcentaje', valor: 15, montoMinimo: 0, activo: true },
    { code: 'MENOS100', tipo: 'monto', valor: 100, montoMinimo: 500, activo: false },
    { code: 'MENOS200', tipo: 'monto', valor: 200, montoMinimo: 1500, activo: false },
    { code: 'ENVIOGRATIS', tipo: 'envio_gratis', valor: 0, montoMinimo: 800, activo: false },
    { code: 'BLACKFRIDAY', tipo: 'porcentaje', valor: 30, montoMinimo: 0, activo: false }
  ],
  STORAGE_KEY: 'edrostock_cart',

  init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.updateUI();
  },

  setCoupons(couponList) {
    if (Array.isArray(couponList) && couponList.length > 0) {
      this.coupons = couponList.map(c => ({
        code: String(c.code || c.codigo || '').trim().toUpperCase(),
        tipo: String(c.tipo || 'porcentaje').trim().toLowerCase(),
        valor: parseFloat(c.valor) || 0,
        montoMinimo: parseFloat(c.montoMinimo || c.montominimo || 0) || 0,
        activo: c.activo !== false && String(c.activo).toUpperCase() !== 'FALSE'
      }));
    }
  },

  loadFromStorage() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (e) {
        this.items = [];
      }
    }
  },

  saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
  },

  addItem(product, variantLabel = null) {
    if (product.stock === 0) {
      if (typeof UI !== 'undefined') UI.showToast("Este producto está agotado.");
      return;
    }

    const itemKey = variantLabel ? `${product.id}_${variantLabel}` : product.id;
    const existingItem = this.items.find(item => (item.itemKey || item.id) === itemKey);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock || !product.stock) {
        existingItem.quantity += 1;
        if (typeof UI !== 'undefined') UI.showToast("Cantidad aumentada en el carrito.");
      } else {
        if (typeof UI !== 'undefined') UI.showToast("No hay más stock disponible.");
      }
    } else {
      this.items.push({
        id: product.id,
        itemKey: itemKey,
        name: product.name,
        price: product.price,
        image: product.image,
        sku: product.sku,
        stock: product.stock,
        variant: variantLabel,
        appliesCoupon: product.appliesCoupon !== false,
        quantity: 1
      });
      if (typeof UI !== 'undefined') UI.showToast("Producto agregado al carrito.");
    }
    
    this.saveToStorage();
    this.updateUI();
  },

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveToStorage();
    this.updateUI();
  },

  updateQuantity(productId, newQuantity) {
    const item = this.items.find(item => item.id === productId);
    if (item) {
      if (newQuantity <= 0) {
        this.removeItem(productId);
      } else if (item.stock && newQuantity > item.stock) {
        if (typeof UI !== 'undefined') UI.showToast("No hay suficiente stock.");
      } else {
        item.quantity = newQuantity;
        this.saveToStorage();
        this.updateUI();
      }
    }
  },

  getSubtotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  isItemEligible(item) {
    if (!item) return false;

    const title = String(item.name || item.titulo || '').toLowerCase().trim();
    const cleanTitle = title.replace(/[^a-z0-9]/g, '_');
    const sku = String(item.sku || '').toLowerCase().trim();
    const id = item.id || '';

    let slugKey = 'id_' + id;
    if (title) slugKey = 'title_' + cleanTitle;
    else if (sku && sku !== '-') slugKey = 'sku_' + sku.replace(/[^a-z0-9]/g, '_');

    // 1. Verificar mapa global edrostock_coupon_map
    try {
      const map = JSON.parse(localStorage.getItem('edrostock_coupon_map')) || {};
      if (map[slugKey] !== undefined) return map[slugKey] === true;
    } catch (e) {}

    // 2. Si está excluido en CONFIG.COUPON_EXCLUSIONS
    if (typeof CONFIG !== 'undefined' && CONFIG.COUPON_EXCLUSIONS && CONFIG.COUPON_EXCLUSIONS[cleanTitle] === false) {
      return false;
    }

    // 3. Verificar en AppState.allProducts (Catálogo cargado)
    if (typeof AppState !== 'undefined' && Array.isArray(AppState.allProducts)) {
      const prod = AppState.allProducts.find(p => p.name === item.name || String(p.id) === String(item.id));
      if (prod && prod.appliesCoupon === false) {
        return false;
      }
    }

    // 4. Verificar si el objeto del carrito fue marcado explícitamente como no elegible
    if (item.appliesCoupon === false) return false;

    return true;
  },

  getEligibleSubtotal() {
    return this.items
      .filter(item => this.isItemEligible(item))
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  getDiscountAmount() {
    if (!this.appliedCoupon) return 0;
    const eligibleSubtotal = this.getEligibleSubtotal();
    
    if (this.appliedCoupon.tipo === 'porcentaje') {
      return (eligibleSubtotal * this.appliedCoupon.valor) / 100;
    } else if (this.appliedCoupon.tipo === 'monto') {
      return Math.min(eligibleSubtotal, this.appliedCoupon.valor);
    } else if (this.appliedCoupon.tipo === 'envio_gratis') {
      return 0;
    }
    return 0;
  },

  getShippingFee() {
    if (this.deliveryMethod !== 'delivery') return 0;
    if (this.appliedCoupon && this.appliedCoupon.tipo === 'envio_gratis') return 0;
    return this.shippingCost;
  },

  getTotalPrice() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscountAmount();
    const shipping = this.getShippingFee();
    return Math.max(0, subtotal - discount + shipping);
  },

  applyCoupon(code) {
    const cleanCode = String(code).trim().toUpperCase();
    if (!cleanCode) return false;

    const coupon = this.coupons.find(c => c.code === cleanCode && c.activo !== false);

    if (coupon) {
      const eligibleSubtotal = this.getEligibleSubtotal();
      if (eligibleSubtotal === 0) {
        if (typeof UI !== 'undefined') {
          UI.showToast("Los productos en tu carrito no admiten cupones de descuento.");
        }
        return false;
      }

      const subtotal = this.getSubtotal();
      if (coupon.montoMinimo > 0 && subtotal < coupon.montoMinimo) {
        const minFmt = typeof UI !== 'undefined' ? UI.formatPrice(coupon.montoMinimo) : '$' + coupon.montoMinimo;
        if (typeof UI !== 'undefined') UI.showToast(`El cupón requiere compra mínima de ${minFmt}`);
        return false;
      }

      this.appliedCoupon = coupon;
      
      let msg = `¡Cupón ${coupon.code} aplicado!`;
      if (coupon.tipo === 'porcentaje') msg = `¡Cupón ${coupon.code} (-${coupon.valor}%) aplicado!`;
      if (coupon.tipo === 'monto') msg = `¡Cupón ${coupon.code} (-$${coupon.valor}) aplicado!`;
      if (coupon.tipo === 'envio_gratis') msg = `¡Cupón ${coupon.code} (Envío Gratis) aplicado!`;

      if (typeof UI !== 'undefined') UI.showToast(msg);
      this.updateUI();
      return true;
    } else {
      if (typeof UI !== 'undefined') UI.showToast("Cupón inválido o expirado.");
      return false;
    }
  },

  getCouponBadgeText() {
    if (!this.appliedCoupon) return '';
    if (this.appliedCoupon.tipo === 'porcentaje') return `-${this.appliedCoupon.valor}%`;
    if (this.appliedCoupon.tipo === 'monto') return `-$${this.appliedCoupon.valor}`;
    if (this.appliedCoupon.tipo === 'envio_gratis') return 'Envío Gratis';
    return `-${this.appliedCoupon.valor}`;
  },

  getTotalItems() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  },

  getItemQuantity(productId) {
    const item = this.items.find(i => String(i.id) === String(productId));
    return item ? item.quantity : 0;
  },

  clearCart() {
    this.items = [];
    this.saveToStorage();
    this.updateUI();
  },

  updateUI() {
    // Actualizar badge del botón flotante
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const totalItems = this.getTotalItems();
      badge.textContent = totalItems;
      if (totalItems > 0) {
        badge.classList.remove('hidden');
        badge.style.display = 'flex';
      } else {
        badge.classList.add('hidden');
        badge.style.display = 'none';
      }
    }

    // Renderizar items en el modal
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
      if (this.items.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty-msg" style="text-align: center; padding: 2rem;">El carrito está vacío.</p>';
      } else {
        cartItemsContainer.innerHTML = this.items.map(item => {
          const isEligible = this.isItemEligible(item);
          let couponBadgeHTML = '';

          if (this.appliedCoupon) {
            if (isEligible) {
              if (this.appliedCoupon.tipo === 'porcentaje') {
                couponBadgeHTML = `<span class="cart-item__coupon-badge badge-eligible" style="background:#d1fae5; color:#065f46; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:6px; display:inline-flex; align-items:center; gap:2px;">🎟️ -${this.appliedCoupon.valor}%</span>`;
              } else if (this.appliedCoupon.tipo === 'monto') {
                couponBadgeHTML = `<span class="cart-item__coupon-badge badge-eligible" style="background:#d1fae5; color:#065f46; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:6px; display:inline-flex; align-items:center; gap:2px;">🎟️ -$${this.appliedCoupon.valor}</span>`;
              } else if (this.appliedCoupon.tipo === 'envio_gratis') {
                couponBadgeHTML = `<span class="cart-item__coupon-badge badge-eligible" style="background:#d1fae5; color:#065f46; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:6px; display:inline-flex; align-items:center; gap:2px;">🎟️ Aplica cupón</span>`;
              }
            } else {
              couponBadgeHTML = `<span class="cart-item__coupon-badge badge-excluded" style="background:#fee2e2; color:#991b1b; font-size:0.72rem; font-weight:600; padding:2px 6px; border-radius:12px; margin-left:6px; display:inline-flex; align-items:center; gap:2px;">🚫 Excluido de cupón</span>`;
            }
          }

          return `
            <div class="cart-item">
              <img src="${item.image}" alt="${item.name}" class="cart-item__img">
              <div class="cart-item__info">
                <h4 class="cart-item__title">${item.name}</h4>
                ${item.variant ? `<span class="cart-item__variant" style="font-size:0.75rem; color:var(--primary-color); display:block;">Opción: ${item.variant}</span>` : ''}
                <div style="display:flex; align-items:center; flex-wrap:wrap; margin-top:2px;">
                  <span class="cart-item__price">${typeof UI !== 'undefined' ? UI.formatPrice(item.price) : '$' + item.price}</span>
                  ${couponBadgeHTML}
                </div>
                <div class="cart-item__controls">
                  <button class="cart-btn-minus" data-id="${item.itemKey || item.id}">-</button>
                  <span class="cart-item__quantity">${item.quantity}</span>
                  <button class="cart-btn-plus" data-id="${item.itemKey || item.id}">+</button>
                </div>
              </div>
              <button class="cart-btn-remove" data-id="${item.itemKey || item.id}" aria-label="Eliminar">&times;</button>
            </div>
          `;
        }).join('');
      }
    }

    // Actualizar total y footer
    const totalPriceEl = document.getElementById('cart-total-price');
    if (totalPriceEl) {
      totalPriceEl.textContent = typeof UI !== 'undefined' ? UI.formatPrice(this.getTotalPrice()) : '$' + this.getTotalPrice();
    }

    // Actualizar sección de opciones (Envío y Cupón) en el footer
    const footer = document.querySelector('.cart-footer');
    if (footer) {
      let extraOptionsEl = document.getElementById('cart-extra-options');
      if (!extraOptionsEl) {
        extraOptionsEl = document.createElement('div');
        extraOptionsEl.id = 'cart-extra-options';
        extraOptionsEl.style.cssText = "margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 1rem;";
        footer.insertBefore(extraOptionsEl, footer.firstChild);
      }

      const shippingCostFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.shippingCost) : '$' + this.shippingCost;
      const subtotalFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getSubtotal()) : '$' + this.getSubtotal();
      const discountFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getDiscountAmount()) : '$' + this.getDiscountAmount();

      extraOptionsEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Cupón de Descuento:</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="coupon-input" placeholder="Ingresa tu código" value="${this.appliedCoupon ? this.appliedCoupon.code : ''}" style="flex: 1; padding: 0.35rem 0.6rem; font-size: 0.85rem; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); text-transform: uppercase;">
            <button id="apply-coupon-btn" class="btn btn--primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Aplicar</button>
          </div>
          ${this.appliedCoupon ? `<span style="font-size:0.75rem; color:#10b981; font-weight:600;">✓ Cupón ${this.appliedCoupon.code} aplicado (${this.getCouponBadgeText()})</span>` : ''}
        </div>
      `;

      // Listener para aplicar cupón
      document.getElementById('apply-coupon-btn').addEventListener('click', () => {
        const val = document.getElementById('coupon-input').value;
        if (val) this.applyCoupon(val);
      });
    }

    // Asegurar que el botón de vaciar carrito exista si hay items
    let clearBtn = document.getElementById('cart-clear-btn');
    if (footer) {
      if (this.items.length > 0 && !clearBtn) {
        const btnHtml = `<button id="cart-clear-btn" class="btn" style="width: 100%; margin-top: 0.5rem; background-color: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-muted);">Vaciar Carrito</button>`;
        footer.insertAdjacentHTML('beforeend', btnHtml);
        document.getElementById('cart-clear-btn').addEventListener('click', () => {
          if (confirm("¿Seguro que deseas vaciar el carrito?")) {
            this.clearCart();
          }
        });
      } else if (this.items.length === 0 && clearBtn) {
        clearBtn.remove();
      }
    }

    // Actualizar botones de acción en tarjetas y ficha técnica
    if (typeof UI !== 'undefined' && typeof UI.updateCardActions === 'function') {
      UI.updateCardActions();
    }
  },

  setupEventListeners() {
    // Abrir modal
    const openBtn = document.getElementById('header-cart-btn');
    const modal = document.getElementById('cart-modal');
    if (openBtn && modal) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('show');
      });
    }

    // Cerrar modal con la x
    const closeBtn = document.getElementById('cart-modal-close');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    }

    // Cerrar modal al hacer clic afuera (en el fondo oscuro)
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }

    // Sincronizar cambios en otras pestañas en tiempo real
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        this.loadFromStorage();
        this.updateUI();
      }
    });

    // Interacciones dentro del carrito
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-btn-plus')) {
          const id = e.target.getAttribute('data-id');
          const item = this.items.find(i => String(i.id) === String(id));
          this.updateQuantity(id, item.quantity + 1);
        } else if (e.target.classList.contains('cart-btn-minus')) {
          const id = e.target.getAttribute('data-id');
          const item = this.items.find(i => String(i.id) === String(id));
          this.updateQuantity(id, item.quantity - 1);
        } else if (e.target.classList.contains('cart-btn-remove')) {
          const id = e.target.getAttribute('data-id');
          this.removeItem(id);
        }
      });
    }

    // Botón de WhatsApp
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        this.sendWhatsAppOrder();
      });
    }
  },

  sendWhatsAppOrder() {
    if (this.items.length === 0) {
      if (typeof UI !== 'undefined') UI.showToast("El carrito está vacío.");
      return;
    }

    let message = `Hola! Me gustaría realizar el siguiente pedido en *${CONFIG.STORE_NAME}*:\n\n`;
    message += `📦 *PRODUCTOS:* \n`;

    this.items.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      const fmtPrice = typeof UI !== 'undefined' ? UI.formatPrice(item.price) : '$' + item.price;
      const fmtLineTotal = typeof UI !== 'undefined' ? UI.formatPrice(lineTotal) : '$' + lineTotal;
      const hasSku = item.sku && String(item.sku).trim() !== '-';

      message += `${index + 1}. *${item.name}*${hasSku ? ` (SKU: ${item.sku})` : ''}\n`;
      if (item.variant) {
        message += `   • Opción: ${item.variant}\n`;
      }
      message += `   • Cantidad: ${item.quantity} x ${fmtPrice} = ${fmtLineTotal}\n`;

      if (this.appliedCoupon) {
        const isEligible = this.isItemEligible(item);
        if (isEligible) {
          if (this.appliedCoupon.tipo === 'porcentaje') {
            message += `   • [🎟️ Descuento: -${this.appliedCoupon.valor}%]\n`;
          } else {
            message += `   • [🎟️ Cupón aplicado]\n`;
          }
        } else {
          message += `   • [🚫 Excluido de cupón]\n`;
        }
      }
      message += `\n`;
    });
    
    if (this.appliedCoupon) {
      const badgeText = this.getCouponBadgeText();
      message += `🏷️ *CUPÓN APLICADO:* ${this.appliedCoupon.code} (${badgeText})\n\n`;
    }

    const subtotalFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getSubtotal()) : '$' + this.getSubtotal();
    const discountFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getDiscountAmount()) : '$' + this.getDiscountAmount();
    const totalFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getTotalPrice()) : '$' + this.getTotalPrice();

    message += `💰 *RESUMEN DE PAGO:* \n`;
    message += `• Subtotal: ${subtotalFmt}\n`;
    if (this.appliedCoupon) {
      message += `• Descuento: -${discountFmt}\n`;
    }
    message += `*TOTAL FINAL:* ${totalFmt}\n\n`;
    message += `Quedo a la espera para coordinar los datos de envío y pago. ¡Muchas gracias!`;

    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Cart.init();
});
