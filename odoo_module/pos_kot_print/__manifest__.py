{
    'name': 'POS KOT Print',
    'version': '19.0.4.0.0',
    'category': 'Point of Sale',
    'summary': 'Kitchen Order Ticket - Cloud + Local Printer Support',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_kot_print/static/src/js/kot_button.js',
            'pos_kot_print/static/src/xml/kot_button.xml',
            'pos_kot_print/static/src/css/kot_button.css',
        ],
    },
    'installable': True,
    'license': 'LGPL-3',
}
