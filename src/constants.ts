export const DEFAULT_RECEIPT_TEMPLATE = `
<div style="text-align: center; font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 72mm; margin: 0 auto; padding: 5px; color: #000; background: #fff;">
  <h2 style="margin: 0; font-size: 1.2em; text-transform: uppercase;">{{companyName}}</h2>
  <p style="margin: 2px 0; font-weight: bold;">{{branchName}}</p>
  <p style="margin: 2px 0; font-size: 0.85em;">{{branchAddress}}</p>
  <p style="margin: 2px 0; font-size: 0.85em;">Tel: {{branchPhone}}</p>
  <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
  
  <div style="text-align: left; font-size: 0.85em; line-height: 1.2;">
    <div style="display: flex; justify-content: space-between;">
      <span>Order:</span>
      <span style="font-weight: bold;">{{orderNumber}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Date:</span>
      <span>{{date}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Cashier:</span>
      <span>{{cashierName}}</span>
    </div>
  </div>
  
  <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
  
  <table style="width: 100%; font-size: 0.85em; border-collapse: collapse; line-height: 1.4;">
    <thead>
      <tr style="border-bottom: 1px solid #000;">
        <th style="text-align: left; padding-bottom: 4px;">Item</th>
        <th style="text-align: center; padding-bottom: 4px;">Qty</th>
        <th style="text-align: right; padding-bottom: 4px;">Total</th>
      </tr>
    </thead>
    <tbody style="padding-top: 4px;">
      {{items}}
    </tbody>
  </table>
  
  <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
  
  <div style="font-size: 0.9em; line-height: 1.4;">
    <div style="display: flex; justify-content: space-between;">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Tax ({{taxPercentage}}%):</span>
      <span>{{tax}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Service Charge ({{serviceChargePercentage}}%):</span>
      <span>{{serviceCharge}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin-top: 4px; border-top: 1px double #000; padding-top: 4px;">
      <span>TOTAL:</span>
      <span>{{total}}</span>
    </div>
  </div>
  
  <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
  
  <div style="text-align: center; font-size: 0.85em;">
    <p style="margin: 4px 0;">Payment: <span style="font-weight: bold;">{{paymentMethod}}</span></p>
    <p style="margin: 12px 0; font-weight: bold; font-size: 1em;">*** THANK YOU ***</p>
    <p style="margin: 0; font-size: 0.7em; color: #666;">Powered by Ace POS</p>
  </div>
</div>
`.trim();
