# -*- coding: utf-8 -*-
from odoo import models


class PosSession(models.Model):
    """
       This is an Odoo model for Point of Sale (POS) sessions.
       It inherits from the 'pos.session' model and extends its functionality.
    """
    _inherit = 'pos.session'

    def _loader_params_product_product(self):
        """Function to load the product field to the product params"""
        result = super()._loader_params_product_product()
        result['search_params']['fields'].append('qty_available')
        return result

    def _loader_params_pos_receipt(self):
        """Function that returns the product field pos Receipt"""
        return {
            'search_params': {
                'domain': [],
                'fields': ['design_receipt', 'name'],
            },
        }

    def _get_pos_ui_pos_receipt(self, params):
        """Used to Return the params value to the pos Receipts"""
        return self.env['pos.receipt'].search_read(**params['search_params'])
    
    def _pos_data_process(self, loaded_data):
        """Register the pos.receipt data loader"""
        super()._pos_data_process(loaded_data)
        loaded_data['pos.receipt'] = self._get_pos_ui_pos_receipt(
            self._loader_params_pos_receipt()
        )

    def _pos_ui_models_to_load(self):
        """Add pos.receipt to models to load"""
        result = super()._pos_ui_models_to_load()
        result.append('pos.receipt')
        return result