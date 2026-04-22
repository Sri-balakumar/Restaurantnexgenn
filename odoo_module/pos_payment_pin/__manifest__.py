{
    'name': 'POS Payment PIN',
    'version': '19.0.5.0.0',
    'category': 'Point of Sale',
    'summary': 'Mobile POS payment PIN gate + KOT print (cloud + local printer)',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_payment_pin/static/src/js/kot_button.js',
            'pos_payment_pin/static/src/xml/kot_button.xml',
            'pos_payment_pin/static/src/css/kot_button.css',
        ],
    },
    'installable': True,
    'license': 'LGPL-3',
}
