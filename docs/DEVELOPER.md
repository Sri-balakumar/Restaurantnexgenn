# NexGenn Restaurant POS — Developer Guide

React Native (Expo) tablet app that talks to Odoo POS. This guide explains where things live, how data flows, and what to touch for common changes.

---

## 1. Stack

| Layer | Tech |
|---|---|
| Mobile | React Native 0.72+ via **Expo** |
| UI | React Native Paper, NativeWind (Tailwind), custom components |
| State | **Zustand** (`src/stores/*`) — auth, product cart, currency, kitchen, language |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Backend | **Odoo 19 Point of Sale** via `/web/dataset/call_kw` (JSON-RPC, session cookie auth) |
| Storage | `@react-native-async-storage/async-storage` (session, pos_config_id, saved creds, recent KOT names) |
| Custom Odoo module | [`odoo_module/pos_payment_pin`](../odoo_module/pos_payment_pin) |

Path aliases defined in [jsconfig.json](../jsconfig.json): `@api`, `@components`, `@screens`, `@stores`, `@hooks`, `@constants`, `@utils`, `@assets`.

---

## 2. Folder layout (what matters)

```
src/
├─ api/
│  ├─ config/                  API base URL + Odoo defaults
│  ├─ services/
│  │  ├─ generalApi.js         Odoo RPC wrappers (products, orders, payments, pricelists, …)
│  │  ├─ kotService.js         KOT print + POS config fetch (+ exports callKw)
│  │  └─ utils.js              get/post/put/delete with base URL
│  └─ utils/
│     ├─ handleApiError.js
│     └─ networkInterceptor.js Global axios interceptor → Retry/Cancel popup
├─ components/
│  ├─ NetworkError/            Global "server unreachable" modal + zustand store
│  ├─ Product/ProductsList.js  Product tile in the grid
│  ├─ Modal/                   Reusable modals
│  └─ …                        Header, Loader, Toast, Text, containers, etc.
├─ hooks/
│  ├─ usePressOnce.js          Debounce + async-lock for buttons (double-tap guard)
│  ├─ useDataFetching.js
│  ├─ useTranslation.js
│  └─ …
├─ navigation/
│  ├─ StackNavigator.js        Root stack (screens registered here)
│  └─ AppNavigator.js          Bottom tab navigator + logout
├─ screens/
│  ├─ Auth/LoginScreenOdoo.js  Login (primes POS config at login)
│  ├─ Splash/
│  ├─ DeviceSetup/             First-run URL/DB config + QR scan
│  ├─ Home/
│  │  ├─ Sections/
│  │  │  ├─ Customer/
│  │  │  │  ├─ POSRegister.js           Pick an open POS session
│  │  │  │  ├─ ChooseOrderType.js       Dine In / New Takeout / Takeout List
│  │  │  │  ├─ TablesScreen.js          Dine-in tables
│  │  │  │  ├─ TakeawayOrdersScreen.js  List of takeaway orders
│  │  │  │  ├─ POSProducts.js           MAIN register screen (cart + products)
│  │  │  │  ├─ KitchenBillPreview.js    Preview before sending KOT
│  │  │  │  ├─ POSCartSummary.js
│  │  │  │  └─ CustomerDetails.js
│  │  │  └─ Services/           Unrelated service / pickup flows
│  │  └─ Options/               CRM, Purchases, Audit, Visits …
│  └─ KPIDashboard/
├─ stores/
│  ├─ auth/                    useAuthStore (isLoggedIn, user, login, logout)
│  ├─ product/                 useProductStore (cartItems by cartOwner)
│  ├─ currency/
│  ├─ kitchen/ticketsStore.js
│  └─ language/
├─ constants/
│  ├─ theme.js
│  └─ translations.js          EN + AR translations
└─ utils/
   └─ formatters/              currency, dates
```

Entry: [App.js](../App.js) loads fonts, installs the network interceptor, mounts `NetworkErrorModal`, and renders `StackNavigator`.

---

## 3. Odoo custom module — `pos_payment_pin`

Location: [odoo_module/pos_payment_pin](../odoo_module/pos_payment_pin)

| File | Purpose |
|---|---|
| [`__manifest__.py`](../odoo_module/pos_payment_pin/__manifest__.py) | Module declaration (`POS Payment PIN`, v19.0.5.0.0) |
| [`models/pos_config.py`](../odoo_module/pos_payment_pin/models/pos_config.py) | Adds fields on `pos.config`: `kot_printer_ip`, `kot_printer_port`, `kot_use_print_agent`, `kot_agent_url`, **`payment_pin`** |
| [`models/pos_kot_print.py`](../odoo_module/pos_payment_pin/models/pos_kot_print.py) | `pos.kot.print` model with `print_kot` method; queues to `pos.kot.queue` |
| [`views/pos_config_views.xml`](../odoo_module/pos_payment_pin/views/pos_config_views.xml) | Adds "KOT Printer Settings" + "Mobile POS — Payment PIN" groups on the POS config form |
| [`security/ir.model.access.csv`](../odoo_module/pos_payment_pin/security/ir.model.access.csv) | ACLs for `pos.kot.print` and `pos.kot.queue` |
| [`static/src/js/kot_button.js`](../odoo_module/pos_payment_pin/static/src/js/kot_button.js) | Adds a KOT button in Odoo web POS |
| [`print_agent.py`](../odoo_module/pos_payment_pin/print_agent.py) | Optional local printer agent (for cloud-hosted Odoo) |

**Bump the manifest version on every schema change** so Odoo picks up new fields on `Upgrade`.

---

## 4. Auth & connection

1. First launch → [`DeviceSetupScreen`](../src/screens/DeviceSetup/DeviceSetupScreen.js) captures server URL + DB (via scan or manual).
2. [`LoginScreenOdoo`](../src/screens/Auth/LoginScreenOdoo.js) hits `/web/session/authenticate`, stores `odoo_session_id`, `userData`, saved creds.
3. After login it:
   - Reads `pos.config` ids → saves the first one to `AsyncStorage.pos_config_id`.
   - Calls [`loadPosConfig(configId)`](../src/api/services/kotService.js) → caches KOT printer + payment PIN fields for the session.
4. On logout ([`AppNavigator.js:91-94`](../src/navigation/AppNavigator.js#L91-L94)) — clears `clearProductCache`, `clearPosConfigCache`, `AsyncStorage.multiRemove(['userData', 'odoo_session_id'])`.

All Odoo requests send `Cookie: session_id=…` + `X-Openerp-Session-Id` + `X-Odoo-Database`. Helpers: `_buildOdooHeaders()` (in generalApi.js), `getConnectionInfo()` (in kotService.js).

---

## 5. Main screen — `POSProducts.js`

This is the register. Everything interesting happens here.

**State refs:**
- `orderIdRef` — current Odoo `pos.order` ID (resolved lazily via `ensureOrderId`).
- `activePricelistRef` + `pricelistItemsRef` — Dine In / Application pricelist cache: `{ _cache: { plId: { tmplId: fixedPrice } }, _prodMap: { productId: { tmplId, lstPrice, taxesId } } }`.
- `taxRateMap` — `{ taxId: { amount, priceInclude } }`.
- `pendingSyncs` — array of in-flight `addLineToOrderOdoo` promises; Kitchen Bill awaits them.

**Key hooks:**
- `useFocusEffect` → sets `cartOwner`, refreshes order from Odoo.
- Mount `useEffect` chain → fetch pricelists, pricelist items, all products (for taxesId lookup), account.tax rates, payment PIN.

**Cart math — the single source of truth:**
- `computeLineTotal(item)` — qty × price_unit with each product's tax added on top (respecting `price_include`). Resolves `taxes_id` from the item first, falls back to `_prodMap[productId].taxesId` for server-loaded lines.
- `computeCartTotal(items)` — sum of `computeLineTotal`.
- `computeCartBreakdown(items)` — `{ subtotal, tax, total }` for the UI.

**User interactions to add-to-cart:**
- Tile tap → opens Quick Add modal (`openQuickAdd`) → user sets qty/note → `confirmQuickAdd` (debounced via `usePressOnce`) → `handleAdd(p, qty, note)` → updates Zustand cart + calls `addLineToOrderOdoo`.
- `handleAdd` applies pricelist `fixed_price` via `pricelistItemsRef`.

**Key buttons (all wrapped by `usePressOnce`):**
- **Kitchen Bill** → `onKitchenBillPress` → awaits `pendingSyncs` → `openKotWizard(baseParams)` (opens name + time slot wizard only for TAKEAWAY; skips for DINEIN).
- **Pay Now** → `onPayNowPress` → PIN gate (if locked) → Payment modal.
- **Pay confirm** → `onPayConfirmPress` → `handlePayNow`.

---

## 6. Pricelists

Dine In / Application are `product.pricelist` records in Odoo. Each item in `product.pricelist.item` overrides `fixed_price` per product template.

Flow in app:
1. Load all pricelists → `fetchPricelistsOdoo`.
2. Bulk-fetch **all** items + all products (taxes_id, tmpl_id) on mount.
3. Active pricelist is stored on the order (`pricelist_id`) and driven by the Dine In / Application toggle.
4. Switching a pricelist → `handleSwitchPricelist` — instantly updates cart line prices from the cache, then syncs to Odoo in the background.

---

## 7. KOT flow

1. User presses **Kitchen Bill**.
2. For TAKEAWAY: wizard asks for customer name + time slot ([POSProducts.js:openKotWizard](../src/screens/Home/Sections/Customer/POSProducts.js)). DINEIN skips the wizard.
3. Navigate to `KitchenBillPreview` → shows items, sends the print request.
4. [`kotService.printKot(kotData)`](../src/api/services/kotService.js) builds payload and calls `pos.kot.print.print_kot`:
   - `printer_ip` + `printer_port` come from `pos.config` (cached at login via `loadPosConfig`).
   - `slot_time`, `order_name`, items, cashier, print_type (NEW / ADDON / FULL).
5. Odoo creates a `pos.kot.queue` job → background processor prints to ESC/POS printer.

KOT customer-name wizard stores last 6 names in `AsyncStorage.kot_recent_names`.

---

## 8. Payment flow

1. User taps **Pay Now** → (`onPayNowPress`)
2. If `payUnlocked === false`, opens PIN modal. On correct PIN (matched against Odoo's `pos.config.payment_pin`), sets `payUnlocked=true` and opens Payment modal in the same tap.
3. User picks a payment method (from `fetchPosPaymentMethodsOdoo`), optional cash amount + change.
4. `handlePayNow(cartItems)`:
   - Creates `pos.payment` record linked to the draft order.
   - Writes `amount_paid`, `amount_return`, `state: 'paid'` on the order.
   - Calls `action_pos_order_paid` for Odoo side effects.
5. Navigate back to Home.

Amount sent to Odoo uses `computeCartTotal` (tax-inclusive).

---

## 9. Takeaway orders

[TakeawayOrdersScreen.js](../src/screens/Home/Sections/Customer/TakeawayOrdersScreen.js) lists orders filtered by preset = Takeaway, with at least one line.

It fetches:
- All takeaway `pos.order` rows.
- All their `pos.order.line` rows in one RPC.
- `taxes_id` for every referenced product.
- All `account.tax` rates.

Then computes each order's tax-inclusive total (same rule as the register) and stores it as `amount_total_incl`. The card shows that.

Opening an order navigates to POSProducts with `orderId`, `orderLines`, `cartOwner = \`order_${id}\``.

---

## 10. Network error popup

Installed once in [App.js](../App.js) via `installNetworkInterceptor()`.

- Axios response interceptor — detects errors with no response, timeouts, `Network Error`.
- Pushes to zustand `useNetworkErrorStore` → `NetworkErrorModal` renders.
- User picks **Retry** (replays the request, resolves original promise) or **Cancel** (rejects with original error — existing `.catch` blocks still run).
- Retries are marked `__networkRetried` so they don't re-trigger the popup.

Files:
- [`src/api/utils/networkInterceptor.js`](../src/api/utils/networkInterceptor.js)
- [`src/components/NetworkError/*`](../src/components/NetworkError)

---

## 11. Double-press guard

[`usePressOnce(handler, cooldownMs=600)`](../src/hooks/usePressOnce.js) returns a wrapped callback that ignores rapid presses. If the handler returns a Promise, the lock holds until it settles.

Apply to any server-side-effect button:

```js
const onSubmit = usePressOnce(async () => { await createX(); navigation.navigate(…); });
<TouchableOpacity onPress={onSubmit} />
```

Currently guards: Kitchen Bill, Pay Now, Pay confirm, Quick-Add confirm.

---

## 12. Running the app

```bash
cd D:\nexgenn\apk\res
npm install          # first time
npx expo start       # dev server
# Press `a` for Android, scan QR with Expo Go, or --tunnel if on a different network
```

Production APK:
```bash
npx eas build -p android --profile preview
```
`eas.json` defines the profiles.

Build uses env vars from `.env` — `EXPO_PUBLIC_APP_NAME`, `EXPO_PUBLIC_PACKAGE_NAME`, `EXPO_PUBLIC_PROJECT_ID` and per-country variants (UAE, Oman, UAE_TEST, ALPHA). [`generateAppJson.js`](../generateAppJson.js) patches `app.json` for the selected country.

---

## 13. Common change recipes

| Task | Touch this |
|---|---|
| Add a new product field from Odoo | `generalApi.preloadAllProducts` → field list. Use in `ProductsList.js` or POSProducts. |
| New RPC wrapper | Add to `generalApi.js` using `_buildOdooHeaders()` + `fetch`. |
| New Odoo field on `pos.config` | Add in `pos_payment_pin/models/pos_config.py`, extend loader, bump manifest version, add to XML view, extend `kotService._fetchPosConfig` field list. |
| New protected button | Wrap the handler with `usePressOnce`. |
| Change price logic | Only edit `computeLineTotal` / `computeCartTotal` / `computeCartBreakdown`. All UI reads from there. |
| Add a screen | Create file in `src/screens/…`, register in `src/navigation/StackNavigator.js`. |
| Translate a string | Add the key to both blocks in `src/constants/translations.js`. |

---

## 14. Debug tips

- Metro logs are king — look for `[KOT]`, `[KitchenBill]`, `[KOT Wizard]`, `API request:`.
- To force the POS config re-fetch (e.g. after editing PIN in Odoo), log out and in, OR open the register screen (it calls `loadPosConfig` on mount).
- Network interceptor swallows retries — for debugging, remove `__networkRetried` guard temporarily.
- Double-tap tests: check you see only one row in Odoo's `pos.order.line` after a rapid-fire add.
- AsyncStorage keys worth knowing: `odoo_session_id`, `device_server_url`, `device_db_name`, `pos_config_id`, `userData`, `saved_credentials`, `kot_recent_names`.
