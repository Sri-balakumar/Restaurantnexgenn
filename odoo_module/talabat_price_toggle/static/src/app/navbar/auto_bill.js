/** @odoo-module **/

import { ActionpadWidget } from "@point_of_sale/app/screens/product_screen/action_pad/action_pad";
import { patch } from "@web/core/utils/patch";
import { onMounted, onWillUnmount } from "@odoo/owl";

console.log("Auto Bill Module - Loading...");

// Track used tokens in current session (shared with order_token.js)
if (!window._posUsedTokens) {
    window._posUsedTokens = new Set();
}

// Track the highest token number seen in this session (shared with order_token.js)
if (!window._posHighestTokenNum) {
    window._posHighestTokenNum = 0;
}

/**
 * Patch ActionpadWidget to add Auto Bill button in Actions modal
 */
patch(ActionpadWidget.prototype, {
    setup() {
        super.setup(...arguments);

        // Store observer reference for cleanup
        this.autoBillObserver = null;

        onMounted(() => {
            setTimeout(() => {
                this._initAutoBillObserver();
            }, 200);
        });

        onWillUnmount(() => {
            // Disconnect observer to prevent memory leaks and interference
            if (this.autoBillObserver) {
                this.autoBillObserver.disconnect();
                this.autoBillObserver = null;
                console.log('Auto Bill observer disconnected');
            }
        });
    },

    /**
     * Watch for Actions modal and inject Auto Bill button
     */
    _initAutoBillObserver() {
        // Disconnect existing observer if any
        if (this.autoBillObserver) {
            this.autoBillObserver.disconnect();
        }

        this.autoBillObserver = new MutationObserver(() => {
            const actionsModal = document.querySelector('.modal-dialog');
            if (actionsModal) {
                const modalTitle = actionsModal.querySelector('.modal-title');
                if (modalTitle && modalTitle.textContent.includes('Actions')) {
                    this._injectAutoBillButton(actionsModal);
                }
            }
        });

        // Only observe modals container, not entire body - more efficient and less intrusive
        const modalContainer = document.querySelector('.o_dialog_container') || document.body;
        this.autoBillObserver.observe(modalContainer, {
            childList: true,
            subtree: true
        });

        console.log('Auto Bill observer initialized on:', modalContainer.className || 'body');
    },

    /**
     * Inject Auto Bill button into Actions modal
     */
    _injectAutoBillButton(actionsModal) {
        // Check if button already exists
        if (actionsModal.querySelector('#auto-bill-btn')) {
            return;
        }

        // Find the control buttons container
        const controlButtons = actionsModal.querySelector('.control-buttons-modal') ||
                              actionsModal.querySelector('.control-buttons') ||
                              actionsModal.querySelector('.modal-body');

        if (!controlButtons) {
            console.error('Control buttons container not found');
            return;
        }

        // Create Auto Bill button matching the style of other buttons with green color
        const autoBillBtn = document.createElement('button');
        autoBillBtn.id = 'auto-bill-btn';
        autoBillBtn.className = 'btn btn-success btn-md py-2 text-center';
        autoBillBtn.style.fontSize = '16px';

        autoBillBtn.innerHTML = `
            <i class="fa fa-print me-1"></i>
            <span>Auto Print - Bill</span>
        `;

        autoBillBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Don't use stopPropagation - it can interfere with modal event handling

            // Handle the print operation
            this._handleAutoBillClick();

            // Close the modal after a short delay to ensure print completes
            setTimeout(() => {
                const closeBtn = actionsModal.querySelector('.btn-close');
                const cancelBtn = actionsModal.querySelector('.btn-secondary');
                if (closeBtn) {
                    closeBtn.click();
                } else if (cancelBtn) {
                    cancelBtn.click();
                } else {
                    // Fallback: remove modal backdrop and dialog
                    const modalBackdrop = document.querySelector('.modal-backdrop');
                    if (modalBackdrop) modalBackdrop.remove();
                    actionsModal.closest('.modal').remove();
                }
            }, 100);
        });

        // Insert at the beginning of the control buttons container
        if (controlButtons.firstChild) {
            controlButtons.insertBefore(autoBillBtn, controlButtons.firstChild);
        } else {
            controlButtons.appendChild(autoBillBtn);
        }

        console.log('Auto Bill button injected into Actions modal');
    },

    /**
     * Handle Auto Bill button click
     */
    async _handleAutoBillClick() {
        console.log('=== AUTO BILL CLICKED [v1.0.22] ===');
        const order = this._getCurrentOrder();

        if (!order) {
            console.error('No order found!');
            this._showNotification('No order found', 'error');
            return;
        }

        console.log('=== AUTO BILL ORDER INFO ===');
        console.log('Order UID:', order.uid);
        console.log('Order server_id:', order.server_id);
        console.log('Token at Auto Bill start:', order.token_number);

        const orderlines = order.orderlines || order.lines || [];
        if (orderlines.length === 0) {
            this._showNotification('Please add items to the order first', 'warning');
            return;
        }

        // Wait for auto-generated token with retries (max 3 seconds)
        let waitAttempts = 0;
        while (!order.token_number && waitAttempts < 6) {
            console.log(`>>> Token not yet generated, waiting... (attempt ${waitAttempts + 1})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            waitAttempts++;
        }

        console.log('>>> After waiting, token_number:', order.token_number);

        // Check if order has a valid token (should be auto-generated)
        const hasValidToken = order.token_number &&
                              order.token_number.length === 8 &&
                              order.token_number.startsWith('T-');

        if (!hasValidToken) {
            // Fallback: generate token if auto-generation failed
            try {
                console.log('>>> Token auto-generation failed, generating manually...');
                console.log('>>> Current used tokens in session:', Array.from(window._posUsedTokens));
                console.log('>>> Current highest token number:', window._posHighestTokenNum);

                let tokenNumber;

                // If we haven't generated any tokens yet, get the starting number from backend
                if (window._posHighestTokenNum === 0) {
                    console.log('>>> First token in session, calling backend...');
                    tokenNumber = await this.pos.data.call(
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
                window._posUsedTokens.add(tokenNumber);
                order.token_number = tokenNumber;

                console.log('>>> Token set on order and marked as used:', order.token_number);
                console.log('>>> Session tokens now:', Array.from(window._posUsedTokens));
                console.log('>>> Highest token number:', window._posHighestTokenNum);
            } catch (error) {
                console.error('!!! ERROR fetching token from backend:', error);
                console.error('!!! Error details:', error.message, error.stack);
                this._showNotification('Failed to generate token number: ' + error.message, 'error');
                return;
            }
        } else {
            console.log('>>> Using auto-generated token:', order.token_number);
            // Make sure to mark it as used
            window._posUsedTokens.add(order.token_number);
        }

        console.log('=== FINAL TOKEN READY FOR PRINTING ===');
        console.log('Order UID:', order.uid);
        console.log('Final Token:', order.token_number);
        console.log('=====================================');

        // Print the bill
        this._printAutoBill(order);
    },

    /**
     * Generate sequential token number (DEPRECATED - now using backend)
     * Keeping this as fallback in case backend call fails
     */
    _generateTokenNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        return `T-${year}${month}${day}${hours}${minutes}${seconds}`;
    },

    /**
     * Print Auto Bill
     */
    _printAutoBill(order) {
        const billHTML = this._generateBillHTML(order);
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            this._showNotification('Please allow pop-ups to print the bill', 'error');
            return;
        }

        printWindow.document.write(billHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };

        this._showNotification('Bill generated successfully!', 'success');
        console.log('Auto Bill printed for order:', order.name);
    },

    /**
     * Generate Bill HTML - Optimized for 80mm Thermal Printer
     */
    _generateBillHTML(order) {
        // Get currency symbol from POS company
        let currencySymbol = '$';
        try {
            if (this.pos && this.pos.currency) {
                currencySymbol = this.pos.currency.symbol || '$';
            } else if (this.pos && this.pos.company && this.pos.company.currency_id) {
                // Try to get from company currency
                const currency = this.pos.company.currency_id;
                if (Array.isArray(currency) && currency.length > 1) {
                    // Odoo format: [id, name]
                    currencySymbol = currency[1] || '$';
                } else if (currency.symbol) {
                    currencySymbol = currency.symbol;
                }
            }
        } catch (e) {
            console.log('Could not get currency symbol, using default $');
        }

        // Set static company logo and get address dynamically
        const companyLogo = '/talabat_price_toggle/static/src/app/navbar/logo_ex.jpeg';
        let companyAddress = '';
        try {
            console.log('>>> Fetching company info...');
            console.log('this.pos:', this.pos ? 'EXISTS' : 'NULL');
            console.log('this.pos.company:', this.pos && this.pos.company);
            console.log('✓ Using static logo:', companyLogo);

            if (this.pos && this.pos.company) {

                // Get company address
                console.log('Checking address sources:');
                console.log('  - this.pos.company.street:', this.pos.company.street);
                console.log('  - this.pos.company.city:', this.pos.company.city);
                console.log('  - this.pos.company.zip:', this.pos.company.zip);
                console.log('  - this.pos.company.state_id:', this.pos.company.state_id);
                console.log('  - this.pos.company.country_id:', this.pos.company.country_id);

                // Build address from available parts
                const addressParts = [];

                if (this.pos.company.street) {
                    addressParts.push(this.pos.company.street);
                }
                if (this.pos.company.street2) {
                    addressParts.push(this.pos.company.street2);
                }

                const cityLine = [];
                if (this.pos.company.city) {
                    cityLine.push(this.pos.company.city);
                }

                // Extract state name
                if (this.pos.company.state_id) {
                    let stateName = '';
                    if (Array.isArray(this.pos.company.state_id) && this.pos.company.state_id.length > 1) {
                        stateName = this.pos.company.state_id[1];
                    } else if (typeof this.pos.company.state_id === 'object' && this.pos.company.state_id.name) {
                        stateName = this.pos.company.state_id.name;
                    } else if (typeof this.pos.company.state_id === 'string') {
                        stateName = this.pos.company.state_id;
                    }
                    if (stateName) {
                        cityLine.push(stateName);
                    }
                }

                if (this.pos.company.zip) {
                    cityLine.push(this.pos.company.zip);
                }
                if (cityLine.length > 0) {
                    addressParts.push(cityLine.join(', '));
                }

                // Extract country name
                if (this.pos.company.country_id) {
                    let countryName = '';
                    if (Array.isArray(this.pos.company.country_id) && this.pos.company.country_id.length > 1) {
                        countryName = this.pos.company.country_id[1];
                    } else if (typeof this.pos.company.country_id === 'object' && this.pos.company.country_id.name) {
                        countryName = this.pos.company.country_id.name;
                    } else if (typeof this.pos.company.country_id === 'string') {
                        countryName = this.pos.company.country_id;
                    }
                    if (countryName) {
                        addressParts.push(countryName);
                    }
                }

                companyAddress = addressParts.join(', ');
                console.log('✓ Company address:', companyAddress);
            }
            console.log('Company logo:', companyLogo ? companyLogo.substring(0, 50) + '...' : 'NONE');
        } catch (e) {
            console.log('✗ Error fetching company logo/address:', e);
        }

        // Get customer name and phone - try multiple approaches
        let customerName = 'Walk-in Customer';
        let customerPhone = '';

        // Try different ways to get customer name and phone
        if (order.partner_id) {
            customerName = order.partner_id.name || customerName;
            customerPhone = order.partner_id.phone || order.partner_id.mobile || '';
        } else if (order.partner) {
            customerName = order.partner.name || customerName;
            customerPhone = order.partner.phone || order.partner.mobile || '';
        } else if (order.get_partner && typeof order.get_partner === 'function') {
            const partner = order.get_partner();
            if (partner) {
                customerName = partner.name || customerName;
                customerPhone = partner.phone || partner.mobile || '';
            }
        } else if (order.get_client && typeof order.get_client === 'function') {
            const client = order.get_client();
            if (client) {
                customerName = client.name || customerName;
                customerPhone = client.phone || client.mobile || '';
            }
        }

        const tokenNumber = order.token_number || 'N/A';

        // Get pickup date dynamically
        let pickupDate = 'Not Set';
        if (order.pickup_date) {
            pickupDate = order.pickup_date;
        } else if (order.scheduled_date) {
            pickupDate = order.scheduled_date;
        } else if (order.delivery_date) {
            pickupDate = order.delivery_date;
        }
        const currentDate = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get order lines - try multiple ways
        let orderlines = [];
        if (order.orderlines && order.orderlines.length > 0) {
            orderlines = order.orderlines;
        } else if (order.lines && order.lines.length > 0) {
            orderlines = order.lines;
        } else if (order.get_orderlines && typeof order.get_orderlines === 'function') {
            orderlines = order.get_orderlines();
        }
        
        // Get totals from order object - Calculate from orderlines for accurate tax
        let subtotal = 0;
        let taxAmount = 0;
        let total = 0;

        console.log('======= AUTO BILL DEBUG =======');
        console.log('Order object:', order);

        // ALWAYS calculate from order lines first (most accurate for POS unsaved orders)
        console.log('>>> Calculating totals from order lines...');

        orderlines.forEach((line, idx) => {
            console.log(`--- Line ${idx + 1} ---`);
            console.log('Line object keys:', Object.keys(line));

            const quantity = line.quantity || line.qty || 0;
            const unitPrice = line.price_unit || line.price || 0;
            console.log('Quantity:', quantity, 'Unit Price:', unitPrice);

            // Get all prices from the line - this includes tax calculation
            let lineSubtotal = 0;
            let lineTotalWithTax = 0;
            let foundPrices = false;

            // Method 1: Try get_all_prices()
            if (line.get_all_prices && typeof line.get_all_prices === 'function') {
                try {
                    const prices = line.get_all_prices();
                    console.log('✓ Prices from get_all_prices():', JSON.stringify(prices));

                    lineSubtotal = prices.priceWithoutTax || prices.price_without_tax || prices.base || 0;
                    lineTotalWithTax = prices.priceWithTax || prices.price_with_tax || prices.total || 0;

                    console.log('  >> Extracted: Subtotal=' + lineSubtotal + ', Total=' + lineTotalWithTax);

                    // Verify we got valid different values
                    if (lineSubtotal > 0 || lineTotalWithTax > 0) {
                        foundPrices = true;
                        console.log('  >> Using get_all_prices() values');
                    }
                } catch (e) {
                    console.log('✗ Error calling get_all_prices():', e);
                }
            }

            // Method 2: Try direct properties if get_all_prices didn't work
            if (!foundPrices) {
                console.log('>>> Trying direct properties...');

                // Check all available price properties
                console.log('  - line.price_subtotal:', line.price_subtotal);
                console.log('  - line.price_subtotal_incl:', line.price_subtotal_incl);
                console.log('  - line.price:', line.price);
                console.log('  - line.price_unit:', line.price_unit);

                // Get subtotal (without tax)
                if (line.price_subtotal !== undefined && line.price_subtotal !== null) {
                    lineSubtotal = line.price_subtotal;
                    console.log('✓ Using price_subtotal (no tax):', lineSubtotal);
                } else if (line.get_price_without_tax && typeof line.get_price_without_tax === 'function') {
                    lineSubtotal = line.get_price_without_tax();
                    console.log('✓ Using get_price_without_tax():', lineSubtotal);
                } else {
                    lineSubtotal = unitPrice * quantity;
                    console.log('✓ Calculated subtotal (unit * qty):', lineSubtotal);
                }

                // Get total with tax
                if (line.price_subtotal_incl !== undefined && line.price_subtotal_incl !== null) {
                    lineTotalWithTax = line.price_subtotal_incl;
                    console.log('✓ Using price_subtotal_incl (with tax):', lineTotalWithTax);
                } else if (line.get_price_with_tax && typeof line.get_price_with_tax === 'function') {
                    lineTotalWithTax = line.get_price_with_tax();
                    console.log('✓ Using get_price_with_tax():', lineTotalWithTax);
                } else if (line.get_display_price && typeof line.get_display_price === 'function') {
                    lineTotalWithTax = line.get_display_price();
                    console.log('✓ Using get_display_price():', lineTotalWithTax);
                } else {
                    // Need to calculate using tax_ids
                    console.log('>>> No price_subtotal_incl found, calculating with tax_ids...');
                    console.log('  - line.tax_ids:', line.tax_ids);

                    // Log the first tax object to see its structure
                    if (line.tax_ids && line.tax_ids.length > 0 && line.tax_ids[0]) {
                        console.log('  - line.tax_ids[0] object:', line.tax_ids[0]);
                        console.log('  - line.tax_ids[0] keys:', Object.keys(line.tax_ids[0]));
                        console.log('  - line.tax_ids[0].amount:', line.tax_ids[0].amount);
                        console.log('  - line.tax_ids[0].id:', line.tax_ids[0].id);
                        console.log('  - line.tax_ids[0].name:', line.tax_ids[0].name);
                    }

                    let taxRate = 0;

                    // Check different locations for tax data
                    console.log('  - Checking this.pos.taxes_by_id:', this.pos && this.pos.taxes_by_id ? 'YES' : 'NO');
                    console.log('  - Checking this.pos.models:', this.pos && this.pos.models ? 'YES' : 'NO');
                    console.log('  - Checking this.pos.db:', this.pos && this.pos.db ? 'YES' : 'NO');

                    if (line.tax_ids && line.tax_ids.length > 0) {
                        // Try multiple ways to access tax data
                        let taxesSource = null;

                        if (this.pos && this.pos.taxes_by_id) {
                            taxesSource = this.pos.taxes_by_id;
                            console.log('✓ Using this.pos.taxes_by_id');
                        } else if (this.pos && this.pos.taxes) {
                            taxesSource = this.pos.taxes;
                            console.log('✓ Using this.pos.taxes');
                        } else if (this.pos && this.pos.db && this.pos.db.tax_by_id) {
                            taxesSource = this.pos.db.tax_by_id;
                            console.log('✓ Using this.pos.db.tax_by_id');
                        }

                        // Iterate through tax_ids
                        for (let i = 0; i < line.tax_ids.length; i++) {
                            const taxIdOrObj = line.tax_ids[i];
                            console.log('  - Processing tax_ids[' + i + ']:', taxIdOrObj);

                            // The tax might be an object with amount directly
                            if (taxIdOrObj && typeof taxIdOrObj === 'object') {
                                if (taxIdOrObj.amount !== undefined) {
                                    taxRate += taxIdOrObj.amount;
                                    console.log('✓ Found tax rate from tax object:', taxIdOrObj.amount, '%', taxIdOrObj.name || '');
                                    continue;
                                }

                                // Try to get tax from id property
                                if (taxIdOrObj.id && taxesSource) {
                                    if (typeof taxesSource === 'object' && !Array.isArray(taxesSource)) {
                                        // It's a dictionary/map
                                        const tax = taxesSource[taxIdOrObj.id];
                                        if (tax && tax.amount !== undefined) {
                                            taxRate += tax.amount;
                                            console.log('✓ Found tax rate from taxes_by_id:', tax.amount, '%', tax.name || '');
                                            continue;
                                        }
                                    } else if (Array.isArray(taxesSource)) {
                                        // It's an array
                                        const tax = taxesSource.find(t => t.id === taxIdOrObj.id);
                                        if (tax && tax.amount !== undefined) {
                                            taxRate += tax.amount;
                                            console.log('✓ Found tax rate from taxes array:', tax.amount, '%', tax.name || '');
                                            continue;
                                        }
                                    }
                                }
                            } else if (typeof taxIdOrObj === 'number' && taxesSource) {
                                // It's just an ID
                                if (typeof taxesSource === 'object' && !Array.isArray(taxesSource)) {
                                    const tax = taxesSource[taxIdOrObj];
                                    if (tax && tax.amount !== undefined) {
                                        taxRate += tax.amount;
                                        console.log('✓ Found tax rate from taxes_by_id:', tax.amount, '%', tax.name || '');
                                        continue;
                                    }
                                } else if (Array.isArray(taxesSource)) {
                                    const tax = taxesSource.find(t => t.id === taxIdOrObj);
                                    if (tax && tax.amount !== undefined) {
                                        taxRate += tax.amount;
                                        console.log('✓ Found tax rate from taxes array:', tax.amount, '%', tax.name || '');
                                        continue;
                                    }
                                }
                            }

                            console.log('✗ Could not find tax data for:', taxIdOrObj);
                        }
                    }

                    if (taxRate > 0) {
                        lineTotalWithTax = lineSubtotal * (1 + taxRate / 100);
                        console.log('✓ Calculated with tax rate ' + taxRate + '%: ' + lineSubtotal + ' * ' + (1 + taxRate/100) + ' = ' + lineTotalWithTax);
                    } else {
                        console.log('⚠ WARNING: No tax rate found! Using subtotal as total');
                        lineTotalWithTax = lineSubtotal;
                    }
                }
            }

            subtotal += lineSubtotal;
            total += lineTotalWithTax;
            const lineTax = lineTotalWithTax - lineSubtotal;
            taxAmount += lineTax;

            console.log(`✓✓✓ Line ${idx + 1} FINAL Summary:`);
            console.log(`  - Subtotal (no tax): ${lineSubtotal.toFixed(3)}`);
            console.log(`  - Total (with tax): ${lineTotalWithTax.toFixed(3)}`);
            console.log(`  - Tax: ${lineTax.toFixed(3)}`);
        });

        console.log('>>> Calculated totals from lines - Subtotal:', subtotal, 'Tax:', taxAmount, 'Total:', total);

        // If orderlines calculation failed, try order-level methods
        if (subtotal === 0 && total === 0) {
            console.log('>>> Orderlines calculation failed, trying order-level methods...');

            try {
                if (order.get_total_with_tax && typeof order.get_total_with_tax === 'function') {
                    total = order.get_total_with_tax();
                    console.log('✓ Total from get_total_with_tax():', total);
                }

                if (order.get_total_without_tax && typeof order.get_total_without_tax === 'function') {
                    subtotal = order.get_total_without_tax();
                    console.log('✓ Subtotal from get_total_without_tax():', subtotal);
                }

                if (order.get_total_tax && typeof order.get_total_tax === 'function') {
                    taxAmount = order.get_total_tax();
                    console.log('✓ Tax from get_total_tax():', taxAmount);
                }

                // Calculate tax if not provided
                if (taxAmount === 0 && total > 0 && subtotal > 0) {
                    taxAmount = total - subtotal;
                    console.log('✓ Calculated tax from difference:', taxAmount);
                }
            } catch (e) {
                console.log('✗ Error calling order methods:', e);
            }
        }

        // Final fallback: Try direct properties
        if (subtotal === 0 && total === 0) {
            console.log('>>> Using direct properties as last resort...');
            total = order.amount_total || 0;
            subtotal = order.amount_untaxed || 0;
            taxAmount = order.amount_tax || 0;

            if (taxAmount === 0 && total > 0 && subtotal > 0) {
                taxAmount = total - subtotal;
            }
            console.log('Direct properties - Subtotal:', subtotal, 'Tax:', taxAmount, 'Total:', total);
        }

        // Ensure we have valid numbers
        subtotal = Number(subtotal) || 0;
        taxAmount = Number(taxAmount) || 0;
        total = Number(total) || 0;

        // Final validation
        if (total === 0 && subtotal > 0) {
            total = subtotal + taxAmount;
            console.log('>>> Recalculated total:', total);
        }

        console.log('======= FINAL VALUES =======');
        console.log('Subtotal:', subtotal.toFixed(3));
        console.log('Tax:', taxAmount.toFixed(3));
        console.log('Total:', total.toFixed(3));
        console.log('===============================');

        const productRows = orderlines.map((line, index) => {
            // Try multiple ways to get product name
            let productName = 'Unknown Product';

            if (line.get_product_name && typeof line.get_product_name === 'function') {
                productName = line.get_product_name();
            } else if (line.product_id && line.product_id.display_name) {
                productName = line.product_id.display_name;
            } else if (line.product_id && Array.isArray(line.product_id) && line.product_id.length > 1) {
                productName = line.product_id[1]; // Odoo often stores as [id, name]
            } else if (line.full_product_name) {
                productName = line.full_product_name;
            } else if (line.product_name) {
                productName = line.product_name;
            } else if (line.product && line.product.display_name) {
                productName = line.product.display_name;
            } else if (line.product && line.product.name) {
                productName = line.product.name;
            } else if (line.get_product && typeof line.get_product === 'function') {
                const product = line.get_product();
                if (product) {
                    productName = product.display_name || product.name || productName;
                }
            }

            const quantity = line.quantity || line.qty || 0;
            const unitPrice = line.price || line.price_unit || 0;

            // Get line total (with tax) for display
            let lineTotal = 0;
            if (line.get_all_prices && typeof line.get_all_prices === 'function') {
                lineTotal = line.get_all_prices().priceWithTax;
            } else if (line.price_subtotal_incl) {
                lineTotal = line.price_subtotal_incl;
            } else {
                lineTotal = unitPrice * quantity;
            }

            return `
                <tr>
                    <td style="padding: 6px 4px; text-align: center; font-size: 11px; color: black;">${index + 1}</td>
                    <td style="padding: 6px 4px; text-align: left; font-weight: 500; font-size: 11px; color: black;">${productName}</td>
                    <td style="padding: 6px 4px; text-align: center; font-size: 11px; color: black;">${quantity}</td>
                    <td style="padding: 6px 4px; text-align: right; font-size: 11px; color: black;">${unitPrice.toFixed(3)}</td>
                    <td style="padding: 6px 4px; text-align: right; font-weight: 600; font-size: 11px; color: black;">${lineTotal.toFixed(3)}</td>
                </tr>
            `;
        }).join('');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bill - ${tokenNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Courier New', monospace;
            background: white;
            padding: 5px;
            margin: 0;
            color: black;
        }

        .bill-container {
            max-width: 300px;
            margin: 0 auto;
            background: white;
            overflow: hidden;
        }

        .bill-header {
            background: white;
            color: black;
            padding: 15px 12px;
            border-bottom: 1px solid black;
            text-align: center;
        }

        .header-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .company-logo {
            max-width: 180px;
            max-height: 100px;
            display: block;
            object-fit: contain;
            margin: 0 auto;
        }

        .company-name {
            font-size: 14px;
            font-weight: 700;
            color: black;
            line-height: 1.3;
            margin-top: 8px;
            text-align: center;
        }

        .company-address {
            font-size: 10px;
            color: black;
            line-height: 1.4;
            margin-top: 5px;
        }

        .bill-date {
            font-size: 9px;
            margin: 0;
            margin-top: 8px;
            color: black;
        }

        .bill-info-section {
            padding: 12px;
            background: white;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
        }

        .info-box {
            background: white;
            padding: 8px 0;
        }

        .info-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: black;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 13px;
            font-weight: 600;
            color: black;
        }

        .token-box {
            background: white;
            color: black;
            text-align: center;
            padding: 8px 0;
        }

        .token-box .info-label {
            color: black;
        }

        .token-box .info-value {
            color: black;
            font-size: 18px;
            letter-spacing: 1.5px;
        }

        .products-section {
            padding: 12px;
        }

        .products-section h2 {
            font-size: 14px;
            color: black;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid black;
        }

        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11px;
        }

        .products-table thead {
            background: white;
            border-bottom: 1px solid black;
        }

        .products-table th {
            padding: 6px 4px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            color: black;
            font-weight: 600;
        }

        .products-table th:first-child,
        .products-table th:nth-child(3) {
            text-align: center;
        }

        .products-table th:nth-child(4),
        .products-table th:nth-child(5) {
            text-align: right;
        }

        .products-table td {
            padding: 6px 4px;
            color: black;
        }

        .products-table tbody tr td {
            border-bottom: 1px dotted black;
        }

        .products-table tbody tr:last-child td {
            border-bottom: 2px solid black;
        }

        .total-section {
            padding: 12px;
            background: white;
            border-top: 1px solid black;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 12px;
            color: black;
        }

        .total-row.subtotal {
            color: black;
        }

        .total-row.tax {
            color: black;
            padding-bottom: 8px;
            margin-bottom: 6px;
        }

        .total-row.grand-total {
            font-size: 16px;
            font-weight: 700;
            color: black;
            padding-top: 8px;
            border-top: 1px solid black;
        }

        .bill-footer {
            padding: 12px;
            text-align: center;
            background: white;
            color: black;
            border-top: 1px solid black;
        }

        .bill-footer p {
            margin: 2px 0;
            font-size: 9px;
            color: black;
        }
        
        .bill-footer .thank-you {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            color: black;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
            }
            
            .bill-container {
                box-shadow: none;
                border-radius: 0;
                max-width: 80mm;
                font-size: 11px;
            }
            
            .bill-header {
                padding: 12px 10px;
            }

            .header-content {
                gap: 6px;
            }

            .company-logo {
                max-width: 150px;
                max-height: 85px;
            }

            .company-name {
                font-size: 12px;
            }

            .company-address {
                font-size: 9px;
            }

            .bill-date {
                font-size: 8px;
            }

            .bill-info-section {
                padding: 10px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            
            .info-box {
                padding: 8px;
            }
            
            .info-label {
                font-size: 8px;
            }
            
            .info-value {
                font-size: 11px;
            }
            
            .token-box {
                padding: 10px;
            }
            
            .token-box .info-value {
                font-size: 16px;
            }
            
            .products-section {
                padding: 10px;
            }
            
            .products-section h2 {
                font-size: 12px;
            }
            
            .products-table {
                font-size: 10px;
            }
            
            .products-table th,
            .products-table td {
                padding: 4px 3px;
                font-size: 9px;
            }
            
            .total-section {
                padding: 10px;
            }
            
            .total-row {
                font-size: 11px;
            }
            
            .total-row.grand-total {
                font-size: 14px;
            }
            
            .bill-footer {
                padding: 10px;
            }
            
            .bill-footer p {
                font-size: 8px;
            }
            
            .bill-footer .thank-you {
                font-size: 11px;
            }
            
            @page {
                size: 80mm auto;
                margin: 2mm;
            }
        }
    </style>
</head>
<body>
    <div class="bill-container">
        <!-- Header -->
        <div class="bill-header">
            <div class="header-content">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
                <div class="company-name">ABU KHUZAM AND PARTNER<br>ALMUTAMIZA TRAD.</div>
                ${companyAddress ? `<div class="company-address">${companyAddress}</div>` : ''}
                <p class="bill-date">${currentDate}</p>
            </div>
        </div>
        
        <!-- Info Section -->
        <div class="bill-info-section">
            <div class="info-grid">
                <!-- Token Number -->
                <div class="info-box token-box">
                    <div class="info-label">Token Number</div>
                    <div class="info-value">${tokenNumber}</div>
                </div>
                
                <!-- Customer Name -->
                <div class="info-box">
                    <div class="info-value" style="font-size: 11px;"><span style="font-weight: 500;">Customer Name:</span> ${customerName}</div>
                </div>

                <!-- Customer Phone -->
                ${customerPhone ? `
                <div class="info-box">
                    <div class="info-value" style="font-size: 11px;"><span style="font-weight: 500;">Phone Number:</span> ${customerPhone}</div>
                </div>
                ` : ''}

                <!-- Pickup Date -->
                <div class="info-box">
                    <div class="info-label">Scheduled Pickup</div>
                    <div class="info-value" style="color: black; font-size: 11px;">${pickupDate}</div>
                </div>
            </div>
        </div>
        
        <!-- Products Section -->
        <div class="products-section">
            <h2>Products</h2>
            <table class="products-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>
        </div>
        
        <!-- Total Section -->
        <div class="total-section">
            <div class="total-row subtotal">
                <span>Subtotal:</span>
                <span>${currencySymbol}${subtotal.toFixed(3)}</span>
            </div>
            <div class="total-row tax">
                <span>Tax:</span>
                <span>${currencySymbol}${taxAmount.toFixed(3)}</span>
            </div>
            <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>${currencySymbol}${total.toFixed(3)}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="bill-footer">
            <p class="thank-you">Thank You!</p>
            <p>Computer-generated bill</p>
            <p style="margin-top: 8px; opacity: 0.7;">Keep for records</p>
        </div>
    </div>
</body>
</html>
        `;
    },

    /**
     * Show notification
     */
    _showNotification(message, type = 'info') {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 24px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <span style="font-size: 24px;">${icons[type]}</span>
            <span>${message}</span>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Get current order
     */
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
        return null;
    },
});

console.log("Auto Bill Module - Loaded successfully");