{
    'name': 'Device Login Configuration',
    'version': '19.0.1.0.0',
    'category': 'Technical/Authentication',
    'summary': 'Register devices and skip config page on repeat visits',
    'description': """
        Device Login Configuration
        ==========================
        When a browser/device accesses Odoo for the first time, it is
        redirected to a configuration page where the operator enters:
          - Base URL
          - Database name

        A UUID v4 Device ID is generated in the browser (stored in cookie
        + localStorage). These details are saved to the ``device.registry``
        model. On subsequent visits the device is recognised automatically
        and the user goes directly to the normal username/password login page.

        Configuration page reappears when:
          - A new/different device or browser accesses the system
          - The registry record for the device is deleted by an administrator
          - The module is reinstalled
    """,
    'author': 'Custom',
    'depends': ['web', 'base'],
    'data': [
        'security/device_security.xml',
        'security/ir.model.access.csv',
        'views/device_registry_views.xml',
        'templates/device_config.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'device_login_config/static/src/js/device_config.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
