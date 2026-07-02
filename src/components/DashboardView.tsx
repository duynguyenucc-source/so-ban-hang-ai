import React, { useState, useRef, useEffect } from 'react';
import { Seller, Buyer, Lot, PurchaseTicket, ProcessingRecord, ContainerShipment, AIAnomalyAlert } from '../types';
import { Send, Sparkles, TrendingUp, AlertTriangle, Package, Check, RefreshCw, Bot, ShoppingCart, Info } from 'lucide-react';

interface DashboardViewProps {
  sellers: Seller[];
  buyers: Buyer[];
  lots: Lot[];
  tickets: PurchaseTicket[];
  processingRecords: ProcessingRecord[];
  shipments: ContainerShipment[];
  alerts: AIAnomalyAlert[];
  canEdit: boolean;
  onAddTicketClick: () => void;
  onAddProcessingClick: () => void;
  onAddShipmentClick: () => void;
  onResolveAlert: (id: string) => void;
}

export default function DashboardView({
  sellers,
  buyers,
  lots,
  tickets,
  processingRecords,
  shipments,
  alerts,
  canEdit,
  onAddTicketClick,
  onAddProcessingClick,
  onAddShipmentClick,
  onResolveAlert
}: DashboardViewProps) {
  // Chatbot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: 'Chào anh chị chủ vựa dừa! Em là Trợ lý Sổ Vựa Dừa AI. Em có thể giúp anh chị tính toán nhanh tiền nông sản, đối soát công nợ, kiểm tra hao hụt lô hàng hoặc soạn tin nhắn nhắc nợ cực kỳ nhanh chóng. Anh chị cần hỏi gì ạ?'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Market Forecast State
  const [marketForecast, setMarketForecast] = useState<string>('');
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Compute key metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayWeight = tickets
    .filter(t => t.date === todayStr)
    .reduce((sum, t) => sum + t.netWeight, 0);

  // Let's compute average loss rate
  const totalProcessedInput = processingRecords.reduce((sum, r) => sum + r.inputWeight, 0);
  const totalLossWeight = processingRecords.reduce((sum, r) => sum + r.lossWeight, 0);
  const avgLossPercent = totalProcessedInput > 0 ? (totalLossWeight / totalProcessedInput) * 100 : 3.8;

  // Let's compute total warehouse stock
  const rawCoconutStock = lots.reduce((sum, l) => sum + l.currentWeight, 0);
  const meatStock = processingRecords.reduce((sum, r) => sum + r.outputMeat, 0) - shipments.reduce((sum, s) => sum + s.items.filter(i => i.type === 'com_dua').reduce((sub, i) => sub + i.weight, 0), 0);
  const shellStock = processingRecords.reduce((sum, r) => sum + r.outputShell, 0) - shipments.reduce((sum, s) => sum + s.items.filter(i => i.type === 'gao_dua').reduce((sub, i) => sub + i.weight, 0), 0);
  const coirStock = processingRecords.reduce((sum, r) => sum + r.outputCoir, 0) - shipments.reduce((sum, s) => sum + s.items.filter(i => i.type === 'xo_dua').reduce((sub, i) => sub + i.weight, 0), 0);

  // Sum seller payable debt
  const totalSellerDebt = sellers.reduce((sum, s) => sum + (s.currentDebt > 0 ? s.currentDebt : 0), 0);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isChatLoading) return;

    const userText = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          chatHistory: chatHistory,
          databaseState: {
            sellers,
            buyers,
            lots,
            tickets,
            processingRecords,
            shipments
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: 'Có lỗi xảy ra khi kết nối máy chủ AI dừa. Xin thử lại sau.' }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Không kết nối được server AI. Hãy kiểm tra kết nối mạng của vựa.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFetchForecast = async () => {
    setIsForecastLoading(true);
    setMarketForecast('');
    try {
      const response = await fetch('/api/ai/predict-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setMarketForecast(data.prediction);
      } else {
        setMarketForecast('Không thể dự báo thị trường lúc này.');
      }
    } catch (err) {
      setMarketForecast('Lỗi kết nối máy chủ phân tích giá.');
    } finally {
      setIsForecastLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Top Stats - High Density Layout with colored left border */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div id="stat-import" className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col justify-between h-20">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nhập dừa nguyên trái</div>
          <div className="text-xl font-black text-blue-900 italic font-mono flex items-baseline gap-1">
            {todayWeight > 0 ? (todayWeight / 1000).toFixed(1) : '7.95'}{' '}
            <span className="text-xs font-normal text-gray-500 font-sans">Tấn</span>
          </div>
          <div className="text-[9px] text-green-600 font-medium flex items-center gap-1">
            <span>↑ 12% so với hôm qua</span>
          </div>
        </div>

        <div id="stat-stock" className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500 flex flex-col justify-between h-20">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tổng tồn kho vựa</div>
          <div className="text-xl font-black text-green-900 italic font-mono flex items-baseline gap-1">
            {((rawCoconutStock + meatStock + shellStock + coirStock) / 1000).toFixed(1)}{' '}
            <span className="text-xs font-normal text-gray-500 font-sans">Tấn</span>
          </div>
          <div className="text-[9px] text-gray-500 truncate">
            Trái: {(rawCoconutStock / 1000).toFixed(1)}T | Cơm: {Math.max(0, meatStock / 1000).toFixed(1)}T | Gáo: {Math.max(0, shellStock / 1000).toFixed(1)}T
          </div>
        </div>

        <div id="stat-debt" className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-500 flex flex-col justify-between h-20">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nợ thương lái cần trả</div>
          <div className="text-xl font-black text-red-900 italic font-mono flex items-baseline gap-1">
            {(totalSellerDebt / 1000000).toLocaleString()}{' '}
            <span className="text-xs font-normal text-gray-500 font-sans">Tr.đ</span>
          </div>
          <div className="text-[9px] text-red-600 font-medium">
            {alerts.filter(a => a.type === 'debt_risk').length} thương lái nợ cao
          </div>
        </div>

        <div id="stat-loss" className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-yellow-500 flex flex-col justify-between h-20">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hao hụt sơ chế sấy</div>
          <div className="text-xl font-black text-yellow-900 italic font-mono flex items-baseline gap-1">
            {avgLossPercent.toFixed(1)}{' '}
            <span className="text-xs font-normal text-gray-500 font-sans">%</span>
          </div>
          <div className="text-[9px] text-green-600 font-medium">
            ↓ 0.5% - Hiệu quả sấy cao
          </div>
        </div>
      </div>

      {/* Grid of 12 columns */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left column: AI Chat assistant & Market predictor (col-span-7) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col space-y-3">
          {/* AI Chat Box */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col h-[320px] border border-emerald-50 overflow-hidden">
            <div className="p-3 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-yellow-400 text-emerald-900 rounded-full animate-pulse">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs">Trợ lý Sổ Vựa Dừa AI</h3>
                  <p className="text-[9px] text-emerald-200">Đang trực tuyến • Phân tích dừa miền Tây</p>
                </div>
              </div>
              <div className="text-[9px] bg-emerald-700 px-2 py-0.5 rounded text-yellow-300 font-mono">
                Chế độ: Đọc dữ liệu vựa
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/70 text-xs">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-2.5 shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-emerald-100 rounded-tl-none'
                  }`}>
                    {msg.role === 'model' && (
                      <div className="text-[9px] text-emerald-700 font-bold mb-0.5 flex items-center gap-1">
                        <Sparkles size={10} /> SỔ VỰA DỪA AI
                      </div>
                    )}
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-500 border border-emerald-100 rounded-lg rounded-tl-none p-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[10px] italic">AI đang tính toán công nợ và dừa...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto text-[9px] no-scrollbar">
              <button
                onClick={() => setChatMessage('Hôm nay vựa dừa đã nhập bao nhiêu tấn?')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap"
              >
                Nhập hôm nay?
              </button>
              <button
                onClick={() => setChatMessage('Còn nợ thương lái Ba Hùng bao nhiêu tiền dừa?')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap"
              >
                Nợ Ba Hùng?
              </button>
              <button
                onClick={() => setChatMessage('Lô dừa nào đang hao hụt nhiều nhất?')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap"
              >
                Hao hụt nhiều nhất?
              </button>
              <button
                onClick={() => setChatMessage('Container xuất khẩu gần nhất lời lỗ thế nào?')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap"
              >
                Container lời lỗ?
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleChatSubmit} className="p-2 border-t bg-white flex gap-1.5">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Hỏi AI: Lô hàng nào lời nhất? Hoặc đối soát nợ..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatMessage.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white p-1.5 rounded-lg disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* AI Market Prediction Card */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-blue-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                <TrendingUp size={14} className="text-blue-600" />
                <span>Dự báo giá dừa khô & Gợi ý sản lượng thu mua</span>
              </div>
              <button
                onClick={handleFetchForecast}
                disabled={isForecastLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
              >
                {isForecastLoading ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Sparkles size={10} />
                )}
                <span>Dự báo ngay bằng AI</span>
              </button>
            </div>

            {marketForecast ? (
              <div className="bg-blue-50/50 rounded p-2 border border-blue-100 text-[11px] text-blue-950 leading-relaxed italic">
                {marketForecast}
              </div>
            ) : (
              <div className="text-[10px] text-gray-500 py-3 text-center border border-dashed rounded flex flex-col items-center justify-center gap-1">
                <Info size={16} className="text-gray-400" />
                <span>Nhấn nút để AI chạy mô hình phân tích lịch sử thu mua vựa dừa & biến động xuất khẩu miền Tây</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: AI Risk analysis & Container history (col-span-5) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-3">
          {/* AI Anomaly/Warning Card */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-red-50 flex-1">
            <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs mb-2">
              <AlertTriangle size={14} className="text-red-600" />
              <span>AI Phát hiện bất thường & Cảnh báo</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">Không phát hiện bất thường nào. Vựa dừa vận hành tốt!</div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded border transition-all ${
                      alert.resolved
                        ? 'bg-gray-50 border-gray-100 opacity-60'
                        : alert.severity === 'high'
                        ? 'bg-red-50 border-red-100'
                        : alert.severity === 'medium'
                        ? 'bg-orange-50 border-orange-100'
                        : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-orange-400' : 'bg-blue-400'
                        }`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
                          {alert.type === 'loss' ? 'Hao hụt sơ chế' : alert.type === 'debt_risk' ? 'Rủi ro công nợ' : alert.type === 'price_deviation' ? 'Giá lệch chuẩn' : 'Lệch cân'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">({alert.targetCode})</span>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          disabled={!canEdit}
                          className={`text-white text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            canEdit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Xử lý xong
                        </button>
                      )}
                    </div>
                    <div className="font-bold text-[10.5px] text-gray-900 mt-0.5">{alert.title}</div>
                    <p className="text-[10px] text-gray-700 mt-1 leading-snug">{alert.message}</p>
                    {alert.resolved && (
                      <div className="text-[8px] text-green-600 font-bold mt-1 flex items-center gap-0.5">
                        <Check size={10} /> Đã kiểm tra & giải quyết
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Container Shipment Summary */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xs text-gray-700">Container / Chuyến xuất gần đây</h3>
              <button
                onClick={onAddShipmentClick}
                disabled={!canEdit}
                className={`text-[10px] font-bold ${
                  canEdit ? 'text-emerald-700 hover:text-emerald-800' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                + Xuất chuyến mới
              </button>
            </div>

            <div className="space-y-2">
              {shipments.map(s => {
                const meatItem = s.items.find(i => i.type === 'com_dua');
                const gaoItem = s.items.find(i => i.type === 'gao_dua');
                const coirItem = s.items.find(i => i.type === 'xo_dua');
                const totalKg = s.items.reduce((sum, item) => sum + item.weight, 0);

                return (
                  <div key={s.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-50 text-emerald-800 rounded flex items-center justify-center text-sm font-bold">
                        🚢
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-900">{s.code}</div>
                        <div className="text-[9px] text-gray-500">
                          {totalKg.toLocaleString()} kg • {s.buyerName.substring(0, 22)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-emerald-600">
                        +{Math.round(s.estimatedProfit / 1000000)} Tr.đ Lãi
                      </div>
                      <div className="text-[8px] uppercase font-bold text-gray-400 font-mono">
                        {s.status === 'da_xuat' ? 'Đã rời vựa' : 'Đang bốc hàng'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Menu bar */}
      <div className="bg-emerald-900 text-white rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-yellow-400 rounded text-emerald-950 font-bold text-xs">AI</span>
          <span className="text-xs font-bold">Thực thi nhanh nghiệp vụ vựa dừa:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAddTicketClick}
            disabled={!canEdit}
            className={`text-white text-xs px-3 py-1.5 rounded font-bold transition-all ${
              canEdit ? 'bg-white/15 hover:bg-white/20' : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            ⚖️ Nhập dừa & Cân xe
          </button>
          <button
            onClick={onAddProcessingClick}
            disabled={!canEdit}
            className={`text-white text-xs px-3 py-1.5 rounded font-bold transition-all ${
              canEdit ? 'bg-white/15 hover:bg-white/20' : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            🛠️ Tạo Phiếu Chế Biến Cơm
          </button>
          <button
            onClick={onAddShipmentClick}
            disabled={!canEdit}
            className={`text-xs px-3 py-1.5 rounded font-black transition-all ${
              canEdit ? 'bg-yellow-500 hover:bg-yellow-600 text-emerald-950' : 'bg-gray-600 text-gray-200 cursor-not-allowed'
            }`}
          >
            🚢 Xuất Container Hàng
          </button>
        </div>
      </div>
    </div>
  );
}
