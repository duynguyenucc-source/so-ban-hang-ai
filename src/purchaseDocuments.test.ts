import assert from 'node:assert/strict';
import { buildPaymentVoucher } from './purchaseDocuments';
import type { PurchaseTicket } from './types';

const ticket: PurchaseTicket = {
  id: 'ticket-1',
  lotId: 'lot-1',
  sellerId: 'seller-1',
  sellerName: 'Ba Hùng',
  date: '2026-07-01',
  licensePlate: '84C-125.84',
  grossWeight: 12500,
  tareWeight: 4500,
  netWeight: 8000,
  unitPrice: 8200,
  subtotal: 65600000,
  deductions: {
    moistureDeductionKg: 100,
    qualityDeductionKg: 50,
    otherDeductionVnd: 200000,
  },
  finalWeight: 7850,
  finalAmount: 64170000,
  paidAmount: 10000000,
  paymentStatus: 'thanh_toan_mot_phan',
};

const voucher = buildPaymentVoucher(ticket, 'LÔ-DUA-20260701-001');

assert.equal(voucher.code, 'PAY-ticket-1');
assert.equal(voucher.payableAmount, 64170000);
assert.equal(voucher.paidAmount, 10000000);
assert.equal(voucher.remainingAmount, 54170000);
assert.equal(voucher.paymentLabel, 'Thanh toán một phần');
assert.equal(voucher.lotCode, 'LÔ-DUA-20260701-001');
