import React, { useState } from 'react';
import { Buyer, Lot, ContainerShipment, ShipmentItem } from '../types';
import { Truck, Sparkles, FileText, Check, DollarSign, RefreshCw, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface ShipmentsViewProps {
  buyers: Buyer[];
  lots: Lot[];
  shipments: ContainerShipment[];
  onAddShipment: (shipment: ContainerShipment) => void;
}

export default function ShipmentsView({ buyers, lots, shipments, onAddShipment }: ShipmentsViewProps) {
  // Shipment Form States
  const [selectedBuyerId, setSelectedBuyerId] = useState(buyers[0]?.id || '');
  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);
  const [licensePlate, setLicensePlate] = useState('51R-123.45 / Đầu kéo 51C-845.22');
  const [driverName, setDriverName] = useState('Trần Thanh Lâm');
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([lots[0]?.id || '']);

  // Shipment Items weights & prices
  const [comWeight, setComWeight] = useState<number>(3000);
  const [comPrice, setComPrice] = useState<number>(38000); // 38,000 VND/kg export
  const [gaoWeight, setGaoWeight] = useState<number>(1500);
  const [gaoPrice, setGaoPrice] = useState<number>(6500); // 6,500 VND/kg
  const [xoWeight, setXoWeight] = useState<number>(2000);
  const [xoPrice, setXoPrice] = useState<number>(4200);  // 4,200 VND/kg

  // Expenses
  const [transportCost, setTransportCost] = useState<number>(8500000); // 8.5M transportation
  const [loadingCost, setLoadingCost] = useState<number>(3000000);    // 3M loading
  const [otherCosts, setOtherCosts] = useState<number>(1500000);      // 1.5M customs / quarantine

  // AI Traceability State
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [selectedShipmentForTrace, setSelectedShipmentForTrace] = useState<ContainerShipment | null>(shipments[0] || null);
  const [traceProfile, setTraceProfile] = useState<any>(null);

  // Computations
  const totalRevenue = (comWeight * comPrice) + (gaoWeight * gaoPrice) + (xoWeight * xoPrice);

  // Calculate COGS (Cost of Goods Sold) based on proportional raw coconut costs
  const selectedLotsList = lots.filter(l => selectedLotIds.includes(l.id));
  const rawCoconutInitialCost = selectedLotsList.reduce((sum, l) => sum + l.totalCost, 0);
  const rawCoconutInitialWeight = selectedLotsList.reduce((sum, l) => sum + l.initialWeight, 0);
  const avgRawCoconutPrice = rawCoconutInitialWeight > 0 ? (rawCoconutInitialCost / rawCoconutInitialWeight) : 8100;

  // Approx raw coconuts required: 1kg cơm dừa takes approx 3.1kg raw coconuts. 1kg gáo take 5kg. 1kg xơ takes 1.5kg.
  const estRawCoconutUsedWeight = (comWeight * 3.1) + (gaoWeight * 5.0) + (xoWeight * 1.5);
  const totalCostOfGoods = Math.round(Math.min(rawCoconutInitialCost || (estRawCoconutUsedWeight * avgRawCoconutPrice), estRawCoconutUsedWeight * avgRawCoconutPrice));

  const totalExpenses = transportCost + loadingCost + otherCosts;
  const estimatedProfit = totalRevenue - totalCostOfGoods - totalExpenses;

  const handleLotSelectToggle = (id: string) => {
    if (selectedLotIds.includes(id)) {
      setSelectedLotIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedLotIds(prev => [...prev, id]);
    }
  };

  const handleExportSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const buyer = buyers.find(b => b.id === selectedBuyerId);
    if (!buyer) return;

    const items: ShipmentItem[] = [];
    if (comWeight > 0) items.push({ type: 'com_dua', weight: comWeight, unitPrice: comPrice, subtotal: comWeight * comPrice });
    if (gaoWeight > 0) items.push({ type: 'gao_dua', weight: gaoWeight, unitPrice: gaoPrice, subtotal: gaoWeight * gaoPrice });
    if (xoWeight > 0) items.push({ type: 'xo_dua', weight: xoWeight, unitPrice: xoPrice, subtotal: xoWeight * xoPrice });

    const newShipment: ContainerShipment = {
      id: 'ship-' + Date.now(),
      code: `CONT-${buyer.companyName.substring(0, 3).toUpperCase()}-${exportDate.replace(/-/g, '').substring(0, 6)}-${shipments.length + 1}`,
      buyerId: selectedBuyerId,
      buyerName: buyer.name,
      exportDate,
      licensePlate,
      driverName,
      items,
      lotIds: selectedLotIds,
      transportCost,
      loadingCost,
      otherCosts,
      totalRevenue,
      totalCostOfGoods,
      estimatedProfit,
      paidAmount: Math.round(totalRevenue * 0.6), // Assume 60% standard partial payment
      paymentStatus: 'thanh_toan_mot_phan',
      status: 'da_xuat',
      note: `Xuất container. Giá vốn nguyên trái: ${totalCostOfGoods.toLocaleString()} đ. Ước tính lợi nhuận ròng vựa dừa: ${estimatedProfit.toLocaleString()} đ.`
    };

    onAddShipment(newShipment);

    // Reset Form
    setComWeight(0);
    setGaoWeight(0);
    setXoWeight(0);
  };

  const handleGenerateTraceability = async (shipment: ContainerShipment) => {
    setIsGeneratingProfile(true);
    setTraceProfile(null);
    setSelectedShipmentForTrace(shipment);

    // Gather corresponding lots and sellers for grounded context
    const matchedLots = lots.filter(l => (shipment.lotIds || []).includes(l.id));

    try {
      const response = await fetch('/api/ai/generate-traceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment,
          lots: matchedLots,
          sellers: matchedLots.map(l => ({ name: l.sellerName, date: l.importDate, weight: l.initialWeight, grade: l.qualityGrade }))
        })
      });
      const data = await response.json();
      if (data.success) {
        setTraceProfile(data.data);
      } else {
        alert('Không thể tạo hồ sơ truy xuất lúc này.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* 2-Columns Grid: Left - Export Form & Profit Calculator, Right - Traceability Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Export Shipment Form (col-span-8) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <form onSubmit={handleExportSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
              <Truck size={14} className="text-emerald-700" />
              <span>Ghi nhận container xuất khẩu hoặc chuyến xuất bán sỉ</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Khách mua / Doanh nghiệp xuất khẩu:</label>
                <select
                  value={selectedBuyerId}
                  onChange={(e) => setSelectedBuyerId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.companyName} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Biển số Cont:</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Tài xế nhận cont:</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Selection of source Lots for direct traceability linking! */}
            <div className="p-2.5 bg-gray-50 rounded border">
              <div className="text-[10px] font-bold text-gray-600 uppercase mb-1.5 flex justify-between">
                <span>Chọn lô dừa khô nguyên trái nguồn gốc dồn vào chuyến này:</span>
                <span className="text-emerald-800 text-[9px] font-bold italic">Truy xuất trực tiếp gốc vườn</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white border rounded">
                {lots.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleLotSelectToggle(l.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                      selectedLotIds.includes(l.id)
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {l.code} ({l.sellerName.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>

            {/* Outputs weights & prices */}
            <div className="p-3 bg-emerald-50/20 rounded border border-emerald-100 space-y-2">
              <div className="text-[9px] font-black text-emerald-800 uppercase">Khối lượng & Đơn giá xuất khẩu (Thực xuất):</div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-emerald-900">Cơm dừa sấy khô (kg):</label>
                  <input
                    type="number"
                    value={comWeight}
                    onChange={(e) => setComWeight(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono font-bold text-emerald-800"
                  />
                  <div className="mt-0.5 text-[8.5px] text-gray-500 font-mono">
                    Đơn giá: <input type="number" value={comPrice} onChange={(e) => setComPrice(Number(e.target.value))} className="w-12 bg-transparent border-b font-bold p-0 outline-none text-emerald-800" />đ
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-amber-900">Gáo dừa thô (kg):</label>
                  <input
                    type="number"
                    value={gaoWeight}
                    onChange={(e) => setGaoWeight(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono font-bold text-amber-800"
                  />
                  <div className="mt-0.5 text-[8.5px] text-gray-500 font-mono">
                    Đơn giá: <input type="number" value={gaoPrice} onChange={(e) => setGaoPrice(Number(e.target.value))} className="w-12 bg-transparent border-b font-bold p-0 outline-none text-amber-800" />đ
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-700">Chỉ xơ dừa bện (kg):</label>
                  <input
                    type="number"
                    value={xoWeight}
                    onChange={(e) => setXoWeight(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono font-bold text-gray-700"
                  />
                  <div className="mt-0.5 text-[8.5px] text-gray-500 font-mono">
                    Đơn giá: <input type="number" value={xoPrice} onChange={(e) => setXoPrice(Number(e.target.value))} className="w-12 bg-transparent border-b font-bold p-0 outline-none text-gray-700" />đ
                  </div>
                </div>
              </div>
            </div>

            {/* Transportation & handling costs */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded border">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Cước tàu / Vận tải:</label>
                <input
                  type="number"
                  value={transportCost}
                  onChange={(e) => setTransportCost(Number(e.target.value))}
                  className="w-full bg-white border rounded p-1 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Bốc xếp kho vựa:</label>
                <input
                  type="number"
                  value={loadingCost}
                  onChange={(e) => setLoadingCost(Number(e.target.value))}
                  className="w-full bg-white border rounded p-1 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Hải quan / Phí cảng:</label>
                <input
                  type="number"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(Number(e.target.value))}
                  className="w-full bg-white border rounded p-1 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Real-time Profit & Loss calculation display! */}
            <div className="bg-emerald-950 text-white rounded-lg p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] uppercase tracking-wider font-bold text-emerald-300">Tính toán hiệu quả kinh tế container thực tế:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center md:text-left">
                <div>
                  <span className="block text-[9px] text-emerald-300">1. Tổng Doanh thu xuất khẩu</span>
                  <span className="text-sm font-black font-mono text-yellow-300">{totalRevenue.toLocaleString()} đ</span>
                </div>
                <div>
                  <span className="block text-[9px] text-emerald-300">2. Giá vốn dừa khô gốc</span>
                  <span className="text-sm font-black font-mono text-red-300">-{totalCostOfGoods.toLocaleString()} đ</span>
                </div>
                <div>
                  <span className="block text-[9px] text-emerald-300">3. Tổng Chi phí vận xe</span>
                  <span className="text-sm font-black font-mono text-red-300">-{totalExpenses.toLocaleString()} đ</span>
                </div>
                <div className="bg-emerald-900 rounded p-1 text-center border border-emerald-800">
                  <span className="block text-[8px] font-bold text-yellow-400 flex items-center justify-center gap-0.5">
                    <TrendingUp size={10} /> LÃI RÒNG CONTAINER
                  </span>
                  <span className={`text-sm font-black font-mono ${estimatedProfit >= 0 ? 'text-green-300' : 'text-red-400'}`}>
                    {estimatedProfit.toLocaleString()} đ
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={totalRevenue <= 0}
              className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-black py-2.5 rounded-lg text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Check size={14} />
              <span>GHI NHẬN XUẤT CHUYẾN & TÍNH LÃI LỖ</span>
            </button>
          </form>

          {/* List of Shipments */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-xs text-gray-700 uppercase flex items-center gap-1.5">
                <FileText size={14} className="text-gray-500" />
                <span>Nhật ký container & Chuyến hàng xuất khẩu</span>
              </h3>
            </div>

            <div className="p-1.5 space-y-1.5">
              {shipments.map(s => (
                <div key={s.id} className="p-2 bg-gray-50/50 rounded border border-gray-100 flex items-center justify-between hover:bg-gray-100/50 transition-all">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono font-bold text-blue-800">{s.code}</span>
                      <span className="text-[9px] text-gray-400">({s.exportDate})</span>
                    </div>
                    <p className="text-[10px] text-gray-700 font-medium">Khách nhận: <strong className="text-gray-900">{s.buyerName}</strong></p>
                    <p className="text-[9px] text-gray-500 italic mt-0.5">{s.note}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateTraceability(s)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1.5 rounded border border-emerald-200 flex items-center gap-1 transition-all"
                    >
                      <Sparkles size={11} className="text-yellow-500" />
                      <span>Truy xuất AI</span>
                    </button>
                    <div className="text-right min-w-[90px]">
                      <div className="text-[10.5px] font-black text-emerald-700">+{s.estimatedProfit.toLocaleString()} đ</div>
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-black uppercase font-mono">Đã rời cảng</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Traceability Profile Card (col-span-4) */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col justify-between h-full min-h-[480px]">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2 border-b pb-1.5">
                <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                <span>Hồ sơ truy xuất nguồn gốc nông sản AI</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed mb-3.5">
                Hỗ trợ cung cấp hồ sơ chuẩn hóa cho khách hàng nước ngoài thu mua cơm dừa sấy xuất khẩu. AI sẽ tổng hợp và gom dữ liệu của toàn bộ nhà vườn đã đóng góp dừa nguyên trái vào container này.
              </p>

              {isGeneratingProfile ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="text-emerald-700 animate-spin" />
                  <span className="text-xs text-gray-500 italic">AI đang tập hợp danh sách nông hộ, tổng hợp ngày thu mua và chứng thư chất lượng xuất khẩu...</span>
                </div>
              ) : traceProfile ? (
                <div id="ai-trace-profile" className="space-y-3 bg-emerald-50/10 p-3 rounded border border-emerald-100 text-[10.5px] leading-relaxed text-gray-700">
                  <div className="bg-emerald-800 text-white text-center py-1 rounded font-bold uppercase tracking-wider text-[10px] mb-2">
                    Traceability Certificate (Vietnamese Standard)
                  </div>

                  <div>
                    <strong className="text-emerald-950 font-bold">Mã Container:</strong> <span className="font-mono">{traceProfile.shipmentCode}</span>
                  </div>
                  <div>
                    <strong className="text-emerald-950 font-bold">Khách nhận khẩu:</strong> {traceProfile.buyerName}
                  </div>
                  <div>
                    <strong className="text-emerald-950 font-bold">Ngày xuất hàng:</strong> {traceProfile.exportDate}
                  </div>
                  <div>
                    <strong className="text-emerald-950 font-bold">Mặt hàng chính:</strong> {traceProfile.itemsList}
                  </div>

                  {/* Sources Table */}
                  <div className="border border-emerald-200 rounded mt-2 overflow-hidden bg-white">
                    <div className="bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-900 uppercase">
                      Danh sách nông hộ / Thương lái liên kết nguồn gốc dừa:
                    </div>
                    <table className="w-full text-left text-[9.5px]">
                      <thead className="bg-gray-50 font-bold text-gray-600 border-b">
                        <tr>
                          <th className="px-2 py-1">Lô hàng</th>
                          <th className="px-2 py-1">Grower/Nông hộ</th>
                          <th className="px-2 py-1 text-right">Khối lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-600">
                        {traceProfile.sourceLots?.map((lot: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 font-mono">{lot.lotCode}</td>
                            <td className="px-2 py-1 font-bold text-gray-900">{lot.sellerName}</td>
                            <td className="px-2 py-1 text-right">{(lot.weight).toLocaleString()} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-emerald-100 pt-2 space-y-2">
                    <div>
                      <strong className="text-emerald-950 font-bold block">Chứng chỉ chất lượng cơm dừa sấy (AI Verified):</strong>
                      <p className="italic text-gray-600 mt-0.5 text-[10px] bg-white p-2 rounded border">{traceProfile.qualityCertificateSummary}</p>
                    </div>
                    <div>
                      <strong className="text-emerald-950 font-bold block">Cam kết nông nghiệp bền vững & Công bằng:</strong>
                      <p className="italic text-gray-600 mt-0.5 text-[10px] bg-white p-2 rounded border">{traceProfile.sustainabilityNote}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed rounded flex flex-col items-center justify-center gap-2 text-gray-400">
                  <FileText size={28} className="text-gray-300" />
                  <span className="text-xs">Hãy chọn một Container ở danh sách kế bên rồi nhấn nút "Truy xuất AI" để sinh chứng thư nguồn gốc xuất khẩu.</span>
                </div>
              )}
            </div>

            {traceProfile && (
              <div className="mt-3 bg-gray-900 text-white p-2 rounded flex justify-between items-center text-[10px]">
                <span className="flex items-center gap-1 text-green-400"><Check size={12} /> Hồ sơ đạt chuẩn xuất khẩu SGS</span>
                <button
                  onClick={() => window.print()}
                  className="bg-white text-gray-900 font-bold px-2 py-0.5 rounded text-[9px] hover:bg-gray-100 transition-colors"
                >
                  In / Xuất PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
