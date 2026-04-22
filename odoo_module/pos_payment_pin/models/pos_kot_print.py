# -*- coding: utf-8 -*-
from odoo import models, api, fields
from datetime import datetime
import pytz
import socket
import json
import logging

_logger = logging.getLogger(__name__)


class PosKotQueue(models.Model):
    """Queue for KOT print jobs - agent polls this"""
    _name = 'pos.kot.queue'
    _description = 'POS KOT Print Queue'
    _order = 'create_date desc'

    config_id = fields.Many2one('pos.config', string='POS Config')
    kot_data = fields.Text(string='KOT Data (JSON)')
    state = fields.Selection([
        ('pending', 'Pending'),
        ('done', 'Printed'),
        ('failed', 'Failed'),
    ], default='pending', string='Status')
    printer_ip = fields.Char(string='Printer IP')
    printer_port = fields.Integer(string='Printer Port')

    @api.model
    def get_pending(self, printer_ip=None):
        """Agent calls this to get pending KOTs"""
        domain = [('state', '=', 'pending')]
        if printer_ip:
            domain.append(('printer_ip', '=', printer_ip))
        records = self.search(domain, limit=20, order='create_date asc')
        result = []
        for rec in records:
            try:
                result.append({
                    'id': rec.id,
                    'data': json.loads(rec.kot_data) if rec.kot_data else {},
                })
            except Exception:
                rec.state = 'failed'
        return result

    @api.model
    def mark_done(self, ids):
        """Agent calls this after printing"""
        records = self.browse(ids)
        records.write({'state': 'done'})
        return True

    @api.model
    def mark_failed(self, ids, error=''):
        """Agent calls this on print failure"""
        records = self.browse(ids)
        records.write({'state': 'failed'})
        return True


class PosKotPrint(models.Model):
    _name = 'pos.kot.print'
    _description = 'POS KOT Print'

    @api.model
    def print_kot(self, kot_data):
        """
        Receives KOT from POS JS and queues it for the local agent.
        No direct socket printing - agent handles that.
        """
        try:
            _logger.info("=== KOT Print Request ===")
            _logger.info("Data: %s", kot_data)

            items = kot_data.get('items', [])
            if not items:
                _logger.info("Skipping KOT - no items")
                return {'success': True, 'message': 'No items'}

            # Get config_id if available
            config_id = kot_data.get('config_id', False)
            printer_ip = kot_data.get('printer_ip', '192.168.0.100')
            printer_port = kot_data.get('printer_port', 9100)

            # Add to queue
            self.env['pos.kot.queue'].sudo().create({
                'config_id': config_id or False,
                'kot_data': json.dumps(kot_data),
                'printer_ip': printer_ip,
                'printer_port': printer_port,
                'state': 'pending',
            })

            _logger.info("KOT queued for %s:%s", printer_ip, printer_port)
            return {'success': True, 'message': 'KOT queued for printing'}

        except Exception as e:
            _logger.exception("KOT error: %s", e)
            return {'success': False, 'message': str(e)}

    def _build_receipt(self, kot_data):
        """Build ESC/POS receipt"""
        INIT = b'\x1b@'
        BOLD_ON = b'\x1bE\x01'
        BOLD_OFF = b'\x1bE\x00'
        CENTER = b'\x1ba\x01'
        LEFT = b'\x1ba\x00'
        DOUBLE = b'\x1d!\x11'
        DOUBLE_HEIGHT = b'\x1d!\x01'
        NORMAL = b'\x1d!\x00'
        CUT = b'\x1dV\x42\x00'
        LF = b'\n'

        data = INIT

        user_tz = 'Asia/Muscat'
        local_tz = pytz.timezone(user_tz)
        local_time = datetime.now(pytz.UTC).astimezone(local_tz)

        order_type = kot_data.get('order_type', '') or kot_data.get('order_type_label', '') or 'Dine In'
        now_time = local_time.strftime('%I:%M:%S %p')

        if order_type.lower() in ['takeout', 'delivery', 'takeaway']:
            order_type_display = f"{order_type} ({now_time})"
        else:
            order_type_display = order_type

        data += CENTER + DOUBLE + BOLD_ON
        data += order_type_display.encode('utf-8', errors='ignore') + LF
        data += NORMAL + BOLD_OFF

        now = local_time.strftime('%H:%M')
        data += ('Restaurant : ' + now).encode('utf-8', errors='ignore') + LF

        slot_time = kot_data.get('slot_time', '')
        if slot_time:
            data += BOLD_ON
            data += ('Slot Time: ' + str(slot_time)).encode('utf-8', errors='ignore') + LF
            data += BOLD_OFF

        waiter = kot_data.get('waiter', '') or kot_data.get('cashier', '')
        if waiter:
            data += ('Waiter: ' + str(waiter)).encode('utf-8', errors='ignore') + LF

        order_name = kot_data.get('order_name', '')
        if order_name:
            data += ('Order Name: ' + str(order_name)).encode('utf-8', errors='ignore') + LF
            
        data += LF

        table_name = kot_data.get('table_name', '')
        order_number = kot_data.get('order_number', '') or kot_data.get('order_name', '')
        order_line = 'Order'
        if table_name:
            order_line += ' ' + str(table_name)
        if order_number:
            order_line += ' # ' + str(order_number)

        data += BOLD_ON + DOUBLE_HEIGHT
        data += order_line.encode('utf-8', errors='ignore') + LF
        data += NORMAL + BOLD_OFF

        guest_count = kot_data.get('guest_count', 0)
        if guest_count:
            data += ('Guest: ' + str(guest_count)).encode('utf-8', errors='ignore') + LF

        data += LF + b'-' * 32 + LF

        print_type = kot_data.get('print_type', 'NEW')
        data += CENTER + BOLD_ON + DOUBLE
        data += print_type.encode('utf-8', errors='ignore') + LF
        data += NORMAL + BOLD_OFF + LEFT
        data += b'-' * 32 + LF

        items = kot_data.get('items', [])
        for item in items:
            name = str(item.get('name', 'Item'))
            qty = int(item.get('qty', 1))
            note = item.get('note', '')
            line = '{:<2} {}'.format(qty, name)
            data += BOLD_ON
            data += line.encode('utf-8', errors='ignore') + LF
            data += BOLD_OFF
            if note:
                data += ('   >> ' + str(note)).encode('utf-8', errors='ignore') + LF

        data += LF + b'-' * 32 + LF + LF + LF * 8 + CUT
        return data
