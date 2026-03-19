{
    'name': 'Talabat Price Toggle',
    'version': '19.0.1.0.1',
    'category': 'Point of Sale',
    'summary': 'Add Normal Price / Talabat Price toggle buttons to POS navigation bar',
    'description': """
        Add pricelist toggle buttons to Point of Sale top navigation bar.

        Features:
        =========
        - Normal Price button - switches to normal pricelist
        - Talabat Price button - switches to talabat pricelist
        - Auto Print Bill button - print bill before payment
        - Uses Odoo's proper pricelist system via order.set_pricelist()
        - Properly recalculates ALL prices for existing order lines
        - Does NOT affect quantities, notes, or any other order data

        Requirements:
        =============
        You need to have pricelists configured in your Odoo system:
        - One pricelist with "Normal" in its name (or it will use the first available)
        - One pricelist with "Talabat" in its name
    """,
    'author': 'Arthur',
    'website': '',
    'depends': ['point_of_sale'],
    'assets': {
        'point_of_sale._assets_pos': [
            'talabat_price_toggle/static/src/app/models/order_token.js',
            'talabat_price_toggle/static/src/app/navbar/custom_buttons.js',
            'talabat_price_toggle/static/src/app/navbar/custom_buttons.scss',
            'talabat_price_toggle/static/src/app/navbar/auto_bill.js',
            'talabat_price_toggle/static/src/app/orders/orders_screen.js',
            'talabat_price_toggle/static/src/app/orders/orders_screen.xml',
        ],
    },
    'data': [
        'views/pos_order_views.xml',
    ],
    'demo': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
