import React, { useState } from 'react';
import { Seller, PurchaseTicket, Lot } from '../types';
import { Eye, Scale, FileText, Camera, Check, RefreshCw, Sparkles, User, AlertCircle, Trash2 } from 'lucide-react';
import { getImageUploadLabel, isSupportedImageFile, readImageAsDataUrl } from '../imageUpload';
import { buildPaymentVoucher } from '../purchaseDocuments';

interface PurchaseViewProps {
  sellers: Seller[];
  tickets: PurchaseTicket[];
  canEdit: boolean;
  onAddTicket: (ticket: PurchaseTicket, newLot: Lot) => void;
  onOpenImportWarehouse: () => void;
  onOpenPayment: () => void;
}

export default function PurchaseView({
  sellers,
  tickets,
  canEdit,
  onAddTicket,
  onOpenImportWarehouse,
  onOpenPayment,
}: PurchaseViewProps) {
  // Main form states
  const [selectedSellerId, setSelectedSellerId] = useState(sellers[0]?.id || '');
  const [licensePlate, setLicensePlate] = useState('84C-125.84');
  const [grossWeight, setGrossWeight] = useState<number>(12500);
  const [tareWeight, setTareWeight] = useState<number>(4500);
  const [unitPrice, setUnitPrice] = useState<number>(8200); // VND/kg
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'da_thanh_toan' | 'ghi_no' | 'thanh_toan_mot_phan'>('ghi_no');
  const [location, setLocation] = useState('Khu A - Sân phơi chính');
  const [note, setNote] = useState('');

  // Deductions
  const [moistureDeductionKg, setMoistureDeductionKg] = useState<number>(0);
  const [qualityDeductionKg, setQualityDeductionKg] = useState<number>(0);
  const [otherDeductionVnd, setOtherDeductionVnd] = useState<number>(0);

  // AI Quality Inspection
  const [isQualityScanning, setIsQualityScanning] = useState(false);
  const [qualityType, setQualityType] = useState<'good' | 'mixed' | 'damaged'>('mixed');
  const [aiQualityResult, setAiQualityResult] = useState<any>(null);
  const [qualityImage, setQualityImage] = useState<{ name: string; dataUrl: string; size: number } | null>(null);

  // AI Ticket Scan
  const [isTicketScanning, setIsTicketScanning] = useState(false);
  const [ticketSampleType, setTicketSampleType] = useState<'slip1' | 'slip2' | 'slip3'>('slip1');
  const [aiTicketResult, setAiTicketResult] = useState<any>(null);
  const [ticketImage, setTicketImage] = useState<{ name: string; dataUrl: string; size: number } | null>(null);
  const [lastSavedPurchase, setLastSavedPurchase] = useState<{ ticket: PurchaseTicket; lot: Lot } | null>(null);

  // Computed Fields
  const netWeight = Math.max(0, grossWeight - tareWeight);
  const finalWeight = Math.max(0, netWeight - moistureDeductionKg - qualityDeductionKg);
  const subtotal = netWeight * unitPrice;
  const finalAmount = Math.max(0, (finalWeight * unitPrice) - otherDeductionVnd);

  // OCR Preloaded Sample Slips Text to show the user
  const sampleSlipsInfo = {
    slip1: "Phiếu cân xe 3 cầu Trà Vinh: Xe 84C-125.84, Cân Tổng 12.45T, Bì 4.5T. Khách hàng: Ba Hùng.",
    slip2: "Trạm thu mua Lan Bến Tre: Xe 71H-082.15, Cân Tổng 5.6T, Bì 2.1T. Người giao: Lan Bến Tre.",
    slip3: "Cân điện tử Tam Quan: Xe 83C-194.55, Cân Tổng 18.5T, Bì 6.2T. Người giao: HTX Tam Quan."
  };

  const sampleQualityInfo = {
    good: "Dừa khô đạt chuẩn: Vỏ sậm màu róc nước, trái to sọ cứng xọc nước nghe róc, dầy cơm béo.",
    mixed: "Dừa dính mưa ẩm: Có một số quả bị ẩm sũng vỏ nứt sọ nhẹ khoảng 5%, dừa rám đều.",
    damaged: "Dừa mọc mầm lên mộng: Khoảng 15% trái đã nhú mộng dừa, vỏ có vết mốc thối ẩm."
  };

  const handleImageSelect = async (
    file: File | undefined,
    setImage: React.Dispatch<React.SetStateAction<{ name: string; dataUrl: string; size: number } | null>>
  ) => {
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      alert('Vui lòng chọn ảnh JPG, PNG hoặc WebP và dung lượng không quá 6 MB.');
      return;
    }

    const dataUrl = await readImageAsDataUrl(file);
    setImage({ name: file.name, dataUrl, size: file.size });
  };

  const handleScanTicket = async () => {
    setIsTicketScanning(true);
    setAiTicketResult(null);

    try {
      const response = await fetch('/api/ai/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleType: ticketSampleType,
          image: ticketImage?.dataUrl
        })
      });
      const resData = await response.json();
      if (resData.success) {
        const extracted = resData.data;
        setAiTicketResult(extracted);

        // Populate fields with AI extracted data
        setLicensePlate(extracted.licensePlate || '');
        setGrossWeight(extracted.grossWeight || 0);
        setTareWeight(extracted.tareWeight || 0);

        // Try to match seller name to exist sellers
        const matched = sellers.find(s => s.name.toLowerCase().includes(extracted.sellerName?.toLowerCase()) || extracted.sellerName?.toLowerCase().includes(s.name.toLowerCase()));
        if (matched) {
          setSelectedSellerId(matched.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTicketScanning(false);
    }
  };

  const handleSuggestQuality = async () => {
    setIsQualityScanning(true);
    setAiQualityResult(null);

    try {
      const response = await fetch('/api/ai/suggest-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: qualityType,
          textDetails: qualityImage
            ? `Ảnh mẫu dừa tải từ máy tính: ${qualityImage.name}. Hãy đánh giá chất lượng dựa trên ảnh.`
            : sampleQualityInfo[qualityType],
          image: qualityImage?.dataUrl
        })
      });
      const resData = await response.json();
      if (resData.success) {
        const quality = resData.data;
        setAiQualityResult(quality);

        // Auto apply suggested deductions
        setQualityDeductionKg(quality.suggestedDeductionKg || 0);
        if (quality.grade === 'loai_1') {
          setUnitPrice(8500);
        } else if (quality.grade === 'loai_2') {
          setUnitPrice(8100);
        } else if (quality.grade === 'loai_3') {
          setUnitPrice(7500);
        } else {
          setUnitPrice(7800);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsQualityScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Tài khoản hiện tại chỉ được xem. Hãy đăng nhập Admin hoặc Nhân viên kho để lưu phiếu mua.');
      return;
    }

    const selectedSeller = sellers.find(s => s.id === selectedSellerId);
    if (!selectedSeller) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const ticketId = 'ticket-' + Date.now();
    const lotId = 'lot-' + Date.now();
    const lotCode = `LÔ-DUA-${dateStr.replace(/-/g, '')}-${tickets.length + 1}`;

    const newTicket: PurchaseTicket = {
      id: ticketId,
      lotId,
      sellerId: selectedSellerId,
      sellerName: selectedSeller.name,
      date: dateStr,
      licensePlate,
      grossWeight,
      tareWeight,
      netWeight,
      unitPrice,
      subtotal,
      deductions: {
        moistureDeductionKg,
        qualityDeductionKg,
        otherDeductionVnd
      },
      finalWeight,
      finalAmount,
      paidAmount,
      paymentStatus,
      scannedImage: ticketImage?.dataUrl,
      qualityImage: qualityImage?.dataUrl,
      scannedImageName: ticketImage?.name,
      qualityImageName: qualityImage?.name,
      aiExtractedText: aiTicketResult?.extractedText,
      paymentVoucherCode: `PAY-${ticketId}`,
      note: [
        note || (aiQualityResult ? `Đánh giá chất lượng AI: ${aiQualityResult.qualityTags?.join(', ')}` : ''),
        ticketImage ? `Ảnh phiếu cân: ${ticketImage.name}` : '',
        qualityImage ? `Ảnh mẫu dừa: ${qualityImage.name}` : ''
      ].filter(Boolean).join(' | ')
    };

    const newLot: Lot = {
      id: lotId,
      code: lotCode,
      sourceSellerId: selectedSellerId,
      sellerName: selectedSeller.name,
      importDate: dateStr,
      initialWeight: finalWeight,
      currentWeight: finalWeight,
      unitPrice,
      totalCost: finalAmount,
      status: 'moi_nhap',
      qualityGrade: aiQualityResult?.grade || 'hon_hop',
      qualityNotes: aiQualityResult?.qualityTags || ['Mới nhập qua cân'],
      location,
      processedWeight: 0,
      note: [
        note,
        ticketImage ? `Ảnh phiếu cân: ${ticketImage.name}` : '',
        qualityImage ? `Ảnh mẫu dừa: ${qualityImage.name}` : ''
      ].filter(Boolean).join(' | ')
    };

    onAddTicket(newTicket, newLot);
    setLastSavedPurchase({ ticket: newTicket, lot: newLot });

    // Reset Form
    setGrossWeight(0);
    setTareWeight(0);
    setMoistureDeductionKg(0);
    setQualityDeductionKg(0);
    setOtherDeductionVnd(0);
    setPaidAmount(0);
    setNote('');
    setAiQualityResult(null);
    setAiTicketResult(null);
    setTicketImage(null);
    setQualityImage(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* OCR and Quality Helper Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: AI OCR Reader */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
              <Sparkles size={14} className="text-yellow-500 animate-pulse" />
              <span>AI Đọc & Phân tích Phiếu Cân (OCR)</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-normal mb-3">
              Chụp phiếu cân thô từ bàn cân điện tử của vựa. AI sẽ tự động đọc biển số xe, cân nặng xe dừa và thông tin tài xế để tự động nhập liệu giúp bạn tránh sai sót.
            </p>

            <div className="bg-gray-50 p-2.5 rounded border border-gray-100 space-y-2">
              <label className="block text-[10px] font-bold text-gray-600">Chọn mẫu phiếu cân mô phỏng:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['slip1', 'slip2', 'slip3'] as const).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTicketSampleType(key)}
                    className={`p-1.5 rounded text-[10px] font-semibold text-center truncate border ${
                      ticketSampleType === key
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Phiếu {key === 'slip1' ? '1 (Ba Hùng)' : key === 'slip2' ? '2 (Lan Bến Tre)' : '3 (Tam Quan)'}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-gray-400 italic leading-snug">
                {sampleSlipsInfo[ticketSampleType]}
              </div>
            </div>

            <div className="mt-2 bg-emerald-50/60 p-2.5 rounded border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase">Ảnh phiếu cân từ máy tính</label>
                  <div className="text-[9px] text-emerald-700 font-medium">{getImageUploadLabel(ticketImage)}</div>
                </div>
                <label className="cursor-pointer bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1.5 rounded">
                  Chọn ảnh
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => handleImageSelect(event.target.files?.[0], setTicketImage)}
                  />
                </label>
              </div>
              {ticketImage && (
                <div className="flex gap-2 items-start">
                  <img src={ticketImage.dataUrl} alt="Ảnh phiếu cân đã chọn" className="h-20 w-28 object-cover rounded border bg-white" />
                  <button
                    type="button"
                    onClick={() => setTicketImage(null)}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    Bỏ ảnh
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <button
              onClick={handleScanTicket}
              disabled={isTicketScanning}
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-[11px] px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
            >
              {isTicketScanning ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
              <span>QUÉT PHIẾU CÂN BẰNG AI</span>
            </button>

            {aiTicketResult && (
              <div className="text-right text-[10px] text-green-700 font-bold flex items-center gap-1">
                <Check size={12} /> Đã trích xuất xong! (Tin cậy {(aiTicketResult.confidence * 100).toFixed(0)}%)
              </div>
            )}
          </div>

          {aiTicketResult && (
            <div className="mt-2.5 bg-yellow-50/50 p-2 rounded border border-yellow-100 text-[10px] font-mono whitespace-pre text-gray-700 overflow-x-auto max-h-24">
              {aiTicketResult.extractedText}
            </div>
          )}
        </div>

        {/* Box 2: AI Quality Detection */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
              <Sparkles size={14} className="text-yellow-500 animate-pulse" />
              <span>AI Đánh giá chất lượng & Phân loại dừa khô</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-normal mb-3">
              Chụp hình ảnh mẫu hoặc nhập mô tả nhanh chất lượng dừa. AI gợi ý phân hạng (Loại 1/2/3/Hỗn hợp) và lượng kg dừa bị hao hụt nứt mọc mầm cần trừ hao.
            </p>

            <div className="bg-gray-50 p-2.5 rounded border border-gray-100 space-y-2">
              <label className="block text-[10px] font-bold text-gray-600">Chọn tình trạng mẫu dừa:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['good', 'mixed', 'damaged'] as const).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQualityType(key)}
                    className={`p-1.5 rounded text-[10px] font-semibold text-center truncate border ${
                      qualityType === key
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {key === 'good' ? 'Dừa đẹp 100%' : key === 'mixed' ? 'Dừa lẫn lộn' : 'Dừa mọc mầm'}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-gray-400 italic leading-snug">
                {sampleQualityInfo[qualityType]}
              </div>
            </div>

            <div className="mt-2 bg-amber-50/70 p-2.5 rounded border border-amber-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase">Ảnh mẫu dừa từ máy tính</label>
                  <div className="text-[9px] text-amber-700 font-medium">{getImageUploadLabel(qualityImage)}</div>
                </div>
                <label className="cursor-pointer bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1.5 rounded">
                  Chọn ảnh
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => handleImageSelect(event.target.files?.[0], setQualityImage)}
                  />
                </label>
              </div>
              {qualityImage && (
                <div className="flex gap-2 items-start">
                  <img src={qualityImage.dataUrl} alt="Ảnh mẫu dừa đã chọn" className="h-20 w-28 object-cover rounded border bg-white" />
                  <button
                    type="button"
                    onClick={() => setQualityImage(null)}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    Bỏ ảnh
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <button
              onClick={handleSuggestQuality}
              disabled={isQualityScanning}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
            >
              {isQualityScanning ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span>NHẬN DIỆN MẪU DỪA AI</span>
            </button>
          </div>

          {aiQualityResult && (
            <div className="mt-2.5 p-2 bg-emerald-50 rounded border border-emerald-100 space-y-1.5 text-[10.5px]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-800">Gợi ý phân hạng:</span>
                <span className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[9px] uppercase font-mono">
                  {aiQualityResult.grade === 'loai_1' ? 'Loại 1' : aiQualityResult.grade === 'loai_2' ? 'Loại 2' : aiQualityResult.grade === 'loai_3' ? 'Loại 3' : 'Hỗn hợp'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-emerald-800">Hao hụt trừ bì đề xuất:</span>
                <span className="font-mono text-red-600 font-bold">-{aiQualityResult.suggestedDeductionKg} kg</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {aiQualityResult.qualityTags?.map((tag: string, i: number) => (
                  <span key={i} className="bg-white text-emerald-800 border border-emerald-200 text-[8.5px] px-1.5 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-[9.5px] text-gray-600 italic mt-1 leading-relaxed border-t border-emerald-100 pt-1">
                <strong>Ý kiến chuyên gia AI:</strong> {aiQualityResult.justification}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Input Purchase Form and Calculation Output */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-bold text-xs uppercase text-gray-700 mb-3 border-b pb-1">Phiếu ghi nhận cân dừa và tính toán nông sản</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Col 1: Seller & Plate */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Đối tác bán dừa:</label>
              <div className="relative">
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type === 'thuong_lai' ? 'Thương lái' : s.type === 'nha_vuon' ? 'Nhà vườn' : 'Đại lý'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Biển số xe / Tài xế:</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vị trí lưu kho hạ tải:</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Khu A - Sân phơi chính">Khu A - Sân phơi chính</option>
                <option value="Khu B - Nhà màng sấy">Khu B - Nhà màng sấy</option>
                <option value="Khu C - Bãi tạm dỡ hàng">Khu C - Bãi tạm dỡ hàng</option>
              </select>
            </div>
          </div>

          {/* Col 2: Weights and Scale readings */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cân Tổng cộng xe dừa (kg):</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 font-bold">KG</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cân Bì / Trọng lượng xe (kg):</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded p-1.5 text-xs font-mono font-bold focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 font-bold">KG</span>
              </div>
            </div>

            <div className="bg-gray-100 p-2 rounded border">
              <div className="text-[9px] text-gray-500 font-bold uppercase">Cân thực nhận (Khối lượng tịnh):</div>
              <div className="text-base font-black text-blue-900 font-mono mt-0.5">
                {netWeight.toLocaleString()} <span className="text-xs font-bold">kg</span>
              </div>
              <div className="text-[8px] text-gray-400 italic">bằng {grossWeight} kg - {tareWeight} kg</div>
            </div>
          </div>

          {/* Col 3: Deductions (Hao hụt chất lượng) */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Trừ tạp ẩm phơi phóng (kg):</label>
              <input
                type="number"
                value={moistureDeductionKg}
                onChange={(e) => setMoistureDeductionKg(Number(e.target.value))}
                className="w-full bg-red-50/50 border border-red-100 rounded p-1.5 text-xs font-mono font-bold focus:outline-none text-red-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Trừ nứt vỡ, lên mộng (kg):</label>
              <input
                type="number"
                value={qualityDeductionKg}
                onChange={(e) => setQualityDeductionKg(Number(e.target.value))}
                className="w-full bg-red-50/50 border border-red-100 rounded p-1.5 text-xs font-mono font-bold focus:outline-none text-red-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Khấu trừ chi phí phụ (đ):</label>
              <input
                type="number"
                value={otherDeductionVnd}
                onChange={(e) => setOtherDeductionVnd(Number(e.target.value))}
                placeholder="VD: phí chuyển, xăng dầu"
                className="w-full bg-red-50/50 border border-red-100 rounded p-1.5 text-xs font-mono font-bold focus:outline-none text-red-800"
              />
            </div>
          </div>

          {/* Col 4: Pricing and Debt decision */}
          <div className="space-y-3 bg-emerald-50/40 p-3 rounded border border-emerald-100">
            <div>
              <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Đơn giá dừa nguyên trái (VND/kg):</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full bg-white border border-emerald-200 rounded p-1.5 text-xs font-mono font-bold focus:outline-none text-emerald-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Hình thức thanh toán:</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-white border border-emerald-200 rounded p-1.5 text-xs focus:outline-none text-emerald-900 font-bold"
              >
                <option value="ghi_no">Ghi công nợ vựa (Trả sau)</option>
                <option value="da_thanh_toan">Thanh toán đủ ngay</option>
                <option value="thanh_toan_mot_phan">Trả trước một phần</option>
              </select>
            </div>

            {paymentStatus === 'thanh_toan_mot_phan' && (
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Số tiền thanh toán trước (VND):</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full bg-white border border-emerald-200 rounded p-1.5 text-xs font-mono font-bold"
                />
              </div>
            )}
          </div>
        </div>

        {/* Calculated Total Bar */}
        <div className="mt-4 bg-emerald-900 text-white p-3.5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex gap-4 flex-wrap text-center md:text-left">
            <div>
              <div className="text-[9px] text-emerald-200 font-medium uppercase">Khối lượng tính tiền thực tế:</div>
              <div className="text-xl font-black font-mono">
                {finalWeight.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
              <div className="text-[9px] text-emerald-200">đã trừ {moistureDeductionKg + qualityDeductionKg} kg</div>
            </div>

            <div className="border-r border-emerald-800 h-10 hidden md:block"></div>

            <div>
              <div className="text-[9px] text-emerald-200 font-medium uppercase">Tổng thành tiền phiếu mua dừa:</div>
              <div className="text-xl font-black font-mono text-yellow-300">
                {finalAmount.toLocaleString()} <span className="text-xs font-normal text-white">VND</span>
              </div>
              <div className="text-[9px] text-emerald-200">Đơn giá: {unitPrice.toLocaleString()} đ/kg</div>
            </div>

            <div className="border-r border-emerald-800 h-10 hidden md:block"></div>

            <div>
              <div className="text-[9px] text-emerald-200 font-medium uppercase">
                {paymentStatus === 'ghi_no' ? 'Ghi nợ mới vào tài khoản:' : paymentStatus === 'da_thanh_toan' ? 'Số tiền xuất quỹ ngay:' : 'Nợ còn lại dồn tích:'}
              </div>
              <div className="text-xl font-black font-mono text-amber-300">
                {(paymentStatus === 'ghi_no' ? finalAmount : paymentStatus === 'da_thanh_toan' ? 0 : Math.max(0, finalAmount - paidAmount)).toLocaleString()}{' '}
                <span className="text-xs font-normal text-white">VND</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canEdit}
            className={`w-full md:w-auto font-black px-6 py-2.5 rounded-lg text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all ${
              canEdit ? 'bg-yellow-400 hover:bg-yellow-500 text-emerald-950' : 'bg-gray-400 text-gray-100 cursor-not-allowed'
            }`}
          >
            <Scale size={14} />
            <span>Xác nhận Cân & Lưu Phiếu Mua</span>
          </button>
        </div>
      </form>

      {lastSavedPurchase && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print:grid-cols-1">
          <section className="bg-white rounded-lg shadow-sm border p-4 print:shadow-none">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-black">Phiếu nhập hàng</div>
                <h3 className="text-lg font-black text-gray-900">{lastSavedPurchase.lot.code}</h3>
                <p className="text-xs text-gray-500">Tạo từ phiếu cân {lastSavedPurchase.ticket.licensePlate}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={onOpenImportWarehouse}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-2 rounded"
                >
                  Lưu kho nhập hàng
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-black px-3 py-2 rounded"
                >
                  In phiếu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mt-3">
              <div>
                <div className="text-gray-500 font-bold">Người bán</div>
                <div className="font-black text-gray-900">{lastSavedPurchase.ticket.sellerName}</div>
              </div>
              <div>
                <div className="text-gray-500 font-bold">Ngày nhập</div>
                <div className="font-mono font-black">{lastSavedPurchase.ticket.date}</div>
              </div>
              <div>
                <div className="text-gray-500 font-bold">Cân tổng / cân bì</div>
                <div className="font-mono font-black">
                  {lastSavedPurchase.ticket.grossWeight.toLocaleString()} / {lastSavedPurchase.ticket.tareWeight.toLocaleString()} kg
                </div>
              </div>
              <div>
                <div className="text-gray-500 font-bold">Khối lượng tính tiền</div>
                <div className="font-mono font-black text-blue-800">{lastSavedPurchase.ticket.finalWeight.toLocaleString()} kg</div>
              </div>
              <div>
                <div className="text-gray-500 font-bold">Đơn giá</div>
                <div className="font-mono font-black">{lastSavedPurchase.ticket.unitPrice.toLocaleString()} đ/kg</div>
              </div>
              <div>
                <div className="text-gray-500 font-bold">Kho lưu</div>
                <div className="font-black">{lastSavedPurchase.lot.location}</div>
              </div>
            </div>

            {(lastSavedPurchase.ticket.scannedImage || lastSavedPurchase.ticket.qualityImage) && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {lastSavedPurchase.ticket.scannedImage && (
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">Ảnh phiếu cân AI</div>
                    <img src={lastSavedPurchase.ticket.scannedImage} alt="Ảnh phiếu cân" className="h-28 w-full object-cover rounded border" />
                  </div>
                )}
                {lastSavedPurchase.ticket.qualityImage && (
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">Ảnh mẫu dừa AI</div>
                    <img src={lastSavedPurchase.ticket.qualityImage} alt="Ảnh mẫu dừa" className="h-28 w-full object-cover rounded border" />
                  </div>
                )}
              </div>
            )}

            {lastSavedPurchase.ticket.aiExtractedText && (
              <div className="mt-3 bg-gray-50 border rounded p-2 text-[10px] text-gray-600 max-h-24 overflow-auto whitespace-pre-wrap">
                {lastSavedPurchase.ticket.aiExtractedText}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg shadow-sm border p-4 print:shadow-none">
            {(() => {
              const voucher = buildPaymentVoucher(lastSavedPurchase.ticket, lastSavedPurchase.lot.code);
              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-amber-700 font-black">Phiếu thanh toán</div>
                      <h3 className="text-lg font-black text-gray-900">{voucher.code}</h3>
                      <p className="text-xs text-gray-500">{voucher.paymentLabel}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={onOpenPayment}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-2 rounded"
                      >
                        Qua thanh toán
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-black px-3 py-2 rounded"
                      >
                        In thanh toán
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500 font-bold">Người nhận tiền</span>
                      <strong>{voucher.sellerName}</strong>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500 font-bold">Mã lô nhập</span>
                      <strong className="font-mono">{voucher.lotCode}</strong>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500 font-bold">Tổng tiền phải trả</span>
                      <strong className="font-mono">{voucher.payableAmount.toLocaleString()} đ</strong>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500 font-bold">Đã thanh toán</span>
                      <strong className="font-mono text-emerald-700">{voucher.paidAmount.toLocaleString()} đ</strong>
                    </div>
                    <div className="flex justify-between bg-red-50 border border-red-100 rounded p-3">
                      <span className="text-red-700 font-black">Còn ghi công nợ</span>
                      <strong className="font-mono text-red-700">{voucher.remainingAmount.toLocaleString()} đ</strong>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      )}

      {/* Purchase History Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-xs text-gray-700 uppercase flex items-center gap-1.5">
            <FileText size={14} className="text-gray-500" />
            <span>Nhật ký phiếu cân nông sản gần đây</span>
          </h3>
          <span className="text-[10px] text-gray-400 font-bold font-mono">Tổng: {tickets.length} lượt cân</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 text-gray-500 uppercase text-[9px] font-bold">
            <tr>
              <th className="px-3 py-2.5">Thời gian</th>
              <th className="px-3 py-2.5">Tên người bán</th>
              <th className="px-3 py-2.5">Biển số / Xe</th>
              <th className="px-3 py-2.5 text-right">Cân thực</th>
              <th className="px-3 py-2.5 text-right">Trừ bì/tạp</th>
              <th className="px-3 py-2.5 text-right">Khối lượng tính</th>
              <th className="px-3 py-2.5 text-right">Thành tiền</th>
              <th className="px-3 py-2.5">Trạng thái nợ</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/70 font-medium">
                <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{t.date}</td>
                <td className="px-3 py-2 font-bold text-gray-900">{t.sellerName}</td>
                <td className="px-3 py-2 font-mono text-blue-800 font-bold">{t.licensePlate}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">{(t.netWeight).toLocaleString()} kg</td>
                <td className="px-3 py-2 text-right font-mono text-red-600">
                  -{(t.deductions.moistureDeductionKg + t.deductions.qualityDeductionKg)} kg
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-emerald-800">{(t.finalWeight).toLocaleString()} kg</td>
                <td className="px-3 py-2 text-right font-mono font-black text-gray-900">{(t.finalAmount).toLocaleString()} đ</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-block ${
                    t.paymentStatus === 'da_thanh_toan'
                      ? 'bg-green-100 text-green-700'
                      : t.paymentStatus === 'ghi_no'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {t.paymentStatus === 'da_thanh_toan' ? 'Đã Trả Hết' : t.paymentStatus === 'ghi_no' ? 'Ghi Công Nợ' : 'Trả 1 Phần'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
