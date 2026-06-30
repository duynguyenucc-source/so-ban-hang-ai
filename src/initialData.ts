import { Seller, Buyer, Lot, PurchaseTicket, ProcessingRecord, ContainerShipment, DebtTransaction, AIAnomalyAlert } from './types';

export const initialSellers: Seller[] = [
  {
    id: 'seller-1',
    name: 'Nguyễn Văn Hùng (Ba Hùng)',
    phone: '0912345678',
    type: 'thuong_lai',
    address: 'Huyện Châu Thành, Bến Tre',
    totalSuppliedWeight: 45200,
    currentDebt: 124000000, // We owe him 124 million VND
  },
  {
    id: 'seller-2',
    name: 'Vườn dừa Tư Sang',
    phone: '0987654321',
    type: 'nha_vuon',
    address: 'Huyện Mỏ Cày Nam, Bến Tre',
    totalSuppliedWeight: 18500,
    currentDebt: -15000000, // We advanced 15 million VND to him
  },
  {
    id: 'seller-3',
    name: 'Hợp tác xã Dừa Tiểu Cần',
    phone: '0933445566',
    type: 'dai_ly',
    address: 'Huyện Tiểu Cần, Trà Vinh',
    totalSuppliedWeight: 89000,
    currentDebt: 58000000, // We owe them 58 million VND
  },
  {
    id: 'seller-4',
    name: 'Thương lái Chín Đợi',
    phone: '0944555666',
    type: 'thuong_lai',
    address: 'Huyện Càng Long, Trà Vinh',
    totalSuppliedWeight: 31200,
    currentDebt: 0,
  }
];

export const initialBuyers: Buyer[] = [
  {
    id: 'buyer-1',
    name: 'Công ty CP Xuất khẩu Nông sản Toàn Cầu',
    phone: '02838222333',
    companyName: 'Global Agri-Export Corp',
    address: 'Khu công nghiệp Giao Long, Bến Tre',
    totalPurchasedWeight: 152000,
    currentDebt: 340000000, // They owe us 340 million VND
  },
  {
    id: 'buyer-2',
    name: 'Doanh nghiệp Xơ dừa & Than hoạt tính Á Châu',
    phone: '02753822333',
    companyName: 'Asia Coir & Charcoal Co., Ltd',
    address: 'Huyện Giồng Trôm, Bến Tre',
    totalPurchasedWeight: 67000,
    currentDebt: 45000000, // They owe us 45 million VND
  }
];

export const initialLots: Lot[] = [
  {
    id: 'lot-1',
    code: 'LÔ-DUA-20260625-001',
    sourceSellerId: 'seller-1',
    sellerName: 'Nguyễn Văn Hùng (Ba Hùng)',
    importDate: '2026-06-25',
    initialWeight: 12500,
    currentWeight: 4000,
    unitPrice: 8500, // 8,500 VND/kg
    totalCost: 106250000,
    status: 'dang_che_bien',
    qualityGrade: 'loai_1',
    qualityNotes: ['Dừa khô đạt chuẩn', 'Trái to', 'Róc nước tốt'],
    location: 'Khu A - Sân phơi chính',
    processedWeight: 8500,
  },
  {
    id: 'lot-2',
    code: 'LÔ-DUA-20260626-002',
    sourceSellerId: 'seller-3',
    sellerName: 'Hợp tác xã Dừa Tiểu Cần',
    importDate: '2026-06-26',
    initialWeight: 18500,
    currentWeight: 18500,
    unitPrice: 8100,
    totalCost: 149850000,
    status: 'dang_phoi',
    qualityGrade: 'loai_2',
    qualityNotes: ['Độ ẩm hơi cao', 'Dừa rám vỏ sậm'],
    location: 'Khu B - Nhà màng sấy',
    processedWeight: 0,
  },
  {
    id: 'lot-3',
    code: 'LÔ-DUA-20260628-003',
    sourceSellerId: 'seller-2',
    sellerName: 'Vườn dừa Tư Sang',
    importDate: '2026-06-28',
    initialWeight: 5200,
    currentWeight: 0,
    unitPrice: 8300,
    totalCost: 43160000,
    status: 'da_hoan_thanh',
    qualityGrade: 'loai_1',
    qualityNotes: ['Cơm dầy', 'Đạt chuẩn hữu cơ'],
    location: 'Khu A - Sân phơi chính',
    processedWeight: 5200,
  },
  {
    id: 'lot-4',
    code: 'LÔ-DUA-20260630-004',
    sourceSellerId: 'seller-4',
    sellerName: 'Thương lái Chín Đợi',
    importDate: '2026-06-30',
    initialWeight: 7950,
    currentWeight: 7950,
    unitPrice: 7800,
    totalCost: 62010000,
    status: 'moi_nhap',
    qualityGrade: 'hon_hop',
    qualityNotes: ['Lẫn dừa non', 'Có dừa nứt 5%'],
    location: 'Khu C - Bãi tạm dỡ hàng',
    processedWeight: 0,
  }
];

export const initialTickets: PurchaseTicket[] = [
  {
    id: 'ticket-1',
    lotId: 'lot-1',
    sellerId: 'seller-1',
    sellerName: 'Nguyễn Văn Hùng (Ba Hùng)',
    date: '2026-06-25',
    licensePlate: '84C-125.84',
    grossWeight: 17000,
    tareWeight: 4500,
    netWeight: 12500,
    unitPrice: 8500,
    subtotal: 106250000,
    deductions: {
      moistureDeductionKg: 0,
      qualityDeductionKg: 0,
      otherDeductionVnd: 0
    },
    finalWeight: 12500,
    finalAmount: 106250000,
    paidAmount: 50000000,
    paymentStatus: 'thanh_toan_mot_phan',
    note: 'Thương lái Ba Hùng giao đợt dừa rất khô ngon, róc vỏ tốt.',
  },
  {
    id: 'ticket-2',
    lotId: 'lot-2',
    sellerId: 'seller-3',
    sellerName: 'Hợp tác xã Dừa Tiểu Cần',
    date: '2026-06-26',
    licensePlate: '83C-194.55',
    grossWeight: 24700,
    tareWeight: 6200,
    netWeight: 18500,
    unitPrice: 8100,
    subtotal: 149850000,
    deductions: {
      moistureDeductionKg: 0,
      qualityDeductionKg: 0,
      otherDeductionVnd: 0
    },
    finalWeight: 18500,
    finalAmount: 149850000,
    paidAmount: 149850000,
    paymentStatus: 'da_thanh_toan',
    note: 'Chuyển khoản thanh toán ngay từ quỹ Agribank.',
  },
  {
    id: 'ticket-3',
    lotId: 'lot-3',
    sellerId: 'seller-2',
    sellerName: 'Vườn dừa Tư Sang',
    date: '2026-06-28',
    licensePlate: '71H-082.15',
    grossWeight: 7300,
    tareWeight: 2100,
    netWeight: 5200,
    unitPrice: 8300,
    subtotal: 43160000,
    deductions: {
      moistureDeductionKg: 0,
      qualityDeductionKg: 0,
      otherDeductionVnd: 0
    },
    finalWeight: 5200,
    finalAmount: 43160000,
    paidAmount: 43160000,
    paymentStatus: 'da_thanh_toan',
    note: 'Đã trừ vào tiền ứng trước 15 triệu, phần còn lại thanh toán mặt.',
  },
  {
    id: 'ticket-4',
    lotId: 'lot-4',
    sellerId: 'seller-4',
    sellerName: 'Thương lái Chín Đợi',
    date: '2026-06-30',
    licensePlate: '84C-999.01',
    grossWeight: 12500,
    tareWeight: 4550,
    netWeight: 7950,
    unitPrice: 7800,
    subtotal: 62010000,
    deductions: {
      moistureDeductionKg: 100, // Trừ 100kg tạp ẩm
      qualityDeductionKg: 50,  // Trừ 50kg mọc mầm
      otherDeductionVnd: 500000 // Trừ tiền xăng xe hỗ trợ bãi
    },
    finalWeight: 7800, // 7950 - 150
    finalAmount: 60340000, // (7800 * 7800) - 500,000
    paidAmount: 0,
    paymentStatus: 'ghi_no',
    note: 'Dừa lẫn nhiều tạp chất ẩm, chủ vựa yêu cầu khấu trừ ngay trên phiếu cân.',
  }
];

export const initialProcessingRecords: ProcessingRecord[] = [
  {
    id: 'proc-1',
    lotId: 'lot-3',
    lotCode: 'LÔ-DUA-20260628-003',
    date: '2026-06-29',
    inputWeight: 5200,
    outputMeat: 1650, // 1.65 tons meat (31.7% recovery)
    outputShell: 1040, // 20% shell
    outputCoir: 1950, // 37.5% coir
    outputWaste: 180, // 3.4% waste
    lossWeight: 380, // 7.3% moisture loss
    recoveryRate: 31.7,
    lossRate: 7.3,
    laborCost: 3500000, // 3.5m labor cost for peeling & processing
    notes: 'Lô Tư Sang dừa khô già tốt, cơm dầy, mộng dừa rất ít nên đạt tỷ lệ thu hồi cơm dừa sấy khô cực kỳ cao.',
  },
  {
    id: 'proc-2',
    lotId: 'lot-1',
    lotCode: 'LÔ-DUA-20260625-001',
    date: '2026-06-27',
    inputWeight: 8500,
    outputMeat: 2420, // 28.4%
    outputShell: 1720,
    outputCoir: 3150,
    outputWaste: 650, // High waste due to nứt sọ mốc cơm
    lossWeight: 560, // 6.5% loss
    recoveryRate: 28.4,
    lossRate: 6.5,
    laborCost: 5200000,
    notes: 'Phát hiện mốc sọ khoảng 5% làm sụt giảm nhẹ tỷ lệ thu hồi cơm.',
  }
];

export const initialShipments: ContainerShipment[] = [
  {
    id: 'ship-1',
    code: 'CONT-MSKU-202606-001',
    buyerId: 'buyer-1',
    buyerName: 'Công ty CP Xuất khẩu Nông sản Toàn Cầu',
    exportDate: '2026-06-28',
    licensePlate: '51R-123.45 / Đầu kéo 51C-845.22',
    driverName: 'Trần Thanh Lâm',
    items: [
      { type: 'com_dua', weight: 4070, unitPrice: 38000, subtotal: 154660000 }, // 4,070 kg cơm dừa
      { type: 'gao_dua', weight: 2760, unitPrice: 6500, subtotal: 17940000 },  // 2,760 kg gáo dừa
    ],
    lotIds: ['lot-1', 'lot-3'],
    transportCost: 8500000,
    loadingCost: 3000000,
    otherCosts: 1500000,
    totalRevenue: 172600000,
    totalCostOfGoods: 114660000, // Proportional cost of raw coconut used
    estimatedProfit: 44940000, // 172.6M - 114.66M - 13M expenses
    paidAmount: 100000000,
    paymentStatus: 'thanh_toan_mot_phan',
    status: 'da_xuat',
    note: 'Đã bàn giao đầy đủ chứng thư kiểm dịch và phiếu cân phao tại cảng Cát Lái.',
  }
];

export const initialDebtTransactions: DebtTransaction[] = [
  {
    id: 'debt-tx-1',
    partyId: 'seller-1',
    partyName: 'Nguyễn Văn Hùng (Ba Hùng)',
    partyType: 'seller',
    date: '2026-06-25',
    type: 'thu_mua',
    amount: 106250000,
    balanceAfter: 106250000,
    note: 'Nhập lô dừa 12.5 tấn theo phiếu cân 84C-125.84',
  },
  {
    id: 'debt-tx-2',
    partyId: 'seller-1',
    partyName: 'Nguyễn Văn Hùng (Ba Hùng)',
    partyType: 'seller',
    date: '2026-06-25',
    type: 'thanh_toan',
    amount: 50000000,
    balanceAfter: 56250000,
    note: 'Chuyển khoản ứng phó Agribank cho thương lái Ba Hùng',
  },
  {
    id: 'debt-tx-3',
    partyId: 'buyer-1',
    partyName: 'Công ty CP Xuất khẩu Nông sản Toàn Cầu',
    partyType: 'buyer',
    date: '2026-06-28',
    type: 'xuat_hang',
    amount: 172600000,
    balanceAfter: 172600000,
    note: 'Xuất container CONT-MSKU-202606-001 (Cơm dừa sấy & Gáo dừa)',
  },
  {
    id: 'debt-tx-4',
    partyId: 'buyer-1',
    partyName: 'Công ty CP Xuất khẩu Nông sản Toàn Cầu',
    partyType: 'buyer',
    date: '2026-06-28',
    type: 'thanh_toan',
    amount: 100000000,
    balanceAfter: 72600000,
    note: 'Nhận tạm ứng trước 100 triệu thanh toán container',
  }
];

export const initialAlerts: AIAnomalyAlert[] = [
  {
    id: 'alert-1',
    type: 'loss',
    severity: 'high',
    title: 'Hao hụt sơ chế vượt ngưỡng',
    message: 'Lô hàng LÔ-DUA-20260625-001 (Ba Hùng) có tỉ lệ hao hụt sấy lột tách dừa thực tế đạt 6.5%, trong khi tỷ lệ dừa hư hỏng loại thải lên đến 7.6% (vượt mức trung bình vựa là 3.2%). Khuyên dùng: Rà soát kỹ khâu phân tách chất lượng đầu vào, tránh gom hàng non bị thối mốc.',
    targetId: 'lot-1',
    targetCode: 'LÔ-DUA-20260625-001',
    date: '2026-06-27',
    resolved: false
  },
  {
    id: 'alert-2',
    type: 'debt_risk',
    severity: 'medium',
    title: 'Dư nợ dồn tích thương lái lớn',
    message: 'Thương lái Ba Hùng hiện đang có số dư nợ vựa cần chi trả dồn tích 124,000,000 VND qua nhiều đợt giao dừa nguyên trái. Đã quá hạn 7 ngày chưa thực hiện đối soát tổng tiền mặt. Khuyên dùng: Liên hệ chốt sổ đối soát công nợ.',
    targetId: 'seller-1',
    targetCode: 'Nguyễn Văn Hùng (Ba Hùng)',
    date: '2026-06-30',
    resolved: false
  },
  {
    id: 'alert-3',
    type: 'price_deviation',
    severity: 'low',
    title: 'Độ lệch giá thu mua cao hơn mặt bằng',
    message: 'Lô hàng ngày 28/06 của Vườn Tư Sang thu mua với giá 8,300 VND/kg, cao hơn mức trung bình ngày tại địa bàn 300 VND/kg đối với dừa loại 1. AI xác định do dừa được cam kết chất lượng hữu cơ xuất khẩu, tỉ lệ cơm dầy đạt chuẩn 100%. Đã kiểm chứng an toàn.',
    targetId: 'lot-3',
    targetCode: 'LÔ-DUA-20260628-003',
    date: '2026-06-29',
    resolved: true
  }
];
