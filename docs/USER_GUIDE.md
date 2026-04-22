# NexGenn Restaurant POS — User Guide

A step-by-step guide for cashiers, waiters, and managers using the tablet POS app.

---

## 1. First-time device setup

The tablet needs to know which Odoo server to connect to. This is usually done once by the admin.

1. Open the app → **Device Setup** screen.
2. Enter the server URL (e.g. `https://myrestaurant.369ai.biz:3049`) and database name. Or scan the QR code the admin shared.
3. Tap **Save & Continue**.

Once configured, the app goes straight to the login screen next time.

---

## 2. Login

1. Type your **Odoo username** (email or login).
2. Type your **password**.
3. Tap **Login**.

- ✅ *Remember me* keeps your credentials for next time.
- 🌐 Pick a language (English / Arabic) from the top-right selector.

If login fails:
- "Incorrect credentials" → double-check username + password in Odoo.
- "Cannot reach server" popup → check Wi-Fi, then **Retry**.

---

## 3. Open a POS session

After login you land on the **Registers** screen listing open POS sessions.

- Tap **Continue Selling** on the session you want.
- If no session is open, the manager needs to open one from Odoo first.

---

## 4. Choose order type

Three choices:

| Button | When to use |
|---|---|
| **Dine In** | Customer sits at a table |
| **New Takeout Order** | Walk-in customer, takeaway / delivery. Always creates a brand-new empty order. |
| **Takeout Orders** | Resume an existing takeaway order (pickup time came, edits, etc.) |

### 4a. Dine In
- You'll see the floor plan with tables.
- Tap an empty table → enter guest count → start adding products.
- Tap a table with an active order → continue that order.

### 4b. New Takeout
- A fresh order is created immediately and opens the Register.
- Cart starts empty.

### 4c. Resume a takeaway order
- Shows a list of all open takeaway orders with their totals.
- Tap any row to reopen it.
- Badges show *Open* / *Paid* / *Done*.

---

## 5. Register screen (the main POS)

Left side (bigger): **Register cart** — items in the current order.
Right side: **Products** — categories + product tiles.

### Adding products
- Tap a **category chip** (Show All / Food / Drinks …) to filter.
- Tap a product tile → **Quick Add** popup:
  - Set **quantity**.
  - (Optional) Add a **note** ("No oil", "Extra spicy").
  - Tap **Apply**.
- Product appears in the cart on the left.

### Editing the cart
- **− / +** buttons next to each line → change quantity.
- **Tap the row** → open "Item Options" for discount / remove.
- **Clear** button (top right) → wipe the whole cart (confirmation asked).

### Dine In Price vs Application Price
Switch at the top of the cart:
- **Dine In Price** → standard menu price (usually higher).
- **Application Price** → app/delivery price (e.g. Talabat) — may be different.

Switching instantly re-prices every item in the cart.

### Subtotal / Taxes / Total (bottom of cart)
- **Subtotal** — the base amount (before tax).
- **Taxes** — sum of VAT / service tax for taxable items.
- **Total** — what the customer pays.

If no items have tax, the Taxes row is hidden.

---

## 6. Send to kitchen — Kitchen Bill (KOT)

Tap the big purple **Kitchen Bill** button.

### For Dine In
- Goes straight to the **Kitchen Bill Preview** — tap **Send to Kitchen** to print.

### For New Takeout
- First popup asks for **Customer Name** (shortcut chips for recent names).
- Second popup asks for **Date + Time Slot** for pickup.
- Then Kitchen Bill Preview → **Send to Kitchen**.

The KOT prints on the kitchen printer with:
- Order number, customer name, waiter, time slot.
- Items, quantities, and notes.
- **ADDON** badge if items were added after a previous KOT.

> Tip: Button is protected against accidental double-tap. If you feel like nothing happened, wait 1 second before tapping again.

---

## 7. Take payment

### Unlock payment (PIN)

If the POS is configured with a **Payment PIN** (manager sets this in Odoo):

1. Tap **🔒 Pay Now** — PIN popup appears.
2. Type the PIN → **Unlock**.
3. The Payment Method popup opens **immediately** after the correct PIN.
4. The button changes to **✅ Pay Now** — no PIN needed for the rest of the session.

Wrong PIN → red "Incorrect PIN" text. Try again or tap ✕ to close.

### Pay

1. In the **Select Payment Method** popup:
   - See the **Subtotal / Taxes / Total** breakdown.
   - Tap a payment method: **Cash**, **Card**, **Customer Account**, **Talabat**, **Bank Transfer**, etc. (list comes from Odoo config).
2. For **Cash**: type the amount received. Change is shown in green if customer pays more; remaining is shown in red if less.
3. Tap **Pay - OMR X.XXX** → payment is recorded in Odoo and the order is closed.
4. The app returns to the Home screen.

---

## 8. Viewing / resuming takeaway orders

From **Choose Order Type** → tap **Takeout Orders**.

- Summary bar shows totals: *Total Orders* / *Open* / *Completed*.
- Tap any card to reopen.
- Amounts shown include taxes (matches the register total).

---

## 9. Logging out

From the bottom tab bar → **Profile** → **Logout**.

- Clears session + cached data.
- Returns to the Login screen.

---

## 10. Common problems

| Problem | What to do |
|---|---|
| "Cannot reach server" popup | Check Wi-Fi / router, then **Retry**. If it keeps failing, ask the manager if the Odoo server is up. |
| KOT not printing | Check the printer is powered on and plugged in. The printer IP is set in Odoo → POS Config → KOT Printer Settings. |
| Pay Now says "Incorrect PIN" after manager set one | Log out and log back in so the app picks up the new PIN. |
| Wrong price on tile | Admin: check the active **Pricelist** rule in Odoo → POS → Configuration → Pricelists. |
| Can't see a product | Admin: in Odoo open the product, tick **Available in POS**, assign a POS category. |
| "New Takeout Order" shows old items | Shouldn't — each tap creates a fresh empty order. If you still see items, pull-to-refresh the list or log out/in. |
| Tablet on different Wi-Fi than server | Use an ngrok tunnel (dev) or check VPN/port forwarding (prod). |

---

## 11. For managers (Odoo side)

Open **Odoo Web** → **Point of Sale → Configuration → Point of Sale** → select your POS.

### KOT Printer Settings
- **KOT Printer IP** — e.g. `192.168.1.100`.
- **KOT Printer Port** — usually `9100` (ESC/POS).
- **Use Local Print Agent** — tick when Odoo is cloud-hosted and the printer is on-site LAN.
- **Print Agent URL** — e.g. `http://localhost:5123` (only if using the agent).

### Mobile POS — Payment PIN
- Type any PIN (numbers/letters). Shown as dots.
- **Empty = PIN gate disabled** (Pay Now works without PIN).
- Different POS configs can have different PINs.
- Staff must log out and log in on the tablet for the new PIN to take effect (or close and reopen the register screen).

### Pricelists (Dine In / Application)
- **Point of Sale → Configuration → Pricelists**.
- Create rules per product with **Fixed Price** (e.g. Barotta on Dine In = `5.000`).
- The tablet's toggle at the top of the cart switches between them.

### Taxes
- Edit a product → **Sales Taxes** → attach a 5% tax (or any %).
- Leave empty for tax-free products.
- The tablet fetches these rates live on each register open.

### Managing orders
- **Point of Sale → Orders** → filter by status (draft / paid / done / cancel).
- Orders created on the tablet appear here in real time.
- Session must be **closed** at end of shift — managers do this in Odoo (not currently available from the tablet app).
