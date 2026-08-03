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
  validCoupons: {
    'BIENVENIDA10': 10,
    'EDRO15': 15,
    'DESCUENTO20': 20
  },
  STORAGE_KEY: 'edrostock_cart',

  init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.updateUI();
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

  getDiscountAmount() {
    if (!this.appliedCoupon) return 0;
    const subtotal = this.getSubtotal();
    return (subtotal * this.appliedCoupon.discountPercent) / 100;
  },

  getShippingFee() {
    return this.deliveryMethod === 'delivery' ? this.shippingCost : 0;
  },

  getTotalPrice() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscountAmount();
    return Math.max(0, subtotal - discount);
  },

  applyCoupon(code) {
    const cleanCode = String(code).trim().toUpperCase();
    if (this.validCoupons[cleanCode]) {
      this.appliedCoupon = {
        code: cleanCode,
        discountPercent: this.validCoupons[cleanCode]
      };
      if (typeof UI !== 'undefined') UI.showToast(`¡Cupón ${cleanCode} (-${this.validCoupons[cleanCode]}%) aplicado!`);
      this.updateUI();
      return true;
    } else {
      if (typeof UI !== 'undefined') UI.showToast("Cupón inválido o expirado.");
      return false;
    }
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
        cartItemsContainer.innerHTML = this.items.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item__img">
            <div class="cart-item__info">
              <h4 class="cart-item__title">${item.name}</h4>
              ${item.variant ? `<span class="cart-item__variant" style="font-size:0.75rem; color:var(--primary-color); display:block;">Opción: ${item.variant}</span>` : ''}
              <span class="cart-item__price">${typeof UI !== 'undefined' ? UI.formatPrice(item.price) : '$' + item.price}</span>
              <div class="cart-item__controls">
                <button class="cart-btn-minus" data-id="${item.itemKey || item.id}">-</button>
                <span class="cart-item__quantity">${item.quantity}</span>
                <button class="cart-btn-plus" data-id="${item.itemKey || item.id}">+</button>
              </div>
            </div>
            <button class="cart-btn-remove" data-id="${item.itemKey || item.id}" aria-label="Eliminar">&times;</button>
          </div>
        `).join('');
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
          ${this.appliedCoupon ? `<span style="font-size:0.75rem; color:#10b981; font-weight:600;">✓ Cupón aplicado (-${this.appliedCoupon.discountPercent}%)</span>` : ''}
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

      message += `${index + 1}. *${item.name}* (SKU: ${item.sku})\n`;
      if (item.variant) {
        message += `   • Opción: ${item.variant}\n`;
      }
      message += `   • Cantidad: ${item.quantity} x ${fmtPrice} = ${fmtLineTotal}\n\n`;
    });
    
    if (this.appliedCoupon) {
      message += `🎟️ *CUPÓN APLICADO:* ${this.appliedCoupon.code} (-${this.appliedCoupon.discountPercent}%)\n`;
    }

    const subtotalFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getSubtotal()) : '$' + this.getSubtotal();
    const discountFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getDiscountAmount()) : '$' + this.getDiscountAmount();
    const totalFmt = typeof UI !== 'undefined' ? UI.formatPrice(this.getTotalPrice()) : '$' + this.getTotalPrice();

    message += `\n💰 *RESUMEN DE PAGO:* \n`;
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
