import React, { useState } from 'react';
import { Seller, Buyer, DebtTransaction } from '../types';
import { CreditCard, Sparkles, User, RefreshCw, Send, Check, Copy, DollarSign, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';

interface DebtViewProps {
  sellers: Seller[];
  buyers: Buyer[];
  transactions: DebtTransaction[];
  onAddTransaction: (tx: DebtTransaction) => void;
}

export default function DebtView({ sellers, buyers, transactions, onAddTransaction }: DebtViewProps) {
  // Tabs for Sellers vs Buyers
  const [partnerType, setPartnerType] = useState<'seller' | 'buyer'>('seller');

  // Payment Form States
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [txType, setTxType] = useState<'thanh_toan' | 'ung_truoc' | 'giam_tru'>('thanh_toan');
  const [amount, setAmount] = useState<number>(10000000); // Default 10M VND
  const [note, setNote] = useState('');

  // AI Reminder State
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);
  const [selectedPartnerForReminder, setSelectedPartnerForReminder] = useState<any>(null);
  const [reminderText, setReminderText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Filter partners
  const activeSellers = sellers;
  const activeBuyers = buyers;

  // Selected partner object for payment form
  const selectedPartner = partnerType === 'seller'
    ? sellers.find(s => s.id === selectedPartnerId)
    : buyers.find(b => b.id === selectedPartnerId);

  const handlePartnerTypeChange = (type: 'seller' | 'buyer') => {
    setPartnerType(type);
    setSelectedPartnerId(type === 'seller' ? sellers[0]?.id || '' : buyers[0]?.id || '');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) return;

    const partner = partnerType === 'seller'
      ? sellers.find(s => s.id === selectedPartnerId)
      : buyers.find(b => b.id === selectedPartnerId);

    if (!partner) return;

    // Calculate balance change based on party type and transaction type
    // Seller debt is what WE owe them (positive). If we pay them, debt goes down (-). If we advance, we pre-pay them (-).
    // Buyer debt is what THEY owe us (positive). If they pay us, debt goes down (-).
    let debtDelta = 0;
    if (partnerType === 'seller') {
      if (txType === 'thanh_toan') {
        debtDelta = -amount; // Paid off debt
      } else if (txType === 'ung_truoc') {
        debtDelta = -amount; // Advanced them money, making balance more negative/favorable to us
      } else if (txType === 'giam_tru') {
        debtDelta = -amount; // Discounted
      }
    } else {
      // Buyer pays us
      if (txType === 'thanh_toan') {
        debtDelta = -amount; // They paid, reducing what they owe us
      } else if (txType === 'ung_truoc') {
        debtDelta = -amount; // Advanced us money
      } else if (txType === 'giam_tru') {
        debtDelta = -amount; // Discounted
      }
    }

    const currentBal = partner.currentDebt;
    const balanceAfter = currentBal + debtDelta;

    const dateStr = new Date().toISOString().split('T')[0];
    const newTx: DebtTransaction = {
      id: 'tx-' + Date.now(),
      partyId: selectedPartnerId,
      partyName: partner.name,
      partyType: partnerType,
      date: dateStr,
      type: txType,
      amount,
      balanceAfter,
      note: note || `${txType === 'thanh_toan' ? 'Thanh toán công nợ giao dịch' : txType === 'ung_truoc' ? 'Chuyển khoản ứng phó trước tiền dừa' : 'Giảm trừ nợ thương lượng'}`
    };

    onAddTransaction(newTx);
    setAmount(10000000);
    setNote('');
  };

  const handleGenerateReminder = async (partner: any, type: 'seller' | 'buyer') => {
    setIsGeneratingReminder(true);
    setReminderText('');
    setSelectedPartnerForReminder(partner);
    setCopied(false);

    try {
      // Prompt designed to solicit Gemini to compose a polite yet firm western Vietnamese reminder text
      const prompt = `Hãy soạn một tin nhắn nhắc đối soát công nợ vựa dừa thô và phụ phẩm qua Zalo cực kỳ tinh tế, khéo léo nhưng rõ ràng bằng tiếng Việt.
Thông tin đối tác:
- Tên: ${partner.name}
- Loại đối tác: ${type === 'seller' ? 'Thương lái / Nhà vườn cung ứng' : 'Khách mua xuất khẩu thành phẩm'}
- Số dư nợ hiện tại: ${Math.abs(partner.currentDebt).toLocaleString()} VND
- Chi tiết nợ: ${partner.currentDebt > 0 ? (type === 'seller' ? 'Vựa dừa đang nợ thương lái tiền dừa nguyên trái' : 'Khách đang nợ vựa tiền cơm dừa xuất khẩu') : (type === 'seller' ? 'Nông dân đang ứng trước tiền vựa chưa giao đủ dừa' : 'Vựa dừa nợ khách hàng')}

Quy tắc tin nhắn:
- Giọng điệu Nam Bộ (miền Tây), xưng hô "Em" hoặc "Vựa dừa Sổ Vựa Dừa AI" và gọi đối tác là "Anh/Chị" hoặc đúng tên lót thân mật (Anh Ba, Chị Tư, v.v.).
- Rất lịch sự, mong muốn hợp tác lâu dài bền vững nhưng nhấn mạnh cần đối soát sổ sách cuối kỳ cho minh bạch.
- Có lời chúc sức khỏe dừa trúng mùa được giá.`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          databaseState: {}
        })
      });
      const data = await response.json();
      if (data.success) {
        setReminderText(data.reply);
      } else {
        setReminderText('Lỗi tạo tin nhắn nhắc nợ.');
      }
    } catch (err) {
      console.error(err);
      setReminderText('Lỗi kết nối máy chủ soạn văn bản.');
    } finally {
      setIsGeneratingReminder(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reminderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* 2-Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Partner balance list (col-span-7) */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          {/* Partner Tabs */}
          <div className="bg-white p-2.5 rounded-lg shadow-sm border flex justify-between items-center">
            <div className="flex gap-1.5">
              <button
                onClick={() => handlePartnerTypeChange('seller')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  partnerType === 'seller'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🌾 Thương lái / Nhà vườn ({sellers.length})
              </button>
              <button
                onClick={() => handlePartnerTypeChange('buyer')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  partnerType === 'buyer'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🏢 Khách mua xuất khẩu ({buyers.length})
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-mono italic">Bấm "Nhắc nợ AI" để gửi tin nhắn Zalo</span>
          </div>

          {/* Table of partners and current balances */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-500 uppercase text-[8.5px] font-black">
                <tr>
                  <th className="px-3 py-2.5">Đối tác / Đại diện</th>
                  <th className="px-3 py-2.5">Liên hệ</th>
                  <th className="px-3 py-2.5">Địa bàn vựa</th>
                  <th className="px-3 py-2.5 text-right">Số dư nợ</th>
                  <th className="px-3 py-2.5 text-center">Hành động AI</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {partnerType === 'seller' ? (
                  sellers.map(s => {
                    const balance = s.currentDebt;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/70 font-medium">
                        <td className="px-3 py-2">
                          <div className="font-bold text-gray-900">{s.name}</div>
                          <span className="text-[8.5px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2 rounded font-mono font-bold uppercase">
                            {s.type === 'thuong_lai' ? 'Thương lái gom' : s.type === 'nha_vuon' ? 'Nhà vườn trồng' : 'Đại lý cấp xã'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500">{s.phone}</td>
                        <td className="px-3 py-2 text-gray-500 text-[10px] truncate max-w-[130px]">{s.address}</td>
                        <td className="px-3 py-2 text-right">
                          <div className={`font-mono font-black ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {balance > 0 ? `Vựa nợ: ${balance.toLocaleString()} đ` : balance < 0 ? `Ứng: ${Math.abs(balance).toLocaleString()} đ` : 'Đã thanh xong'}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono">{(s.totalSuppliedWeight / 1000).toFixed(1)}T dừa đã giao</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleGenerateReminder(s, 'seller')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-2 py-1 rounded inline-flex items-center gap-1"
                          >
                            <Sparkles size={10} className="text-yellow-500" />
                            <span>Nhắc nợ AI</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  buyers.map(b => {
                    const balance = b.currentDebt;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/70 font-medium">
                        <td className="px-3 py-2">
                          <div className="font-bold text-gray-900">{b.companyName}</div>
                          <span className="text-[9px] text-gray-400 italic">Đại diện: {b.name}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500">{b.phone}</td>
                        <td className="px-3 py-2 text-gray-500 text-[10px] truncate max-w-[130px]">{b.address}</td>
                        <td className="px-3 py-2 text-right">
                          <div className={`font-mono font-black ${balance > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                            {balance > 0 ? `Nợ vựa: ${balance.toLocaleString()} đ` : 'Đã chốt xong'}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono">{(b.totalPurchasedWeight / 1000).toFixed(1)}T cơm/gáo mua</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleGenerateReminder(b, 'buyer')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-2 py-1 rounded inline-flex items-center gap-1"
                          >
                            <Sparkles size={10} className="text-yellow-500" />
                            <span>Nhắc nợ AI</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Consolidated Debt Ledger History */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-bold text-xs text-gray-700 uppercase">Sổ ghi chép giao dịch ngân quỹ & thanh toán</h3>
            </div>

            <div className="p-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[8px] font-bold">
                  <tr>
                    <th className="px-3 py-2">Ngày</th>
                    <th className="px-3 py-2">Đối tác liên quan</th>
                    <th className="px-3 py-2">Loại giao dịch</th>
                    <th className="px-3 py-2 text-right">Giá trị (VND)</th>
                    <th className="px-3 py-2 text-right">Số dư nợ sau</th>
                    <th className="px-3 py-2">Ghi chú vựa</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 font-medium">
                      <td className="px-3 py-2 text-[10px] text-gray-400 font-mono">{tx.date}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{tx.partyName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          tx.type === 'thu_mua'
                            ? 'bg-blue-100 text-blue-800'
                            : tx.type === 'xuat_hang'
                            ? 'bg-purple-100 text-purple-800'
                            : tx.type === 'ung_truoc'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {tx.type === 'thu_mua' ? 'Nhập dừa' : tx.type === 'xuat_hang' ? 'Xuất Cont' : tx.type === 'ung_truoc' ? 'Ứng tiền' : tx.type === 'thanh_toan' ? 'Thanh toán' : 'Khác'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                        {tx.amount.toLocaleString()} đ
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {tx.balanceAfter.toLocaleString()} đ
                      </td>
                      <td className="px-3 py-2 text-gray-400 italic text-[10px] truncate max-w-[130px]">{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Payment Form and AI Reminder text output (col-span-5) */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          {/* Quick Payment recorder form */}
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-700" />
              <span>Giao dịch ngân quỹ vựa (Chi trả / Ứng tiền)</span>
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Chọn đối tác thanh toán:</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  <option value="">-- Chọn nhà vườn/thương lái/khách mua --</option>
                  {partnerType === 'seller' ? (
                    sellers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Nợ: {s.currentDebt.toLocaleString()} đ)
                      </option>
                    ))
                  ) : (
                    buyers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.companyName} (Nợ vựa: {b.currentDebt.toLocaleString()} đ)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Loại giao dịch:</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none text-gray-900 font-bold"
                  >
                    <option value="thanh_toan">Trả công nợ hàng</option>
                    <option value="ung_truoc">Ứng tiền trước</option>
                    <option value="giam_tru">Thương lượng giảm trừ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Số tiền giao dịch (đ):</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Ghi chú chuyển khoản / Chứng từ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyển khoản Vietcombank, Phiếu chi số 12"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none"
                />
              </div>

              {selectedPartner && (
                <div className="p-2 bg-emerald-50/50 rounded border text-[10px] text-emerald-900">
                  Sau khi ghi nhận, dư nợ của <strong>{selectedPartner.name}</strong> sẽ thay đổi từ{' '}
                  <span className="font-mono font-bold text-red-600">{selectedPartner.currentDebt.toLocaleString()} đ</span> về{' '}
                  <span className="font-mono font-bold text-emerald-800">
                    {(selectedPartner.currentDebt - amount).toLocaleString()} đ
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedPartnerId || amount <= 0}
                className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-black py-2 rounded-lg text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Check size={14} />
                <span>Xác nhận giao dịch & Cập nhật sổ quỹ</span>
              </button>
            </form>
          </div>

          {/* AI Message Drafting Card */}
          <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col justify-between h-[300px]">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2 border-b pb-1.5">
                <Sparkles size={14} className="text-yellow-500" />
                <span>Bản nháp nhắc nợ tinh tế bằng AI (Zalo)</span>
              </div>

              {isGeneratingReminder ? (
                <div className="py-14 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="text-emerald-700 animate-spin" />
                  <span className="text-[10px] text-gray-400 italic">AI đang lựa chọn từ ngữ địa phương miền Tây thân mật...</span>
                </div>
              ) : reminderText ? (
                <div className="bg-emerald-50/25 p-2.5 rounded border border-emerald-100 text-[10px] leading-relaxed text-gray-700 font-sans max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                  {reminderText}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed rounded flex flex-col items-center justify-center gap-1.5 text-gray-400">
                  <Info size={24} className="text-gray-300" />
                  <span className="text-[10px] px-4">Hãy bấm nút "Nhắc nợ AI" tại danh sách đối tác bên trái để hệ thống soạn thảo tin nhắn nhắc tiền dừa khéo léo nhất.</span>
                </div>
              )}
            </div>

            {reminderText && (
              <div className="mt-2.5 pt-2 border-t flex justify-between items-center text-[10px]">
                <span className="text-[9px] text-emerald-700 font-bold">Người nhận: {selectedPartnerForReminder?.name}</span>
                <button
                  onClick={copyToClipboard}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold px-3 py-1 rounded flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép tin'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
