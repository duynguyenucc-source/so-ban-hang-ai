import React from 'react';
import { ContainerShipment, Lot, PurchaseTicket } from '../types';
import { getExportWarehouseRows, getImportWarehouseRows } from '../warehouse';
import { Archive, FileText, PackageCheck, Truck } from 'lucide-react';

interface WarehouseViewProps {
  mode: 'import' | 'export';
  lots: Lot[];
  tickets: PurchaseTicket[];
  shipments: ContainerShipment[];
  onOpenPayment: () => void;
  onCreateExport: () => void;
}

export default function WarehouseView({
  mode,
  lots,
  tickets,
  shipments,
  onOpenPayment,
  onCreateExport,
}: WarehouseViewProps) {
  const importRows = getImportWarehouseRows(lots, tickets);
  const exportRows = getExportWarehouseRows(shipments);

  if (mode === 'export') {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-800 rounded-lg p-2">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase text-gray-800">Kho xuất hàng</h2>
              <p className="text-xs text-gray-500">Theo dõi container, thành phẩm đã xuất và lợi nhuận dự kiến.</p>
            </div>
          </div>
          <button onClick={onCreateExport} className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-black px-4 py-2 rounded">
            Tạo chuyến xuất
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {exportRows.map(({ shipment, totalWeight, totalItems }) => (
            <div key={shipment.id} className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex justify-between gap-3 border-b pb-3">
                <div>
                  <div className="text-[10px] text-blue-700 font-black uppercase">Phiếu xuất kho</div>
                  <div className="font-black text-gray-900">{shipment.code}</div>
                  <div className="text-xs text-gray-500">{shipment.buyerName}</div>
                </div>
                <div className={`text-xs font-black ${shipment.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {shipment.estimatedProfit.toLocaleString()} đ
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 font-bold">Ngày xuất</div>
                  <div className="font-mono font-black">{shipment.exportDate}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 font-bold">Số mặt hàng</div>
                  <div className="font-mono font-black">{totalItems}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 font-bold">Tổng kg</div>
                  <div className="font-mono font-black">{totalWeight.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">{shipment.note}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-800 rounded-lg p-2">
            <Archive size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-gray-800">Kho nhập hàng</h2>
            <p className="text-xs text-gray-500">Phiếu nhập sau khi AI quét và lưu sẽ nằm ở đây, kèm ảnh và công nợ.</p>
          </div>
        </div>
        <button onClick={onOpenPayment} className="bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-black px-4 py-2 rounded">
          Qua thanh toán
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {importRows.map(({ lot, ticket, remainingPercent }) => (
          <div key={lot.id} className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex justify-between gap-3 border-b pb-3">
              <div>
                <div className="text-[10px] text-emerald-700 font-black uppercase">Phiếu nhập kho</div>
                <div className="font-black text-gray-900">{lot.code}</div>
                <div className="text-xs text-gray-500">{lot.sellerName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-bold">Tồn kho</div>
                <div className="font-mono font-black text-emerald-700">{lot.currentWeight.toLocaleString()} kg</div>
                <div className="text-[10px] text-gray-400">{remainingPercent}% còn lại</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500 font-bold">Ngày nhập</div>
                <div className="font-mono font-black">{lot.importDate}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500 font-bold">Tổng tiền</div>
                <div className="font-mono font-black">{lot.totalCost.toLocaleString()} đ</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500 font-bold">Trạng thái</div>
                <div className="font-black">{lot.status}</div>
              </div>
            </div>

            {ticket && (
              <div className="mt-3 rounded border bg-emerald-50/40 p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                  <FileText size={14} />
                  <span>Phiếu cân {ticket.licensePlate}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div>Thanh toán: <strong>{ticket.paidAmount.toLocaleString()} đ</strong></div>
                  <div>Còn nợ: <strong>{Math.max(0, ticket.finalAmount - ticket.paidAmount).toLocaleString()} đ</strong></div>
                </div>
                {(ticket.scannedImage || ticket.qualityImage) && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {ticket.scannedImage && <img src={ticket.scannedImage} alt="Phiếu cân" className="h-24 w-full object-cover rounded border bg-white" />}
                    {ticket.qualityImage && <img src={ticket.qualityImage} alt="Mẫu dừa" className="h-24 w-full object-cover rounded border bg-white" />}
                  </div>
                )}
              </div>
            )}

            <button onClick={onOpenPayment} className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-black px-3 py-2 rounded flex items-center justify-center gap-1.5">
              <PackageCheck size={14} />
              Qua phiếu thanh toán
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
