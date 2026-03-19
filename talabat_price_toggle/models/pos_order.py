# -*- coding: utf-8 -*-

from odoo import api, fields, models
from datetime import datetime
import logging

_logger = logging.getLogger(__name__)


class PosOrder(models.Model):
    _inherit = 'pos.order'

    token_number = fields.Char(
        string='Token Number',
        readonly=True,
        copy=False,
    )
    # Store pickup date as Char to avoid Odoo datetime conversion issues
    pickup_date = fields.Char(
        string='Scheduled Pickup Date',
    )

    def _export_for_ui(self, order):
        """Add token_number and pickup_date to POS UI order data"""
        result = super()._export_for_ui(order)
        result['token_number'] = order.token_number
        result['pickup_date'] = order.pickup_date
        return result

    @api.model
    def _generate_token_number(self):
        """Generate sequential token number T-000001, T-000002, etc."""
        # Search for all tokens matching pattern T-XXXXXX (6 digits only)
        all_orders = self.search([
            ('token_number', '!=', False),
            ('token_number', 'like', 'T-%')
        ], order='id desc')

        # Find the highest token number in new format (T-XXXXXX, 8 chars total)
        last_num = 0
        for order in all_orders:
            token = order.token_number
            # Only process tokens in new format: T-XXXXXX (exactly 8 characters)
            if token and len(token) == 8 and token.startswith('T-'):
                try:
                    num = int(token.split('-')[1])
                    # Only accept 6-digit numbers (1 to 999999)
                    if num > 0 and num <= 999999 and num > last_num:
                        last_num = num
                        _logger.info(f"Found valid token: {token}, number: {num}")
                except (ValueError, IndexError):
                    # Skip invalid tokens
                    _logger.warning(f"Skipping invalid token format: {token}")
                    continue
            else:
                # Skip old timestamp tokens (longer than 8 chars)
                if token:
                    _logger.info(f"Skipping old timestamp token: {token}")

        new_num = last_num + 1
        _logger.info(f"Generating new token number: {new_num}")

        return f'T-{new_num:06d}'

    @api.model
    def get_next_token_number(self):
        """Public method to get next token number - callable from frontend"""
        return self._generate_token_number()

    @api.model
    def _order_fields(self, ui_order):
        """Override to include pickup_date and token_number from POS UI"""
        result = super()._order_fields(ui_order)
        if ui_order.get('pickup_date'):
            # Store as string directly
            result['pickup_date'] = ui_order.get('pickup_date')
        if ui_order.get('token_number'):
            # Store token number from frontend to preserve it
            result['token_number'] = ui_order.get('token_number')
        return result

    @api.model_create_multi
    def create(self, vals_list):
        """Override create to generate token number if not already set"""
        for vals in vals_list:
            if not vals.get('token_number'):
                # Only generate new token if one wasn't already set from frontend
                vals['token_number'] = self._generate_token_number()
                _logger.info(f"Generated new token: {vals['token_number']}")
            else:
                # Token already set from frontend (Auto Bill), preserve it
                _logger.info(f"Using existing token from frontend: {vals['token_number']}")
        return super().create(vals_list)