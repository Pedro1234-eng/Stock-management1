import React, { useRef } from 'react';
import { Printer, Download, X, Building, CheckCircle } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Invoice } from '../types/index.ts';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const business = {
    name: 'Apex Stock & Building Supply Ltd',
    address: '100 Industrial Boulevard, Logistics District, Suite 400',
    phone: '+1 (800) 555-0199',
    email: 'billing@apexstocksupply.com',
    taxId: 'US-TAX-89230192',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" maxWidth="4xl">
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Status: <strong className="text-emerald-400 font-semibold">{invoice.status}</strong></span>
            <span className="mx-2 text-slate-600">|</span>
            <span>Payment Method: <strong className="text-white font-medium">{invoice.payment_method}</strong></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={printAreaRef}
          className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                  A
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {business.name}
                </h1>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                {business.address}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Tel: {business.phone} | Email: {business.email}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Tax Reg ID: {business.taxId}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md tracking-wider uppercase mb-2">
                Tax Invoice
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {invoice.invoice_number}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(invoice.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-500">
                Time: {new Date(invoice.created_at).toLocaleTimeString()}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Cashier: {invoice.created_by || 'Sales Clerk'}
              </p>
            </div>
          </div>

          {/* Customer & Transaction Meta */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200/80">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Bill To:
              </div>
              <div className="text-sm font-bold text-slate-800">
                {invoice.customer_name || 'Walk-in Retail Customer'}
              </div>
              {invoice.customer_address && (
                <div className="text-xs text-slate-600 mt-0.5">{invoice.customer_address}</div>
              )}
              {invoice.customer_phone && (
                <div className="text-xs text-slate-600">Tel: {invoice.customer_phone}</div>
              )}
              {invoice.customer_email && (
                <div className="text-xs text-slate-600">{invoice.customer_email}</div>
              )}
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Payment Details:
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {invoice.payment_method}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Payment Status: <span className="font-semibold text-emerald-700">PAID</span>
              </div>
              {invoice.notes && (
                <div className="text-xs text-slate-500 italic mt-1">
                  Note: {invoice.notes}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left mb-6 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2">SKU / Code</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Discount</th>
                <th className="py-2.5 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">
                      {item.product_name || `Product #${item.productId}`}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-500">
                      {item.sku || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      ${Number(item.unitPrice || item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                      ${Number(item.discount || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                      ${Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No items found on this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Special Discount:</span>
                  <span className="font-mono">-${Number(invoice.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax / VAT (8%):</span>
                <span className="font-mono font-medium">${Number(invoice.tax).toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total Amount Due:</span>
                <span className="text-base font-black font-mono text-blue-700">
                  ${Number(invoice.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Signatures */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p>1. Goods received in good order & condition cannot be returned after 7 days.</p>
              <p>2. Thank you for your business and partnership!</p>
            </div>
            <div className="text-center">
              <div className="w-44 border-b border-slate-400 mb-1"></div>
              <p className="font-medium text-slate-600">Authorized Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
