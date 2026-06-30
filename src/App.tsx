import React, { useState } from 'react';
import {
  initialSellers,
  initialBuyers,
  initialLots,
  initialTickets,
  initialProcessingRecords,
  initialShipments,
  initialDebtTransactions,
  initialAlerts
} from './initialData';
import { Seller, Buyer, Lot, PurchaseTicket, ProcessingRecord, ContainerShipment, DebtTransaction, AIAnomalyAlert } from './types';

// Import Views
import DashboardView from './components/DashboardView';
import PurchaseView from './components/PurchaseView';
import LotsView from './components/LotsView';
import ShipmentsView from './components/ShipmentsView';
import DebtView from './components/DebtView';

import { BarChart3, Scale, Layers, Truck, CreditCard, Sparkles, Bot, Clock } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchase' | 'lots' | 'shipments' | 'debt'>('dashboard');

  // Main Database State
  const [sellers, setSellers] = useState<Seller[]>(initialSellers);
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [tickets, setTickets] = useState<PurchaseTicket[]>(initialTickets);
  const [processingRecords, setProcessingRecords] = useState<ProcessingRecord[]>(initialProcessingRecords);
  const [shipments, setShipments] = useState<ContainerShipment[]>(initialShipments);
  const [transactions, setTransactions] = useState<DebtTransaction[]>(initialDebtTransactions);
  const [alerts, setAlerts] = useState<AIAnomalyAlert[]>(initialAlerts);

  // Loading States
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Handler to add a new purchase ticket
  const handleAddTicket = (newTicket: PurchaseTicket, newLot: Lot) => {
    // Add ticket
    setTickets(prev => [newTicket, ...prev]);

    // Add lot
    setLots(prev => [newLot, ...prev]);

    // Update Seller's supplied weight and currentDebt
    setSellers(prev => prev.map(s => {
      if (s.id === newTicket.sellerId) {
        // Under standard terms, the unpaid part of the purchase ticket is added to our payable debt
        const unpaidDebt = newTicket.paymentStatus === 'da_thanh_toan'
          ? 0
          : newTicket.paymentStatus === 'ghi_no'
          ? newTicket.finalAmount
          : Math.max(0, newTicket.finalAmount - newTicket.paidAmount);

        return {
          ...s,
          totalSuppliedWeight: s.totalSuppliedWeight + newTicket.finalWeight,
          currentDebt: s.currentDebt + unpaidDebt
        };
      }
      return s;
    }));

    // Add associated transaction to debt ledger
    const unpaidDebt = newTicket.paymentStatus === 'da_thanh_toan'
      ? 0
      : newTicket.paymentStatus === 'ghi_no'
      ? newTicket.finalAmount
      : Math.max(0, newTicket.finalAmount - newTicket.paidAmount);

    const dateStr = new Date().toISOString().split('T')[0];
    const newTx: DebtTransaction = {
      id: 'tx-' + Date.now(),
      partyId: newTicket.sellerId,
      partyName: newTicket.sellerName,
      partyType: 'seller',
      date: dateStr,
      type: 'thu_mua',
      amount: newTicket.finalAmount,
      balanceAfter: sellers.find(s => s.id === newTicket.sellerId)!.currentDebt + unpaidDebt,
      note: `Thu mua dừa khô. Phiếu cân xe ${newTicket.licensePlate}. Nhập mã lô ${newLot.code}`
    };

    setTransactions(prev => [newTx, ...prev]);
  };

  // Handler to record processing/peeling
  const handleAddProcessingRecord = (record: ProcessingRecord) => {
    setProcessingRecords(prev => [record, ...prev]);

    // Deduct raw coconuts from associated Lot currentWeight
    setLots(prev => prev.map(l => {
      if (l.id === record.lotId) {
        const updatedWeight = Math.max(0, l.currentWeight - record.inputWeight);
        return {
          ...l,
          currentWeight: updatedWeight,
          processedWeight: l.processedWeight + record.inputWeight,
          status: updatedWeight === 0 ? 'da_hoan_thanh' : 'dang_che_bien'
        };
      }
      return l;
    }));

    // Check if loss rate is too high (> 8%) and auto generate alert
    if (record.lossRate > 8) {
      const newAlert: AIAnomalyAlert = {
        id: 'alert-' + Date.now(),
        type: 'loss',
        severity: 'high',
        title: `Hao hụt sơ chế sấy vượt mức lô ${record.lotCode}`,
        message: `Mẫu sấy của lô ${record.lotCode} có hao hụt phơi lột vỏ là ${record.lossRate}% (vượt mức chuẩn 8%). Lớp cơm dầy thu hồi sụt giảm còn ${record.recoveryRate}%. Đề xuất kiểm toán lò sấy ngay.`,
        targetId: record.lotId,
        targetCode: record.lotCode,
        date: record.date,
        resolved: false
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  // Handler to add shipment
  const handleAddShipment = (shipment: ContainerShipment) => {
    setShipments(prev => [shipment, ...prev]);

    // Update Buyer's total purchased and currentDebt
    setBuyers(prev => prev.map(b => {
      if (b.id === shipment.buyerId) {
        // Buyer owes us what they didn't pay in advance
        const unpaidReceivable = shipment.paymentStatus === 'da_thanh_toan'
          ? 0
          : shipment.paymentStatus === 'ghi_no'
          ? shipment.totalRevenue
          : Math.max(0, shipment.totalRevenue - shipment.paidAmount);

        return {
          ...b,
          totalPurchasedWeight: b.totalPurchasedWeight + shipment.items.reduce((sum, i) => sum + i.weight, 0),
          currentDebt: b.currentDebt + unpaidReceivable
        };
      }
      return b;
    }));

    // Record associated transaction to debt ledger
    const unpaidReceivable = shipment.paymentStatus === 'da_thanh_toan'
      ? 0
      : shipment.paymentStatus === 'ghi_no'
      ? shipment.totalRevenue
      : Math.max(0, shipment.totalRevenue - shipment.paidAmount);

    const dateStr = new Date().toISOString().split('T')[0];
    const newTx: DebtTransaction = {
      id: 'tx-' + Date.now(),
      partyId: shipment.buyerId,
      partyName: shipment.buyerName,
      partyType: 'buyer',
      date: dateStr,
      type: 'xuat_hang',
      amount: shipment.totalRevenue,
      balanceAfter: buyers.find(b => b.id === shipment.buyerId)!.currentDebt + unpaidReceivable,
      note: `Xuất container ${shipment.code}. Xe cont ${shipment.licensePlate}`
    };

    setTransactions(prev => [newTx, ...prev]);
  };

  // Handler for direct debt payment/advance/write-off transactions
  const handleAddTransaction = (newTx: DebtTransaction) => {
    setTransactions(prev => [newTx, ...prev]);

    // Apply debt change directly to partner current balance
    if (newTx.partyType === 'seller') {
      setSellers(prev => prev.map(s => {
        if (s.id === newTx.partyId) {
          // Paying debt reduce what we owe them (-)
          // Advancing them money also reduces balance (-)
          return {
            ...s,
            currentDebt: s.currentDebt - newTx.amount
          };
        }
        return s;
      }));
    } else {
      setBuyers(prev => prev.map(b => {
        if (b.id === newTx.partyId) {
          // Buyer paying us reduces what they owe us (-)
          return {
            ...b,
            currentDebt: b.currentDebt - newTx.amount
          };
        }
        return b;
      }));
    }
  };

  // Handler to clear warning/alert
  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, resolved: true };
      }
      return a;
    }));
  };

  // Trigger AI Auditor Analysis via endpoint
  const handleRunAIAudit = async () => {
    setIsAuditLoading(true);
    try {
      const response = await fetch('/api/ai/detect-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lots,
          processingRecords,
          sellers
        })
      });
      const data = await response.json();
      if (data.success && data.data) {
        // Merge newly audited alerts with existing ones, avoiding duplicates by title
        setAlerts(prev => {
          const existingTitles = prev.map(a => a.title);
          const newAlerts = data.data.filter((a: any) => !existingTitles.includes(a.title));
          return [...newAlerts, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#f0f2f5] font-sans text-[#1a202c] overflow-hidden">
      {/* Sidebar - High Density Design */}
      <aside className="w-64 bg-[#064e3b] text-white flex flex-col justify-between shrink-0 h-full border-r border-[#065f46]">
        <div>
          <div className="p-5 border-b border-[#065f46] bg-[#044a38]">
            <h1 className="text-lg font-black flex items-center gap-2 tracking-tight">
              <span className="text-xl">🥥</span> Sổ Vựa Dừa AI
            </h1>
            <p className="text-[10px] text-emerald-200 mt-1 uppercase tracking-wider font-bold">Thu mua & Xuất khẩu dừa khô</p>
          </div>

          <nav className="p-3 space-y-1 text-[12.5px] font-bold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <BarChart3 size={15} />
              <span>Bảng tổng quan vựa</span>
            </button>

            <button
              onClick={() => setActiveTab('purchase')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'purchase'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <Scale size={15} />
              <span>Ghi nhận thu mua dừa</span>
            </button>

            <button
              onClick={() => setActiveTab('lots')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'lots'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <Layers size={15} />
              <span>Kho hàng & Chế biến</span>
            </button>

            <button
              onClick={() => setActiveTab('shipments')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'shipments'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <Truck size={15} />
              <span>Xuất khẩu Container</span>
            </button>

            <button
              onClick={() => setActiveTab('debt')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'debt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <CreditCard size={15} />
              <span>Công nợ & Thanh toán</span>
            </button>
          </nav>
        </div>

        {/* Live operational details in sidebar */}
        <div className="p-4 border-t border-[#065f46] bg-[#044a38]/40 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-black flex items-center gap-1">
            <Bot size={11} className="text-yellow-400" />
            <span>Chủ vựa đối thoại AI</span>
          </div>
          <div className="text-[10.5px] bg-[#033f2f] p-2.5 rounded text-emerald-100 leading-relaxed italic border border-emerald-800">
            "Mẹo: Hãy hỏi chatbot bên cạnh về lô dừa đang lãi nhiều nhất hoặc nhắc nợ nhanh Ba Hùng."
          </div>
        </div>
      </aside>

      {/* Main Working Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Header - Modern High Density Styling */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              {activeTab === 'dashboard' && 'Tổng quan vận hành & Phân tích thông minh'}
              {activeTab === 'purchase' && 'Trạm cân dừa nguyên trái & Phân loại chất lượng'}
              {activeTab === 'lots' && 'Quản lý kho dừa theo lô & Hao hụt bóc tách cơm dừa'}
              {activeTab === 'shipments' && 'Tính toán lời/lỗ container & Truy xuất nguồn gốc'}
              {activeTab === 'debt' && 'Sổ quỹ công nợ nhà vườn & Khách mua xuất khẩu'}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="text-right">
              <div className="text-gray-400 font-mono flex items-center gap-1">
                <Clock size={12} />
                <span>30/06/2026 • 10:30 UTC+7</span>
              </div>
              <span className="text-emerald-700 font-bold">Vựa Dừa Khô Bến Tre - Chi nhánh 1</span>
            </div>
            <div className="w-9 h-9 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center font-black text-emerald-800">
              AD
            </div>
          </div>
        </header>

        {/* Dynamic View Mount */}
        {activeTab === 'dashboard' && (
          <DashboardView
            sellers={sellers}
            buyers={buyers}
            lots={lots}
            tickets={tickets}
            processingRecords={processingRecords}
            shipments={shipments}
            alerts={alerts}
            onAddTicketClick={() => setActiveTab('purchase')}
            onAddProcessingClick={() => setActiveTab('lots')}
            onAddShipmentClick={() => setActiveTab('shipments')}
            onResolveAlert={handleResolveAlert}
          />
        )}

        {activeTab === 'purchase' && (
          <PurchaseView
            sellers={sellers}
            tickets={tickets}
            onAddTicket={handleAddTicket}
          />
        )}

        {activeTab === 'lots' && (
          <LotsView
            lots={lots}
            processingRecords={processingRecords}
            onAddProcessingRecord={handleAddProcessingRecord}
            onRunAIAudit={handleRunAIAudit}
            isAuditLoading={isAuditLoading}
          />
        )}

        {activeTab === 'shipments' && (
          <ShipmentsView
            buyers={buyers}
            lots={lots}
            shipments={shipments}
            onAddShipment={handleAddShipment}
          />
        )}

        {activeTab === 'debt' && (
          <DebtView
            sellers={sellers}
            buyers={buyers}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {/* Bottom Status & Quick Action Bar */}
        <footer className="h-12 bg-[#1a202c] text-white flex items-center justify-between px-6 text-xs shrink-0 select-none">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span className="text-green-400">HỆ THỐNG AI ĐANG TRỰC TUYẾN</span>
            </span>
            <span className="text-gray-400 hidden md:inline">|</span>
            <span className="text-gray-400 hidden md:inline">
              Tổng kho dừa: <strong className="text-white font-mono">{lots.reduce((sum, l) => sum + l.currentWeight, 0).toLocaleString()} kg</strong>
            </span>
            <span className="text-gray-400 hidden md:inline">|</span>
            <span className="text-yellow-400 font-bold">
              ⚠️ {alerts.filter(a => !a.resolved).length} cảnh báo chưa xử lý
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded transition-colors"
            >
              Mở Tổng Quan
            </button>
            <button
              onClick={() => setActiveTab('purchase')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1 rounded transition-colors"
            >
              CÂN NHẬP HÀNG NGAY
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
