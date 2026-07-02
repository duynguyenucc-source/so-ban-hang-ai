import React, { useState } from 'react';
import { Lot, ProcessingRecord, Seller } from '../types';
import { Layers, HelpCircle, Hammer, Check, History, Sparkles, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

interface LotsViewProps {
  lots: Lot[];
  processingRecords: ProcessingRecord[];
  canEdit: boolean;
  onAddProcessingRecord: (record: ProcessingRecord) => void;
  onRunAIAudit: () => void;
  isAuditLoading: boolean;
}

export default function LotsView({
  lots,
  processingRecords,
  canEdit,
  onAddProcessingRecord,
  onRunAIAudit,
  isAuditLoading
}: LotsViewProps) {
  // Processing Form States
  const [selectedLotId, setSelectedLotId] = useState<string>(lots.find(l => l.currentWeight > 0)?.id || '');
  const [inputWeight, setInputWeight] = useState<number>(3000);
  const [outputMeat, setOutputMeat] = useState<number>(950); // ~31% recovery
  const [outputShell, setOutputShell] = useState<number>(600); // ~20%
  const [outputCoir, setOutputCoir] = useState<number>(1050); // ~35%
  const [outputWaste, setOutputWaste] = useState<number>(100); // ~3%
  const [laborCost, setLaborCost] = useState<number>(1500000); // 1.5M labor
  const [notes, setNotes] = useState('');

  // Computed fields
  const totalOutputWeight = outputMeat + outputShell + outputCoir + outputWaste;
  const lossWeight = Math.max(0, inputWeight - totalOutputWeight);
  const recoveryRate = inputWeight > 0 ? (outputMeat / inputWeight) * 100 : 0;
  const lossRate = inputWeight > 0 ? (lossWeight / inputWeight) * 100 : 0;

  // Selected Lot Details for visual helper
  const selectedLot = lots.find(l => l.id === selectedLotId);

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Tài khoản hiện tại chỉ được xem. Hãy đăng nhập Admin hoặc Nhân viên kho để cập nhật kho.');
      return;
    }
    if (!selectedLot) return;

    if (inputWeight > selectedLot.currentWeight) {
      alert(`Khối lượng đưa vào chế biến (${inputWeight} kg) không được lớn hơn khối lượng dừa nguyên trái còn lại trong lô (${selectedLot.currentWeight} kg).`);
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const newRecord: ProcessingRecord = {
      id: 'proc-' + Date.now(),
      lotId: selectedLotId,
      lotCode: selectedLot.code,
      date: dateStr,
      inputWeight,
      outputMeat,
      outputShell,
      outputCoir,
      outputWaste,
      lossWeight,
      recoveryRate: Number(recoveryRate.toFixed(1)),
      lossRate: Number(lossRate.toFixed(1)),
      laborCost,
      notes: notes || `Sơ chế lột vỏ lấy cơm sọ dừa. Khối lượng hao hụt: ${lossWeight} kg (${lossRate.toFixed(1)}%)`
    };

    onAddProcessingRecord(newRecord);

    // Reset processing form
    setNotes('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Run AI Audit Panel */}
      <div className="bg-emerald-800 text-white p-3.5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-400 text-emerald-900 rounded-full">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider">AI Rà Soát & Đối Soát Hao Hụt Toàn Vựa</h4>
            <p className="text-[10.5px] text-emerald-100">
              Chạy kiểm toán thuật toán AI để phân tích hiệu suất thu hồi cơm dừa sấy khô, cảnh báo hao hụt phơi phóng bất thường vượt ngưỡng {'>'} 8%.
            </p>
          </div>
        </div>
        <button
          onClick={onRunAIAudit}
          disabled={isAuditLoading || !canEdit}
          className={`w-full md:w-auto text-xs font-black px-4 py-2 rounded flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            canEdit ? 'bg-yellow-400 hover:bg-yellow-500 text-emerald-950' : 'bg-gray-500 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isAuditLoading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          <span>ĐỐI SOÁT HAO HỤT AI</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Active Lots Table (col-span-8) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-xs text-gray-700 uppercase flex items-center gap-1.5">
                <Layers size={14} className="text-gray-500" />
                <span>Theo dõi tồn kho theo từng lô hàng thu mua</span>
              </h3>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black font-mono px-2 py-0.5 rounded border border-emerald-200">
                Tồn: {lots.filter(l => l.currentWeight > 0).length} lô dừa trái
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-500 uppercase text-[9px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">Mã Lô</th>
                  <th className="px-3 py-2.5">Nguồn hàng</th>
                  <th className="px-3 py-2.5 text-right">Khối lượng ban đầu</th>
                  <th className="px-3 py-2.5 text-right">Trái tồn hiện tại</th>
                  <th className="px-3 py-2.5">Hạng dừa</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Vị trí</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700 font-medium">
                {lots.map(l => (
                  <tr key={l.id} className={`hover:bg-gray-50/70 ${l.currentWeight === 0 ? 'opacity-50 bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2 text-[10px] font-mono font-bold text-blue-800">{l.code}</td>
                    <td className="px-3 py-2">{l.sellerName}</td>
                    <td className="px-3 py-2 text-right font-mono">{(l.initialWeight).toLocaleString()} kg</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {(l.currentWeight).toLocaleString()} kg
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                        l.qualityGrade === 'loai_1'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.qualityGrade === 'loai_2'
                          ? 'bg-blue-100 text-blue-800'
                          : l.qualityGrade === 'loai_3'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.qualityGrade === 'loai_1' ? 'Loại 1' : l.qualityGrade === 'loai_2' ? 'Loại 2' : l.qualityGrade === 'loai_3' ? 'Loại 3' : 'Hỗn hợp'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          l.status === 'moi_nhap' ? 'bg-blue-500 animate-pulse' : l.status === 'dang_phoi' ? 'bg-amber-500' : l.status === 'da_hoan_thanh' ? 'bg-gray-400' : 'bg-emerald-500'
                        }`}></span>
                        {l.status === 'moi_nhap' ? 'Mới nhập' : l.status === 'dang_phoi' ? 'Đang phơi' : l.status === 'dang_che_bien' ? 'Đang sơ chế' : l.status === 'da_hoan_thanh' ? 'Đã chế biến' : 'Phân loại'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-sans text-[10px]">{l.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Processing Log History */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-xs text-gray-700 uppercase flex items-center gap-1.5">
                <History size={14} className="text-gray-500" />
                <span>Nhật ký tách vỏ dừa khô lấy cơm sấy & phụ phẩm</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Đã xử lý: {processingRecords.length} đợt</span>
            </div>

            <div className="p-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[8px] font-bold">
                  <tr>
                    <th className="px-3 py-2">Ngày sơ chế</th>
                    <th className="px-3 py-2">Mã lô gốc</th>
                    <th className="px-3 py-2 text-right">Dừa đưa vào</th>
                    <th className="px-3 py-2 text-right">Cơm thu hồi</th>
                    <th className="px-3 py-2 text-right">Gáo thu hồi</th>
                    <th className="px-3 py-2 text-right">Xơ / Chỉ</th>
                    <th className="px-3 py-2 text-right">Hao hụt</th>
                    <th className="px-3 py-2 text-right">Hao hụt %</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {processingRecords.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/70 font-medium">
                      <td className="px-3 py-2 text-[10px] text-gray-400 font-mono">{r.date}</td>
                      <td className="px-3 py-2 font-mono text-blue-700 font-bold">{r.lotCode}</td>
                      <td className="px-3 py-2 text-right font-mono">{(r.inputWeight).toLocaleString()} kg</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">{(r.outputMeat).toLocaleString()} kg</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-800">{(r.outputShell).toLocaleString()} kg</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">{(r.outputCoir).toLocaleString()} kg</td>
                      <td className="px-3 py-2 text-right font-mono text-red-500 font-bold">{(r.lossWeight).toLocaleString()} kg</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-1 rounded font-bold font-mono text-[10px] ${
                          r.lossRate > 8 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {r.lossRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Peeling & Processing Form (col-span-4) */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white rounded-lg shadow-sm border p-3.5 space-y-3">
            <h3 className="font-bold text-xs uppercase text-gray-700 border-b pb-1.5 flex items-center gap-1.5">
              <Hammer size={14} className="text-amber-500" />
              <span>Ghi nhận đợt bóc tách chế biến dừa</span>
            </h3>

            <form onSubmit={handleProcessSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Chọn lô dừa khô cần bóc tách vỏ:</label>
                <select
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  <option value="">-- Chọn lô hàng còn dừa nguyên trái --</option>
                  {lots.filter(l => l.currentWeight > 0).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.code} ({l.currentWeight.toLocaleString()} kg trái tồn)
                    </option>
                  ))}
                </select>

                {selectedLot && (
                  <div className="mt-1 bg-blue-50/50 p-2 rounded text-[10px] border border-blue-100 flex justify-between">
                    <div>
                      <span className="font-bold text-blue-900">Người bán:</span> {selectedLot.sellerName}
                    </div>
                    <div>
                      <span className="font-bold text-blue-900">Hạng:</span> {selectedLot.qualityGrade === 'loai_1' ? 'Loại 1' : 'Loại 2'}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Khối lượng dừa mang ra lột vỏ sấy sọ (kg):</label>
                <input
                  type="number"
                  value={inputWeight}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInputWeight(val);
                    // Dynamically set default mock values for outputs to match typical ratios (31% meat, 20% shell, 35% coir, 3% waste)
                    setOutputMeat(Math.round(val * 0.31));
                    setOutputShell(Math.round(val * 0.20));
                    setOutputCoir(Math.round(val * 0.35));
                    setOutputWaste(Math.round(val * 0.03));
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold focus:outline-none"
                  max={selectedLot?.currentWeight || 0}
                />
              </div>

              {/* Outputs obtained */}
              <div className="bg-gray-50/50 p-3 rounded border space-y-2.5">
                <div className="text-[9px] font-bold text-gray-500 uppercase">Sản lượng phụ phẩm & thành phẩm thu hồi:</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-emerald-800">Cơm dừa sấy thu hồi (kg):</label>
                    <input
                      type="number"
                      value={outputMeat}
                      onChange={(e) => setOutputMeat(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-amber-800">Gáo dừa thu hồi (kg):</label>
                    <input
                      type="number"
                      value={outputShell}
                      onChange={(e) => setOutputShell(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono font-bold text-amber-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-600">Sợi / Chỉ xơ dừa thu hồi (kg):</label>
                    <input
                      type="number"
                      value={outputCoir}
                      onChange={(e) => setOutputCoir(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-red-700">Dừa thối hỏng loại bỏ (kg):</label>
                    <input
                      type="number"
                      value={outputWaste}
                      onChange={(e) => setOutputWaste(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded p-1 text-xs font-mono text-red-700"
                    />
                  </div>
                </div>
              </div>

              {/* Live calculations */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-emerald-50 rounded p-1.5 border border-emerald-100">
                  <div className="text-[8px] text-emerald-800 font-bold">TỶ LỆ THU HỒI CƠM</div>
                  <div className="text-xs font-black font-mono text-emerald-950">{recoveryRate.toFixed(1)}%</div>
                </div>
                <div className="bg-red-50 rounded p-1.5 border border-red-100">
                  <div className="text-[8px] text-red-800 font-bold">HAO HỤT SẤY PHƠI</div>
                  <div className="text-xs font-black font-mono text-red-900">{lossWeight} kg</div>
                </div>
                <div className="bg-amber-50 rounded p-1.5 border border-amber-100">
                  <div className="text-[8px] text-amber-800 font-bold">PHẦN TRĂM HAO HỤT</div>
                  <div className={`text-xs font-black font-mono ${lossRate > 8 ? 'text-red-700 animate-pulse' : 'text-amber-900'}`}>
                    {lossRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {lossRate > 8 && (
                <div className="p-2 bg-red-100/50 rounded border border-red-200 text-[9.5px] text-red-800 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-red-600 animate-bounce" />
                  <span>Cảnh báo: Hao hụt sấy khô vượt định mức an toàn ({lossRate.toFixed(1)}% {'>'} 8%). Lô này sẽ bị hệ thống AI theo dõi rủi ro chất lượng!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Chi phí nhân công tách sấy (đ):</label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Ghi chú vận hành lò sơ chế:</label>
                  <input
                    type="text"
                    placeholder="VD: sấy lò hơi, phơi nắng"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedLotId || inputWeight <= 0 || !canEdit}
                className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-black py-2 rounded-lg text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Check size={14} />
                <span>Hoàn Tất & Cập Nhật Tồn Kho Phụ Phẩm</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
