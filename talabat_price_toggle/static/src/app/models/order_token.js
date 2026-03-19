/** @odoo-module **/

import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";

console.log("Order Token Auto-Generation - Loading...");

// Track used tokens in current session to prevent duplicates (use global to share between modules)
if (!window._posUsedTokens) {
    window._posUsedTokens = new Set();
}
const usedTokensInSession = window._posUsedTokens;

// Track the highest token number seen in this session
if (!window._posHighestTokenNum) {
    window._posHighestTokenNum = 0;
}

/**
 * Patch PosStore to auto-generate token when adding new orders
 */
patch(PosStore.prototype, {
    /**
     * Initialize used tokens from existing orders
     */
    _initializeUsedTokens() {
        console.log('>>> Initializing used tokens from existing orders...');
        const orders = this.models['pos.order']?.getAll() || [];
        let highestNum = 0;

        orders.forEach(order => {
            if (order.token_number) {
                usedTokensInSession.add(order.token_number);

                // Track highest token number
                if (order.token_number.startsWith('T-') && order.token_number.length === 8) {
                    try {
                        const num = parseInt(order.token_number.split('-')[1]);
                        if (num > highestNum) {
                            highestNum = num;
                        }
                    } catch (e) {
                        // Ignore invalid tokens
                    }
                }
            }
        });

        window._posHighestTokenNum = highestNum;
        console.log('>>> Initialized tokens:', Array.from(usedTokensInSession));
        console.log('>>> Highest token from existing orders:', highestNum);
    },

    addNewOrder(data = {}) {
        const order = super.addNewOrder(data);

        // Auto-generate token for every new order (not from server)
        if (order && !order.server_id) {
            console.log('=== NEW ORDER CREATED ===');
            console.log('Order UID:', order.uid);
            console.log('Token BEFORE clear:', order.token_number);

            // Initialize token tracking from existing orders (if not done yet)
            if (usedTokensInSession.size === 0) {
                this._initializeUsedTokens();
            }

            // CRITICAL: Clear any existing token to prevent reuse from previous orders
            order.token_number = null;
            console.log('Token AFTER clear:', order.token_number);
            console.log('>>> Cleared old token, generating fresh token...');

            // Generate new unique token for this order (async - don't block)
            this._autoGenerateTokenForOrder(order).then(() => {
                console.log('Token AFTER generation:', order.token_number);
                console.log('=== NEW ORDER TOKEN SETUP COMPLETE ===');
            });
        } else if (order && order.token_number) {
            // Track token from existing/restored orders
            usedTokensInSession.add(order.token_number);
            console.log('>>> Tracked token from existing order:', order.token_number);
        }

        return order;
    },

    async _autoGenerateTokenForOrder(order) {
        try {
            console.log('>>> Auto-generating token for order:', order.uid);

            let tokenNumber;

            // If we haven't generated any tokens yet, get the starting number from backend
            if (window._posHighestTokenNum === 0) {
                console.log('>>> First token in session, calling backend...');
                tokenNumber = await this.data.call(
                    'pos.order',
                    'get_next_token_number',
                    []
                );

                // Extract the numeric part
                const num = parseInt(tokenNumber.split('-')[1]);
                window._posHighestTokenNum = num;
                console.log('>>> Backend returned:', tokenNumber, '(num:', num, ')');
            } else {
                // Increment locally to avoid calling backend every time
                window._posHighestTokenNum++;
                tokenNumber = `T-${window._posHighestTokenNum.toString().padStart(6, '0')}`;
                console.log('>>> Incremented locally:', tokenNumber);
            }

            // Mark this token as used
            usedTokensInSession.add(tokenNumber);
            order.token_number = tokenNumber;
            console.log('>>> Token auto-generated and marked as used:', tokenNumber);
            console.log('>>> Session tokens so far:', Array.from(usedTokensInSession));
            console.log('>>> Highest token number:', window._posHighestTokenNum);

        } catch (error) {
            console.error('Failed to auto-generate token:', error);
        }
    }
});

/**
 * Patch Order model to handle token persistence
 */
patch(PosOrder.prototype, {
    /**
     * Export for JSON - ensure token_number is included
     */
    export_as_JSON() {
        const json = super.export_as_JSON();
        json.token_number = this.token_number || null;
        json.pickup_date = this.pickup_date || null;
        return json;
    },

    /**
     * Init from JSON - restore token_number only for validated/synced orders
     */
    init_from_JSON(json) {
        super.init_from_JSON(json);

        // Only restore token for orders from server (validated orders)
        // New orders should get fresh tokens from auto-generation
        if (json.server_id || json.id) {
            this.token_number = json.token_number || null;
            console.log('>>> Restored token from JSON for order:', json.server_id || json.id, 'Token:', this.token_number);

            // Track this token as used and update highest number
            if (this.token_number && this.token_number.startsWith('T-') && this.token_number.length === 8) {
                usedTokensInSession.add(this.token_number);
                console.log('>>> Added restored token to session tracking:', this.token_number);

                // Update highest token number if this is higher
                try {
                    const num = parseInt(this.token_number.split('-')[1]);
                    if (num > window._posHighestTokenNum) {
                        window._posHighestTokenNum = num;
                        console.log('>>> Updated highest token number to:', num);
                    }
                } catch (e) {
                    // Ignore invalid tokens
                }
            }
        } else {
            // Don't restore token for new local orders - they need fresh tokens
            console.log('>>> Skipping token restoration for new local order');
            this.token_number = null;
        }

        this.pickup_date = json.pickup_date || null;
    }
});

console.log("Order Token Auto-Generation - Loaded successfully");
