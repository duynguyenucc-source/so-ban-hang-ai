import React, { useEffect, useMemo, useState } from 'react';
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
import { canMutateData, getDemoAccounts, loginWithDemoAccount, sanitizeSession, UserSession } from './auth';
import {
  createInitialLocalDatabase,
  LOCAL_DATABASE_KEY,
  parseLocalDatabase,
  serializeLocalDatabase,
} from './localDatabase';

// Import Views
import DashboardView from './components/DashboardView';
import PurchaseView from './components/PurchaseView';
import LotsView from './components/LotsView';
import ShipmentsView from './components/ShipmentsView';
import DebtView from './components/DebtView';
import WarehouseView from './components/WarehouseView';

import { BarChart3, Scale, Layers, Truck, CreditCard, Sparkles, Bot, Clock, Lock, LogOut, ShieldCheck, UserCheck, Archive, PackageCheck } from 'lucide-react';

const SESSION_STORAGE_KEY = 'so-vua-dua-ai-session';

const getStoredDatabase = () => {
  if (typeof localStorage === 'undefined') return null;
  return parseLocalDatabase(localStorage.getItem(LOCAL_DATABASE_KEY));
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchase' | 'importWarehouse' | 'exportWarehouse' | 'lots' | 'shipments' | 'debt'>('dashboard');
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? sanitizeSession(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  const canEdit = canMutateData(session);
  const demoAccounts = useMemo(() => getDemoAccounts(), []);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const nextSession = loginWithDemoAccount(loginUsername, loginPassword);
    if (!nextSession) {
      setLoginError('Sai tài khoản hoặc mật khẩu. Hãy dùng một tài khoản mẫu bên dưới.');
      return;
    }
    setLoginError('');
    setSession(nextSession);
  };

  const requireEditPermission = () => {
    if (canEdit) return true;
    alert('Tài khoản hiện tại chỉ được xem. Hãy đăng nhập Admin hoặc Nhân viên kho để thao tác chỉnh sửa.');
    return false;
  };

  // Main Database State
  const [storedDatabaseLoaded] = useState(() => getStoredDatabase());
  const [sellers, setSellers] = useState<Seller[]>(storedDatabaseLoaded?.sellers || initialSellers);
  const [buyers, setBuyers] = useState<Buyer[]>(storedDatabaseLoaded?.buyers || initialBuyers);
  const [lots, setLots] = useState<Lot[]>(storedDatabaseLoaded?.lots || initialLots);
  const [tickets, setTickets] = useState<PurchaseTicket[]>(storedDatabaseLoaded?.tickets || initialTickets);
  const [processingRecords, setProcessingRecords] = useState<ProcessingRecord[]>(storedDatabaseLoaded?.processingRecords || initialProcessingRecords);
  const [shipments, setShipments] = useState<ContainerShipment[]>(storedDatabaseLoaded?.shipments || initialShipments);
  const [transactions, setTransactions] = useState<DebtTransaction[]>(storedDatabaseLoaded?.transactions || initialDebtTransactions);
  const [alerts, setAlerts] = useState<AIAnomalyAlert[]>(storedDatabaseLoaded?.alerts || initialAlerts);
  const [databaseSavedAt, setDatabaseSavedAt] = useState(storedDatabaseLoaded?.savedAt || '');

  // Loading States
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  useEffect(() => {
    const database = createInitialLocalDatabase({
      sellers,
      buyers,
      lots,
      tickets,
      processingRecords,
      shipments,
      transactions,
      alerts,
    });
    localStorage.setItem(LOCAL_DATABASE_KEY, serializeLocalDatabase(database));
    setDatabaseSavedAt(database.savedAt);
  }, [sellers, buyers, lots, tickets, processingRecords, shipments, transactions, alerts]);

  // Handler to add a new purchase ticket
  const handleAddTicket = (newTicket: PurchaseTicket, newLot: Lot) => {
    if (!requireEditPermission()) return;
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
    if (!requireEditPermission()) return;
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
    if (!requireEditPermission()) return;
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
    if (!requireEditPermission()) return;
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
    if (!requireEditPermission()) return;
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, resolved: true };
      }
      return a;
    }));
  };

  // Trigger AI Auditor Analysis via endpoint
  const handleRunAIAudit = async () => {
    if (!requireEditPermission()) return;
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

  if (!session) {
    return (
      <div className="min-h-screen w-screen bg-[#f0f2f5] flex items-center justify-center p-6 font-sans text-[#1a202c]">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <section className="bg-[#064e3b] text-white rounded-lg p-7 shadow-sm flex flex-col justify-between min-h-[520px]">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-lg bg-yellow-400 text-emerald-950 flex items-center justify-center">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Sổ Vựa Dừa AI</h1>
                  <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">Cổng quản trị vận hành local</p>
                </div>
              </div>
              <h2 className="text-3xl font-black leading-tight max-w-xl">
                Đăng nhập để quản lý thu mua, kho, xuất container và công nợ.
              </h2>
              <p className="mt-4 text-sm text-emerald-100 leading-6 max-w-xl">
                Bản local này dùng tài khoản mẫu trong trình duyệt. Admin và nhân viên được ghi dữ liệu, tài khoản xem chỉ dùng dashboard và trợ lý AI.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
              {demoAccounts.map(account => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => {
                    setLoginUsername(account.username);
                    setLoginPassword(account.username === 'admin' ? 'admin123' : account.username === 'kho' ? 'kho123' : 'viewer123');
                    setLoginError('');
                  }}
                  className="text-left rounded-lg border border-emerald-700 bg-[#033f2f] p-3 hover:bg-[#065f46] transition-colors"
                >
                  <div className="text-xs font-black uppercase text-yellow-300">{account.role}</div>
                  <div className="text-sm font-bold mt-1">{account.username}</div>
                  <div className="text-[11px] text-emerald-100 mt-2 leading-4">{account.description}</div>
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={handleLogin} className="bg-white rounded-lg p-7 shadow-sm border flex flex-col justify-center">
            <div className="flex items-center gap-2 text-emerald-800 mb-5">
              <Lock size={19} />
              <h2 className="text-lg font-black">Đăng nhập quản trị</h2>
            </div>
            <label className="text-xs font-bold text-gray-600 mb-1">Tài khoản</label>
            <input
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              className="border rounded-lg px-3 py-2.5 text-sm font-semibold mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="username"
            />
            <label className="text-xs font-bold text-gray-600 mb-1">Mật khẩu</label>
            <input
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              type="password"
              className="border rounded-lg px-3 py-2.5 text-sm font-semibold mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="current-password"
            />
            {loginError && (
              <div className="mb-3 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-xs font-semibold">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg py-2.5 text-sm font-black flex items-center justify-center gap-2"
            >
              <UserCheck size={16} />
              Vào hệ thống
            </button>
            <div className="mt-5 rounded-lg bg-gray-50 border p-3 text-xs text-gray-600 leading-5">
              <div className="font-black text-gray-800 mb-1">Tài khoản mẫu</div>
              <div>Admin: <strong>admin</strong> / <strong>admin123</strong></div>
              <div>Nhân viên kho: <strong>kho</strong> / <strong>kho123</strong></div>
              <div>Chỉ xem: <strong>viewer</strong> / <strong>viewer123</strong></div>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
              onClick={() => setActiveTab('importWarehouse')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'importWarehouse'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <Archive size={15} />
              <span>Kho nhập hàng</span>
            </button>

            <button
              onClick={() => setActiveTab('exportWarehouse')}
              className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'exportWarehouse'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-[#065f46]'
              }`}
            >
              <PackageCheck size={15} />
              <span>Kho xuất hàng</span>
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

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="text-right">
              <div className="text-gray-400 font-mono flex items-center gap-1">
                <Clock size={12} />
                <span>30/06/2026 • 10:30 UTC+7</span>
              </div>
              <span className="text-emerald-700 font-bold">Vựa Dừa Khô Bến Tre - Chi nhánh 1</span>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-gray-400 uppercase font-black">Phiên đăng nhập</div>
              <div className="text-emerald-800 font-black">{session.name}</div>
              <div className={`text-[10px] font-black ${canEdit ? 'text-green-600' : 'text-amber-600'}`}>
                {canEdit ? 'Được chỉnh sửa' : 'Chỉ xem'}
              </div>
            </div>
            <div className="w-9 h-9 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center font-black text-emerald-800 uppercase">
              {session.role.slice(0, 2)}
            </div>
            <button
              onClick={() => setSession(null)}
              className="p-2 rounded-lg border hover:bg-gray-50 text-gray-600"
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
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
            canEdit={canEdit}
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
            canEdit={canEdit}
            onAddTicket={handleAddTicket}
            onOpenImportWarehouse={() => setActiveTab('importWarehouse')}
            onOpenPayment={() => setActiveTab('debt')}
          />
        )}

        {activeTab === 'importWarehouse' && (
          <WarehouseView
            mode="import"
            lots={lots}
            tickets={tickets}
            shipments={shipments}
            onOpenPayment={() => setActiveTab('debt')}
            onCreateExport={() => setActiveTab('shipments')}
          />
        )}

        {activeTab === 'exportWarehouse' && (
          <WarehouseView
            mode="export"
            lots={lots}
            tickets={tickets}
            shipments={shipments}
            onOpenPayment={() => setActiveTab('debt')}
            onCreateExport={() => setActiveTab('shipments')}
          />
        )}

        {activeTab === 'lots' && (
          <LotsView
            lots={lots}
            processingRecords={processingRecords}
            canEdit={canEdit}
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
            canEdit={canEdit}
            onAddShipment={handleAddShipment}
          />
        )}

        {activeTab === 'debt' && (
          <DebtView
            sellers={sellers}
            buyers={buyers}
            transactions={transactions}
            canEdit={canEdit}
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
            <span className="text-gray-400 hidden lg:inline">|</span>
            <span className="text-blue-300 font-bold hidden lg:inline">
              DB local: {databaseSavedAt ? new Date(databaseSavedAt).toLocaleTimeString('vi-VN') : 'đang lưu'}
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
              disabled={!canEdit}
              className={`font-black px-3.5 py-1 rounded transition-colors ${
                canEdit ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              CÂN NHẬP HÀNG NGAY
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
