from odoo import models, fields


class DeviceRegistry(models.Model):
    _name = 'device.registry'
    _description = 'Device Registry'
    _rec_name = 'device_name'
    _order = 'last_login desc'

    device_name = fields.Char(
        string='Device Name',
        required=True,
        help='Browser/User-Agent string that identifies the device.',
    )
    device_id = fields.Char(
        string='Device ID (UUID)',
        required=True,
        index=True,
        help='UUID v4 generated in the browser and stored in a cookie. '
             'Uniquely identifies a device across sessions.',
    )
    base_url = fields.Char(
        string='Base URL',
        required=True,
        help='The Odoo server base URL entered by the operator during device setup.',
    )
    database_name = fields.Char(
        string='Database Name',
        required=True,
        help='The Odoo database this device is registered against.',
    )
    last_login = fields.Datetime(
        string='Last Login',
        help='Timestamp of the last successful device registration or login.',
    )

    _device_id_db_uniq = models.Constraint(
        'UNIQUE(device_id, database_name)',
        'A device ID can only be registered once per database.',
    )
