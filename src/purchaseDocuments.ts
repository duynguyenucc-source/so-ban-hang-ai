import type { PurchaseTicket } from './types';

export interface PaymentVoucher {
  code: string;
  ticketId: string;
  lotCode: string;
  sellerName: string;
  date: string;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentLabel: string;
}

export function getPaymentLabel(status: PurchaseTicket['paymentStatus']) {
  if (status === 'da_thanh_toan') return 'Đã thanh toán đủ';
  if (status === 'thanh_toan_mot_phan') return 'Thanh toán một phần';
  return 'Ghi công nợ';
}

export function buildPaymentVoucher(ticket: PurchaseTicket, lotCode: string): PaymentVoucher {
  return {
    code: `PAY-${ticket.id}`,
    ticketId: ticket.id,
    lotCode,
    sellerName: ticket.sellerName,
    date: ticket.date,
    payableAmount: ticket.finalAmount,
    paidAmount: ticket.paymentStatus === 'da_thanh_toan' ? ticket.finalAmount : ticket.paidAmount,
    remainingAmount:
      ticket.paymentStatus === 'da_thanh_toan'
        ? 0
        : Math.max(0, ticket.finalAmount - ticket.paidAmount),
    paymentLabel: getPaymentLabel(ticket.paymentStatus),
  };
}
