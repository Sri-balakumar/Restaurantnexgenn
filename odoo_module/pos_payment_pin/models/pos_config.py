# -*- coding: utf-8 -*-
from odoo import models, fields


class PosConfig(models.Model):
    _inherit = 'pos.config'

    kot_printer_ip = fields.Char(
        string='KOT Printer IP',
        default='192.168.0.100'
    )
    kot_printer_port = fields.Integer(
        string='KOT Printer Port',
        default=9100
    )
    kot_use_print_agent = fields.Boolean(
        string='Use Local Print Agent',
        default=False,
        help='Enable for cloud Odoo setup. Browser sends KOT to local print agent '
             'running on client PC instead of Odoo server trying to reach the printer.'
    )
    kot_agent_url = fields.Char(
        string='Print Agent URL',
        default='http://localhost:5123',
        help='URL of the local print agent (print_agent.py) running on client PC'
    )
    payment_pin = fields.Char(
        string='Payment PIN',
        default='',
        help='PIN required on the mobile POS app before opening the payment screen. '
             'Leave empty to disable the PIN gate for this POS.'
    )


class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_pos_config(self):
        result = super()._loader_params_pos_config()
        result['search_params']['fields'].extend([
            'kot_printer_ip',
            'kot_printer_port',
            'kot_use_print_agent',
            'kot_agent_url',
            'payment_pin',
        ])
        return result
