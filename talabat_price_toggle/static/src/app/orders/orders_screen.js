/** @odoo-module **/

import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { patch } from "@web/core/utils/patch";

console.log("POS Orders Screen Token Column - Loading...");

/**
 * Patch PosOrder model to include token_number in searchable fields
 */
patch(PosOrder.prototype, {
    /**
     * Override getDisplayData to include token number in search and display
     */
    getDisplayData() {
        const data = super.getDisplayData();

        // Add token number to display data
        if (this.token_number) {
            data.token_number = this.token_number;
        }

        // Add pickup date to display data
        if (this.pickup_date) {
            data.pickup_date = this.pickup_date;
        }

        return data;
    },

    /**
     * Override get_name to include token in search
     */
    get_name() {
        const name = super.get_name();
        if (this.token_number) {
            return `${name} [${this.token_number}]`;
        }
        return name;
    }
});

/**
 * Patch TicketScreen to add getter method for token number column and search config
 */
patch(TicketScreen.prototype, {
    /**
     * Get token number for display in orders list
     */
    getTokenNumber(order) {
        if (!order) {
            console.warn('getTokenNumber called with undefined order');
            return '-';
        }
        return order.token_number || '-';
    },

    /**
     * Override _getSearchFields to add Token Number as searchable field
     */
    _getSearchFields() {
        const fields = super._getSearchFields();

        // Add Token Number field to search
        fields.TOKEN_NUMBER = {
            repr: (order) => order.token_number || "",
            displayName: "Token Number",
            modelFields: ["token_number"],
        };

        console.log('>>> Added TOKEN_NUMBER to search fields');
        return fields;
    }
});

console.log("POS Orders Screen Token Column - Loaded successfully");
