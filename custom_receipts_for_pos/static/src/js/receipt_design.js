/** @odoo-module */
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";
import { Component, xml } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

patch(OrderReceipt.prototype, {
    setup() {
        super.setup();
        this.pos = useService("pos");
    },
    
    get templateProps() {
        return {
            order: this.order,
            formatCurrency: this.formatCurrency.bind(this),
            header: this.header,
            qrCode: this.qrCode,
            paymentLines: this.paymentLines,
            vatText: this.vatText,
            doesAnyOrderlineHaveTaxLabel: this.doesAnyOrderlineHaveTaxLabel.bind(this),
            getPortalURL: this.getPortalURL.bind(this),
        };
    },
    
    get templateComponent() {
        const mainRef = this;
        return class extends Component {
            static template = xml`${mainRef.pos.config.design_receipt || '<div>No custom template</div>'}`;
            static props = ["*"];
        };
    },
    
    get isTrue() {
        return this.pos?.config && !this.pos.config.is_custom_receipt;
    }
});