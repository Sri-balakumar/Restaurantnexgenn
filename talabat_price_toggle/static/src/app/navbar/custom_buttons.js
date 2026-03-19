/** @odoo-module **/

import { Navbar } from "@point_of_sale/app/components/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { onMounted, onWillUnmount, useState } from "@odoo/owl";

console.log("POS Talabat Price Toggle - Loading...");

patch(Navbar.prototype, {
    setup() {
        super.setup(...arguments);

        this.pricelistButtonsState = useState({
            initialized: false,
        });

        this._retryCount = 0;
        this._visibilityInterval = null;

        onMounted(() => {
            setTimeout(() => this._addPricelistButtons(), 500);
            // Watch for screen changes to show/hide buttons
            this._visibilityInterval = setInterval(() => this._updateVisibility(), 300);
        });

        onWillUnmount(() => {
            this._removePricelistButtons();
            if (this._visibilityInterval) {
                clearInterval(this._visibilityInterval);
            }
        });
    },

    _getCurrentOrder() {
        if (this.pos && typeof this.pos.get_order === 'function') {
            return this.pos.get_order();
        }
        if (this.pos && this.pos.selectedOrder) {
            return this.pos.selectedOrder;
        }
        if (this.pos && this.pos.currentOrder) {
            return this.pos.currentOrder;
        }
        if (this.pos && this.pos.models && this.pos.models['pos.order']) {
            const orders = this.pos.models['pos.order'].getAll();
            if (orders && orders.length > 0) {
                return orders[orders.length - 1];
            }
        }
        return null;
    },

    _addPricelistButtons() {
        console.log("_addPricelistButtons() called, attempt:", this._retryCount + 1);

        if (document.querySelector('.pos-pricelist-buttons')) {
            console.log("Pricelist buttons already exist, updating states");
            this._updateButtonStates();
            return;
        }

        // Don't add buttons if not on ProductScreen
        if (!this._isInOrder()) {
            console.log("Not on ProductScreen, skipping button creation");
            return;
        }

        // Insert into .pos-topheader directly, between left and right header
        // This avoids the overflow-auto scrollbar from .pos-leftheader
        const topHeader = document.querySelector('.pos-topheader');

        if (!topHeader) {
            this._retryCount++;
            if (this._retryCount < 20) {
                console.log("pos-topheader not found, retrying...");
                setTimeout(() => this._addPricelistButtons(), 500);
            } else {
                console.error("Could not find pos-topheader after 20 attempts");
            }
            return;
        }

        console.log("pos-topheader found, adding buttons");

        const wrapper = document.createElement('div');
        wrapper.className = 'pos-pricelist-buttons d-flex align-items-center flex-shrink-0';

        const normalBtn = document.createElement('button');
        normalBtn.id = 'pos-normal-price-btn';
        normalBtn.className = 'pos-pricelist-btn btn btn-primary active';
        normalBtn.textContent = 'DINE IN PRICE';
        normalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._selectPricelist('normal');
        });

        const talabatBtn = document.createElement('button');
        talabatBtn.id = 'pos-talabat-price-btn';
        talabatBtn.className = 'pos-pricelist-btn btn btn-light';
        talabatBtn.textContent = 'APPLICATION PRICE';
        talabatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._selectPricelist('talabat');
        });

        wrapper.appendChild(normalBtn);
        wrapper.appendChild(talabatBtn);

        // Insert between pos-leftheader and pos-rightheader
        const rightHeader = topHeader.querySelector('.pos-rightheader');
        if (rightHeader) {
            topHeader.insertBefore(wrapper, rightHeader);
        } else {
            topHeader.appendChild(wrapper);
        }

        this._updateButtonStates();
        this.pricelistButtonsState.initialized = true;
        console.log("Pricelist buttons added to navbar successfully");
    },

    _isInOrder() {
        // Only show buttons on ProductScreen (inside an order)
        // Hide on FloorScreen, TicketScreen, PaymentScreen, etc.
        const currentRoute = this.pos?.router?.state?.current;
        console.log("Current POS route:", currentRoute);
        return currentRoute === 'ProductScreen';
    },

    _updateVisibility() {
        const wrapper = document.querySelector('.pos-pricelist-buttons');
        if (!wrapper) {
            // If in order and buttons don't exist yet, try to add them
            if (this._isInOrder()) {
                this._retryCount = 0;
                this._addPricelistButtons();
            }
            return;
        }
        // Show buttons only when inside an order
        if (this._isInOrder()) {
            wrapper.style.display = 'flex';
            this._updateButtonStates();
        } else {
            wrapper.style.display = 'none';
        }
    },

    _removePricelistButtons() {
        const wrapper = document.querySelector('.pos-pricelist-buttons');
        if (wrapper) {
            wrapper.remove();
        }
    },

    _updateButtonStates() {
        const normalBtn = document.getElementById('pos-normal-price-btn');
        const talabatBtn = document.getElementById('pos-talabat-price-btn');

        if (!normalBtn || !talabatBtn) return;

        const order = this._getCurrentOrder();
        const isTalabat = order?.pricelist?.name?.toLowerCase().includes('talabat');

        if (isTalabat) {
            normalBtn.className = 'pos-pricelist-btn btn btn-light';
            talabatBtn.className = 'pos-pricelist-btn btn btn-danger active';
        } else {
            normalBtn.className = 'pos-pricelist-btn btn btn-primary active';
            talabatBtn.className = 'pos-pricelist-btn btn btn-light';
        }
    },

    _getPricelists() {
        try {
            if (this.pos && this.pos.models && this.pos.models["product.pricelist"]) {
                return this.pos.models["product.pricelist"].getAll() || [];
            }
            if (this.pos && this.pos.pricelists) {
                return this.pos.pricelists;
            }
            return [];
        } catch (e) {
            console.error("Error fetching pricelists:", e);
            return [];
        }
    },

    _findPricelist(type) {
        const pricelists = this._getPricelists();

        if (type === 'talabat') {
            return pricelists.find(p => p.name?.toLowerCase().includes('talabat'));
        }

        let normal = pricelists.find(p => p.name?.toLowerCase().includes('normal'));
        if (!normal) {
            normal = pricelists.find(p => !p.name?.toLowerCase().includes('talabat'));
        }
        if (!normal && pricelists.length > 0) {
            normal = pricelists[0];
        }
        return normal;
    },

    _selectPricelist(type) {
        try {
            const order = this._getCurrentOrder();
            if (!order) {
                console.error("No current order found");
                return;
            }

            const targetPricelist = this._findPricelist(type);
            if (!targetPricelist) {
                console.error(type + " pricelist not found");
                return;
            }

            const currentPricelistId = order.pricelist?.id;
            if (currentPricelistId === targetPricelist.id) {
                console.log(type + " price already active");
                return;
            }

            console.log("Applying pricelist: " + targetPricelist.name);

            if (typeof order.set_pricelist === 'function') {
                order.set_pricelist(targetPricelist);
            } else if (typeof order.setPricelist === 'function') {
                order.setPricelist(targetPricelist);
            } else {
                order.pricelist = targetPricelist;
                if (order.orderlines) {
                    order.orderlines.forEach(line => {
                        if (typeof line.set_unit_price === 'function') {
                            const product = line.product;
                            if (product && targetPricelist) {
                                const newPrice = this._getProductPrice(product, targetPricelist);
                                if (newPrice !== null) {
                                    line.set_unit_price(newPrice);
                                }
                            }
                        }
                    });
                }
            }

            this._updateButtonStates();
            console.log("Pricelist " + targetPricelist.name + " applied successfully");

        } catch (error) {
            console.error("Error selecting pricelist:", error);
        }
    },

    _getProductPrice(product, pricelist) {
        try {
            if (pricelist && pricelist.items) {
                for (const item of pricelist.items) {
                    if (item.product_id && item.product_id[0] === product.id) {
                        return item.fixed_price;
                    }
                }
            }
            return product.lst_price || product.list_price;
        } catch (e) {
            return null;
        }
    },
});

console.log("POS Talabat Price Toggle - Patch applied successfully!");
