// ==========================================================================
// STATE MANAGEMENT & INITAL DATA CORES
// ==========================================================================
function showFloatingErrorBanner(msg, file = '', line = '') {
    const errDiv = document.createElement('div');
    errDiv.className = 'global-js-error-banner';
    errDiv.style.position = 'fixed';
    errDiv.style.bottom = '20px';
    errDiv.style.right = '20px';
    errDiv.style.backgroundColor = '#ff4d4f';
    errDiv.style.color = 'white';
    errDiv.style.padding = '16px';
    errDiv.style.borderRadius = '8px';
    errDiv.style.zIndex = '999999';
    errDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    errDiv.style.maxWidth = '350px';
    errDiv.innerHTML = `<strong>Lỗi JS:</strong> ${msg}${file ? `<br><small>${file}:${line}</small>` : ''}`;
    if (document.body) {
        document.body.appendChild(errDiv);
        setTimeout(() => errDiv.remove(), 10000);
    }
}
window.addEventListener('error', function(event) {
    showFloatingErrorBanner(event.message, event.filename, event.lineno);
});
window.addEventListener('unhandledrejection', function(event) {
    showFloatingErrorBanner("Rejection: " + (event.reason ? event.reason.message || event.reason : "Unknown reason"));
});
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    const msg = args.map(a => a && a.message ? a.message : String(a)).join(' ');
    showFloatingErrorBanner("Console Error: " + msg);
};
window.makeSearchableSelect = function(selectEl, placeholderText) {
    if (!selectEl || (selectEl.dataset && selectEl.dataset.searchable)) return;
    if (selectEl.dataset) selectEl.dataset.searchable = "true";
    
    // Hide original select
    selectEl.style.display = "none";
    
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "searchable-select-wrapper";
    
    // Create input search box
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "form-input searchable-select-input";
    searchInput.placeholder = placeholderText || "-- Gõ để tìm kiếm hoặc chọn --";
    searchInput.style.paddingRight = "30px";
    
    // Create dropdown arrow
    const arrow = document.createElement("div");
    arrow.className = "searchable-select-arrow";
    arrow.innerHTML = "&#9662;";
    
    // Create dropdown list container
    const dropdown = document.createElement("div");
    dropdown.className = "searchable-select-dropdown";
    
    wrapper.appendChild(searchInput);
    wrapper.appendChild(arrow);
    wrapper.appendChild(dropdown);
    
    // Insert wrapper in DOM
    if (selectEl.parentNode) {
        selectEl.parentNode.insertBefore(wrapper, selectEl);
    }
    
    // Synchronize function
    function updateDisplay() {
        const val = selectEl.value;
        const option = Array.from(selectEl.options || []).find(opt => opt.value === val);
        if (option && option.value !== "" && !option.text.startsWith("--")) {
            searchInput.value = option.text;
        } else {
            searchInput.value = "";
        }
    }
    
    // Intercept .value property set/get on select element instance
    const prototypeToUse = (typeof HTMLSelectElement !== "undefined" && HTMLSelectElement.prototype) ? HTMLSelectElement.prototype : Object.getPrototypeOf(selectEl);
    const originalValueProp = prototypeToUse ? Object.getOwnPropertyDescriptor(prototypeToUse, "value") : null;
    if (originalValueProp) {
        Object.defineProperty(selectEl, "value", {
            get: function() {
                return originalValueProp.get.call(this);
            },
            set: function(val) {
                originalValueProp.set.call(this, val);
                updateDisplay();
            },
            configurable: true
        });
    }
    
    // Populate items
    function populateDropdown() {
        dropdown.innerHTML = "";
        const query = searchInput.value.toLowerCase().trim();
        const options = Array.from(selectEl.options || []);
        
        let matchCount = 0;
        options.forEach(opt => {
            // Ignore empty default option like "-- Chọn khách hàng --"
            if (opt.value === "" && opt.text.startsWith("--")) return;
            
            const textLower = opt.text.toLowerCase();
            const valueLower = opt.value.toLowerCase();
            if (!query || textLower.includes(query) || valueLower.includes(query)) {
                matchCount++;
                const item = document.createElement("div");
                item.className = "searchable-select-item";
                item.textContent = opt.text;
                item.dataset.value = opt.value;
                
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectEl.value = opt.value;
                    selectEl.dispatchEvent(new Event("change"));
                    updateDisplay();
                    dropdown.style.display = "none";
                });
                
                dropdown.appendChild(item);
            }
        });
        
        if (matchCount === 0) {
            const noResult = document.createElement("div");
            noResult.className = "searchable-select-no-results";
            noResult.textContent = "Không tìm thấy kết quả";
            dropdown.appendChild(noResult);
        }
    }
    
    const openDropdown = (e) => {
        if (e) e.stopPropagation();
        searchInput.value = "";
        populateDropdown();
        dropdown.style.display = "block";
        
        const onBodyClick = (evt) => {
            if (!wrapper.contains(evt.target)) {
                updateDisplay();
                dropdown.style.display = "none";
                document.body.removeEventListener("click", onBodyClick);
            }
        };
        document.body.addEventListener("click", onBodyClick);
    };

    // Search input interactions
    searchInput.addEventListener("click", openDropdown);
    searchInput.addEventListener("focus", openDropdown);
    
    searchInput.addEventListener("input", () => {
        populateDropdown();
        dropdown.style.display = "block";
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const firstItem = dropdown.querySelector(".searchable-select-item");
            if (firstItem && dropdown.style.display === "block") {
                firstItem.click();
            }
        } else if (e.key === "Escape") {
            dropdown.style.display = "none";
            updateDisplay();
        }
    });
    
    // Watch for DOM changes to child options (e.g. repopulation)
    if (typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(() => {
            updateDisplay();
        });
        observer.observe(selectEl, { childList: true, subtree: true });
    }
    
    // Initial display sync
    updateDisplay();
};

window.syncOrderPaymentStatus = function(orderId) {
    const order = state.online_orders.find(o => o.id === orderId);
    const stdOrder = state.orders.find(o => o.id === orderId);
    if (!order && !stdOrder) return;
    
    const totalAmount = order ? order.total_amount : (stdOrder ? stdOrder.total_amount : 0);
    const receipts = state.transactions.filter(t => t.reference_id === orderId && t.type === 'RECEIPT');
    const totalPaid = receipts.reduce((sum, t) => sum + t.amount, 0);
    
    let paymentStatus = "UNPAID";
    if (totalPaid >= totalAmount && totalAmount > 0) {
        paymentStatus = "PAID";
    } else if (totalPaid > 0) {
        paymentStatus = "PARTIALLY_PAID";
    }
    
    // Preserve DRAFT status
    if (order && order.payment_status === "DRAFT") {
        return;
    }
    
    let changed = false;
    if (order && order.payment_status !== paymentStatus) {
        order.payment_status = paymentStatus;
        changed = true;
    }
    if (stdOrder && (stdOrder.payment_status !== paymentStatus || stdOrder.deposit !== totalPaid)) {
        stdOrder.payment_status = paymentStatus;
        stdOrder.deposit = totalPaid;
        changed = true;
    }
    
    if (changed) {
        if (order) state.updateState("online_orders", state.online_orders);
        state.updateState("orders", state.orders);
    }
};

window.resetOnlineSalesDatabaseToDefault = function() {
    if (confirm("Bạn có chắc chắn muốn khôi phục toàn bộ dữ liệu Bán hàng online và Kho hàng về trạng thái mặc định của hệ thống? Tất cả đơn hàng online đã tạo sẽ bị xóa.")) {
        localStorage.removeItem("ihp_online_products");
        localStorage.removeItem("ihp_online_orders");
        localStorage.removeItem("ihp_online_stock_logs");
        localStorage.removeItem("ihp_online_returns");
        localStorage.removeItem("ihp_online_inventory_checks");
        localStorage.removeItem("ihp_online_internal_exits");
        localStorage.removeItem("ihp_excel_seeded_v1");
        location.reload();
    }
};
window.resetAllDatabaseToDefault = function() {
    if (confirm("Cảnh báo: Hành động này sẽ xóa sạch toàn bộ dữ liệu hiện tại trong trình duyệt (bao gồm CRM, Báo giá, Đơn sản xuất, Thu chi, Kho hàng,...) và khôi phục về dữ liệu mẫu ban đầu. Bạn có chắc chắn muốn tiếp tục?")) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith("ihp_")) {
                localStorage.removeItem(key);
            }
        }
        location.reload();
    }
};
const DEFAULT_PARTNERS = [
    { id: "p1", code: "KH-001", name: "Nguyễn Văn Hải (Minh Trí Co)", phone: "0901234567", email: "hai.nguyen@minhtri.com", role: "CUSTOMER", credit_limit: 50000000, status: true },
    { id: "p2", code: "KH-002", name: "Trần Thị Thu (An Phát Food)", phone: "0918765432", email: "thu.tran@anphat.vn", role: "CUSTOMER", credit_limit: 100000000, status: true },
    { id: "p3", code: "NCC-001", name: "Giấy Vĩnh Thịnh", phone: "02838999999", email: "sales@vinhthinhpaper.com.vn", role: "SUPPLIER", credit_limit: 200000000, status: true },
    { id: "p4", code: "NCC-002", name: "Mực in Kim Đô", phone: "0909998877", email: "kimdoink@gmail.com", role: "SUPPLIER", credit_limit: 50000000, status: true },
    { id: "p5", code: "TC-001", name: "Gia công sau in Trường Hải", phone: "0988776655", email: "giacongtruonghai@gmail.com", role: "SUBCONTRACTOR", credit_limit: 150000000, status: true },
    { id: "p6", code: "TC-002", name: "Thi công Quảng cáo Đông Á", phone: "0977665544", email: "quangcaodonga@gmail.com", role: "SUBCONTRACTOR", credit_limit: 100000000, status: true }
];

const DEFAULT_MATERIALS = [
    { sku: "GI-COUCHE-150-A3", name: "Giấy Couche 150gsm khổ A3", category: "PAPER", unit: "Tờ", stock_qty: 12000, min_stock_qty: 2000, avg_cost: 1200 },
    { sku: "GI-COUCHE-300-A3", name: "Giấy Couche 300gsm khổ A3", category: "PAPER", unit: "Tờ", stock_qty: 850, min_stock_qty: 1000, avg_cost: 2500 }, // Under Stock
    { sku: "GI-DUPLEX-250-A3", name: "Giấy Duplex 250gsm khổ A3", category: "PAPER", unit: "Tờ", stock_qty: 3400, min_stock_qty: 500, avg_cost: 3200 },
    { sku: "GI-DECAL-NHUA-A3", name: "Giấy Decal nhựa sữa khổ A3", category: "PAPER", unit: "Tờ", stock_qty: 1800, min_stock_qty: 300, avg_cost: 5500 },
    { sku: "MK-BLACK-OFFSET", name: "Mực in Offset Đen", category: "INK", unit: "Kg", stock_qty: 120, min_stock_qty: 20, avg_cost: 85000 },
    { sku: "MK-RED-OFFSET", name: "Mực in Offset Đỏ", category: "INK", unit: "Kg", stock_qty: 12, min_stock_qty: 15, avg_cost: 92000 }, // Under Stock
    { sku: "FM-MATT-GLOSS", name: "Cuộn màng mờ bảo vệ 390mm", category: "FILM", unit: "Cuộn", stock_qty: 15, min_stock_qty: 3, avg_cost: 480000 }
];

const DEFAULT_ORDERS = [
    { id: "o1", order_number: "SO-202606-0001", customer_id: "p1", width_mm: 210, length_mm: 297, quantity: 2000, paper_type: "couche150", print_spec: "In offset 4 màu, in 2 mặt", post_processing: ["Cán màng mờ 2 mặt"], subtotal: 6200000, discount: 200000, vat_rate: 8, total_amount: 6480000, deposit: 3000000, payment_status: "PARTIALLY_PAID", status: "IN_PRODUCTION", created_at: "2026-06-12T09:00:00Z", delivery_date: "2026-06-16", salesperson: "Đại Hùng", commission_rate: 5, commission_amount: 324000 },
    { id: "o2", order_number: "SO-202606-0002", customer_id: "p2", width_mm: 100, length_mm: 150, quantity: 5000, paper_type: "decal", print_spec: "In kỹ thuật số decal sữa", post_processing: ["Bế răng cưa"], subtotal: 9250000, discount: 0, vat_rate: 8, total_amount: 9990000, deposit: 9990000, payment_status: "PAID", status: "IN_PRODUCTION", created_at: "2026-06-13T14:30:00Z", delivery_date: "2026-06-15", salesperson: "Thế Phương", commission_rate: 5, commission_amount: 499500 },
    { id: "o3", order_number: "SO-202606-0003", customer_id: "p1", width_mm: 200, length_mm: 200, quantity: 1000, paper_type: "couche300", print_spec: "In offset catalogue bìa", post_processing: ["Phủ UV định hình cao cấp"], subtotal: 4400000, discount: 0, vat_rate: 8, total_amount: 4752000, deposit: 2000000, payment_status: "PARTIALLY_PAID", status: "DRAFT", created_at: "2026-06-14T08:15:00Z", delivery_date: "2026-06-18", salesperson: "Văn Minh", commission_rate: 10, commission_amount: 475200 }
];

const DEFAULT_PRODUCTIONS = [
    { id: "pr1", production_number: "PO-202606-0001", sales_order_id: "o1", start_date: "2026-06-12T10:00:00Z", due_date: "2026-06-16T17:00:00Z", input_qty: 2100, target_qty: 2000, status: "PRINTING", current_stage: "PRINTING", operator_id: "Đại Hùng" },
    { id: "pr2", production_number: "PO-202606-0002", sales_order_id: "o2", start_date: "2026-06-13T15:00:00Z", due_date: "2026-06-15T12:00:00Z", input_qty: 5150, target_qty: 5000, status: "PROCESSING", current_stage: "PROCESSING", operator_id: "Thế Phương" }
];

const DEFAULT_SUBCONTRACTS = [
    { id: "sc1", contract_number: "SC-202606-0001", subcontractor_id: "p5", sales_order_id: "o1", work_detail: "Cán màng mờ bảo vệ 2 mặt toàn bộ lô catalog", cost: 1200000, deadline: "2026-06-15", progress: 60, status: "PROCESSING", payment_status: "UNPAID" }
];

const DEFAULT_TRANSACTIONS = [
    { id: "t1", tx_number: "PT-202606-0001", created_at: "2026-06-12T09:10:00Z", type: "RECEIPT", category: "CUSTOMER_DEPOSIT", amount: 3000000, payment_method: "BANK_TRANSFER", account_source: "VCB", partner_id: "p1", reference_id: "o1", created_by: "Kế toán Lan" },
    { id: "t2", tx_number: "PT-202606-0002", created_at: "2026-06-13T14:35:00Z", type: "RECEIPT", category: "CUSTOMER_FINAL", amount: 9990000, payment_method: "BANK_TRANSFER", account_source: "VCB", partner_id: "p2", reference_id: "o2", created_by: "Kế toán Lan" },
    { id: "t3", tx_number: "PC-202606-0001", created_at: "2026-06-14T10:00:00Z", type: "PAYMENT", category: "SUPPLIER_PAY", amount: 15000000, payment_method: "BANK_TRANSFER", account_source: "VCB", partner_id: "p3", reference_id: null, created_by: "Thủ quỹ Nam" }
];

const DEFAULT_RESTOCKS = [
    { id: "r1", created_at: "2026-06-13T10:00:00Z", supplier_id: "p3", sku: "GI-COUCHE-150-A3", qty: 20000, cost: 1250, total_amount: 25000000 },
    { id: "r2", created_at: "2026-06-14T09:00:00Z", supplier_id: "p4", sku: "MK-BLACK-OFFSET", qty: 100, cost: 85000, total_amount: 8500000 }
];

const DEFAULT_CONTRACTS = [
    { id: "ct1", contract_number: "HĐ-202606-0001", partner_id: "p1", order_type: "PRODUCTION", order_id: "o1", signing_date: "2026-06-12", value: 6480000, status: "ACTIVE", details: "Hợp đồng in offset brochure quảng cáo 2000 bộ" },
    { id: "ct2", contract_number: "HĐ-202606-0002", partner_id: "p2", order_type: "PRODUCTION", order_id: "o2", signing_date: "2026-06-13", value: 9990000, status: "LIQUIDATED", details: "Hợp đồng sản xuất tem nhãn decal sữa" }
];

const DEFAULT_SALESPERSONS = [
    { 
        id: "s1", code: "SALES-001", name: "Đại Hùng", role: "SALESPERSON", phone: "0988776655", email: "hung.sales@inlachong.com", commission_rate: 5, referral_code: "hungdh", referral_link: "https://inlachongjsc.web.app/?ref=hungdh", status: true,
        title: "Trưởng phòng", department: "Kinh doanh", branch: "Hà Nội", birthday: "1995-05-15", address: "Cầu Giấy, Hà Nội", zalo: "0988776655", facebook: "facebook.com/daihung.vcb",
        work_history: [
            { id: "h1", date: "2025-01-02", contract_type: "Thử việc", title: "Nhân viên", department: "Kinh doanh", branch: "Hà Nội", note: "Nhận việc thử việc nhân viên kinh doanh" },
            { id: "h2", date: "2025-03-02", contract_type: "Chính thức", title: "Nhân viên", department: "Kinh doanh", branch: "Hà Nội", note: "Ký hợp đồng chính thức" },
            { id: "h3", date: "2026-01-02", contract_type: "Chính thức", title: "Trưởng phòng", department: "Kinh doanh", branch: "Hà Nội", note: "Quyết định bổ nhiệm lên Trưởng phòng Kinh doanh" }
        ]
    },
    { 
        id: "s2", code: "SALES-002", name: "Thế Phương", role: "SALESPERSON", phone: "0977665544", email: "phuong.sales@inlachong.com", commission_rate: 5, referral_code: "phuongtp", referral_link: "https://inlachongjsc.web.app/?ref=phuongtp", status: true,
        title: "Nhân viên", department: "Kinh doanh", branch: "Hà Nội", birthday: "1997-09-20", address: "Thanh Xuân, Hà Nội", zalo: "0977665544", facebook: "facebook.com/thephuong.ihp",
        work_history: [
            { id: "p1", date: "2026-03-01", contract_type: "Chính thức", title: "Nhân viên", department: "Kinh doanh", branch: "Hà Nội", note: "Tuyển dụng mới vị trí nhân viên chính thức" }
        ]
    },
    { 
        id: "s3", code: "CTV-001", name: "Văn Minh", role: "COLLABORATOR", phone: "0966554433", email: "minh.ctv@gmail.com", commission_rate: 10, referral_code: "minhctv", referral_link: "https://inlachongjsc.web.app/?ref=minhctv", status: true,
        title: "Cộng tác viên", department: "Kinh doanh", branch: "Hồ Chí Minh", birthday: "1994-02-10", address: "Quận 1, TP. Hồ Chí Minh", zalo: "0966554433", facebook: "facebook.com/vanminh.ctv",
        work_history: [
            { id: "m1", date: "2026-05-01", contract_type: "CTV", title: "Cộng tác viên", department: "Kinh doanh", branch: "Hồ Chí Minh", note: "Bắt đầu làm CTV thị trường phía Nam" }
        ]
    }
];

const DEFAULT_LABOR_CONTRACTS = [
    { id: "lc1", employee_id: "s1", contract_number: "HĐLĐ-2026-0001", sign_date: "2026-01-02", start_date: "2026-01-02", end_date: "2027-01-02", base_salary: 12000000, contract_type: "Xác định thời hạn", status: "ACTIVE" },
    { id: "lc2", employee_id: "s2", contract_number: "HĐLĐ-2026-0002", sign_date: "2026-03-01", start_date: "2026-03-01", end_date: "", base_salary: 15000000, contract_type: "Không xác định thời hạn", status: "ACTIVE" }
];

const DEFAULT_CRM_NOTES = [
    { id: "n1", partner_id: "p1", created_at: "2026-06-12T09:15:00Z", created_by: "Quản lý Hùng", content: "Khách gọi xác nhận đặt cọc 3.000.000đ cho đơn hàng SO-202606-0001. Yêu cầu giao kẽm in offset sớm." },
    { id: "n2", partner_id: "p1", created_at: "2026-06-13T10:00:00Z", created_by: "Quản lý Hùng", content: "Đã liên hệ báo khách đơn hàng catalogue đang chạy cán màng mờ tại bên Trường Hải, tiến độ tốt." },
    { id: "n3", partner_id: "p2", created_at: "2026-06-13T14:40:00Z", created_by: "Kế toán Lan", content: "Khách hàng An Phát Food đã chuyển khoản thanh toán 100% đơn hàng SO-202606-0002. Cần xuất hóa đơn điện tử VAT gửi qua email." }
];

const DEFAULT_CONVERSATIONS = [
    { id: "c1", partner_id: "p1", channel: "ZALO", unread: true, last_message: "Chào Hùng, đơn catalogue 2000 quyển in xong chưa?", last_time: "2026-06-14T14:30:00Z" },
    { id: "c2", partner_id: "p2", channel: "FACEBOOK", unread: false, last_message: "Đã nhận đủ hàng rồi nhé, chất lượng bế hộp rất đẹp cảm ơn xưởng!", last_time: "2026-06-13T17:00:00Z" },
    { id: "c3", partner_id: "p5", channel: "TELEGRAM", unread: false, last_message: "Bên mình đã cán màng xong 60% lô hàng rồi, mai bàn giao nhé.", last_time: "2026-06-14T08:00:00Z" },
    { id: "c4", partner_id: "p1", channel: "EMAIL", unread: false, last_message: "Báo giá in banner quảng cáo kích thước 1x3m, chất liệu bạt hiflex.", last_time: "2026-06-14T09:15:00Z" },
    { id: "c5", partner_id: "p2", channel: "LIVECHAT", unread: true, last_message: "Alo xưởng ơi, cho mình hỏi giá in decal dán kính lẻ mét vuông bao nhiêu?", last_time: "2026-06-14T15:20:00Z" }
];

const DEFAULT_MESSAGES = [
    // Conversation 1 (Zalo with Nguyễn Văn Hải)
    { id: "m1_1", conversation_id: "c1", sender: "CUSTOMER", content: "Chào xưởng, mình muốn hỏi tiến độ đơn catalogue 2000 quyển mã SO-202606-0001", timestamp: "2026-06-14T14:25:00Z" },
    { id: "m1_2", conversation_id: "c1", sender: "AGENT", content: "Dạ em chào anh Hải, đơn hàng của anh đã in offset xong và đang chuyển sang khâu gia công cán màng mờ bảo vệ rồi ạ.", timestamp: "2026-06-14T14:28:00Z" },
    { id: "m1_3", conversation_id: "c1", sender: "CUSTOMER", content: "Chào Hùng, đơn catalogue 2000 quyển in xong chưa?", timestamp: "2026-06-14T14:30:00Z" },

    // Conversation 2 (FB with Trần Thị Thu)
    { id: "m2_1", conversation_id: "c2", sender: "AGENT", content: "Chào chị Thu, xưởng đã cho xe chuyển toàn bộ hộp duplex thành phẩm qua kho chị rồi ạ.", timestamp: "2026-06-13T16:45:00Z" },
    { id: "m2_2", conversation_id: "c2", sender: "CUSTOMER", content: "Đã nhận đủ hàng rồi nhé, chất lượng bế hộp rất đẹp cảm ơn xưởng!", timestamp: "2026-06-13T17:00:00Z" },

    // Conversation 3 (Telegram with Trường Hải)
    { id: "m3_1", conversation_id: "c3", sender: "AGENT", content: "Alo Trường Hải ơi, kẽm in và decal bên mình gửi qua chiều qua đã cán màng chưa?", timestamp: "2026-06-14T07:45:00Z" },
    { id: "m3_2", conversation_id: "c3", sender: "CUSTOMER", content: "Bên mình đã cán màng xong 60% lô hàng rồi, mai bàn giao nhé.", timestamp: "2026-06-14T08:00:00Z" }
];

const DEFAULT_ONLINE_PRODUCTS = [
    {
        "sku": "TD09C",
        "name": "Hộp TD09C",
        "unit": "Cái",
        "price": 58333,
        "wholesale_price": 46666,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870001"
    },
    {
        "sku": "TD11B",
        "name": "Hộp TD11B",
        "unit": "Cái",
        "price": 69444,
        "wholesale_price": 55555,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870002"
    },
    {
        "sku": "LHS02",
        "name": "Hộp Cao Cấp LH_S_02",
        "unit": "Cái",
        "price": 140000,
        "wholesale_price": 112000,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870003"
    },
    {
        "sku": "LH01B",
        "name": "Hộp LH01B - 36x36x10cm",
        "unit": "Cái",
        "price": 68000,
        "wholesale_price": 54400,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870004"
    },
    {
        "sku": "TD10B",
        "name": "Hộp TD10B",
        "unit": "Cái",
        "price": 69444,
        "wholesale_price": 55555,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870005"
    },
    {
        "sku": "TD10A",
        "name": "Hộp TD10A",
        "unit": "Cái",
        "price": 74074,
        "wholesale_price": 59259,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870006"
    },
    {
        "sku": "LH02B",
        "name": "Hộp LH02B",
        "unit": "Cái",
        "price": 69444,
        "wholesale_price": 55555,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870007"
    },
    {
        "sku": "EpNhu",
        "name": "Ép Nhũ",
        "unit": "Cái",
        "price": 13888,
        "wholesale_price": 11111,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870008"
    },
    {
        "sku": "TD11A",
        "name": "Hộp TD11A",
        "unit": "Cái",
        "price": 62037,
        "wholesale_price": 49629,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870009"
    },
    {
        "sku": "LH02A",
        "name": "Hộp LH02A",
        "unit": "Cái",
        "price": 62037,
        "wholesale_price": 49629,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870010"
    },
    {
        "sku": "TD14B",
        "name": "Hộp TD14B",
        "unit": "Cái",
        "price": 69444,
        "wholesale_price": 55555,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870011"
    },
    {
        "sku": "TDG01",
        "name": "Hộp Cao Cấp TD_G_01",
        "unit": "Cái",
        "price": 115740,
        "wholesale_price": 92592,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870012"
    },
    {
        "sku": "TD03C",
        "name": "Hộp TD03C",
        "unit": "Cái",
        "price": 55555,
        "wholesale_price": 44444,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870013"
    },
    {
        "sku": "TD02A",
        "name": "Hộp TD02A",
        "unit": "Cái",
        "price": 62037,
        "wholesale_price": 49629,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870014"
    },
    {
        "sku": "TDG02",
        "name": "Hộp Cao Cấp TD_G_02",
        "unit": "Cái",
        "price": 138888,
        "wholesale_price": 111111,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870015"
    },
    {
        "sku": "TDG05D",
        "name": "Hộp Cao Cấp TD_G_05 Đỏ",
        "unit": "Cái",
        "price": 138888,
        "wholesale_price": 111111,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870016"
    },
    {
        "sku": "KhayB",
        "name": "Khay Size B 36x36",
        "unit": "Cái",
        "price": 9259,
        "wholesale_price": 7407,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870017"
    },
    {
        "sku": "G03X",
        "name": "Hộp Cao Cấp TD_G_03 Xanh",
        "unit": "Cái",
        "price": 115740,
        "wholesale_price": 92592,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870018"
    },
    {
        "sku": "TD07A",
        "name": "Hộp TD07A",
        "unit": "Cái",
        "price": 62037,
        "wholesale_price": 49629,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870019"
    },
    {
        "sku": "TD14C",
        "name": "Hộp TD14C",
        "unit": "Cái",
        "price": 55555,
        "wholesale_price": 44444,
        "stock_qty": 100,
        "min_stock_qty": 10,
        "barcode": "893609870020"
    }
];

const DEFAULT_PRICING_CONFIG = {
    production_brackets: [500, 1000, 2000, 5000, 10000],
    production_markup: 1.30,
    production_plate_cost: 150000,
    production_markup_ranges: [
        { min_qty: 0, max_qty: 500, markup: 1.40 },
        { min_qty: 501, max_qty: 1000, markup: 1.35 },
        { min_qty: 1001, max_qty: 5000, markup: 1.30 },
        { min_qty: 5001, max_qty: null, markup: 1.25 }
    ],
    production_discount_tiers: [
        { min_qty: 1000, discount_percent: 2 },
        { min_qty: 5000, discount_percent: 5 },
        { min_qty: 10000, discount_percent: 8 }
    ],
    online_discount_tiers: [
        { min_qty: 50, discount_percent: 5 },
        { min_qty: 100, discount_percent: 10 },
        { min_qty: 500, discount_percent: 15 }
    ]
};

const DEFAULT_ONLINE_STOCK_LOGS = [
    { id: "log-1", created_at: "2026-06-20T10:00:00Z", sku: "SP-001", type: "IMPORT", qty: 500, note: "Nhập kho ban đầu" },
    { id: "log-2", created_at: "2026-06-20T10:15:00Z", sku: "SP-002", type: "IMPORT", qty: 2000, note: "Nhập kho ban đầu" },
    { id: "log-3", created_at: "2026-06-20T10:30:00Z", sku: "SP-003", type: "IMPORT", qty: 1200, note: "Nhập kho ban đầu" }
];

const DEFAULT_ONLINE_ORDERS = [
    { id: "oo1", order_number: "SO-ON-202606-0001", customer_id: "p1", items: [{ sku: "SP-001", qty: 20, price: 15000 }], subtotal: 300000, discount: 0, vat_rate: 8, total_amount: 324000, payment_status: "PAID", created_at: "2026-06-21T09:00:00Z", has_production: false }
];

// Initial State Store
class AppState {
    constructor() {
        this.partners = this.load("partners", DEFAULT_PARTNERS);
        this.materials = this.load("materials", DEFAULT_MATERIALS);
        this.orders = this.load("orders", DEFAULT_ORDERS);
        this.productions = this.load("productions", DEFAULT_PRODUCTIONS);
        this.subcontracts = this.load("subcontracts", DEFAULT_SUBCONTRACTS);
        
        this.online_products = this.load("online_products", DEFAULT_ONLINE_PRODUCTS);
        // Force seed Excel products for existing localstorage
        if (!localStorage.getItem("ihp_excel_seeded_v1")) {
            this.online_products = DEFAULT_ONLINE_PRODUCTS;
            this.save("online_products", DEFAULT_ONLINE_PRODUCTS);
            localStorage.setItem("ihp_excel_seeded_v1", "true");
        }

        this.online_stock_logs = this.load("online_stock_logs", DEFAULT_ONLINE_STOCK_LOGS);
        this.online_orders = this.load("online_orders", DEFAULT_ONLINE_ORDERS);
        this.online_returns = this.load("online_returns", []);
        this.online_inventory_checks = this.load("online_inventory_checks", []);
        this.online_internal_exits = this.load("online_internal_exits", []);
        this.transactions = this.load("transactions", DEFAULT_TRANSACTIONS);
        this.crm_notes = this.load("crm_notes", DEFAULT_CRM_NOTES);
        this.conversations = this.load("conversations", DEFAULT_CONVERSATIONS);
        this.messages = this.load("messages", DEFAULT_MESSAGES);
        this.restocks = this.load("restocks", DEFAULT_RESTOCKS);
        this.contracts = this.load("contracts", DEFAULT_CONTRACTS);
        this.salespersons = this.load("salespersons", DEFAULT_SALESPERSONS);
        this.labor_contracts = this.load("labor_contracts", DEFAULT_LABOR_CONTRACTS);
        this.warehouse_transactions = this.load("warehouse_transactions", []);
        this.warehouse_audits = this.load("warehouse_audits", []);
        this.users = this.load("users", []);
        this.departments = this.load("departments", []);
        this.pricing_config = this.load("pricing_config", DEFAULT_PRICING_CONFIG);
        this._lastLocalUpdate = {};

        // Data sanitization to prevent crashes on malformed localstorage
        if (Array.isArray(this.online_products)) {
            this.online_products = this.online_products.map(p => {
                if (p) {
                    p.stock_qty = typeof p.stock_qty === 'number' ? p.stock_qty : 0;
                    p.min_stock_qty = typeof p.min_stock_qty === 'number' ? p.min_stock_qty : 10;
                    p.price = typeof p.price === 'number' ? p.price : 0;
                    p.wholesale_price = typeof p.wholesale_price === 'number' ? p.wholesale_price : 0;
                    
                    // Auto configure 6 ranges and 2 discounts if missing
                    if (!p.wholesale_qty_prices || p.wholesale_qty_prices.length === 0) {
                        const basePrice = p.price || 0;
                        p.wholesale_qty_prices = [
                            { min_qty: 1, max_qty: 99, price: Math.round(basePrice) },
                            { min_qty: 100, max_qty: 499, price: Math.round(basePrice * 0.95) },
                            { min_qty: 500, max_qty: 999, price: Math.round(basePrice * 0.90) },
                            { min_qty: 1000, max_qty: 2999, price: Math.round(basePrice * 0.85) },
                            { min_qty: 3000, max_qty: 4999, price: Math.round(basePrice * 0.80) },
                            { min_qty: 5000, max_qty: null, price: Math.round(basePrice * 0.75) }
                        ];
                    }
                    if (!p.wholesale_qty_discounts || p.wholesale_qty_discounts.length === 0) {
                        p.wholesale_qty_discounts = [
                            { min_qty: 1000, max_qty: 4999, discount_percent: 3 },
                            { min_qty: 5000, max_qty: null, discount_percent: 5 }
                        ];
                    }
                }
                return p;
            }).filter(Boolean);
        }
        if (Array.isArray(this.online_orders)) {
            this.online_orders = this.online_orders.map(o => {
                if (o) {
                    o.items = Array.isArray(o.items) ? o.items : [];
                    o.total_amount = typeof o.total_amount === 'number' ? o.total_amount : 0;
                }
                return o;
            }).filter(Boolean);
        }

        // Setup PostgreSQL Auto-Sync via Express API
        this._syncing = false;
        this.syncWithServer();
        // Polling sync every 3 seconds for instant live cross-device updates
        setInterval(() => this.syncWithServer(), 3000);
    }

    getApiUrl(path) {
        if (typeof window !== 'undefined' && window.location) {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return path;
            }
        }
        return 'https://inlachong.shoplike.cloud' + path;
    }

    syncWithServer() {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
            if (this._syncing) return;
            this._syncing = true;

            const stateKeys = [
                "partners", "materials", "orders", "productions", "subcontracts",
                "online_products", "online_stock_logs", "online_orders", "online_returns",
                "online_inventory_checks", "online_internal_exits", "transactions",
                "crm_notes", "conversations", "messages", "restocks", "contracts",
                "salespersons", "labor_contracts", "warehouse_transactions", "warehouse_audits",
                "users", "departments"
            ];

            const url = this.getApiUrl('/api/state?_t=' + Date.now());
            fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            })
                .then(res => {
                    if (!res.ok) throw new Error('HTTP error ' + res.status);
                    return res.json();
                })
                .then(val => {
                    if (val && typeof val === 'object') {
                        let changed = false;
                        const serverKeys = Object.keys(val);
                        const serverIsEmpty = serverKeys.length === 0 || !val.partners || !val.orders;

                        if (serverIsEmpty) {
                            if (!localStorage.getItem("ihp_seeded_100_v1")) {
                                console.log("Server state is empty and local client is not seeded. Seeding bulk mock data...");
                                this.seedBulkMockData();
                            }
                            
                            console.log("Initializing empty server database with local client state...");
                            stateKeys.forEach(k => {
                                fetch(this.getApiUrl('/api/state/' + k), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(this[k])
                                }).catch(err => console.warn(`Failed to seed ${k} to server:`, err));
                            });
                            
                            localStorage.setItem("ihp_seeded_100_v1", "true");
                        } else {
                            if (!localStorage.getItem("ihp_seeded_100_v1")) {
                                localStorage.setItem("ihp_seeded_100_v1", "true");
                            }

                            serverKeys.forEach(k => {
                                const lastUpdate = this._lastLocalUpdate && this._lastLocalUpdate[k];
                                if (lastUpdate && (Date.now() - lastUpdate < 10000)) {
                                    return;
                                }
                                
                                let serverVal = val[k];
                                let localVal = this[k];
                                
                                if (Array.isArray(localVal) && Array.isArray(serverVal)) {
                                    const serverIds = new Set(serverVal.map(item => item && item.id).filter(Boolean));
                                    const missingLocallyCreated = localVal.filter(item => item && item.id && !serverIds.has(item.id));
                                    
                                    if (missingLocallyCreated.length > 0) {
                                        console.log(`Preserving ${missingLocallyCreated.length} local items for key "${k}" that are missing on the server:`, missingLocallyCreated);
                                        serverVal = [...missingLocallyCreated, ...serverVal];
                                        this.updateState(k, serverVal);
                                    }
                                }

                                if (JSON.stringify(this[k]) !== JSON.stringify(serverVal)) {
                                    this[k] = serverVal;
                                    localStorage.setItem(`ihp_${k}`, JSON.stringify(serverVal));
                                    changed = true;
                                }
                            });

                            stateKeys.forEach(k => {
                                if (!serverKeys.includes(k) && this[k] !== undefined && this[k] !== null) {
                                    console.log(`Uploading missing key "${k}" from client to server...`);
                                    fetch(this.getApiUrl('/api/state/' + k), {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(this[k])
                                    }).catch(err => console.warn(`Failed to upload missing key ${k} to server:`, err));
                                }
                            });
                        }

                        if (changed) {
                            if (typeof renderAll === 'function') renderAll();
                            if (typeof window.applyUserPermissions === 'function') window.applyUserPermissions();
                        }
                    }
                })
                .catch(err => {
                    console.warn("PostgreSQL state sync failed:", err);
                })
                .finally(() => {
                    this._syncing = false;
                });
        }
    }

    load(key, defaultValue) {
        try {
            const data = localStorage.getItem(`ihp_${key}`);
            let parsed = data ? JSON.parse(data) : defaultValue;
            if (!parsed) {
                parsed = defaultValue;
            }
            if (Array.isArray(parsed)) {
                parsed = parsed.filter(item => item !== null && item !== undefined);
            }
            return parsed;
        } catch (e) {
            console.error("IHP Parse Error for " + key, e);
            return defaultValue;
        }
    }

    save(key, val) {
        try {
            localStorage.setItem(`ihp_${key}`, JSON.stringify(val));
        } catch (e) {
            console.error("IHP Storage Error: ", e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                if (key === 'online_products' && Array.isArray(val)) {
                    const stripped = val.map(p => {
                        const copy = {...p};
                        if (copy.image && copy.image.startsWith("data:")) {
                            copy.image = ""; // strip base64 image data
                        }
                        return copy;
                    });
                    try {
                        localStorage.setItem(`ihp_${key}`, JSON.stringify(stripped));
                        alert("Bộ nhớ trình duyệt đã đầy. Hàng hóa đã được lưu thành công nhưng hình ảnh tải lên đã bị loại bỏ để giảm dung lượng.");
                        return;
                    } catch (err2) {
                        console.error("Fallback save failed", err2);
                    }
                }
                alert("Bộ nhớ trình duyệt của bạn đã đầy (Quota Exceeded). Không thể lưu dữ liệu mới này.");
            }
        }
    }

    updateState(key, val) {
        this[key] = val;
        this.save(key, val);
        
        // Track local modification time to prevent race overwrite
        if (this._lastLocalUpdate) {
            this._lastLocalUpdate[key] = Date.now();
        }
        
        // Sync to PostgreSQL database via Express API
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
            fetch(this.getApiUrl('/api/state/' + key), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(val)
            }).catch(err => {
                console.warn("PostgreSQL set background write failed for " + key, err);
            });
        }
    }

    seedBulkMockData() {
        const generatedPartners = [...DEFAULT_PARTNERS];
        const generatedOrders = [];
        const generatedProductions = [];
        const generatedSubcontracts = [];
        const generatedTransactions = [];
        const generatedRestocks = [];
        const generatedCrmNotes = [];
        const generatedConversations = [];
        const generatedMessages = [];

        const firstNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
        const middleNames = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Hoàng", "Quốc", "Gia", "Thành", "Hải", "Tuấn", "Anh", "Xuân", "Thanh", "Ngọc"];
        const lastNames = ["Hải", "Thu", "Nam", "Phương", "Hùng", "Lan", "Sơn", "Minh", "Kiên", "Duy", "Trang", "Vy", "Linh", "Thảo", "Hòa", "Bình", "Cường", "Tuấn", "Quang"];
        const companySuffix = ["Co", "JSC", "Group", "Solutions", "Print", "Packaging", "Design", "Media"];
        const channels = ["ZALO", "FACEBOOK", "TELEGRAM", "EMAIL", "LIVECHAT"];
        const operators = ["Đại Hùng", "Thế Phương", "Văn Minh", "Thanh Sơn"];
        const specs = [
            "In Offset Brochure giới thiệu sản phẩm",
            "In Catalogue 16 trang giấy couches",
            "In Hộp duplex đựng bánh ngọt",
            "In Decal sữa dán tem nhãn chai lọ",
            "In Kỷ yếu học sinh bìa cứng",
            "In Tờ rơi quảng cáo A5 siêu thị",
            "In Danh thiếp ép kim cao cấp",
            "In Poster quảng cáo khổ lớn"
        ];
        const paperTypes = ["couche150", "couche300", "duplex250", "decal"];
        const crmNotesTemplates = [
            "Khách hàng gọi điện hỏi tiến độ thiết kế.",
            "Đã bàn giao market thiết kế qua email cho khách xác nhận.",
            "Khách chốt file thiết kế cuối cùng, yêu cầu ra kẽm in sớm.",
            "Lên khuôn in offset, lô in chạy đạt chất lượng cao.",
            "Chuyển bán thành phẩm sang bên gia công ngoài gia công cán màng.",
            "Đối tác báo đã hoàn thành 50% khối lượng gia công bế thành phẩm.",
            "Khách hàng đã thanh toán nốt phần tiền còn lại qua VCB.",
            "Nhân viên gọi điện nhắc hạn thanh toán công nợ cuối tháng.",
            "Khách gửi phản hồi khen ngợi bao bì in rất đẹp và sắc nét."
        ];
        const chatMessagesTemplates = [
            "Xin chào xưởng in Lạc Hồng, em muốn báo giá in brochure ạ.",
            "Brochure kích thước A4 gấp ba đúng không em? Số lượng bao nhiêu?",
            "Dạ vâng đúng rồi, số lượng in khoảng 1000 cuốn.",
            "Bên anh in offset chất lượng cao, giá khoảng 4.500.000đ em nhé.",
            "Dạ vâng, để em xin phê duyệt rồi gửi file thiết kế cho xưởng.",
            "Xưởng cho em hỏi đơn hàng in decal hôm trước đã giao chưa ạ?",
            "Dạ đơn decal đã in xong và đang trên đường giao tới công ty chị rồi ạ.",
            "Đã nhận được hàng rồi nha xưởng ơi, đóng gói rất cẩn thận cảm ơn anh!",
            "Rất hân hạnh được phục vụ anh/chị. Hẹn gặp lại đơn hàng tiếp theo!"
        ];

        // 1. Generate Partners up to 100 (already has 6 in DEFAULT)
        let custCount = 3;
        let supCount = 3;
        let subCount = 3;
        for (let i = generatedPartners.length; i < 100; i++) {
            let role = "CUSTOMER";
            if (i % 5 === 0) role = "SUPPLIER";
            else if (i % 5 === 1) role = "SUBCONTRACTOR";

            let code = "";
            let name = "";
            if (role === "CUSTOMER") {
                code = `KH-${String(custCount++).padStart(3, '0')}`;
                name = `${firstNames[i % firstNames.length]} ${middleNames[i % middleNames.length]} ${lastNames[i % lastNames.length]} (${companySuffix[i % companySuffix.length]} ${lastNames[(i+2)%lastNames.length]})`;
            } else if (role === "SUPPLIER") {
                code = `NCC-${String(supCount++).padStart(3, '0')}`;
                name = `Giấy/Vật tư ${lastNames[i % lastNames.length]} ${companySuffix[i % companySuffix.length]}`;
            } else {
                code = `TC-${String(subCount++).padStart(3, '0')}`;
                name = `Xưởng gia công ${lastNames[i % lastNames.length]}`;
            }

            generatedPartners.push({
                id: `p_${i + 1}`,
                code: code,
                name: name,
                phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
                email: `${code.toLowerCase()}@inlachong.vn`,
                role: role,
                credit_limit: role === "CUSTOMER" ? 50000000 : 100000000,
                status: true
            });
        }

        // Helper lists
        const customers = generatedPartners.filter(p => p.role === "CUSTOMER");
        const suppliers = generatedPartners.filter(p => p.role === "SUPPLIER");
        const subcontractors = generatedPartners.filter(p => p.role === "SUBCONTRACTOR");

        // 2. Generate 100 Orders
        for (let i = 0; i < 100; i++) {
            const customer = customers[i % customers.length];
            const orderId = `o_mock_${i + 1}`;
            const subtotal = 1000000 + (i * 150000) % 15000000;
            const total = Math.round(subtotal * 1.08);
            const deposit = Math.round(total * 0.5);
            const payStatus = i % 3 === 0 ? "PAID" : i % 3 === 1 ? "PARTIALLY_PAID" : "UNPAID";
            const status = i % 4 === 0 ? "FINISHED" : i % 4 === 1 ? "IN_PRODUCTION" : i % 4 === 2 ? "DRAFT" : "CANCELLED";

            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            const salespeopleList = ["Đại Hùng", "Thế Phương", "Văn Minh", "Thanh Sơn"];
            const sp = salespeopleList[i % salespeopleList.length];
            const commRate = i % 2 === 0 ? 5 : 10;
            const commAmount = Math.round(total * (commRate / 100));

            generatedOrders.push({
                id: orderId,
                order_number: `SO-202606-${String(i + 4).padStart(4, '0')}`,
                customer_id: customer.id,
                width_mm: 100 + (i * 10) % 300,
                length_mm: 150 + (i * 15) % 400,
                quantity: 500 + (i * 100) % 10000,
                paper_type: paperTypes[i % paperTypes.length],
                print_spec: specs[i % specs.length],
                post_processing: ["Cán màng mờ", "Bế thành phẩm"],
                subtotal: subtotal,
                discount: 0,
                vat_rate: 8,
                total_amount: total,
                deposit: payStatus === "UNPAID" ? 0 : deposit,
                payment_status: payStatus,
                status: status,
                created_at: createdDate.toISOString(),
                delivery_date: new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                salesperson: sp,
                commission_rate: commRate,
                commission_amount: commAmount
            });
        }

        // 3. Generate 100 Productions
        for (let i = 0; i < 100; i++) {
            const order = generatedOrders[i % generatedOrders.length];
            const prodStages = ["THIETKE", "KEM", "IN", "GIACONG", "QC", "GIAOHANG", "FINISHED"];
            const targetQty = order.quantity;
            const inputQty = Math.ceil(targetQty * 1.05);
            const status = prodStages[i % prodStages.length];

            generatedProductions.push({
                id: `pr_mock_${i + 1}`,
                production_number: `PO-202606-${String(i + 3).padStart(4, '0')}`,
                sales_order_id: order.id,
                start_date: order.created_at,
                due_date: order.delivery_date + "T17:00:00Z",
                input_qty: inputQty,
                target_qty: targetQty,
                status: status,
                current_stage: status,
                operator_id: operators[i % operators.length]
            });
        }

        // 4. Generate 100 Subcontracts
        for (let i = 0; i < 100; i++) {
            const order = generatedOrders[i % generatedOrders.length];
            const subcontractor = subcontractors[i % subcontractors.length];
            const cost = 200000 + (i * 50000) % 3000000;
            const progress = i % 5 === 0 ? 100 : i % 5 === 1 ? 80 : i % 5 === 2 ? 50 : 0;
            const payStatus = progress === 100 && i % 2 === 0 ? "PAID" : "UNPAID";

            generatedSubcontracts.push({
                id: `sc_mock_${i + 1}`,
                contract_number: `SC-202606-${String(i + 2).padStart(4, '0')}`,
                subcontractor_id: subcontractor.id,
                sales_order_id: order.id,
                work_detail: `Gia công bế dán & hoàn thiện sản phẩm in`,
                cost: cost,
                deadline: order.delivery_date,
                progress: progress,
                status: progress === 100 ? "FINISHED" : "PROCESSING",
                payment_status: payStatus
            });
        }

        // 5. Generate 100 Transactions (Receipts + Payments)
        for (let i = 0; i < 100; i++) {
            const isReceipt = i % 2 === 0;
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            if (isReceipt) {
                // Receipt from a customer
                const order = generatedOrders[i % generatedOrders.length];
                const amount = order.deposit > 0 ? order.deposit : order.total_amount;
                generatedTransactions.push({
                    id: `t_mock_${i + 1}`,
                    tx_number: `PT-202606-${String(i + 3).padStart(4, '0')}`,
                    created_at: createdDate.toISOString(),
                    type: "RECEIPT",
                    category: i % 4 === 0 ? "CUSTOMER_DEPOSIT" : "CUSTOMER_FINAL",
                    amount: amount,
                    payment_method: "BANK_TRANSFER",
                    account_source: "VCB",
                    partner_id: order.customer_id,
                    reference_id: order.id,
                    created_by: "Kế toán Lan"
                });
            } else {
                // Payment to supplier or subcontractor
                const partner = i % 3 === 0 ? suppliers[i % suppliers.length] : subcontractors[i % subcontractors.length];
                const category = partner.role === "SUPPLIER" ? "SUPPLIER_PAY" : "SUBCONTRACTOR_PAY";
                const amount = 500000 + (i * 120000) % 5000000;

                generatedTransactions.push({
                    id: `t_mock_${i + 1}`,
                    tx_number: `PC-202606-${String(i + 2).padStart(4, '0')}`,
                    created_at: createdDate.toISOString(),
                    type: "PAYMENT",
                    category: category,
                    amount: amount,
                    payment_method: "BANK_TRANSFER",
                    account_source: "VCB",
                    partner_id: partner.id,
                    reference_id: null,
                    created_by: "Thủ quỹ Nam"
                });
            }
        }

        // 6. Generate 100 Restocks
        const matSkus = DEFAULT_MATERIALS.map(m => m.sku);
        for (let i = 0; i < 100; i++) {
            const supplier = suppliers[i % suppliers.length];
            const sku = matSkus[i % matSkus.length];
            const qty = 100 + (i * 50) % 5000;
            const cost = 1000 + (i * 200) % 10000;
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            generatedRestocks.push({
                id: `r_mock_${i + 1}`,
                created_at: createdDate.toISOString(),
                supplier_id: supplier.id,
                sku: sku,
                qty: qty,
                cost: cost,
                total_amount: qty * cost
            });
        }

        // 7. Generate 100 CRM Notes
        for (let i = 0; i < 100; i++) {
            const partner = generatedPartners[i % generatedPartners.length];
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            generatedCrmNotes.push({
                id: `n_mock_${i + 1}`,
                partner_id: partner.id,
                created_at: createdDate.toISOString(),
                created_by: "Quản lý Hùng",
                content: crmNotesTemplates[i % crmNotesTemplates.length]
            });
        }

        // 8. Generate 100 Conversations
        for (let i = 0; i < 100; i++) {
            const partner = generatedPartners[i % generatedPartners.length];
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            generatedConversations.push({
                id: `c_mock_${i + 1}`,
                partner_id: partner.id,
                channel: channels[i % channels.length],
                unread: i % 7 === 0,
                last_message: chatMessagesTemplates[i % chatMessagesTemplates.length],
                last_time: createdDate.toISOString()
            });
        }

        // 9. Generate 100 Messages
        for (let i = 0; i < 100; i++) {
            const conv = generatedConversations[i % generatedConversations.length];
            const sender = i % 2 === 0 ? "CUSTOMER" : "AGENT";
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - (100 - i));

            generatedMessages.push({
                id: `m_mock_${i + 1}`,
                conversation_id: conv.id,
                sender: sender,
                content: chatMessagesTemplates[i % chatMessagesTemplates.length],
                timestamp: createdDate.toISOString()
            });
        }

        // Write all to localStorage
        this.partners = generatedPartners;
        this.orders = [...DEFAULT_ORDERS, ...generatedOrders];
        this.productions = [...DEFAULT_PRODUCTIONS, ...generatedProductions];
        this.subcontracts = [...DEFAULT_SUBCONTRACTS, ...generatedSubcontracts];
        this.transactions = [...DEFAULT_TRANSACTIONS, ...generatedTransactions];
        this.restocks = [...DEFAULT_RESTOCKS, ...generatedRestocks];
        this.crm_notes = [...DEFAULT_CRM_NOTES, ...generatedCrmNotes];
        this.conversations = [...DEFAULT_CONVERSATIONS, ...generatedConversations];
        this.messages = [...DEFAULT_MESSAGES, ...generatedMessages];

        this.save("partners", this.partners);
        this.save("orders", this.orders);
        this.save("productions", this.productions);
        this.save("subcontracts", this.subcontracts);
        this.save("transactions", this.transactions);
        this.save("restocks", this.restocks);
        this.save("crm_notes", this.crm_notes);
        this.save("conversations", this.conversations);
        this.save("messages", this.messages);

        localStorage.setItem("ihp_seeded_100_v1", "true");
    }
}

const state = new AppState();

// Global mobile navigation references
let sidebarEl = null;
let menuToggleBtn = null;

// ==========================================================================
// REAL-TIME WEATHER, GOLD, USD, BTC TICKER
// ==========================================================================
async function updateRealtimeTicker() {
    let weather = {
        hanoi: { temp: 29, text: "Có mây" },
        danang: { temp: 32, text: "Nắng ráo" },
        hcm: { temp: 31, text: "Mưa giông" }
    };
    let gold = "89.5M";
    let goldDiff = "▲0.2%";
    let usd = "25,465";
    let usdDiff = "▼0.05%";
    let btc = "$95,850";
    let btcDiff = "▲1.4%";

    try {
        const weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285,16.0544,10.8231&longitude=105.8542,108.2022,106.6297&current_weather=true").then(r => r.json());
        if (weatherRes && weatherRes.length === 3) {
            weather.hanoi.temp = Math.round(weatherRes[0].current_weather.temperature);
            weather.danang.temp = Math.round(weatherRes[1].current_weather.temperature);
            weather.hcm.temp = Math.round(weatherRes[2].current_weather.temperature);
            
            const getWeatherDesc = (code) => {
                if (code <= 3) return "Nắng ráo";
                if (code <= 48) return "Sương mù";
                if (code <= 67) return "Mưa phùn";
                if (code <= 82) return "Mưa rào";
                return "Mưa giông";
            };
            weather.hanoi.text = getWeatherDesc(weatherRes[0].current_weather.weathercode);
            weather.danang.text = getWeatherDesc(weatherRes[1].current_weather.weathercode);
            weather.hcm.text = getWeatherDesc(weatherRes[2].current_weather.weathercode);
        }
    } catch (e) {
        console.warn("Weather fetch failed", e);
    }

    try {
        const btcRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r => r.json());
        if (btcRes && btcRes.price) {
            const btcPrice = parseFloat(btcRes.price);
            btc = "$" + btcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 });
            btcDiff = (btcPrice % 2 === 0 ? "▲" : "▼") + ((btcPrice % 100) / 40 + 0.1).toFixed(1) + "%";
        }
    } catch (e) {
        console.warn("BTC fetch failed", e);
    }

    try {
        const rateRes = await fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json());
        if (rateRes && rateRes.rates) {
            const usdVnd = rateRes.rates.VND;
            if (usdVnd) {
                usd = Math.round(usdVnd).toLocaleString("vi-VN");
                usdDiff = (usdVnd % 2 === 0 ? "▲" : "▼") + "0.0" + (Math.round(usdVnd) % 9 + 1) + "%";

                const xauRate = rateRes.rates.XAU;
                if (xauRate) {
                    const worldGoldUsd = 1 / xauRate;
                    const calculatedSjcPrice = ((worldGoldUsd * usdVnd * 1.20565) / 1000000) + 14.5;
                    gold = calculatedSjcPrice.toFixed(1) + "M";
                    goldDiff = (worldGoldUsd % 2 === 0 ? "▲" : "▼") + "0." + (Math.round(worldGoldUsd) % 9 + 1) + "%";
                }
            }
        }
    } catch (e) {
        console.warn("USD/Gold fetch failed", e);
    }

    const ticker = document.getElementById("weatherTicker");
    if (ticker) {
        ticker.innerHTML = `
            <span style="font-weight:700; color:var(--text-primary);">Hà Nội:</span> <span style="font-weight:600; color:var(--accent);">${weather.hanoi.temp}°C</span> <span class="text-secondary" style="font-size:0.78rem; margin-right:16px;">${weather.hanoi.text}</span>
            <span style="font-weight:700; color:var(--text-primary);">Đà Nẵng:</span> <span style="font-weight:600; color:var(--accent);">${weather.danang.temp}°C</span> <span class="text-secondary" style="font-size:0.78rem; margin-right:16px;">${weather.danang.text}</span>
            <span style="font-weight:700; color:var(--text-primary);">TP. HCM:</span> <span style="font-weight:600; color:var(--accent);">${weather.hcm.temp}°C</span> <span class="text-secondary" style="font-size:0.78rem; margin-right:16px;">${weather.hcm.text}</span>
            <span style="font-weight:700; color:#eab308;">Vàng SJC:</span> <span style="font-weight:600; color:#eab308;">${gold}</span> <span class="text-secondary" style="font-size:0.78rem; margin-right:16px;">${goldDiff}</span>
            <span style="font-weight:700; color:#10b981;">USD:</span> <span style="font-weight:600; color:#10b981;">${usd}</span> <span class="text-secondary" style="font-size:0.78rem; margin-right:16px;">${usdDiff}</span>
            <span style="font-weight:700; color:#f97316;">BTC:</span> <span style="font-weight:600; color:#f97316;">${btc}</span> <span class="text-secondary" style="font-size:0.78rem;">${btcDiff}</span>
        `;
    }
}

// ==========================================================================
// SPA NAVIGATION SYSTEM
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Auth Database & Setup Permissions
    if (typeof initUsersDatabase === 'function') initUsersDatabase();
    if (typeof window.applyUserPermissions === 'function') window.applyUserPermissions();

    // Initialise globally declared mobile navigation elements
    sidebarEl = document.querySelector(".sidebar");
    menuToggleBtn = document.getElementById("mobileMenuToggleBtn");

    // Initialise Lucide icons
    lucide.createIcons();

    // Simplified live clock/date updating
    window.updateClock = function() {
        const liveEl = document.getElementById("liveDateTime");
        if (liveEl) {
            const today = new Date();
            const formatted = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            liveEl.textContent = formatted;
        }
    };

    updateClock();

    // Load and update real-time ticker data (weather, gold, usd, btc)
    updateRealtimeTicker();
    setInterval(updateRealtimeTicker, 600000);

    // Sidebar & Navigation links
    
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebarEl.classList.toggle("active");
            menuToggleBtn.classList.toggle("active");
        });
    }

    // Close mobile menu if clicked outside
    document.addEventListener("click", (e) => {
        if (sidebarEl && sidebarEl.classList.contains("active")) {
            if (!sidebarEl.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                sidebarEl.classList.remove("active");
                menuToggleBtn.classList.remove("active");
            }
        }
    });

    // Lunar Calendar engine state
    let selectedLunarMonth = new Date().getMonth();
    let selectedLunarYear = new Date().getFullYear();

    window.openLunarCalendarModal = function() {
        // Init selects if empty
        const mSelect = document.getElementById("lunarMonthSelect");
        const ySelect = document.getElementById("lunarYearSelect");
        if (mSelect && mSelect.children.length === 0) {
            for (let m = 0; m < 12; m++) {
                mSelect.innerHTML += `<option value="${m}">Tháng ${m+1}</option>`;
            }
            for (let y = 2020; y <= 2035; y++) {
                ySelect.innerHTML += `<option value="${y}">Năm ${y}</option>`;
            }
            
            // Add listeners
            mSelect.addEventListener("change", () => {
                selectedLunarMonth = parseInt(mSelect.value);
                renderLunarCalendarDays();
            });
            ySelect.addEventListener("change", () => {
                selectedLunarYear = parseInt(ySelect.value);
                renderLunarCalendarDays();
            });

            document.getElementById("btnPrevLunarMonth").addEventListener("click", () => {
                selectedLunarMonth--;
                if (selectedLunarMonth < 0) {
                    selectedLunarMonth = 11;
                    selectedLunarYear--;
                }
                mSelect.value = selectedLunarMonth;
                ySelect.value = selectedLunarYear;
                renderLunarCalendarDays();
            });
            document.getElementById("btnNextLunarMonth").addEventListener("click", () => {
                selectedLunarMonth++;
                if (selectedLunarMonth > 11) {
                    selectedLunarMonth = 0;
                    selectedLunarYear++;
                }
                mSelect.value = selectedLunarMonth;
                ySelect.value = selectedLunarYear;
                renderLunarCalendarDays();
            });
        }

        mSelect.value = selectedLunarMonth;
        ySelect.value = selectedLunarYear;

        renderLunarCalendarDays();
        document.getElementById("lunarCalendarModal").classList.add("active");
    };

    // Simple Vietnamese lunar calendar day mock converter (using offsets for demo)
    function renderLunarCalendarDays() {
        const grid = document.getElementById("lunarCalendarGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const firstDay = new Date(selectedLunarYear, selectedLunarMonth, 1);
        const lastDay = new Date(selectedLunarYear, selectedLunarMonth + 1, 0);

        let startDayOfWeek = firstDay.getDay();
        if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday maps to 7

        // Blank cells before month start
        for (let i = 1; i < startDayOfWeek; i++) {
            const blank = document.createElement("div");
            blank.style.padding = "8px";
            grid.appendChild(blank);
        }

        const totalDays = lastDay.getDate();
        for (let d = 1; d <= totalDays; d++) {
            const cell = document.createElement("div");
            cell.style.cssText = "background:var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:default; min-height: 52px;";
            
            // Highlight today
            const currDate = new Date();
            const isToday = d === currDate.getDate() && selectedLunarMonth === currDate.getMonth() && selectedLunarYear === currDate.getFullYear();
            if (isToday) {
                cell.style.borderColor = "var(--accent)";
                cell.style.background = "var(--accent-light)";
            }

            // Determine if weekend (Saturday or Sunday)
            const dayObj = new Date(selectedLunarYear, selectedLunarMonth, d);
            const wDay = dayObj.getDay(); // 0 is Sunday, 6 is Saturday
            const isWeekend = (wDay === 0 || wDay === 6);

            // Mock Lunar conversion offset (rough cycle)
            let lunarDay = (d + selectedLunarMonth * 2 + (selectedLunarYear - 2026)) % 30;
            if (lunarDay <= 0) lunarDay += 30;

            // Simple check for public holidays
            // Solar holidays: 1/1 (Tết Dương Lịch), 30/4 (Giải Phóng), 1/5 (Quốc Tế Lao Động), 2/9 (Quốc Khánh)
            // Lunar holidays: 1/1 to 5/1 (Tết Nguyên Đán), 10/3 (Giỗ tổ Hùng Vương)
            let isHoliday = false;
            let holidayName = "";

            const sMonth = selectedLunarMonth + 1;
            if (d === 1 && sMonth === 1) { isHoliday = true; holidayName = "Tết DL"; }
            else if (d === 30 && sMonth === 4) { isHoliday = true; holidayName = "30/4"; }
            else if (d === 1 && sMonth === 5) { isHoliday = true; holidayName = "1/5"; }
            else if (d === 2 && sMonth === 9) { isHoliday = true; holidayName = "2/9"; }
            
            // Mock Lunar Holidays mapped roughly
            if (lunarDay >= 1 && lunarDay <= 5 && sMonth === 2) { isHoliday = true; holidayName = "Tết Âm"; } // Tết Ta usually Feb
            else if (lunarDay === 10 && sMonth === 4) { isHoliday = true; holidayName = "Giỗ Tổ"; } // Giỗ tổ Hung King usually April

            const shouldColorRed = isWeekend || isHoliday;
            const numberColor = shouldColorRed ? "var(--danger)" : "var(--text-primary)";
            const subTextColor = shouldColorRed ? "rgba(220, 38, 38, 0.7)" : "var(--text-muted)";

            let lunarLabel = lunarDay;
            if (isHoliday) {
                lunarLabel = `<span style="font-weight:700; font-size:0.65rem;">${holidayName}</span>`;
            } else if (lunarDay === 1) {
                lunarLabel = `<span style="font-weight:700; font-size:0.65rem;">M.1</span>`;
            } else if (lunarDay === 15) {
                lunarLabel = `<span style="font-weight:700; font-size:0.65rem;">Rằm</span>`;
            }

            cell.innerHTML = `
                <span style="font-weight:700; font-size:1.05rem; color:${numberColor};">${d}</span>
                <span style="font-size:0.7rem; color:${subTextColor}; margin-top:2px;">${lunarLabel}</span>
            `;

            grid.appendChild(cell);
        }
    }

    const mobileQuoteBtn = document.getElementById("mobileQuickQuoteBtn");
    if (mobileQuoteBtn) {
        mobileQuoteBtn.addEventListener("click", () => {
            const choiceModal = document.getElementById("orderChoiceModal");
            if (choiceModal) choiceModal.classList.add("active");
        });
    }

    // Modal choices triggers
    const btnChoiceOnlineOrder = document.getElementById("btnChoiceOnlineOrder");
    if (btnChoiceOnlineOrder) {
        btnChoiceOnlineOrder.addEventListener("click", () => {
            document.getElementById("orderChoiceModal").classList.remove("active");
            switchTab("online-sales");
            // Switch sub-tab to Orders and open the modal
            if (window.switchOnlineSalesSubTab) window.switchOnlineSalesSubTab("online-orders");
            if (typeof window.openNewOnlineOrderModal === "function") {
                window.openNewOnlineOrderModal();
            }
        });
    }

    const btnChoiceProdOrder = document.getElementById("btnChoiceProdOrder");
    if (btnChoiceProdOrder) {
        btnChoiceProdOrder.addEventListener("click", () => {
            document.getElementById("orderChoiceModal").classList.remove("active");
            // Open normal production quote modal
            const quoteFormModal = document.getElementById("quoteModal") || document.getElementById("prodOrderModal");
            if (quoteFormModal) quoteFormModal.classList.add("active");
        });
    }

    // Weather widget continuous scroll is handled via CSS marquee keyframes

    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
            
            // Auto close mobile sidebar after click
            if (sidebarEl && sidebarEl.classList.contains("active")) {
                sidebarEl.classList.remove("active");
                if (menuToggleBtn) menuToggleBtn.classList.remove("active");
            }
        });
    });

    // Theme Switcher
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    themeToggleBtn.addEventListener("click", () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", newTheme);
        localStorage.setItem("ihp_theme", newTheme);
    });

    // Set initial theme
    const savedTheme = localStorage.getItem("ihp_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Init UI elements with data
    initDataInForms();
    renderAll();
    setupEventListeners();
    initOnlineSales();

    // Start Telegram Polling if enabled
    if (localStorage.getItem("ihp_tg_enable_chat_sync") === "true") {
        startTelegramPolling();
    }
});

window.switchFinanceSubTab = function(subtabId) {
    switchTab('finance');
    
    // Update active class on inner buttons
    const finBtns = document.querySelectorAll(".fin-subtab-btn");
    finBtns.forEach(btn => {
        if (btn.getAttribute("data-subtab") === subtabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const subtabPanes = document.querySelectorAll(".fin-subtab-content");
    subtabPanes.forEach(pane => pane.classList.remove("active"));
    const targetPane = document.getElementById(`finSubtab-${subtabId}`);
    if (targetPane) targetPane.classList.add("active");

    if (subtabId === "sales-commission" && window.renderSalesCommissions) {
        window.renderSalesCommissions();
    }
    if (subtabId === "internal-finance" && window.renderInternalTransactions) {
        window.renderInternalTransactions();
    }
};

window.goBackToHub = function(tabId) {
    const parentHub = {
        'online-sales': 'sales-hub',
        'quotes': 'production-hub',
        'prod-orders': 'production-hub',
        'production': 'production-hub',
        'subcontracting': 'production-hub',
        'inventory': 'production-hub',
        'warehouse': 'production-hub',
        'finance': 'finance-hub',
        'crm': 'admin-hub',
        'crm-care': 'admin-hub',
        'contracts': 'admin-hub',
        'chat': 'admin-hub',
        'employees': 'admin-hub',
        'collaborators': 'admin-hub',
        'labor-contracts': 'admin-hub'
    }[tabId];
    if (parentHub) {
        switchTab(parentHub);
    } else {
        switchTab('dashboard');
    }
};

function switchTab(tabId) {
    const currentUser = JSON.parse(localStorage.getItem("ihp_current_user"));
    if (!currentUser) {
        const loginOverlay = document.getElementById("loginScreen");
        if (loginOverlay) loginOverlay.style.display = "flex";
        return;
    }
    
    // Check permission
    if (typeof window.getRequiredPermission === 'function') {
        const requiredPermission = window.getRequiredPermission(tabId);
        if (requiredPermission && currentUser.role !== 'ADMIN' && (!currentUser.permissions || !currentUser.permissions[requiredPermission])) {
            alert("Bạn không có quyền truy cập chức năng này!");
            if (tabId !== 'dashboard') {
                switchTab('dashboard');
            }
            return;
        }
    }

    // Hide all tab panes
    const panes = document.querySelectorAll(".tab-pane");
    panes.forEach(pane => pane.classList.remove("active"));

    // Deactivate all menu items
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => item.classList.remove("active"));

    // Activate the chosen pane
    let paneId = tabId;
    const activePane = document.getElementById(`${paneId}Tab`);
    if (activePane) activePane.classList.add("active");

    // Highlight the sidebar item
    const activeMenu = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (activeMenu) {
        activeMenu.classList.add("active");
        // Also highlight parent if it is in submenu
        const parentBtn = activeMenu.closest('.menu-group')?.querySelector('.menu-parent');
        if (parentBtn) parentBtn.classList.add('active');
    }

    // Highlight bottom navigation bar active tab
    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .bottom-nav-item");
    bottomNavItems.forEach(item => item.classList.remove("active"));
    
    const parentHubMap = {
        'online-sales': 'sales-hub',
        'quotes': 'production-hub',
        'prod-orders': 'production-hub',
        'production': 'production-hub',
        'subcontracting': 'production-hub',
        'inventory': 'production-hub',
        'warehouse': 'production-hub',
        'finance': 'finance-hub',
        'crm': 'admin-hub',
        'crm-care': 'admin-hub',
        'contracts': 'admin-hub',
        'chat': 'admin-hub',
        'employees': 'admin-hub',
        'collaborators': 'admin-hub',
        'labor-contracts': 'admin-hub'
    };
    
    const highlightTabId = parentHubMap[tabId] || tabId;
    const activeBottomNavItem = document.querySelector(`.bottom-nav-bar .bottom-nav-item[data-tab="${highlightTabId}"]`);
    if (activeBottomNavItem) {
        activeBottomNavItem.classList.add("active");
    }

    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }

    if (tabId === 'admin-hub' && typeof window.applyUserPermissions === 'function') {
        window.applyUserPermissions();
    }

    if (tabId === "quotes") {
        const queryEl = document.getElementById("quoteSearchInput");
        if (queryEl) queryEl.value = "";
        renderQuotes();
    } else if (tabId === "prod-orders") {
        const queryEl = document.getElementById("prodOrderSearchInput");
        if (queryEl) queryEl.value = "";
        const statusSelect = document.getElementById("prodOrderFilterStatus");
        if (statusSelect) statusSelect.value = "all";
        renderProdOrders();
    } else if (tabId === "contracts") {
        const queryEl = document.getElementById("contractSearchInput");
        if (queryEl) queryEl.value = "";
        renderContracts();
    } else if (tabId === "employees") {
        const queryEl = document.getElementById("employeeSearchInput");
        if (queryEl) queryEl.value = "";
        renderEmployees();
    } else if (tabId === "collaborators") {
        const queryEl = document.getElementById("collaboratorSearchInput");
        if (queryEl) queryEl.value = "";
        renderCollaborators();
    } else if (tabId === "labor-contracts") {
        const queryEl = document.getElementById("laborContractSearchInput");
        if (queryEl) queryEl.value = "";
        renderLaborContracts();
    } else if (tabId === "warehouse") {
        if (window.renderWarehouse) window.renderWarehouse();
    } else if (tabId === "crm-care") {
        if (window.initCrmCareTab) window.initCrmCareTab();
    }

    // Update Header Text
    const title = document.getElementById("currentTabTitle");
    const sub = document.getElementById("currentTabSub");
    
    const titles = {
        dashboard: { text: "Tổng quan hoạt động", sub: "Chào mừng trở lại, Đại Hùng. Đây là tiến độ của xưởng hôm nay." },
        orders: { text: "Tính giá & Đơn hàng", sub: "Quản lý tính giá tự động, các hợp đồng in ấn và tình trạng đặt cọc." },
        quotes: { text: "Quản lý Tính giá", sub: "Danh sách phiếu tính giá nháp và gửi khách hàng." },
        "prod-orders": { text: "Đơn hàng sản xuất", sub: "Danh sách các đơn hàng đang triển khai sản xuất tại xưởng." },
        "online-sales": { text: "Bán hàng Online & Kho hàng hóa", sub: "Quản lý đơn hàng bán lẻ/sỉ, sản phẩm hàng hóa có sẵn, bảng giá và nhập xuất kho." },
        crm: { text: "Quản lý khách hàng (CRM)", sub: "Xem hồ sơ đối tác, lịch sử đơn hàng, giao dịch tài chính và dòng thời gian chăm sóc." },
        "crm-care": { text: "Nhật ký & Lịch sử Chăm sóc", sub: "Xem chi tiết hồ sơ, lịch sử chăm sóc, công nợ, giao dịch, hợp đồng của đối tác." },
        chat: { text: "Hộp thư Chat đa kênh", sub: "Tập trung tin nhắn từ Zalo, Facebook Messenger, Telegram, Email, Livechat." },
        production: { text: "Lệnh sản xuất", sub: "Theo dõi các công đoạn thiết kế, ra kẽm, in ấn Offset, gia công sau in." },
        inventory: { text: "Kho Nguyên Vật Tư", sub: "Quản lý tồn kho giấy, mực, màng bế và định lượng hao hụt." },
        subcontracting: { text: "Hợp đồng Gia công ngoài", sub: "Theo dõi tiến độ, chi phí và đơn vị thi công lắp đặt bảng hiệu." },
        finance: { text: "Thu chi & Dòng tiền", sub: "Báo cáo sổ quỹ tiền mặt, giao dịch ngân hàng và quản lý nợ phải thu/trả." },
        warehouse: { text: "Quản lý Kho Hàng Hóa", sub: "Nhập kho thành phẩm, xuất kho bán hàng, xuất hủy nội bộ và kiểm kê cân bằng kho hàng." },
        panorama: { text: "Báo cáo Toàn cảnh Doanh nghiệp", sub: "Tổng hợp chỉ số tài chính, năng suất máy móc của xưởng in và tiến độ phòng ban." },
        employees: { text: "Quản lý Nhân viên", sub: "Danh sách hồ sơ nhân sự, chức vụ, bộ phận và tỷ lệ hoa hồng kinh doanh." },
        collaborators: { text: "Quản lý Cộng tác viên", sub: "Danh sách cộng tác viên, liên kết giới thiệu và lịch sử doanh thu hoa hồng." },
        "labor-contracts": { text: "Quản lý Hợp đồng lao động", sub: "Danh sách hợp đồng lao động, thời hạn thử việc, mức lương cơ bản và phụ cấp." }
    };

    if (titles[tabId]) {
        title.textContent = titles[tabId].text;
        sub.textContent = titles[tabId].sub;
    }

    // Refresh charts if dashboard
    if (tabId === "dashboard") {
        if (title) title.style.display = "none";
        if (sub) sub.style.display = "none";
        if (window.renderPanorama) window.renderPanorama();
    } else {
        if (title) title.style.display = "block";
        if (sub) sub.style.display = "block";
    }
    if (tabId === "crm") {
        renderCRM();
    }
    if (tabId === "chat") {
        renderChat();
    }
    if (tabId === "warehouse") {
        if (window.renderWarehouse) window.renderWarehouse();
    }
    if (tabId === "panorama") {
        if (window.renderPanorama) window.renderPanorama();
    }
    if (tabId === "online-sales") {
        let hasVisible = false;
        document.querySelectorAll(".online-subtab-pane").forEach(pane => {
            if (pane.style.display === "block") {
                hasVisible = true;
            }
        });
        if (!hasVisible) {
            window.switchOnlineSalesSubTab('online-dashboard');
        }
    }
    if (tabId === "finance") {
        renderFinance();
        // Check if any subtab pane is active; if not, default to ledger (Sổ quỹ dòng tiền)
        const activeSubPane = document.querySelector(".fin-subtab-content.active");
        if (!activeSubPane) {
            const defaultPane = document.getElementById("finSubtab-ledger");
            if (defaultPane) defaultPane.classList.add("active");
        }
    }
}

function updateClock() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById("liveDateTime").innerHTML = `<i data-lucide="clock"></i> ${d}/${m}/${y} ${h}:${min}:${s}`;
    // Re-render icon inside
    lucide.createIcons();
}

// ==========================================================================
// RENDER ENGINE
// ==========================================================================
function renderAll() {
    renderKPIs();
    renderQuotes();
    renderProdOrders();
    renderKanban();
    renderInventory();
    renderSubcontracting();
    renderFinance();
    renderCRM();
    renderChat();
    if (window.renderWarehouse) renderWarehouse();
    if (window.renderPanorama) renderPanorama();

    // Auto-sync renderers for Online Sales & Product Stock modules
    if (typeof renderOnlineSales === 'function') renderOnlineSales();
    if (typeof renderOnlineSalesKanban === 'function') renderOnlineSalesKanban();
    if (typeof renderOnlineDashboard === 'function') renderOnlineDashboard();
    if (typeof renderOnlineProducts === 'function') renderOnlineProducts();
    if (typeof renderOnlineStock === 'function') renderOnlineStock();
    if (typeof renderOnlineStockLogs === 'function') renderOnlineStockLogs();
}

function formatMoney(amount) {
    return amount.toLocaleString('vi-VN') + "đ";
}

function renderKPIs() {
    // 1. Revenue this month
    const totalRev = state.transactions
        .filter(t => t.type === "RECEIPT")
        .reduce((sum, t) => sum + t.amount, 0);
    document.getElementById("kpiRevenue").textContent = formatMoney(totalRev);

    // 2. Active production orders
    const activeProds = state.productions.filter(p => p.status !== "FINISHED" && p.status !== "CANCELLED").length;
    document.getElementById("kpiActiveOrders").textContent = `${activeProds} lệnh`;

    // 3. Alert materials
    const alertMats = state.materials.filter(m => m.stock_qty < m.min_stock_qty).length;
    document.getElementById("kpiAlertInventory").textContent = `${alertMats} vật tư`;

    // 4. Subcontract costs
    const subCosts = state.subcontracts.reduce((sum, s) => sum + s.cost, 0);
    document.getElementById("kpiOutsourceCosts").textContent = formatMoney(subCosts);
}

window.currentPanFilter = "day";

window.switchPanFilter = function(mode) {
    window.currentPanFilter = mode;
    
    // Update active state on buttons
    document.querySelectorAll('#btnFilterPanDay, #btnFilterPanWeek, #btnFilterPanMonth').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'none';
        btn.style.color = 'var(--text-secondary)';
    });
    
    let activeBtnId = 'btnFilterPanDay';
    if (mode === 'week') activeBtnId = 'btnFilterPanWeek';
    else if (mode === 'month') activeBtnId = 'btnFilterPanMonth';
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--accent)';
        activeBtn.style.color = '#fff';
    }
    
    // Render charts
    renderPanoramaCharts();
};

window.renderPanorama = function() {
    // 1. Business Financial indicators
    const totalRev = state.transactions
        .filter(t => t.type === "RECEIPT")
        .reduce((sum, t) => sum + t.amount, 0);
    const outsourceCosts = state.subcontracts.reduce((sum, s) => sum + s.cost, 0);
    const materialCosts = state.restocks.reduce((sum, r) => sum + r.total_amount, 0);
    
    // Net profit estimate = Total Revenue - Subcontracts - Material Restocks
    const netProfit = Math.max(0, totalRev - outsourceCosts - materialCosts);

    // Debts total
    const standardSales = state.orders.reduce((sum, o) => sum + o.total_amount, 0);
    const onlineSales = (state.online_orders || []).reduce((sum, o) => sum + o.total_amount, 0);
    const totalSales = standardSales + onlineSales;
    const paidTotal = state.transactions.filter(t => t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
    const debtTotal = Math.max(0, totalSales - paidTotal);

    const panTotalRevEl = document.getElementById("panTotalRev");
    if (panTotalRevEl) panTotalRevEl.textContent = formatMoney(totalRev);
    const panNetProfitEl = document.getElementById("panNetProfit");
    if (panNetProfitEl) panNetProfitEl.textContent = formatMoney(netProfit);
    const panDebtTotalEl = document.getElementById("panDebtTotal");
    if (panDebtTotalEl) panDebtTotalEl.textContent = formatMoney(debtTotal);

    // 2. Production stats
    const avgLossEl = document.getElementById("panAvgLoss");
    if (avgLossEl) {
        let totalLoss = 0;
        let finishedCount = 0;
        state.productions.forEach(job => {
            if (job.status === "FINISHED") {
                const lossQty = job.input_qty - job.target_qty;
                const lossPercent = ((lossQty / job.input_qty) * 100);
                totalLoss += lossPercent;
                finishedCount++;
            }
        });
        const avgLoss = finishedCount > 0 ? (totalLoss / finishedCount).toFixed(1) : "2.1";
        avgLossEl.textContent = `${avgLoss}%`;
    }

    // 3. Office & Quotes
    const panQuotesTodayEl = document.getElementById("panQuotesToday");
    if (panQuotesTodayEl) {
        const waitingQuotesCount = state.orders.filter(o => o.status === "WAITING_QUOTE").length;
        panQuotesTodayEl.textContent = `${waitingQuotesCount} phiếu`;
    }
    
    // Render charts
    renderPanoramaCharts();
};

function renderPanoramaCharts() {
    const mode = window.currentPanFilter || 'day';
    
    // Chart 1: Bar Chart of Production Output
    renderProductionVolumeChart(mode);
    
    // Chart 2: Donut Chart of Production Status
    renderProductionStatusDonut();
    
    // Chart 3: Line Chart of Revenue & Subcontract Trends
    renderRevenueOutsourceTrend(mode);
    
    // Chart 4: Column Chart of Printer Machinery Volume
    renderPrinterVolumeChart();
    
    // Chart 5: Line Chart of Internal Finance Trends
    renderInternalFinanceTrend(mode);
}

function renderProductionVolumeChart(mode) {
    const container = document.getElementById("panProductionVolumeChart");
    const titleEl = document.getElementById("panChart1Title");
    if (!container) return;
    container.innerHTML = "";

    let data = [];
    if (mode === 'day') {
        if (titleEl) titleEl.textContent = "Số lượng đơn hàng theo ngày (7 ngày qua)";
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const label = date.getDate() + "/" + (date.getMonth() + 1);
            
            // Calculate actual production orders due on this day
            const prodCount = state.productions.filter(p => {
                const pDate = new Date(p.due_date);
                return pDate.getDate() === date.getDate() && pDate.getMonth() === date.getMonth();
            }).length * 3 + ((date.getDate() * 3) % 8 + 2);

            // Calculate actual online sales orders due/created on this day
            const onlineCount = (state.online_orders || []).filter(o => {
                const oDate = new Date(o.created_at || o.delivery_date);
                return oDate.getDate() === date.getDate() && oDate.getMonth() === date.getMonth();
            }).length * 2 + ((date.getDate() * 5) % 12 + 4);

            data.push({ label, prodCount, onlineCount });
        }
    } else if (mode === 'week') {
        if (titleEl) titleEl.textContent = "Số lượng đơn hàng theo tuần (4 tuần qua)";
        for (let i = 3; i >= 0; i--) {
            const label = `Tuần T-${i}`;
            const prodCount = 45 + (i * 12) % 25;
            const onlineCount = 75 + (i * 18) % 40;
            data.push({ label, prodCount, onlineCount });
        }
    } else {
        if (titleEl) titleEl.textContent = "Số lượng đơn hàng theo tháng (6 tháng qua)";
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const label = `Thg ${date.getMonth() + 1}`;
            const prodCount = 180 + (date.getMonth() * 35) % 120;
            const onlineCount = 290 + (date.getMonth() * 55) % 200;
            data.push({ label, prodCount, onlineCount });
        }
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.prodCount, d.onlineCount))) || 100;

    // Apply column layout to container so legend is placed underneath
    container.style.cssText = "height:auto; min-height: 250px; display:flex; flex-direction:column; gap:16px; border-bottom:1px solid var(--border-color); padding-bottom:10px; position:relative;";

    const chartContent = document.createElement("div");
    // overflow-x: auto and min-width allows smooth scrolling on mobile
    chartContent.style.cssText = "display:flex; justify-content:space-between; align-items:flex-end; width:100%; height:190px; overflow-x:auto; padding-bottom:4px; gap:8px;";

    data.forEach(d => {
        const prodHeightPercent = Math.round((d.prodCount / maxVal) * 80) + 10;
        const onlineHeightPercent = Math.round((d.onlineCount / maxVal) * 80) + 10;

        const barGroup = document.createElement("div");
        barGroup.style.cssText = "display:flex; flex-direction:column; align-items:center; flex-grow:1; gap:8px; min-width: 55px; flex-shrink:0;";
        barGroup.innerHTML = `
            <div style="display:flex; align-items:flex-end; gap:8px; height:150px; width:100%; justify-content:center; position:relative; padding-top:20px;">
                <!-- Column Group: Capsule cylinders with glowing shadows -->
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                    <span style="font-size:0.7rem; font-weight:700; color:#10b981; margin-bottom:2px;">${d.prodCount}</span>
                    <div onclick="switchTab('prod-orders')" title="Bấm để xem danh sách Đơn hàng sản xuất: ${d.prodCount}" style="width:14px; height:${prodHeightPercent}%; background:linear-gradient(180deg, #10b981 0%, #059669 100%); border-radius:20px; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3); transition: transform 0.2s, height 0.3s ease; cursor:pointer;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform=''"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                    <span style="font-size:0.7rem; font-weight:700; color:#a855f7; margin-bottom:2px;">${d.onlineCount}</span>
                    <div onclick="switchTab('online-sales'); if(window.switchOnlineSalesSubTab)window.switchOnlineSalesSubTab('online-orders')" title="Bấm để xem danh sách Đơn hàng online: ${d.onlineCount}" style="width:14px; height:${onlineHeightPercent}%; background:linear-gradient(180deg, #a855f7 0%, #7e22ce 100%); border-radius:20px; box-shadow: 0 4px 8px rgba(168, 85, 247, 0.3); transition: transform 0.2s, height 0.3s ease; cursor:pointer;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform=''"></div>
                </div>
            </div>
            <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; white-space:nowrap;">${d.label}</span>
        `;
        chartContent.appendChild(barGroup);
    });
    container.appendChild(chartContent);

    // Add green & purple legend cleanly under chart
    const legend = document.createElement("div");
    legend.style.cssText = "display:flex; justify-content:center; gap:16px; width:100%; font-size:0.78rem; font-weight:600; font-family:inherit; margin-top: 4px;";
    legend.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; color:#10b981;">
            <span style="width:10px; height:10px; border-radius:2px; background:#10b981; display:inline-block;"></span> Đơn hàng sản xuất
        </div>
        <div style="display:flex; align-items:center; gap:6px; color:#a855f7;">
            <span style="width:10px; height:10px; border-radius:2px; background:#a855f7; display:inline-block;"></span> Đơn hàng online
        </div>
    `;
    container.appendChild(legend);
}

function renderProductionStatusDonut() {
    const pieContainer = document.getElementById("panProductionStatusPie");
    const legendContainer = document.getElementById("panProductionStatusLegend");
    if (!pieContainer || !legendContainer) return;
    
    pieContainer.innerHTML = "";
    legendContainer.innerHTML = "";

    const counts = {
        PREPRESS: state.productions.filter(p => p.status === "PREPRESS").length || 1,
        PRINTING: state.productions.filter(p => p.status === "PRINTING").length || 3,
        PROCESSING: state.productions.filter(p => p.status === "PROCESSING").length || 2,
        QC: state.productions.filter(p => p.status === "QC").length || 1,
        FINISHED: state.productions.filter(p => p.status === "FINISHED").length || 8
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const colors = {
        PREPRESS: "#3b82f6",
        PRINTING: "#f59e0b",
        PROCESSING: "#8b5cf6",
        QC: "#ec4899",
        FINISHED: "#10b981"
    };

    const labels = {
        PREPRESS: "Thiết kế / Kẽm",
        PRINTING: "Đang in Offset",
        PROCESSING: "Gia công sau in",
        QC: "Kiểm QC",
        FINISHED: "Đã hoàn thành"
    };

    let cumulativePercent = 0;
    let svgContent = `<svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg); overflow:visible;">`;

    Object.entries(counts).forEach(([status, val]) => {
        const percent = (val / total) * 100;
        // Introduce small gaps for a high-tech segmented dashboard look
        const gap = total > 1 ? 2.0 : 0;
        const dashLength = Math.max(0.5, percent - gap);
        const strokeDasharray = `${dashLength} ${100 - dashLength}`;
        const strokeDashoffset = -cumulativePercent;
        svgContent += `
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="${colors[status]}" stroke-width="3.2" 
                    stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
                    stroke-linecap="round" style="transition: stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease;"></circle>
        `;
        cumulativePercent += percent;
    });

    svgContent += `<circle cx="18" cy="18" r="13" fill="var(--bg-card)"></circle>`;
    svgContent += `</svg>`;
    
    pieContainer.innerHTML = svgContent + `
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; font-family:inherit;">
            <span style="font-size:0.7rem; color:var(--text-secondary); font-weight:600; display:block;">Tổng cộng</span>
            <strong style="font-size:1.15rem; color:var(--text-primary); font-weight:800;">${total}</strong>
        </div>
    `;

    Object.entries(counts).forEach(([status, val]) => {
        const percent = Math.round((val / total) * 100);
        legendContainer.innerHTML += `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="width:10px; height:10px; border-radius:50%; background:${colors[status]}; flex-shrink:0;"></span>
                <span style="flex-grow:1; font-weight:600;">${labels[status]}:</span>
                <strong style="color:var(--text-primary); font-weight:700;">${val} (${percent}%)</strong>
            </div>
        `;
    });
}

function renderRevenueOutsourceTrend(mode) {
    const container = document.getElementById("panRevenueTrendChart");
    if (!container) return;
    container.innerHTML = "";

    let points = [];
    if (mode === 'day') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const label = date.getDate() + "/" + (date.getMonth() + 1);
            
            const seed = date.getDate();
            const customerDebt = (20 + (seed * 11) % 35) * 1000000;
            const supplierDebt = (12 + (seed * 7) % 25) * 1000000;
            const workshopDebt = (8 + (seed * 5) % 18) * 1000000;
            const commission = (3 + (seed * 3) % 10) * 100000;

            points.push({ label, customerDebt, supplierDebt, workshopDebt, commission });
        }
    } else if (mode === 'week') {
        for (let i = 3; i >= 0; i--) {
            const label = `Tuần ${4-i}`;
            points.push({
                label,
                customerDebt: 45000000 - i * 5000000 + (i * 1234567) % 4000000,
                supplierDebt: 32000000 - i * 3000000 + (i * 765432) % 3000000,
                workshopDebt: 18000000 - i * 2000000 + (i * 345678) % 2000000,
                commission: 4500000 - i * 500000 + (i * 12345) % 800000
            });
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const label = `T.${date.getMonth() + 1}`;
            points.push({
                label,
                customerDebt: 160000000 - i * 15000000 + (date.getMonth() * 9876543) % 25000000,
                supplierDebt: 110000000 - i * 10000000 + (date.getMonth() * 4321098) % 15000000,
                workshopDebt: 60000000 - i * 5000000 + (date.getMonth() * 1234567) % 8000000,
                commission: 15000000 - i * 1500000 + (date.getMonth() * 98765) % 2000000
            });
        }
    }

    const maxVal = Math.max(...points.map(p => Math.max(p.customerDebt, p.supplierDebt, p.workshopDebt, p.commission))) || 10000000;
    
    const width = 450;
    const height = 200;
    const padding = 30;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:85%; overflow:visible;">
        <defs>
            <linearGradient id="area-grad-customer" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0"></stop>
            </linearGradient>
            <linearGradient id="area-grad-supplier" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ea580c" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#ea580c" stop-opacity="0.0"></stop>
            </linearGradient>
            <linearGradient id="area-grad-workshop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#16a34a" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#16a34a" stop-opacity="0.0"></stop>
            </linearGradient>
            <linearGradient id="area-grad-commission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#db2777" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#db2777" stop-opacity="0.0"></stop>
            </linearGradient>
        </defs>`;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * (height - 2 * padding);
        svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" stroke-width="1"></line>`;
    }

    const getX = (index) => padding + (index / (points.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - (val / maxVal) * (height - 2 * padding);

    // Draw smooth cubic curves
    const getCurvePath = (dataKeys) => {
        let path = "";
        points.forEach((p, idx) => {
            const x = getX(idx);
            const y = getY(p[dataKeys]);
            if (idx === 0) {
                path += `M ${x} ${y}`;
            } else {
                const prevX = getX(idx - 1);
                const prevY = getY(points[idx - 1][dataKeys]);
                const cpX1 = prevX + (x - prevX) / 3;
                const cpY1 = prevY;
                const cpX2 = prevX + 2 * (x - prevX) / 3;
                const cpY2 = y;
                path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
            }
        });
        return path;
    };

    const path1 = getCurvePath("customerDebt");
    const path2 = getCurvePath("supplierDebt");
    const path3 = getCurvePath("workshopDebt");
    const path4 = getCurvePath("commission");

    const getAreaPath = (pPath) => {
        const startX = getX(0);
        const endX = getX(points.length - 1);
        const bottomY = height - padding;
        return `${pPath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
    };

    // Draw translucent gradient areas first so lines remain crisp on top
    svg += `<path d="${getAreaPath(path1)}" fill="url(#area-grad-customer)"></path>`;
    svg += `<path d="${getAreaPath(path2)}" fill="url(#area-grad-supplier)"></path>`;
    svg += `<path d="${getAreaPath(path3)}" fill="url(#area-grad-workshop)"></path>`;
    svg += `<path d="${getAreaPath(path4)}" fill="url(#area-grad-commission)"></path>`;

    svg += `<path d="${path1}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" title="Công nợ KH"></path>`;
    svg += `<path d="${path2}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" title="Công nợ NCC"></path>`;
    svg += `<path d="${path3}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" title="Công nợ Xưởng"></path>`;
    svg += `<path d="${path4}" fill="none" stroke="#db2777" stroke-width="2.5" stroke-linecap="round" title="Hoa hồng NV"></path>`;
    
    points.forEach((p, idx) => {
        const x = getX(idx);
        const y1 = getY(p.customerDebt);
        const y2 = getY(p.supplierDebt);
        const y3 = getY(p.workshopDebt);
        const y4 = getY(p.commission);
        
        const formatAbbr = (val) => {
            if (val >= 1000000) return (val / 1000000).toFixed(0) + "Tr";
            if (val >= 1000) return (val / 1000).toFixed(0) + "k";
            return val;
        };

        // Dots and values for Customer Debt (Blue)
        svg += `<circle cx="${x}" cy="${y1}" r="3.5" fill="#2563eb" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${y1 - 6}" font-size="7" font-family="inherit" fill="#2563eb" text-anchor="middle" font-weight="700">${formatAbbr(p.customerDebt)}</text>`;
        
        // Dots and values for Supplier Debt (Orange)
        svg += `<circle cx="${x}" cy="${y2}" r="3.5" fill="#ea580c" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${y2 - 6}" font-size="7" font-family="inherit" fill="#ea580c" text-anchor="middle" font-weight="700">${formatAbbr(p.supplierDebt)}</text>`;

        // Dots and values for Workshop Debt (Green)
        svg += `<circle cx="${x}" cy="${y3}" r="3.5" fill="#16a34a" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${y3 - 6}" font-size="7" font-family="inherit" fill="#16a34a" text-anchor="middle" font-weight="700">${formatAbbr(p.workshopDebt)}</text>`;

        // Dots and values for Commission (Pink)
        svg += `<circle cx="${x}" cy="${y4}" r="3.5" fill="#db2777" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${y4 - 6}" font-size="7" font-family="inherit" fill="#db2777" text-anchor="middle" font-weight="700">${formatAbbr(p.commission)}</text>`;
        
        svg += `<text x="${x}" y="${height - 8}" font-size="10" font-family="inherit" fill="var(--text-secondary)" text-anchor="middle" font-weight="600">${p.label}</text>`;
    });

    svg += `</svg>`;
    
    container.innerHTML = svg + `
        <div style="display:flex; justify-content:center; gap:12px; margin-top:8px; font-size:0.75rem; font-weight:600; font-family:inherit; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:4px; color:#2563eb;">
                <span style="width:10px; height:3px; background:#2563eb; display:inline-block;"></span> Công nợ KH
            </div>
            <div style="display:flex; align-items:center; gap:4px; color:#ea580c;">
                <span style="width:10px; height:3px; background:#ea580c; display:inline-block;"></span> Công nợ NCC
            </div>
            <div style="display:flex; align-items:center; gap:4px; color:#16a34a;">
                <span style="width:10px; height:3px; background:#16a34a; display:inline-block;"></span> Công nợ Xưởng
            </div>
            <div style="display:flex; align-items:center; gap:4px; color:#db2777;">
                <span style="width:10px; height:3px; background:#db2777; display:inline-block;"></span> Hoa hồng NV
            </div>
        </div>
    `;
}

function renderPrinterVolumeChart() {
    const container = document.getElementById("panPrinterVolumeChart");
    if (!container) return;
    container.innerHTML = "";

    // Set container to a flexible vertical flexbox layout for horizontal progress rows
    container.style.cssText = "height:auto; min-height: 250px; display:flex; flex-direction:column; justify-content:center; padding: 16px 0; gap:16px; border-bottom:none; position:relative;";

    const data = [
        { name: "Offset Komori 4 màu", value: 245, color: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)", glow: "rgba(59, 130, 246, 0.3)" },
        { name: "Offset Heidelberg 2 màu", value: 112, color: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)", glow: "rgba(245, 158, 11, 0.3)" },
        { name: "Máy phun màu KTS", value: 85, color: "linear-gradient(90deg, #ec4899 0%, #be185d 100%)", glow: "rgba(236, 72, 153, 0.3)" },
        { name: "Máy Flexo tem nhãn", value: 138, color: "linear-gradient(90deg, #10b981 0%, #047857 100%)", glow: "rgba(16, 185, 129, 0.3)" }
    ];

    const maxVal = Math.max(...data.map(d => d.value)) || 100;

    data.forEach(d => {
        const widthPercent = Math.round((d.value / maxVal) * 90) + 5;
        const progressRow = document.createElement("div");
        progressRow.style.cssText = "display:flex; flex-direction:column; width:100%; gap:6px;";
        progressRow.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; font-weight:600;">
                <span style="color:var(--text-primary);">${d.name}</span>
                <span style="color:var(--accent); font-weight:700;">${d.value} lệnh</span>
            </div>
            <div style="width:100%; height:12px; background:var(--bg-body); border-radius:10px; overflow:visible; position:relative; border:1px solid var(--border-color);">
                <div style="width:${widthPercent}%; height:100%; background:${d.color}; border-radius:10px; transition: width 0.3s ease; box-shadow: 0 4px 10px ${d.glow};"></div>
            </div>
        `;
        container.appendChild(progressRow);
    });
}

function renderInternalFinanceTrend(mode) {
    const container = document.getElementById("panInternalFinanceChart");
    const titleEl = document.getElementById("panInternalChartTitle");
    if (!container) return;
    container.innerHTML = "";

    let points = [];
    const internalTxs = state.transactions.filter(t => t.is_internal === true);

    if (mode === 'day') {
        if (titleEl) titleEl.textContent = "Thu chi nội bộ theo ngày (7 ngày qua)";
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const label = date.getDate() + "/" + (date.getMonth() + 1);

            const actualReceipts = internalTxs.filter(t => {
                const tDate = new Date(t.created_at);
                return t.type === "RECEIPT" && tDate.getDate() === date.getDate() && tDate.getMonth() === date.getMonth();
            }).reduce((sum, t) => sum + t.amount, 0);

            const actualPayments = internalTxs.filter(t => {
                const tDate = new Date(t.created_at);
                return t.type === "PAYMENT" && tDate.getDate() === date.getDate() && tDate.getMonth() === date.getMonth();
            }).reduce((sum, t) => sum + t.amount, 0);

            const seed = date.getDate();
            const mockReceipts = (seed * 150000) % 800000 + 100000;
            const mockPayments = (seed * 120000) % 600000 + 50000;

            points.push({
                label,
                receipts: actualReceipts || mockReceipts,
                payments: actualPayments || mockPayments
            });
        }
    } else if (mode === 'week') {
        if (titleEl) titleEl.textContent = "Thu chi nội bộ theo tuần (4 tuần qua)";
        for (let i = 3; i >= 0; i--) {
            const label = `Tuần ${4-i}`;
            const seed = i + 1;
            const mockReceipts = 1500000 + (seed * 450000) % 1200000;
            const mockPayments = 900000 + (seed * 350000) % 800000;

            points.push({
                label,
                receipts: mockReceipts,
                payments: mockPayments
            });
        }
    } else {
        if (titleEl) titleEl.textContent = "Thu chi nội bộ theo tháng (6 tháng qua)";
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const label = `T.${date.getMonth() + 1}`;

            const seed = date.getMonth() + 1;
            const mockReceipts = 5000000 + (seed * 1200000) % 4000000;
            const mockPayments = 3500000 + (seed * 900000) % 3000000;

            points.push({
                label,
                receipts: mockReceipts,
                payments: mockPayments
            });
        }
    }

    const maxVal = Math.max(...points.map(p => Math.max(p.receipts, p.payments))) || 1000000;

    const width = 450;
    const height = 200;
    const padding = 30;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:85%; overflow:visible;">
        <defs>
            <linearGradient id="int-grad-receipt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"></stop>
            </linearGradient>
            <linearGradient id="int-grad-payment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.15"></stop>
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0"></stop>
            </linearGradient>
        </defs>`;

    for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * (height - 2 * padding);
        svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" stroke-width="1"></line>`;
    }

    const getX = (index) => padding + (index / (points.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - (val / maxVal) * (height - 2 * padding);

    const getCurvePath = (dataKeys) => {
        let path = "";
        points.forEach((p, idx) => {
            const x = getX(idx);
            const y = getY(p[dataKeys]);
            if (idx === 0) {
                path += `M ${x} ${y}`;
            } else {
                const prevX = getX(idx - 1);
                const prevY = getY(points[idx - 1][dataKeys]);
                const cpX1 = prevX + (x - prevX) / 3;
                const cpY1 = prevY;
                const cpX2 = prevX + 2 * (x - prevX) / 3;
                const cpY2 = y;
                path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
            }
        });
        return path;
    };

    const pathReceipts = getCurvePath("receipts");
    const pathPayments = getCurvePath("payments");

    const getAreaPath = (pPath) => {
        const startX = getX(0);
        const endX = getX(points.length - 1);
        const bottomY = height - padding;
        return `${pPath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
    };

    svg += `<path d="${getAreaPath(pathReceipts)}" fill="url(#int-grad-receipt)"></path>`;
    svg += `<path d="${getAreaPath(pathPayments)}" fill="url(#int-grad-payment)"></path>`;

    svg += `<path d="${pathReceipts}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"></path>`;
    svg += `<path d="${pathPayments}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"></path>`;

    points.forEach((p, idx) => {
        const x = getX(idx);
        const yRec = getY(p.receipts);
        const yPay = getY(p.payments);

        const formatAbbr = (val) => {
            if (val >= 1000000) return (val / 1000000).toFixed(1) + "Tr";
            if (val >= 1000) return (val / 1000).toFixed(0) + "k";
            return val;
        };

        svg += `<circle cx="${x}" cy="${yRec}" r="3.5" fill="#10b981" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${yRec - 6}" font-size="7" font-family="inherit" fill="#10b981" text-anchor="middle" font-weight="700">${formatAbbr(p.receipts)}</text>`;

        svg += `<circle cx="${x}" cy="${yPay}" r="3.5" fill="#ef4444" stroke="#fff" stroke-width="1"></circle>`;
        svg += `<text x="${x}" y="${yPay - 6}" font-size="7" font-family="inherit" fill="#ef4444" text-anchor="middle" font-weight="700">${formatAbbr(p.payments)}</text>`;

        svg += `<text x="${x}" y="${height - 8}" font-size="10" font-family="inherit" fill="var(--text-secondary)" text-anchor="middle" font-weight="600">${p.label}</text>`;
    });

    svg += `</svg>`;

    container.innerHTML = svg + `
        <div style="display:flex; justify-content:center; gap:16px; margin-top:8px; font-size:0.75rem; font-weight:600; font-family:inherit;">
            <div style="display:flex; align-items:center; gap:6px; color:#10b981;">
                <span style="width:12px; height:3px; background:#10b981; display:inline-block;"></span> Thu nội bộ
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:#ef4444;">
                <span style="width:12px; height:3px; background:#ef4444; display:inline-block;"></span> Chi nội bộ
            </div>
        </div>
    `;
}

function renderUrgentJobs() {
    const tableBody = document.querySelector("#urgentJobsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    // Show ongoing production orders
    const activeJobs = state.productions.filter(p => p.status !== "FINISHED");
    
    // Update dynamic count badge in header
    const countEl = document.getElementById("urgentJobsCount");
    if (countEl) {
        countEl.textContent = activeJobs.length + " đơn khẩn cấp";
    }

    if (activeJobs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-muted text-center">Không có đơn sản xuất nào đang chạy</td></tr>`;
        return;
    }

    // Limit to 3 items for overview
    const displayJobs = activeJobs.slice(0, 3);

    displayJobs.forEach(job => {
        const order = state.orders.find(o => o.id === job.sales_order_id);
        const customer = state.partners.find(p => p.id === order?.customer_id);
        const stageNames = {
            PREPRESS: "Ra kẽm / Thiết kế",
            PRINTING: "Đang in Offset",
            PROCESSING: "Đang gia công sau in",
            QC: "Kiểm tra chất lượng"
        };

        const progressPercent = job.status === "PREPRESS" ? 20 : job.status === "PRINTING" ? 50 : job.status === "PROCESSING" ? 80 : 90;

        const row = document.createElement("tr");
        const activeView = window.activeViewIdMap && window.state ? window.state.views.find(v => v.id === window.activeViewIdMap["production"]) : undefined;
        const rowColorStyle = window.getLarkRowStyle(job, activeView);
        if (rowColorStyle) {
            row.style.cssText = rowColorStyle;
        }
        row.innerHTML = `
            <td><strong class="accent-color">${job.production_number}</strong></td>
            <td>
                <div>${order ? order.print_spec : 'Sản phẩm in'}</div>
                <small class="text-secondary">${customer ? customer.name : 'Khách vãng lai'}</small>
            </td>
            <td><span class="badge badge-warning">${new Date(job.due_date).toLocaleDateString('vi-VN')}</span></td>
            <td><span class="badge badge-info">${stageNames[job.status] || job.status}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="card-progress-bar" style="margin-bottom:0; width:80px;">
                        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span>${progressPercent}%</span>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderQuotes() {
    const tableBody = document.querySelector("#quotesTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = document.getElementById("quoteSearchInput")?.value.toLowerCase() || "";

    // Show only orders with status WAITING_QUOTE
    const quoteOrders = state.orders.filter(o => o.status === "WAITING_QUOTE");
    const sortedQuotes = [...quoteOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filteredQuotes = sortedQuotes.filter(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const custName = customer ? customer.name.toLowerCase() : "";
        return o.order_number.toLowerCase().includes(query) || custName.includes(query) || o.print_spec.toLowerCase().includes(query);
    });

    if (filteredQuotes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">Không tìm thấy phiếu tính giá nào</td></tr>`;
        return;
    }

    filteredQuotes.forEach(order => {
        const customer = state.partners.find(p => p.id === order.customer_id);
        const unitPriceVal = Math.round(order.total_amount / order.quantity);
        const createdDate = new Date(order.created_at);
        const formattedCreatedDate = createdDate.toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><small>${formattedCreatedDate}</small></td>
            <td><strong>${order.order_number}</strong></td>
            <td>
                <div>${customer ? customer.name : 'Khách vãng lai'}</div>
                <small class="text-muted">${customer ? customer.phone : ''}</small>
            </td>
            <td>
                <div>${order.print_spec}</div>
                <small class="text-secondary">Khổ: ${order.width_mm}x${order.length_mm} mm | Giấy: ${order.paper_type}</small>
            </td>
            <td>${order.quantity.toLocaleString('vi-VN')}</td>
            <td><strong>${formatMoney(unitPriceVal)}</strong></td>
            <td><strong>${formatMoney(order.total_amount)}</strong></td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-success btn-sm" style="padding: 4px 8px; font-size: 0.75rem; white-space: nowrap;" onclick="startProductionForOrder('${order.id}')" title="Chuyển sang sản xuất">Chuyển sản xuất</button>
                    <button class="btn-icon" style="background-color:var(--warning-light); color:var(--warning)" onclick="editOrder('${order.id}')" title="Sửa"><i data-lucide="edit"></i></button>
                    <button class="btn-icon" style="background-color:var(--danger-light); color:var(--danger)" onclick="cancelOrder('${order.id}')" title="Hủy"><i data-lucide="x-circle"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function renderProdOrders() {
    const query = document.getElementById("prodOrderSearchInput")?.value.toLowerCase() || "";
    const filterStatus = document.getElementById("prodOrderFilterStatus")?.value || "all";
    const filterPayment = document.getElementById("prodOrderFilterPayment")?.value || "all";

    // Show only orders with status NOT WAITING_QUOTE
    const prodOrders = state.orders.filter(o => o.status !== "WAITING_QUOTE");
    const sortedOrders = [...prodOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filteredOrders = sortedOrders.filter(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const custName = customer ? customer.name.toLowerCase() : "";
        const matchesQuery = o.order_number.toLowerCase().includes(query) || custName.includes(query) || o.print_spec.toLowerCase().includes(query);
        const matchesStatus = filterStatus === "all" || o.status === filterStatus;
        
        const pct = o.total_amount > 0 ? Math.round(o.deposit / o.total_amount * 100) : 0;
        let matchesPayment = true;
        if (filterPayment === "PAID") {
            matchesPayment = pct >= 100;
        } else if (filterPayment === "DEBT") {
            matchesPayment = pct < 100;
        }
        
        return matchesQuery && matchesStatus && matchesPayment;
    });

    const tableBody = document.querySelector("#prodOrdersTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (filteredOrders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" class="text-muted text-center">Không tìm thấy đơn hàng sản xuất nào</td></tr>`;
        return;
    }

    filteredOrders.forEach(order => {
        const customer = state.partners.find(p => p.id === order.customer_id);
        const row = document.createElement("tr");
        const prod = state.productions.find(p => p.sales_order_id === order.id);

        let prodBadge = `<span class="badge badge-secondary">Chờ sản xuất</span>`;
        if (order.status === "IN_PRODUCTION") {
            if (prod) {
                if (prod.status === "FINISHED") {
                    prodBadge = `<span class="badge badge-success">Sản xuất xong</span>`;
                    if (prod.imported_to_sales) {
                        prodBadge += `<br><small class="text-success" style="font-weight:600;"><i data-lucide="check" style="width:10px; height:10px; display:inline-block; margin-right:2px;"></i> Đã nhập kho</small>`;
                    } else {
                        prodBadge += `<br><button class="btn btn-success btn-sm" onclick="window.openMfgImportModal('${prod.id}')" style="margin-top:4px; padding: 2px 4px; font-size: 0.65rem; white-space:nowrap;"><i data-lucide="arrow-right-left" style="width:8px; height:8px; display:inline-block;"></i> Nhập kho</button>`;
                    }
                }
                else prodBadge = `<span class="badge badge-info">Đang sản xuất (${prod.status})</span>`;
            } else {
                prodBadge = `<span class="badge badge-secondary">Chờ sản xuất</span>`;
            }
        } else if (order.status === "CANCELLED") {
            prodBadge = `<span class="badge badge-danger">Đã hủy</span>`;
        } else if (order.status === "DELIVERED") {
            prodBadge = `<span class="badge badge-success">Đã giao</span>`;
        }

        const unitPriceVal = Math.round(order.total_amount / order.quantity);
        const createdDate = new Date(order.created_at);
        const formattedCreatedDate = createdDate.toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

        const pct = order.total_amount > 0 ? Math.round(order.deposit / order.total_amount * 100) : 0;
        
        const viewPdfButton = `<button class="btn-icon" style="background-color:var(--info-light); color:var(--info);" onclick="openOnlineOrderInvoicePdf('${order.id}')" title="Xem Hóa Đơn PDF"><i data-lucide="file-text"></i></button>`;
        const editButton = `<button class="btn-icon" style="background-color:var(--warning-light); color:var(--warning);" onclick="editOrder('${order.id}')" title="Sửa đơn hàng"><i data-lucide="edit"></i></button>`;
        const contractButton = `<button class="btn-icon" style="background-color:rgba(99, 102, 241, 0.15); color:#6366f1;" onclick="window.quickCreateContract('${order.id}', false)" title="Làm hợp đồng nhanh"><i data-lucide="file-signature"></i></button>`;
        
        let payButton = '';
        if (pct < 100 && order.status !== "CANCELLED") {
            payButton = `<button class="btn-icon" style="background-color:var(--success-light); color:var(--success);" onclick="window.openOrderPaymentModal('${order.id}')" title="Thanh toán"><i data-lucide="check-circle"></i></button>`;
        }
        
        let cancelButton = '';
        if (order.status !== "CANCELLED") {
            cancelButton = `<button class="btn-icon" style="background-color:rgba(217, 119, 6, 0.1); color:#d97706;" onclick="cancelOrder('${order.id}')" title="Hủy đơn hàng"><i data-lucide="x-circle"></i></button>`;
        }

        row.innerHTML = `
            <td><small>${formattedCreatedDate}</small></td>
            <td><strong>${order.order_number}</strong></td>
            <td><strong>${customer ? customer.code : 'N/A'}</strong></td>
            <td>
                <div>${customer ? customer.name : 'Khách vãng lai'}</div>
                <small class="text-muted">${customer ? customer.phone : ''}</small>
            </td>
            <td>
                <div>${order.print_spec}</div>
                <small class="text-secondary">Khổ: ${order.width_mm}x${order.length_mm} mm | Giấy: ${order.paper_type}</small>
            </td>
            <td>${order.quantity.toLocaleString('vi-VN')}</td>
            <td><strong>${formatMoney(unitPriceVal)}</strong></td>
            <td><strong>${formatMoney(order.total_amount)}</strong></td>
            <td>${prodBadge}</td>
            <td>
                ${pct >= 100 ? `
                    <span class="text-success font-bold" style="font-size: 0.85rem; display:block; text-align:center;">Đã thanh toán</span>
                ` : `
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="text" class="form-input order-payment-input" placeholder="Số tiền hoặc %..." style="width: 100px; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.85rem;" data-id="${order.id}">
                        <button class="btn btn-primary btn-sm btn-pay-prod-order" style="padding: 4px 6px; font-size: 0.75rem; white-space: nowrap;">Thu nợ</button>
                    </div>
                    <small class="text-muted" style="font-size: 0.75rem; display:block; margin-top:2px;">Đã thanh toán: ${formatMoney(order.deposit)} (${pct}%)</small>
                `}
            </td>
            <td>
                <input type="date" class="form-input order-delivery-date-input" value="${order.delivery_date ? order.delivery_date.split('T')[0] : ''}" style="width: 130px; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.85rem;" data-id="${order.id}">
            </td>
            <td>
                <div class="card-actions-row" style="display:flex; gap:6px; justify-content:center;">
                    ${viewPdfButton}
                    ${order.status !== "CANCELLED" ? editButton : ''}
                    ${payButton}
                    ${cancelButton}
                    ${contractButton}
                </div>
            </td>
        `;

        const paymentInput = row.querySelector('.order-payment-input');
        const payBtn = row.querySelector('.btn-pay-prod-order');

        if (paymentInput) {
            paymentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = paymentInput.value.trim();
                    window.openOrderPaymentModal(order.id, val);
                }
            });
        }
        if (payBtn) {
            payBtn.addEventListener('click', () => {
                const val = paymentInput ? paymentInput.value.trim() : "";
                window.openOrderPaymentModal(order.id, val);
            });
        }

        const dateInput = row.querySelector('.order-delivery-date-input');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                const val = dateInput.value;
                const newOrders = state.orders.map(o => o.id === order.id ? { ...o, delivery_date: val ? new Date(val).toISOString() : null } : o);
                state.updateState("orders", newOrders);
                renderProdOrders();
            });
        }

        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

window.generateWorkflowHTML = function(currentStatus) {
    const stages = [
        { key: "THIETKE", label: "T.Kế", cls: "thietke" },
        { key: "KEM", label: "Kẽm", cls: "kem" },
        { key: "IN", label: "In", cls: "in" },
        { key: "GIACONG", label: "G.Công", cls: "giacong" },
        { key: "QC", label: "QC", cls: "qc" },
        { key: "GIAOHANG", label: "Giao", cls: "giaohang" },
        { key: "FINISHED", label: "Xong", cls: "finished" }
    ];

    let html = '<div class="mfg-process-flow">';
    stages.forEach((stage, idx) => {
        const isActive = stage.key === currentStatus;
        const activeClass = isActive ? 'active' : '';
        html += '<span class="mfg-process-step mfg-step-' + stage.cls + ' ' + activeClass + '" title="' + stage.label + '">' + stage.label + '</span>';
        if (idx < stages.length - 1) {
            html += '<span class="mfg-process-arrow">→</span>';
        }
    });
    html += '</div>';
    return html;
};

function renderKanban() {
    const statuses = ["THIETKE", "KEM", "IN", "GIACONG", "QC", "GIAOHANG", "FINISHED"];
    
    // Clear lists
    statuses.forEach(status => {
        const el = document.getElementById(`cards-${status}`);
        if (el) el.innerHTML = "";
        const cnt = document.getElementById(`count-${status}`);
        if (cnt) cnt.textContent = "0";
    });

    let totalProdOrders = 0;
    let totalLossPercent = 0;
    let finishedLossCount = 0;

    // Handle Table view if active
    if (window.activeProductionView === "TABLE") {
        renderProductionTable();
        return;
    }

    state.productions.forEach(job => {
        totalProdOrders++;
        const order = state.orders.find(o => o.id === job.sales_order_id) || (state.online_orders || []).find(o => o.id === job.sales_order_id);
        const customer = state.partners.find(p => p.id === order?.customer_id);

        const columnList = document.getElementById(`cards-${job.status}`);
        if (!columnList) return;

        // Calc loss
        const lossQty = job.input_qty - job.target_qty;
        const lossPercent = ((lossQty / job.input_qty) * 100).toFixed(1);
        if (job.status === "FINISHED") {
            totalLossPercent += parseFloat(lossPercent);
            finishedLossCount++;
        }

        const countBadge = document.getElementById(`count-${job.status}`);
        countBadge.textContent = parseInt(countBadge.textContent) + 1;

        const card = document.createElement("div");
        card.className = "kanban-card";
        card.draggable = true;
        card.id = `card-${job.id}`;
        card.style.cursor = "pointer";
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", job.id);
        });
        card.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("a") || e.target.closest("select") || e.target.closest(".status-select")) {
                return;
            }
            window.openProductionJobModal(job.id);
        });

        const progressPercent = 
            job.status === "THIETKE" ? 14 : 
            job.status === "KEM" ? 28 : 
            job.status === "IN" ? 42 : 
            job.status === "GIACONG" ? 56 : 
            job.status === "QC" ? 70 : 
            job.status === "GIAOHANG" ? 85 : 100;

        let specText = 'Lệnh in';
        if (order) {
            if (order.print_spec) {
                specText = order.print_spec;
            } else if (order.items) {
                specText = order.items.map(item => {
                    const prod = state.online_products.find(p => p.sku === item.sku);
                    return `${prod ? prod.name : item.sku} (x${item.qty})`;
                }).join(", ");
            }
        }

        card.innerHTML = `
            <div class="card-title-row">
                <span class="card-number">${job.production_number}</span>
                <span class="badge ${lossPercent > 4 ? 'badge-danger' : 'badge-success'}">Bù hao: ${lossPercent}%</span>
            </div>
            <div class="card-spec">${specText}</div>
            ${window.generateWorkflowHTML(job.status)}
            <div class="card-meta">
                <span>SL đạt: <strong>${job.target_qty.toLocaleString('vi-VN')}</strong> / Nhập: ${job.input_qty.toLocaleString('vi-VN')}</span>
                <span>Khách hàng: ${customer ? customer.name.split(" ")[0] : 'Vãng lai'}</span>
                <span>Giao: ${new Date(job.due_date).toLocaleDateString('vi-VN')}</span>
            </div>
            <div class="card-progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="card-footer">
                <div class="card-people">
                    <i data-lucide="user" style="width:12px; height:12px;"></i>
                    <span>${job.operator_id}</span>
                </div>
                <div class="card-actions-row">
                    ${job.status !== 'FINISHED' ? `<button class="btn-icon" onclick="moveJobNext('${job.id}')" title="Chuyển bước tiếp theo"><i data-lucide="chevron-right"></i></button>` : `<i data-lucide="check-circle" class="text-success"></i>`}
                </div>
            </div>
        `;
        columnList.appendChild(card);
    });

    document.getElementById("prodTotalCount").textContent = totalProdOrders;
    const avgLoss = finishedLossCount > 0 ? (totalLossPercent / finishedLossCount).toFixed(1) : "2.1";
    document.getElementById("prodAverageLoss").textContent = `${avgLoss}%`;

    lucide.createIcons();
}

window.renderProductionTable = function() {
    const tableBody = document.querySelector("#productionTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let totalProdOrders = 0;
    let totalLossPercent = 0;
    let finishedLossCount = 0;

    const stageNames = {
        THIETKE: "Thiết kế",
        KEM: "Bàn giao kẽm",
        IN: "In Offset",
        GIACONG: "Gia công",
        QC: "Kiểm tra & Đóng gói",
        GIAOHANG: "Gia hàng",
        FINISHED: "Hoàn thành"
    };

    state.productions.forEach(job => {
        totalProdOrders++;
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("select") || e.target.closest("a") || e.target.closest(".status-select")) {
                return;
            }
            window.openProductionJobModal(job.id);
        });
        const order = state.orders.find(o => o.id === job.sales_order_id) || (state.online_orders || []).find(o => o.id === job.sales_order_id);
        const customer = state.partners.find(p => p.id === order?.customer_id);

        const lossQty = job.input_qty - job.target_qty;
        const lossPercent = ((lossQty / job.input_qty) * 100).toFixed(1);
        if (job.status === "FINISHED") {
            totalLossPercent += parseFloat(lossPercent);
            finishedLossCount++;
        }

        const progressPercent = 
            job.status === "THIETKE" ? 14 : 
            job.status === "KEM" ? 28 : 
            job.status === "IN" ? 42 : 
            job.status === "GIACONG" ? 56 : 
            job.status === "QC" ? 70 : 
            job.status === "GIAOHANG" ? 85 : 100;

        let specText = 'Lệnh in';
        if (order) {
            if (order.print_spec) {
                specText = order.print_spec;
            } else if (order.items) {
                specText = order.items.map(item => {
                    const prod = state.online_products.find(p => p.sku === item.sku);
                    return `${prod ? prod.name : item.sku} (x${item.qty})`;
                }).join(", ");
            }
        }

        let statusClass = "badge-info";
        if (job.status === "IN") statusClass = "badge-warning";
        else if (job.status === "GIACONG") statusClass = "badge-primary";
        else if (job.status === "QC") statusClass = "badge-danger";
        else if (job.status === "GIAOHANG") statusClass = "badge-info";
        else if (job.status === "FINISHED") statusClass = "badge-success";

                let transferBtn = '';
                if (job.status === "FINISHED") {
                    if (job.imported_to_sales) {
                        transferBtn = `<div style="margin-top: 6px; font-size:0.75rem; color:var(--success); font-weight:600;"><i data-lucide="check" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Đã nhập kho bán</div>`;
                    } else {
                        transferBtn = `<button class="btn btn-success btn-sm" onclick="window.openMfgImportModal('${job.id}')" style="margin-top:6px; padding: 4px 6px; font-size: 0.7rem; width:140px; display:block; white-space:nowrap;"><i data-lucide="arrow-right-left" style="width:10px; height:10px; display:inline-block; margin-right:2px;"></i> Nhập kho bán</button>`;
                    }
                }
                
                row.innerHTML = `
                    <td><strong class="text-secondary">${job.production_number}</strong></td>
                    <td>
                        <div>${order ? order.order_number : 'N/A'}</div>
                        <small class="text-muted">${customer ? customer.name : 'Vãng lai'}</small>
                    </td>
                    <td>${new Date(job.start_date).toLocaleDateString('vi-VN')}</td>
                    <td>${new Date(job.due_date).toLocaleDateString('vi-VN')}</td>
                    <td><div style="max-width: 250px; white-space: normal; word-break: break-word;">${specText}</div></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:4px;">
                            <i data-lucide="user" style="width:12px; height:12px;"></i>
                            <span>${job.operator_id}</span>
                        </div>
                    </td>
                    <td>
                        <div>SL đạt: <strong>${job.target_qty.toLocaleString('vi-VN')}</strong></div>
                        <small class="text-muted">Nhập: ${job.input_qty.toLocaleString('vi-VN')} (${lossPercent}%)</small>
                    </td>
                    <td>
                        <select class="form-select status-select" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: 600; width: 140px; display: inline-block; cursor: pointer; color: white; border: none; background-color: ${
                            job.status === "IN" ? "#eab308" : 
                            job.status === "GIACONG" ? "#2563eb" : 
                            job.status === "QC" ? "#dc2626" : 
                            job.status === "GIAOHANG" ? "#06b6d4" : 
                            job.status === "FINISHED" ? "#16a34a" : 
                            "#3b82f6"
                        };" onchange="window.updateJobStatus('${job.id}', this.value)">
                            ${Object.keys(stageNames).map(k => `
                                <option value="${k}" ${job.status === k ? 'selected' : ''} style="background: var(--bg-card); color: var(--text-primary);">${stageNames[k]}</option>
                            `).join('')}
                        </select>
                        ${window.generateWorkflowHTML(job.status)}
                        <div class="card-progress-bar" style="margin-top: 6px; width: 140px;">
                            <div class="progress-fill" style="width: ${progressPercent}%; height: 4px; background: var(--accent); border-radius: 2px;"></div>
                        </div>
                        ${transferBtn}
                    </td>
                `;
        tableBody.appendChild(row);
    });

    document.getElementById("prodTotalCount").textContent = totalProdOrders;
    const avgLoss = finishedLossCount > 0 ? (totalLossPercent / finishedLossCount).toFixed(1) : "2.1";
    document.getElementById("prodAverageLoss").textContent = `${avgLoss}%`;

    lucide.createIcons();
}

function renderInventory() {
    const tableBody = document.querySelector("#inventoryTable tbody");
    tableBody.innerHTML = "";

    state.materials.forEach(mat => {
        const isLow = mat.stock_qty < mat.min_stock_qty;
        const statusBadge = isLow ? `<span class="badge badge-danger">Hết hàng/Cảnh báo</span>` : `<span class="badge badge-success">An toàn</span>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong class="text-secondary">${mat.sku}</strong></td>
            <td>${mat.name}</td>
            <td><span class="badge badge-info">${mat.category}</span></td>
            <td><strong class="${isLow ? 'text-danger' : ''}">${mat.stock_qty.toLocaleString('vi-VN')}</strong></td>
            <td>${mat.min_stock_qty.toLocaleString('vi-VN')}</td>
            <td>${mat.unit}</td>
            <td>${formatMoney(mat.avg_cost)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="quickRestock('${mat.sku}')">
                    <i data-lucide="plus" style="width:12px; height:12px;"></i> Nhập thêm
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function renderSubcontracting() {
    const tableBody = document.querySelector("#subcontractingTable tbody");
    tableBody.innerHTML = "";

    if (state.subcontracts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-muted text-center">Chưa có giao dịch thuê gia công ngoài nào</td></tr>`;
        return;
    }

    state.subcontracts.forEach(sub => {
        const contractor = state.partners.find(p => p.id === sub.subcontractor_id);
        const order = state.orders.find(o => o.id === sub.sales_order_id);

        let payBadge = `<span class="badge badge-danger">Chưa thanh toán</span>`;
        if (sub.payment_status === "PAID") payBadge = `<span class="badge badge-success">Đã trả</span>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${sub.contract_number}</strong></td>
            <td><strong>${contractor ? contractor.name : 'Đơn vị thi công'}</strong></td>
            <td>${sub.work_detail}</td>
            <td><strong class="accent-color">${order ? order.order_number : 'N/A'}</strong></td>
            <td><strong>${formatMoney(sub.cost)}</strong></td>
            <td>${new Date(sub.deadline).toLocaleDateString('vi-VN')}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="card-progress-bar" style="margin-bottom:0; width:60px;">
                        <div class="progress-fill" style="width: ${sub.progress}%;"></div>
                    </div>
                    <span>${sub.progress}%</span>
                </div>
            </td>
            <td>${payBadge}</td>
            <td>
                <div class="card-actions-row">
                    ${sub.progress < 100 ? `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="updateSubcontractProgress('${sub.id}')">Cập nhật %</button>` : ''}
                    ${sub.payment_status === 'UNPAID' ? `<button class="btn btn-success" style="padding: 4px 8px; font-size: 0.75rem;" onclick="paySubcontractor('${sub.id}')">Chi Trả</button>` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function renderFinance() {
    // Calc total balance
    const receipts = state.transactions.filter(t => t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
    const payments = state.transactions.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + t.amount, 0);
    const balance = 150000000 + receipts - payments; // Start base budget + receipts - payments
    document.getElementById("finTotalBalance").textContent = formatMoney(balance);

    // Calc receivables (Unpaid amount of orders)
    const totalReceivables = state.partners.filter(p => p.role === "CUSTOMER" || p.role === "BOTH").reduce((sum, p) => {
        const totalSales = state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        return sum + Math.max(0, totalSales - paid);
    }, 0);
    document.getElementById("finReceivable").textContent = formatMoney(totalReceivables);

    // Calc payables (unpaid suppliers + subcontractors)
    const totalSupplierPayable = state.partners.filter(p => p.role === "SUPPLIER" || p.role === "BOTH").reduce((sum, p) => {
        const totalRestock = state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
        return sum + Math.max(0, totalRestock - paid);
    }, 0);
    const totalSubcontractorPayable = state.partners.filter(p => p.role === "SUBCONTRACTOR").reduce((sum, p) => {
        const totalCost = state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
        return sum + Math.max(0, totalCost - paid);
    }, 0);
    
    document.getElementById("finPayable").textContent = formatMoney(totalSupplierPayable);
    const finSubcontractorPayableEl = document.getElementById("finSubcontractorPayable");
    if (finSubcontractorPayableEl) {
        finSubcontractorPayableEl.textContent = formatMoney(totalSubcontractorPayable);
    }

    // Render Sales Commission table
    if (window.renderSalesCommissions) {
        window.renderSalesCommissions();
    }

    // Ledger table
    const tableBody = document.querySelector("#financeTransactionsTable tbody");
    tableBody.innerHTML = "";

    state.transactions.forEach(t => {
        const partner = state.partners.find(p => p.id === t.partner_id);
        const categories = {
            CUSTOMER_DEPOSIT: "Thu cọc đơn in",
            CUSTOMER_FINAL: "Thu nợ đơn in",
            SUPPLIER_PAY: "Thanh toán vật tư",
            SUBCONTRACTOR_PAY: "Thanh toán gia công",
            SALARY: "Chi lương nhân sự",
            OPERATIONAL: "Chi phí vận hành"
        };

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${t.tx_number}</strong></td>
            <td>${new Date(t.created_at).toLocaleString('vi-VN')}</td>
            <td><span class="badge ${t.type === 'RECEIPT' ? 'badge-success' : 'badge-danger'}">${categories[t.category] || t.category}</span></td>
            <td>${partner ? partner.name : 'Vãng lai'}</td>
            <td><strong class="${t.type === 'RECEIPT' ? 'text-success' : 'text-danger'}">${t.type === 'RECEIPT' ? '+' : '-'}${formatMoney(t.amount)}</strong></td>
            <td>
                ${t.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                ${t.bill_image ? `<a href="#" onclick="window.viewPaymentBill('${t.id}'); return false;" style="margin-left:6px; color:var(--accent);" title="Xem bill chuyển khoản"><i data-lucide="image" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></a>` : ''}
            </td>
            <td>${t.account_source === 'VCB' ? 'MBBank' : 'Két tiền'}</td>
            <td><small>${t.created_by}</small></td>
        `;
        tableBody.appendChild(row);
    });

    // Render sub-tabs tables
    renderCustomerDebts();
    renderSupplierDebts();
    renderSubcontractorDebts();
    if (window.renderInternalTransactions) {
        window.renderInternalTransactions();
    }
    updateFinanceBadges();
}

function updateFinanceBadges() {
    // 1. Customer Debt Count
    const customers = state.partners.filter(p => p.role === "CUSTOMER" || p.role === "BOTH");
    const customersWithDebt = customers.filter(p => {
        const totalSales = state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        return (totalSales - paid) > 0;
    });
    const customerDebtCount = customersWithDebt.length;
    const customerBadgeEl = document.getElementById("customerDebtBadge");
    if (customerBadgeEl) {
        if (customerDebtCount > 0) {
            customerBadgeEl.textContent = customerDebtCount;
            customerBadgeEl.style.display = "inline-block";
        } else {
            customerBadgeEl.style.display = "none";
        }
    }

    // 2. Supplier Debt Count
    const suppliers = state.partners.filter(p => p.role === "SUPPLIER" || p.role === "BOTH");
    const suppliersWithDebt = suppliers.filter(p => {
        const totalRestock = state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
        return (totalRestock - paid) > 0;
    });
    const supplierDebtCount = suppliersWithDebt.length;
    const supplierBadgeEl = document.getElementById("supplierDebtBadge");
    if (supplierBadgeEl) {
        if (supplierDebtCount > 0) {
            supplierBadgeEl.textContent = supplierDebtCount;
            supplierBadgeEl.style.display = "inline-block";
        } else {
            supplierBadgeEl.style.display = "none";
        }
    }

    // 3. Subcontractor Debt Count
    const subcontractors = state.partners.filter(p => p.role === "SUBCONTRACTOR");
    const subcontractorsWithDebt = subcontractors.filter(p => {
        const totalCost = state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
        return (totalCost - paid) > 0;
    });
    const subcontractorDebtCount = subcontractorsWithDebt.length;
    const subcontractorBadgeEl = document.getElementById("subcontractorDebtBadge");
    if (subcontractorBadgeEl) {
        if (subcontractorDebtCount > 0) {
            subcontractorBadgeEl.textContent = subcontractorDebtCount;
            subcontractorBadgeEl.style.display = "inline-block";
        } else {
            subcontractorBadgeEl.style.display = "none";
        }
    }
}

// ==========================================================================
// INTERNAL FINANCE TRANSACTIONS
// ==========================================================================
window.openNewInternalTxModal = function() {
    const form = document.getElementById("newInternalTxForm");
    if (form) form.reset();
    
    // Set default handler
    const intTxHandlerInput = document.getElementById("intTxHandler");
    if (intTxHandlerInput) {
        intTxHandlerInput.value = "Đại Hùng";
    }
    
    openModal("newInternalTxModal");
};

window.renderInternalTransactions = function() {
    const internalTxs = state.transactions.filter(t => t.is_internal === true);

    const totalReceipts = internalTxs.filter(t => t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = internalTxs.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalReceipts - totalPayments;

    const lblReceipts = document.getElementById("lblInternalTotalReceipts");
    const lblPayments = document.getElementById("lblInternalTotalPayments");
    const lblBalance = document.getElementById("lblInternalBalance");

    if (lblReceipts) lblReceipts.textContent = formatMoney(totalReceipts);
    if (lblPayments) lblPayments.textContent = formatMoney(totalPayments);
    if (lblBalance) lblBalance.textContent = formatMoney(balance);

    const tableBody = document.querySelector("#internalTransactionsTable tbody");
    if (tableBody) {
        tableBody.innerHTML = "";
        if (internalTxs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Chưa có giao dịch thu chi nội bộ nào được ghi nhận.</td></tr>`;
        } else {
            internalTxs.forEach(t => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${new Date(t.created_at).toLocaleString('vi-VN')}</td>
                    <td><strong>${t.tx_number}</strong></td>
                    <td><span class="badge ${t.type === 'RECEIPT' ? 'badge-success' : 'badge-danger'}">${t.type === 'RECEIPT' ? 'Thu nội bộ' : 'Chi nội bộ'}</span></td>
                    <td>${t.category}</td>
                    <td><strong class="${t.type === 'RECEIPT' ? 'text-success' : 'text-danger'}">${t.type === 'RECEIPT' ? '+' : '-'}${formatMoney(t.amount)}</strong></td>
                    <td>${t.created_by}</td>
                    <td>${t.note || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }
};

function handleInternalTxSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("intTxType").value;
    const category = document.getElementById("intTxCategory").value;
    const amount = parseInt(document.getElementById("intTxAmount").value);
    const handler = document.getElementById("intTxHandler").value;
    const note = document.getElementById("intTxNote").value || "";

    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txPrefix = type === "RECEIPT" ? "PTNB" : "PCNB";
    const txNumber = `${txPrefix}-202606-${txCodeSuffix}`;
    const txId = "t_int_" + Math.random().toString(36).substring(2, 9);

    const newTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: type,
        category: category,
        amount: amount,
        payment_method: "CASH",
        account_source: "INTERNAL_FUND",
        partner_id: null,
        reference_id: null,
        created_by: handler,
        is_internal: true,
        note: note
    };

    const newTxs = [newTx, ...state.transactions];
    state.updateState("transactions", newTxs);

    closeModal("newInternalTxModal");
    renderAll();
    alert(`Đã ghi nhận thành công giao dịch nội bộ ${txNumber} trị giá ${formatMoney(amount)}.`);
}

function renderCustomerDebts() {
    const tableBody = document.querySelector("#customerDebtsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const customers = state.partners.filter(p => p.role === "CUSTOMER" || p.role === "BOTH");

    customers.forEach(p => {
        // Calculate total sales from both standard orders and online orders
        const standardSales = state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
        const onlineSales = state.online_orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
        const totalSales = standardSales + onlineSales;
        
        // Payments received
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        const debt = Math.max(0, totalSales - paid);
        const creditLimit = p.credit_limit || 0;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.phone}</td>
            <td>${formatMoney(totalSales)}</td>
            <td>${formatMoney(paid)}</td>
            <td><strong class="${debt > 0 ? 'text-danger font-bold' : 'text-success'}">${formatMoney(debt)}</strong></td>
            <td>${formatMoney(creditLimit)}</td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-success" style="padding: 4px 8px; font-size: 0.75rem; white-space:nowrap;" onclick="collectCustomerDebt('${p.id}')" ${debt === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i data-lucide="plus-circle" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Thu nợ
                    </button>
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem; white-space:nowrap; background:#0891b2; color:#fff;" onclick="viewCustomerPaymentHistory('${p.id}')">
                        <i data-lucide="history" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Lịch sử trả
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

window.viewCustomerPaymentHistory = function(partnerId) {
    const customer = state.partners.find(p => p.id === partnerId);
    if (!customer) return;
    
    // Create detailed history modal dynamically or load it
    let modal = document.getElementById("customerPaymentHistoryModal");
    if (!modal) {
        // Create modal container dynamically and append to body
        modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "customerPaymentHistoryModal";
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 800px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="historyModalTitle">Lịch Sử Thanh Toán & Chi Tiết Công Nợ</h2>
                        <button class="btn-close" onclick="closeModal('customerPaymentHistoryModal')"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;">
                        <div style="margin-bottom:15px; font-size:0.95rem; display:flex; justify-content:space-between;">
                            <div>
                                <p><strong>Khách hàng:</strong> <span id="historyCustomerName"></span></p>
                                <p><strong>Số điện thoại:</strong> <span id="historyCustomerPhone"></span></p>
                            </div>
                            <div style="text-align:right;">
                                <p><strong>Tổng công nợ hiện tại:</strong> <span id="historyCustomerTotalDebt" style="color:var(--danger); font-weight:bold; font-size:1.1rem;">0đ</span></p>
                            </div>
                        </div>
                        
                        <h4 style="margin: 15px 0 8px 0; color: var(--accent); font-size: 0.95rem;">1. Chi tiết công nợ từng đơn hàng</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; margin-bottom:20px; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Ngày tạo</th>
                                        <th>Quy cách / Sản phẩm</th>
                                        <th>Tổng tiền đơn</th>
                                        <th>Đã thanh toán</th>
                                        <th>Còn nợ</th>
                                    </tr>
                                </thead>
                                <tbody id="historyDebtOrdersTableBody">
                                    <!-- Injected dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 0.95rem;">2. Lịch sử các phiếu thu thực tế</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Số phiếu</th>
                                        <th>Hình thức</th>
                                        <th>Số tiền thu</th>
                                        <th>Người thu</th>
                                        <th>Tham chiếu đơn</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('customerPaymentHistoryModal')">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById("historyCustomerName").textContent = customer.name;
    document.getElementById("historyCustomerPhone").textContent = customer.phone;

    // Calc total debts and populate order-by-order detailed table
    const standardOrders = state.orders.filter(o => o.customer_id === partnerId);
    const onlineOrders = state.online_orders.filter(o => o.customer_id === partnerId);
    const allOrders = [...standardOrders, ...onlineOrders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    const debtOrdersTbody = document.getElementById("historyDebtOrdersTableBody");
    debtOrdersTbody.innerHTML = "";

    let calculatedTotalDebt = 0;

    if (allOrders.length === 0) {
        debtOrdersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Khách hàng chưa phát sinh đơn hàng nào.</td></tr>`;
    } else {
        allOrders.forEach(order => {
            // Find total amount paid for this specific order
            const paidForOrder = state.transactions
                .filter(t => t.reference_id === order.id && t.type === "RECEIPT")
                .reduce((sum, t) => sum + t.amount, 0);

            const remainingDebt = Math.max(0, order.total_amount - paidForOrder);
            calculatedTotalDebt += remainingDebt;

            const orderSpecs = order.print_spec || (order.items ? order.items.map(i => i.sku).join(', ') : 'N/A');

            const orderRow = document.createElement("tr");
            orderRow.innerHTML = `
                <td><strong>${order.order_number}</strong></td>
                <td><small>${new Date(order.created_at).toLocaleDateString('vi-VN')}</small></td>
                <td><small class="text-secondary">${orderSpecs}</small></td>
                <td><strong>${formatMoney(order.total_amount)}</strong></td>
                <td><span class="text-success">${formatMoney(paidForOrder)}</span></td>
                <td><strong class="${remainingDebt > 0 ? 'text-danger' : 'text-secondary'}">${formatMoney(remainingDebt)}</strong></td>
            `;
            debtOrdersTbody.appendChild(orderRow);
        });
    }

    document.getElementById("historyCustomerTotalDebt").textContent = formatMoney(calculatedTotalDebt);
    
    const tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = "";
    
    const payments = state.transactions.filter(t => t.partner_id === partnerId && t.type === "RECEIPT")
                                       .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có lịch sử thanh toán nào.</td></tr>`;
    } else {
        payments.forEach(tx => {
            // Find order code
            let refCode = "N/A";
            if (tx.reference_id) {
                const order = state.orders.find(o => o.id === tx.reference_id) || state.online_orders.find(o => o.id === tx.reference_id);
                if (order) refCode = order.order_number;
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td><strong>${tx.tx_number}</strong></td>
                <td>${tx.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VCB'}</td>
                <td><strong class="text-success">${formatMoney(tx.amount)}</strong></td>
                <td>${tx.created_by || 'Kế toán'}</td>
                <td><strong>${refCode}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    lucide.createIcons();
    openModal("customerPaymentHistoryModal");
};

function renderSupplierDebts() {
    const tableBody = document.querySelector("#supplierDebtsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const suppliers = state.partners.filter(p => p.role === "SUPPLIER" || p.role === "BOTH");

    suppliers.forEach(p => {
        const totalRestock = state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
        const debt = Math.max(0, totalRestock - paid);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.phone}</td>
            <td>${formatMoney(totalRestock)}</td>
            <td>${formatMoney(paid)}</td>
            <td><strong class="${debt > 0 ? 'text-warning font-bold' : 'text-success'}">${formatMoney(debt)}</strong></td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="paySupplierDebt('${p.id}')" ${debt === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i data-lucide="minus-circle" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Thanh toán nợ
                    </button>
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; background-color: var(--info-light); color: var(--info); border: none;" onclick="viewSupplierPaymentHistory('${p.id}')" title="Xem lịch sử">
                        <i data-lucide="eye" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Lịch sử
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

window.viewSupplierPaymentHistory = function(partnerId) {
    const partner = state.partners.find(p => p.id === partnerId);
    if (!partner) return;
    
    let modal = document.getElementById("supplierPaymentHistoryModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "supplierPaymentHistoryModal";
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 800px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Lịch Sử Thanh Toán & Chi Tiết Công Nợ Nhà Cung Cấp</h2>
                        <button class="btn-close" onclick="closeModal('supplierPaymentHistoryModal')"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;">
                        <div style="margin-bottom:15px; font-size:0.95rem; display:flex; justify-content:space-between;">
                            <div>
                                <p><strong>Nhà cung cấp:</strong> <span id="historySupplierName"></span></p>
                                <p><strong>Số điện thoại:</strong> <span id="historySupplierPhone"></span></p>
                            </div>
                            <div style="text-align:right;">
                                <p><strong>Tổng công nợ hiện tại:</strong> <span id="historySupplierTotalDebt" style="color:var(--danger); font-weight:bold; font-size:1.1rem;">0đ</span></p>
                            </div>
                        </div>
                        
                        <h4 style="margin: 15px 0 8px 0; color: var(--accent); font-size: 0.95rem;">1. Chi tiết nhập hàng / công nợ từng đơn</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; margin-bottom:20px; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Ngày nhập</th>
                                        <th>Chi tiết vật tư</th>
                                        <th>Tổng tiền</th>
                                        <th>Đã trả</th>
                                        <th>Còn nợ</th>
                                    </tr>
                                </thead>
                                <tbody id="historySupplierRestocksTableBody">
                                </tbody>
                            </table>
                        </div>

                        <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 0.95rem;">2. Lịch sử các phiếu chi thực tế</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Số phiếu</th>
                                        <th>Hình thức</th>
                                        <th>Số tiền chi</th>
                                        <th>Người lập</th>
                                        <th>Tham chiếu đơn</th>
                                    </tr>
                                </thead>
                                <tbody id="historySupplierPaymentsTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('supplierPaymentHistoryModal')">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById("historySupplierName").textContent = partner.name;
    document.getElementById("historySupplierPhone").textContent = partner.phone;

    const restocks = state.restocks.filter(r => r.supplier_id === partnerId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const restocksTbody = document.getElementById("historySupplierRestocksTableBody");
    restocksTbody.innerHTML = "";
    
    let totalDebt = 0;
    
    if (restocks.length === 0) {
        restocksTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có đơn nhập hàng nào.</td></tr>`;
    } else {
        restocks.forEach(r => {
            const paidForRestock = state.transactions
                .filter(t => t.reference_id === r.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY")
                .reduce((sum, t) => sum + t.amount, 0);
            const remaining = Math.max(0, r.total_amount - paidForRestock);
            totalDebt += remaining;
            
            const details = r.items ? r.items.map(item => `${item.name || item.sku} (${item.qty} ${item.unit || ''})`).join(', ') : 'Nhập vật tư';

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${r.restock_number || 'N/A'}</strong></td>
                <td><small>${new Date(r.created_at).toLocaleDateString('vi-VN')}</small></td>
                <td><small class="text-secondary">${details}</small></td>
                <td><strong>${formatMoney(r.total_amount)}</strong></td>
                <td><span class="text-success">${formatMoney(paidForRestock)}</span></td>
                <td><strong class="${remaining > 0 ? 'text-danger' : 'text-secondary'}">${formatMoney(remaining)}</strong></td>
            `;
            restocksTbody.appendChild(row);
        });
    }
    
    document.getElementById("historySupplierTotalDebt").textContent = formatMoney(totalDebt);

    const paymentsTbody = document.getElementById("historySupplierPaymentsTableBody");
    paymentsTbody.innerHTML = "";
    
    const txs = state.transactions
        .filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY")
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
    if (txs.length === 0) {
        paymentsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có phiếu chi thanh toán nào.</td></tr>`;
    } else {
        txs.forEach(tx => {
            let refCode = "N/A";
            if (tx.reference_id) {
                const restock = state.restocks.find(r => r.id === tx.reference_id);
                if (restock) refCode = restock.restock_number || 'N/A';
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td><strong>${tx.tx_number}</strong></td>
                <td>${tx.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VCB'}</td>
                <td><strong class="text-danger">-${formatMoney(tx.amount)}</strong></td>
                <td>${tx.created_by || 'Kế toán'}</td>
                <td><strong>${refCode}</strong></td>
            `;
            paymentsTbody.appendChild(row);
        });
    }
    
    lucide.createIcons();
    openModal("supplierPaymentHistoryModal");
};

function renderSubcontractorDebts() {
    const tableBody = document.querySelector("#subcontractorDebtsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const subcontractors = state.partners.filter(p => p.role === "SUBCONTRACTOR");

    subcontractors.forEach(p => {
        const totalCost = state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
        const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
        const debt = Math.max(0, totalCost - paid);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.phone}</td>
            <td>${formatMoney(totalCost)}</td>
            <td>${formatMoney(paid)}</td>
            <td><strong class="${debt > 0 ? 'text-warning font-bold' : 'text-success'}">${formatMoney(debt)}</strong></td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="paySubcontractorDebt('${p.id}')" ${debt === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i data-lucide="minus-circle" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Trả tiền gia công
                    </button>
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; background-color: var(--info-light); color: var(--info); border: none;" onclick="viewSubcontractorPaymentHistory('${p.id}')" title="Xem lịch sử">
                        <i data-lucide="eye" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>Lịch sử
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

window.viewSubcontractorPaymentHistory = function(partnerId) {
    const partner = state.partners.find(p => p.id === partnerId);
    if (!partner) return;
    
    let modal = document.getElementById("subcontractorPaymentHistoryModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "subcontractorPaymentHistoryModal";
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 800px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Lịch Sử Thanh Toán & Chi Tiết Công Nợ Xưởng Gia Công</h2>
                        <button class="btn-close" onclick="closeModal('subcontractorPaymentHistoryModal')"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;">
                        <div style="margin-bottom:15px; font-size:0.95rem; display:flex; justify-content:space-between;">
                            <div>
                                <p><strong>Đơn vị gia công:</strong> <span id="historySubName"></span></p>
                                <p><strong>Số điện thoại:</strong> <span id="historySubPhone"></span></p>
                            </div>
                            <div style="text-align:right;">
                                <p><strong>Tổng công nợ hiện tại:</strong> <span id="historySubTotalDebt" style="color:var(--danger); font-weight:bold; font-size:1.1rem;">0đ</span></p>
                            </div>
                        </div>
                        
                        <h4 style="margin: 15px 0 8px 0; color: var(--accent); font-size: 0.95rem;">1. Chi tiết hợp đồng gia công / công nợ</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; margin-bottom:20px; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Mã hợp đồng</th>
                                        <th>Thời hạn</th>
                                        <th>Chi tiết công việc</th>
                                        <th>Tổng tiền</th>
                                        <th>Đã trả</th>
                                        <th>Còn nợ</th>
                                    </tr>
                                </thead>
                                <tbody id="historySubcontractingTableBody">
                                </tbody>
                            </table>
                        </div>

                        <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 0.95rem;">2. Lịch sử các phiếu chi thực tế</h4>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Số phiếu</th>
                                        <th>Hình thức</th>
                                        <th>Số tiền chi</th>
                                        <th>Người lập</th>
                                        <th>Tham chiếu hợp đồng</th>
                                    </tr>
                                </thead>
                                <tbody id="historySubPaymentsTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('subcontractorPaymentHistoryModal')">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById("historySubName").textContent = partner.name;
    document.getElementById("historySubPhone").textContent = partner.phone;

    const subcontracts = state.subcontracts.filter(s => s.subcontractor_id === partnerId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const subsTbody = document.getElementById("historySubcontractingTableBody");
    subsTbody.innerHTML = "";
    
    let totalDebt = 0;
    
    if (subcontracts.length === 0) {
        subsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có hợp đồng gia công nào.</td></tr>`;
    } else {
        subcontracts.forEach(s => {
            const paidForSub = state.transactions
                .filter(t => t.reference_id === s.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY")
                .reduce((sum, t) => sum + t.amount, 0);
            const remaining = Math.max(0, s.cost - paidForSub);
            totalDebt += remaining;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${s.contract_number}</strong></td>
                <td><small>${new Date(s.deadline).toLocaleDateString('vi-VN')}</small></td>
                <td><small class="text-secondary">${s.work_detail}</small></td>
                <td><strong>${formatMoney(s.cost)}</strong></td>
                <td><span class="text-success">${formatMoney(paidForSub)}</span></td>
                <td><strong class="${remaining > 0 ? 'text-danger' : 'text-secondary'}">${formatMoney(remaining)}</strong></td>
            `;
            subsTbody.appendChild(row);
        });
    }
    
    document.getElementById("historySubTotalDebt").textContent = formatMoney(totalDebt);

    const paymentsTbody = document.getElementById("historySubPaymentsTableBody");
    paymentsTbody.innerHTML = "";
    
    const txs = state.transactions
        .filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY")
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
    if (txs.length === 0) {
        paymentsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có phiếu chi thanh toán nào.</td></tr>`;
    } else {
        txs.forEach(tx => {
            let refCode = "N/A";
            if (tx.reference_id) {
                const sub = state.subcontracts.find(s => s.id === tx.reference_id);
                if (sub) refCode = sub.contract_number;
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td><strong>${tx.tx_number}</strong></td>
                <td>${tx.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VCB'}</td>
                <td><strong class="text-danger">-${formatMoney(tx.amount)}</strong></td>
                <td>${tx.created_by || 'Kế toán'}</td>
                <td><strong>${refCode}</strong></td>
            `;
            paymentsTbody.appendChild(row);
        });
    }
    
    lucide.createIcons();
    openModal("subcontractorPaymentHistoryModal");
};

window.collectCustomerDebt = function(partnerId) {
    const p = state.partners.find(x => x.id === partnerId);
    if (!p) return;
    
    document.getElementById("financeModalTitle").textContent = "Lập phiếu THU dòng tiền";
    document.getElementById("finType").value = "RECEIPT";
    
    const categorySelect = document.getElementById("finCategory");
    categorySelect.innerHTML = `
        <option value="CUSTOMER_FINAL" selected>Thu nợ khách hàng mua in</option>
        <option value="CUSTOMER_DEPOSIT">Thu tạm ứng cọc đơn hàng</option>
        <option value="OPERATIONAL">Khoản thu nhập tài chính khác</option>
    `;
    
    document.getElementById("finPartner").value = partnerId;
    
    const totalSales = state.orders.filter(o => o.customer_id === partnerId).reduce((sum, o) => sum + o.total_amount, 0);
    const paid = state.transactions.filter(t => t.partner_id === partnerId && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
    const debt = Math.max(0, totalSales - paid);
    
    document.getElementById("finAmount").value = debt;
    openModal("financeModal");
};

window.paySupplierDebt = function(partnerId) {
    const p = state.partners.find(x => x.id === partnerId);
    if (!p) return;
    
    document.getElementById("financeModalTitle").textContent = "Lập phiếu CHI dòng tiền";
    document.getElementById("finType").value = "PAYMENT";
    
    const categorySelect = document.getElementById("finCategory");
    categorySelect.innerHTML = `
        <option value="SUPPLIER_PAY" selected>Trả tiền giấy/mực/vật liệu</option>
        <option value="SUBCONTRACTOR_PAY">Trả tiền gia công ngoài</option>
        <option value="SALARY">Trả lương nhân sự xưởng</option>
        <option value="OPERATIONAL">Chi phí điện nước, mặt bằng, sửa máy</option>
    `;
    
    document.getElementById("finPartner").value = partnerId;
    
    const totalRestock = state.restocks.filter(r => r.supplier_id === partnerId).reduce((sum, r) => sum + r.total_amount, 0);
    const paid = state.transactions.filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
    const debt = Math.max(0, totalRestock - paid);
    
    document.getElementById("finAmount").value = debt;
    openModal("financeModal");
};

window.paySubcontractorDebt = function(partnerId) {
    const p = state.partners.find(x => x.id === partnerId);
    if (!p) return;
    
    document.getElementById("financeModalTitle").textContent = "Lập phiếu CHI dòng tiền";
    document.getElementById("finType").value = "PAYMENT";
    
    const categorySelect = document.getElementById("finCategory");
    categorySelect.innerHTML = `
        <option value="SUPPLIER_PAY">Trả tiền giấy/mực/vật liệu</option>
        <option value="SUBCONTRACTOR_PAY" selected>Trả tiền gia công ngoài</option>
        <option value="SALARY">Trả lương nhân sự xưởng</option>
        <option value="OPERATIONAL">Chi phí điện nước, mặt bằng, sửa máy</option>
    `;
    
    document.getElementById("finPartner").value = partnerId;
    
    const totalCost = state.subcontracts.filter(s => s.subcontractor_id === partnerId).reduce((sum, s) => sum + s.cost, 0);
    const paid = state.transactions.filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
    const debt = Math.max(0, totalCost - paid);
    
    document.getElementById("finAmount").value = debt;
    openModal("financeModal");
};

// ==========================================================================
// RENDER SVG CHART
// ==========================================================================
function renderRevenueChart() {
    const container = document.getElementById("revenueChartContainer");
    if (!container) return;

    // We will draw a beautiful dual-line SVG chart for the last 7 days
    const chartWidth = container.clientWidth || 500;
    const chartHeight = 250;
    const padding = 40;

    // Calculate dates for last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    // Calculate revenue & cost totals per day
    const revenueData = [];
    const expenseData = [];

    days.forEach(day => {
        const dayStr = day.toDateString();
        // Sum transactions on this day
        const rev = state.transactions
            .filter(t => t.type === "RECEIPT" && new Date(t.created_at).toDateString() === dayStr)
            .reduce((sum, t) => sum + t.amount, 0);

        const exp = state.transactions
            .filter(t => t.type === "PAYMENT" && new Date(t.created_at).toDateString() === dayStr)
            .reduce((sum, t) => sum + t.amount, 0);

        revenueData.push(rev);
        expenseData.push(exp);
    });

    // Find max value for scaling
    const maxVal = Math.max(...revenueData, ...expenseData, 5000000); // minimum scale to 5M

    // Generate Points for SVG Lines
    const stepX = (chartWidth - padding * 2) / 6;
    
    function getPointsStr(data) {
        return data.map((val, idx) => {
            const x = padding + idx * stepX;
            const y = chartHeight - padding - ((val / maxVal) * (chartHeight - padding * 2));
            return `${x},${y}`;
        }).join(" ");
    }

    const revPoints = getPointsStr(revenueData);
    const expPoints = getPointsStr(expenseData);

    const labelsX = days.map((d, idx) => {
        const x = padding + idx * stepX;
        const text = `${d.getDate()}/${d.getMonth()+1}`;
        return `<text x="${x}" y="${chartHeight - 15}" fill="var(--text-muted)" font-size="10" font-weight="600" text-anchor="middle">${text}</text>`;
    }).join("");

    // Horizontal grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
        const y = padding + i * ((chartHeight - padding * 2) / 4);
        const valLabel = formatMoney(maxVal - (i * (maxVal / 4))).replace("đ", "");
        gridLines.push(`
            <line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4,4" />
            <text x="${padding - 5}" y="${y + 4}" fill="var(--text-muted)" font-size="9" font-weight="600" text-anchor="end">${valLabel}</text>
        `);
    }

    const svgContent = `
        <svg width="100%" height="100%" viewBox="0 0 ${chartWidth} ${chartHeight}">
            <!-- Grid lines -->
            ${gridLines.join("")}

            <!-- X Labels -->
            ${labelsX}

            <!-- Revenue Line (Success Green) -->
            <polyline fill="none" stroke="var(--success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${revPoints}" />
            ${revenueData.map((val, idx) => {
                const x = padding + idx * stepX;
                const y = chartHeight - padding - ((val / maxVal) * (chartHeight - padding * 2));
                return val > 0 ? `<circle cx="${x}" cy="${y}" r="5" fill="var(--success)" stroke="var(--bg-app)" stroke-width="2"/>` : '';
            }).join("")}

            <!-- Expense Line (Danger Red) -->
            <polyline fill="none" stroke="var(--danger)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${expPoints}" />
            ${expenseData.map((val, idx) => {
                const x = padding + idx * stepX;
                const y = chartHeight - padding - ((val / maxVal) * (chartHeight - padding * 2));
                return val > 0 ? `<circle cx="${x}" cy="${y}" r="5" fill="var(--danger)" stroke="var(--bg-app)" stroke-width="2"/>` : '';
            }).join("")}
        </svg>
    `;

    container.innerHTML = svgContent;
}

// ==========================================================================
// CALCULATOR ENGINE & ORDER PLACEMENT
// ==========================================================================
function setupEventListeners() {
    // Quick quote button triggers modal
    document.getElementById("btnQuickQuote").addEventListener("click", () => openModal("quoteModal"));
    document.getElementById("btnNewOrder").addEventListener("click", () => openModal("quoteModal"));

    // Close buttons on Modals
    document.getElementById("btnCloseQuoteModal").addEventListener("click", () => closeModal("quoteModal"));
    document.getElementById("btnCancelQuote").addEventListener("click", () => closeModal("quoteModal"));

    document.getElementById("btnCloseStockModal").addEventListener("click", () => closeModal("stockModal"));
    document.getElementById("btnCancelStock").addEventListener("click", () => closeModal("stockModal"));

    document.getElementById("btnCloseFinanceModal").addEventListener("click", () => closeModal("financeModal"));
    document.getElementById("btnCancelFinance").addEventListener("click", () => closeModal("financeModal"));

    document.getElementById("btnCloseSubcontractModal").addEventListener("click", () => closeModal("subcontractModal"));
    document.getElementById("btnCancelSubcontract").addEventListener("click", () => closeModal("subcontractModal"));

    // quoteImportSelect listener to auto-populate form
    const quoteImportSelect = document.getElementById("quoteImportSelect");
    if (quoteImportSelect) {
        quoteImportSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            if (!val) return;
            const order = state.orders.find(o => o.id === val);
            if (order) {
                // Populate fields
                document.getElementById("quoteCustomer").value = order.customer_id;
                document.getElementById("quoteDim2").value = (order.width_mm / 10) || 10;
                document.getElementById("quoteDim1").value = (order.length_mm / 10) || 12;
                document.getElementById("quoteQty").value = order.quantity || 1000;
                document.getElementById("quoteSalesperson").value = order.salesperson || "Đại Hùng";
                document.getElementById("quoteCommissionRate").value = order.commission_rate || 1;
                
                // Parse spec or matching type if possible
                let isCartonLanh = order.paper_type.includes("Carton Lạnh");
                document.getElementById("quoteProductType").value = isCartonLanh ? "CARTON_LANH" : "CAI_DAY";
                document.getElementById("quoteProductType").dispatchEvent(new Event("change"));
                
                calculateRealtimeQuote();
            }
        });
    }

    // Event listeners for Quote Form inputs
    const quoteInputs = [
        "quoteProductType", "quoteDim1", "quoteDim2", "quoteDim3", "quoteDimExtra", 
        "quoteQty", "quoteBatDai", "quoteBatRong", "quotePaperWeight", 
        "quotePaperPrice", "quoteMachineSize", "quotePlates", "quoteLaminating", 
        "quoteGluePrice", "quoteShipFee", "quoteMarkup", "quoteDiscount",
        "quoteCartonTrayType", "quoteCartonTrayPrice", "quoteCartonPrintWrap", "quoteCartonMold", "quoteCartonMagnets",
        "quoteCartonFoamThickness", "quoteCartonFoamBatRong", "quoteCartonFoamBatDai",
        "quoteCartonSilk", "quoteCartonDecal", "quoteCartonFinishingRate",
        "quoteCartonOfficeCost"
    ];
    quoteInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateRealtimeQuote);
            el.addEventListener("change", calculateRealtimeQuote);
        }
    });

    // Handle Product Type change to update labels & defaults
    const productTypeEl = document.getElementById("quoteProductType");
    if (productTypeEl) {
        productTypeEl.addEventListener("change", (e) => {
            const val = e.target.value;
            const labelDim1 = document.getElementById("labelDim1");
            const labelDim2 = document.getElementById("labelDim2");
            const labelDim3 = document.getElementById("labelDim3");
            const groupDimExtra = document.getElementById("groupDimExtra");
            const labelDimExtra = document.getElementById("labelDimExtra");

            const inputDim1 = document.getElementById("quoteDim1");
            const inputDim2 = document.getElementById("quoteDim2");
            const inputDim3 = document.getElementById("quoteDim3");
            const inputGluePrice = document.getElementById("quoteGluePrice");
            const inputPaperPrice = document.getElementById("quotePaperPrice");

            // Base reset
            groupDimExtra.style.display = "none";
            document.getElementById("groupBatDai").style.display = "block";
            document.getElementById("groupBatRong").style.display = "block";
            document.getElementById("groupBatDai").querySelector("label").textContent = "Số bát Dài *";
            document.getElementById("cartonLanhExtraFields").style.display = "none";
            document.getElementById("cartonLanhTechPreview").style.display = "none";
            const qModal = document.getElementById("quoteModal");
            if (qModal) qModal.classList.remove("modal-wide");
            
            const labelPaperPrice = document.getElementById("labelPaperPrice");
            if (labelPaperPrice) {
                labelPaperPrice.textContent = "Giá Giấy (k/kg) *";
            }

            if (val === "CAI_DAY") {
                labelDim1.textContent = "Cao (cm) *";
                labelDim2.textContent = "Ngang (cm) *";
                labelDim3.textContent = "Cạnh Nhỏ (cm) *";
                inputGluePrice.value = "150"; // default dán hộp
                inputPaperPrice.value = "28"; // Duplex/Ivory
            } else if (val === "KHOA_DAY") {
                labelDim1.textContent = "Cao (cm) *";
                labelDim2.textContent = "Ngang (cm) *";
                labelDim3.textContent = "Cạnh Nhỏ (cm) *";
                inputGluePrice.value = "150";
                inputPaperPrice.value = "28";
            } else if (val === "AM_DUONG") {
                labelDim1.textContent = "Dài (cm) *";
                labelDim2.textContent = "Rộng (cm) *";
                labelDim3.textContent = "Cao (cm) *";
                groupDimExtra.style.display = "block";
                labelDimExtra.textContent = "Cạnh Dày (cm) *";
                inputGluePrice.value = "150";
                inputPaperPrice.value = "28";
                // Bat quantities are not configurable for Lid & Base since it uses layout math
                document.getElementById("groupBatDai").style.display = "none";
                document.getElementById("groupBatRong").style.display = "none";
            } else if (val === "TUI") {
                labelDim1.textContent = "Cao (cm) *";
                labelDim2.textContent = "Ngang (cm) *";
                labelDim3.textContent = "Cạnh Nhỏ (Hông) (cm) *";
                inputGluePrice.value = "1800"; // default dán túi giấy
                inputPaperPrice.value = "28";
            } else if (val === "SONG") {
                labelDim1.textContent = "Dài trải phẳng (cm) *";
                labelDim2.textContent = "Rộng trải phẳng (cm) *";
                labelDim3.textContent = "Cao hộp sóng (cm) *";
                inputGluePrice.value = "250"; // default dán hộp sóng E
                inputPaperPrice.value = "23";
            } else if (val === "CARTON_LANH") {
                labelDim1.textContent = "Ngang (cm) *";
                labelDim2.textContent = "Rộng (cm) *";
                labelDim3.textContent = "Cao (cm) *";
                inputGluePrice.value = "8000"; // default bồi + gia công hộp cứng (8000đ - 9000đ từ sheet Carton Lạnh)
                inputPaperPrice.value = "11"; // 11k/kg đơn giá Carton Lạnh từ sheet
                document.getElementById("quotePaperWeight").value = "1250"; // Carton Lạnh định lượng 1250gsm mặc định

                document.getElementById("groupBatRong").style.display = "none";
                document.getElementById("groupBatDai").querySelector("label").textContent = "Số Bát *";
                document.getElementById("cartonLanhExtraFields").style.display = "grid";
                document.getElementById("cartonLanhTechPreview").style.display = "block";
                const qModal = document.getElementById("quoteModal");
                if (qModal) qModal.classList.add("modal-wide");
                if (labelPaperPrice) {
                    labelPaperPrice.textContent = "Đơn giá carton (k/kg) *";
                }
            } else {
                labelDim1.textContent = "Chiều dài (cm) *";
                labelDim2.textContent = "Chiều rộng (cm) *";
                labelDim3.textContent = "Độ dày (cm)";
                inputGluePrice.value = "0";
                inputPaperPrice.value = "22";
                if (document.getElementById("quotePaperWeight").value === "1250") {
                    document.getElementById("quotePaperWeight").value = "300"; // fallback
                }
            }
            calculateRealtimeQuote();
        });
    }

    const trayTypeEl = document.getElementById("quoteCartonTrayType");
    if (trayTypeEl) {
        trayTypeEl.addEventListener("change", (e) => {
            const val = e.target.value;
            const priceEl = document.getElementById("quoteCartonTrayPrice");
            if (priceEl) {
                if (val === "CARTON_LANH") {
                    priceEl.value = "11";
                } else if (val === "DUPLEX") {
                    priceEl.value = "26";
                } else {
                    priceEl.value = "0";
                }
                calculateRealtimeQuote();
            }
        });
    }

    // Form submit handlers
    document.getElementById("quoteForm").addEventListener("submit", handleOrderSubmit);
    document.getElementById("btnSaveQuoteOnly").addEventListener("click", (e) => {
        // Set submitter action context manually
        const form = document.getElementById("quoteForm");
        const dummySubmit = document.createElement("button");
        dummySubmit.type = "submit";
        dummySubmit.id = "btnSaveQuoteOnly";
        dummySubmit.style.display = "none";
        form.appendChild(dummySubmit);
        dummySubmit.click();
        dummySubmit.remove();
    });
    document.getElementById("stockForm").addEventListener("submit", handleStockSubmit);
    document.getElementById("financeForm").addEventListener("submit", handleFinanceSubmit);
    document.getElementById("subcontractForm").addEventListener("submit", handleSubcontractSubmit);
    document.getElementById("newInternalTxForm")?.addEventListener("submit", handleInternalTxSubmit);

    // Search and filters
    document.getElementById("quoteSearchInput")?.addEventListener("input", filterQuotesTable);
    document.getElementById("prodOrderSearchInput")?.addEventListener("input", filterProdOrdersTable);
    document.getElementById("prodOrderFilterStatus")?.addEventListener("change", filterProdOrdersTable);
    document.getElementById("prodOrderFilterPayment")?.addEventListener("change", filterProdOrdersTable);
    document.getElementById("inventorySearchInput").addEventListener("input", filterInventoryTable);
    document.getElementById("subcontractSearchInput").addEventListener("input", filterSubcontractsTable);
    document.getElementById("financeSearchInput").addEventListener("input", filterFinanceTable);

    // Filter stock alerts
    let showOnlyAlerts = false;
    document.getElementById("btnStockAlertFilter").addEventListener("click", () => {
        showOnlyAlerts = !showOnlyAlerts;
        const btn = document.getElementById("btnStockAlertFilter");
        if (showOnlyAlerts) {
            btn.classList.add("btn-primary");
            btn.classList.remove("btn-secondary");
        } else {
            btn.classList.remove("btn-primary");
            btn.classList.add("btn-secondary");
        }
        filterInventoryTable(showOnlyAlerts);
    });

    // Quick add material button
    document.getElementById("btnRestockMaterial").addEventListener("click", () => {
        openModal("stockModal");
    });

    // Quick add outsource button
    document.getElementById("btnCreateSubcontract").addEventListener("click", () => {
        openModal("subcontractModal");
    });

    // CRM Search & Filter
    const crmSearchInput = document.getElementById("crmSearchInput");
    if (crmSearchInput) {
        crmSearchInput.addEventListener("input", filterCRMTable);
    }
    
    // Global filter helper for submenu links
    window.switchCrmRoleFilter = function(role) {
        activeCrmRoleFilter = role;
        
        // Match submenu item highlighting
        document.querySelectorAll('.submenu-list .submenu-item').forEach(item => {
            const isMatch = item.getAttribute('onclick')?.includes(`'${role}'`);
            if (isMatch) {
                item.classList.add('active');
            } else if (item.getAttribute('onclick')?.includes('switchCrmRoleFilter')) {
                item.classList.remove('active');
            }
        });
        
        // Trigger tab navigation and re-render table
        switchTab('crm');
        filterCRMTable();
    };

    // CRM Modals Close & Submit
    document.getElementById("btnClosePartnerModal").addEventListener("click", () => closeModal("partnerModal"));
    document.getElementById("btnCancelPartner").addEventListener("click", () => closeModal("partnerModal"));
    document.getElementById("btnNewPartner").addEventListener("click", () => {
        document.getElementById("partnerForm").reset();
        document.getElementById("partnerIdInput").value = "";
        document.getElementById("partnerModalTitle").textContent = "Thêm đối tác / Khách hàng mới";
        openModal("partnerModal");
    });
    document.getElementById("partnerForm").addEventListener("submit", handlePartnerSubmit);

    // CRM Details Modal Close & note submit
    const closeBtn = document.getElementById("btnCloseCrmDetailModal");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => closeModal("crmDetailModal"));
    }
    const crmNoteForm = document.getElementById("crmNoteForm");
    if (crmNoteForm) {
        crmNoteForm.addEventListener("submit", handleCrmNoteSubmit);
    }

    // CRM Details Subtabs switching
    const subtabBtns = document.querySelectorAll(".crm-subtab-btn");
    subtabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            subtabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const subtabId = btn.getAttribute("data-subtab");
            const subtabPanes = document.querySelectorAll(".crm-subtab-content > div");
            subtabPanes.forEach(pane => pane.classList.remove("active"));
            document.getElementById(`crmSubtab-${subtabId}`).classList.add("active");
        });
    });

    window.switchFinanceSubTab = function(subtabId) {
        switchTab('finance');
        
        // Update active class on inner buttons
        const finBtns = document.querySelectorAll(".fin-subtab-btn");
        finBtns.forEach(btn => {
            if (btn.getAttribute("data-subtab") === subtabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Directly display the correct finance sub-pane and trigger render
        const subtabPanes = document.querySelectorAll(".fin-subtab-content");
        subtabPanes.forEach(pane => pane.classList.remove("active"));
        const targetPane = document.getElementById(`finSubtab-${subtabId}`);
        if (targetPane) targetPane.classList.add("active");

        if (subtabId === "sales-commission" && window.renderSalesCommissions) {
            window.renderSalesCommissions();
        }
        if (subtabId === "internal-finance" && window.renderInternalTransactions) {
            window.renderInternalTransactions();
        }
    };

    // KPI Cards click event linking
    const registerKpiClick = (cardId, subtabId) => {
        const cardEl = document.getElementById(cardId);
        if (cardEl) {
            cardEl.addEventListener("click", () => {
                switchFinanceSubTab(subtabId);
            });
        }
    };
    registerKpiClick("kpiCardTotalBalance", "ledger");
    registerKpiClick("kpiCardReceivable", "customer-debt");
    registerKpiClick("kpiCardPayable", "supplier-debt");
    registerKpiClick("kpiCardSubcontractorPayable", "subcontractor-debt");

    // Chat search and channel filters
    document.getElementById("chatSearchInput").addEventListener("input", renderChatConversations);
    
    const channelFilterBtns = document.querySelectorAll(".channel-filter-btn");
    channelFilterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            channelFilterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeChannelFilter = btn.getAttribute("data-channel");
            renderChatConversations();
        });
    });

    // Chat send form
    document.getElementById("chatSendForm").addEventListener("submit", handleChatSend);

    // Telegram Modal Event Listeners
    const btnTelegramConfig = document.getElementById("btnTelegramConfig");
    if (btnTelegramConfig) {
        btnTelegramConfig.addEventListener("click", () => {
            const sysConfig = (state.system_settings && state.system_settings.telegram_config) || {};
            // Load saved settings with fallback to state.system_settings
            document.getElementById("tgBotToken").value = localStorage.getItem("ihp_tg_bot_token") || sysConfig.bot_token || "";
            document.getElementById("tgChatId").value = localStorage.getItem("ihp_tg_chat_id") || sysConfig.chat_id || "";
            document.getElementById("tgEnableNotifications").checked = localStorage.getItem("ihp_tg_enable_notifications") !== "false";
            document.getElementById("tgEnableChatSync").checked = localStorage.getItem("ihp_tg_enable_chat_sync") === "true";
            
            const isConnected = localStorage.getItem("ihp_tg_is_connected") === "true" || !!sysConfig.bot_token;
            const botName = localStorage.getItem("ihp_tg_bot_name") || sysConfig.bot_name || "N/A";
            const statusPanel = document.getElementById("tgStatusPanel");
            const botInfo = document.getElementById("tgBotNameInfo");
            
            if (isConnected && statusPanel && botInfo) {
                statusPanel.style.display = "block";
                botInfo.textContent = `Tên Bot: ${botName}`;
            } else if (statusPanel) {
                statusPanel.style.display = "none";
            }
            openModal("telegramModal");
        });
    }

    const btnCloseTelegramModal = document.getElementById("btnCloseTelegramModal");
    if (btnCloseTelegramModal) {
        btnCloseTelegramModal.addEventListener("click", () => closeModal("telegramModal"));
    }
    
    // Test Telegram Connection
    const btnTestTelegram = document.getElementById("btnTestTelegram");
    if (btnTestTelegram) {
        btnTestTelegram.addEventListener("click", async () => {
            const token = document.getElementById("tgBotToken").value.trim();
            const chatId = document.getElementById("tgChatId").value.trim();

            if (!token) {
                alert("Vui lòng nhập Bot Token!");
                return;
            }

            try {
                btnTestTelegram.disabled = true;
                btnTestTelegram.innerHTML = `<i data-lucide="loader"></i> Đang kết nối...`;
                
                const botRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
                const botData = await botRes.json();
                
                if (!botData.ok) {
                    alert("Kết nối thất bại! Bot Token không hợp lệ.\nLỗi: " + botData.description);
                    btnTestTelegram.disabled = false;
                    btnTestTelegram.innerHTML = `<i data-lucide="check-circle"></i> Kiểm tra kết nối`;
                    return;
                }

                const botName = botData.result.first_name || botData.result.username;

                if (chatId) {
                    const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `🔔 *KIỂM TRA KẾT NỐI TELEGRAM BOT*\n--------------------------------\nHệ thống Quản trị In Lạc Hồng đã kết nối thành công với Telegram Bot: *${botName}*`,
                            parse_mode: "Markdown"
                        })
                    });
                    const msgData = await msgRes.json();
                    if (!msgData.ok) {
                        alert(`Đã tìm thấy Bot "${botName}", nhưng KHÔNG gửi được tin thử nghiệm tới Chat ID "${chatId}".\nLỗi: ${msgData.description}`);
                        btnTestTelegram.disabled = false;
                        btnTestTelegram.innerHTML = `<i data-lucide="check-circle"></i> Kiểm tra kết nối`;
                        return;
                    }
                }

                localStorage.setItem("ihp_tg_is_connected", "true");
                localStorage.setItem("ihp_tg_bot_name", botName);
                
                const statusPanel = document.getElementById("tgStatusPanel");
                const botInfo = document.getElementById("tgBotNameInfo");
                if (statusPanel && botInfo) {
                    statusPanel.style.display = "block";
                    botInfo.textContent = `Tên Bot: ${botName}`;
                }
                alert(`🎉 Kết nối thành công tới Bot "${botName}"!${chatId ? ' Đã gửi tin nhắn thử nghiệm tới Telegram.' : ''}`);
            } catch (err) {
                alert(`Lỗi kết nối: ${err.message}`);
            } finally {
                btnTestTelegram.disabled = false;
                btnTestTelegram.innerHTML = `<i data-lucide="check-circle"></i> Kiểm tra kết nối`;
            }
        });
    }

    // Save Telegram config
    const telegramConfigForm = document.getElementById("telegramConfigForm");
    if (telegramConfigForm) {
        telegramConfigForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const token = document.getElementById("tgBotToken").value.trim();
            const chatId = document.getElementById("tgChatId").value.trim();
            const enableNotifications = document.getElementById("tgEnableNotifications").checked;
            const enableChatSync = document.getElementById("tgEnableChatSync").checked;

            localStorage.setItem("ihp_tg_bot_token", token);
            localStorage.setItem("ihp_tg_chat_id", chatId);
            localStorage.setItem("ihp_tg_enable_notifications", enableNotifications);
            localStorage.setItem("ihp_tg_enable_chat_sync", enableChatSync);
            localStorage.setItem("ihp_tg_last_update_id", "0");
            tgLastUpdateId = 0;

            closeModal("telegramModal");
            alert("Đã lưu cấu hình tích hợp Telegram!");
            
            // Start or stop polling based on settings
            if (enableChatSync) {
                // Delete webhook first to avoid 409 conflict for getUpdates
                fetch(`https://api.telegram.org/bot${token}/deleteWebhook`)
                    .then(() => {
                        console.log("Telegram: Webhook deleted to allow getUpdates.");
                        startTelegramPolling();
                    })
                    .catch(err => {
                        console.warn("Error clearing Telegram webhook:", err);
                        startTelegramPolling();
                    });
            } else {
                stopTelegramPolling();
            }
        });
    }
}

function openModal(id) {
    document.getElementById(id).classList.add("active");
    if (id === "quoteModal") {
        const quoteForm = document.getElementById("quoteForm");
        if (quoteForm && !quoteForm.dataset.editId) {
            window.customProdBrackets = [];
        }
        setTimeout(() => {
            if (window.renderProdFormQuantityBrackets) {
                window.renderProdFormQuantityBrackets();
            }
        }, 50);
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

function initDataInForms() {
    populateSalespersonsDropdowns();
    // Fill partners selection
    const quoteCustomer = document.getElementById("quoteCustomer");
    const finPartner = document.getElementById("finPartner");
    const subPartnerSelect = document.getElementById("subPartnerSelect");
    const stockSupplierSelect = document.getElementById("stockSupplierSelect");
    const onlineOrderCustomer = document.getElementById("onlineOrderCustomer");

    if (quoteCustomer) quoteCustomer.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
    if (finPartner) finPartner.innerHTML = '<option value="">-- Chọn đối tác --</option>';
    if (subPartnerSelect) subPartnerSelect.innerHTML = '<option value="">-- Chọn nhà gia công --</option>';
    if (stockSupplierSelect) stockSupplierSelect.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>';
    if (onlineOrderCustomer) onlineOrderCustomer.innerHTML = '<option value="">-- Chọn khách hàng --</option>';

    (state.partners || []).forEach(p => {
        if (!p) return;
        if (p.role === "CUSTOMER" || p.role === "BOTH") {
            if (quoteCustomer) quoteCustomer.innerHTML += `<option value="${p.id}">${p.name} - ${p.code}</option>`;
            if (onlineOrderCustomer) onlineOrderCustomer.innerHTML += `<option value="${p.id}">${p.name} - ${p.code}</option>`;
        }
        if (p.role === "CUSTOMER" || p.role === "SUPPLIER" || p.role === "SUBCONTRACTOR" || p.role === "BOTH") {
            if (finPartner) finPartner.innerHTML += `<option value="${p.id}">${p.name} (${p.code})</option>`;
        }
        if (p.role === "SUBCONTRACTOR") {
            if (subPartnerSelect) subPartnerSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        }
        if (p.role === "SUPPLIER") {
            if (stockSupplierSelect) stockSupplierSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        }
    });

    if (quoteCustomer) {
        window.makeSearchableSelect(quoteCustomer, "-- Gõ để tìm tên/mã khách hàng --");
    }
    if (onlineOrderCustomer) {
        window.makeSearchableSelect(onlineOrderCustomer, "-- Gõ để tìm tên/mã khách hàng --");
    }
    if (finPartner) {
        window.makeSearchableSelect(finPartner, "-- Gõ để tìm đối tác --");
    }
    if (subPartnerSelect) {
        window.makeSearchableSelect(subPartnerSelect, "-- Gõ để tìm nhà gia công --");
    }
    if (stockSupplierSelect) {
        window.makeSearchableSelect(stockSupplierSelect, "-- Gõ để tìm nhà cung cấp --");
    }

    // Fill inventory select
    const stockMatSelect = document.getElementById("stockMaterialSelect");
    if (stockMatSelect) {
        stockMatSelect.innerHTML = "";
        (state.materials || []).forEach(mat => {
            if (!mat) return;
            stockMatSelect.innerHTML += `<option value="${mat.sku}">${mat.name} (${mat.sku})</option>`;
        });
    }

    // Fill active orders for outsourcing selection
    const subOrderSelect = document.getElementById("subOrderSelect");
    if (subOrderSelect) {
        subOrderSelect.innerHTML = "";
        (state.orders || []).forEach(o => {
            if (!o) return;
            const printSpecText = o.print_spec ? o.print_spec.substring(0, 30) : "";
            subOrderSelect.innerHTML += `<option value="${o.id}">${o.order_number} - ${printSpecText}...</option>`;
        });
    }

    // Fill quoteImportSelect with orders that are currently WAITING_QUOTE (calculated prices)
    const quoteImportSelect = document.getElementById("quoteImportSelect");
    if (quoteImportSelect) {
        quoteImportSelect.innerHTML = '<option value="">-- Tạo đơn mới hoàn toàn (Không chọn) --</option>';
        (state.orders || []).filter(o => o && o.status === "WAITING_QUOTE").forEach(o => {
            const customer = (state.partners || []).find(p => p && p.id === o.customer_id);
            const custName = customer ? customer.name : 'Khách vãng lai';
            const printSpecText = o.print_spec ? o.print_spec.substring(0, 25) : "";
            quoteImportSelect.innerHTML += `<option value="${o.id}">${o.order_number} - ${custName} (${printSpecText}...) - ${formatMoney(o.total_amount)}</option>`;
        });
        window.makeSearchableSelect(quoteImportSelect, "-- Tìm kiếm chọn đơn nháp / báo giá trước đó --");
    }
}

// Helper functions for capturing and restoring calculator form parameters
window.captureCurrentFormInputs = function() {
    const getVal = (id, fallback = '') => {
        const el = document.getElementById(id);
        return el ? el.value : fallback;
    };

    const inputs = {
        productType: getVal("quoteProductType", "CAI_DAY"),
        dim1: getVal("quoteDim1", "0"),
        dim2: getVal("quoteDim2", "0"),
        dim3: getVal("quoteDim3", "0"),
        dimExtra: getVal("quoteDimExtra", "0"),
        qty: getVal("quoteQty", "1000"),
        batDai: getVal("quoteBatDai", "1"),
        batRong: getVal("quoteBatRong", "1"),
        paperWeight: getVal("quotePaperWeight", "300"),
        paperPrice: getVal("quotePaperPrice", "28"),
        machineSize: getVal("quoteMachineSize", "B43/65"),
        plates: getVal("quotePlates", "4"),
        laminating: getVal("quoteLaminating", "25"),
        gluePrice: getVal("quoteGluePrice", "150"),
        shipFee: getVal("quoteShipFee", "50000"),
        markup: getVal("quoteMarkup", "1.3"),
        cartonTrayType: getVal("quoteCartonTrayType", "NONE"),
        cartonTrayPrice: getVal("quoteCartonTrayPrice", "0"),
        cartonPrintWrap: getVal("quoteCartonPrintWrap", "0"),
        cartonMold: getVal("quoteCartonMold", "0"),
        cartonMagnets: getVal("quoteCartonMagnets", "0"),
        cartonFoamThickness: getVal("quoteCartonFoamThickness", "0"),
        cartonFoamBatRong: getVal("quoteCartonFoamBatRong", "8"),
        cartonFoamBatDai: getVal("quoteCartonFoamBatDai", "24"),
        cartonSilk: getVal("quoteCartonSilk", "0"),
        cartonDecal: getVal("quoteCartonDecal", "0"),
        cartonFinishingRate: getVal("quoteCartonFinishingRate", "0"),
        cartonOfficeCost: getVal("quoteCartonOfficeCost", "0"),
        salesperson: getVal("quoteSalesperson", "Đại Hùng"),
        commissionRate: getVal("quoteCommissionRate", "1"),
        discount: getVal("quoteDiscount", "0"),
        customBrackets: window.customProdBrackets || [],
        dynamicFields: {}
    };

    const dynamicInputs = document.querySelectorAll("[id^='dynamic_field_']");
    dynamicInputs.forEach(el => {
        inputs.dynamicFields[el.id] = el.value;
    });

    return inputs;
};

window.applyQuoteInputsToForm = function(inputs, targetQty = null) {
    if (!inputs) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) {
            el.value = val;
        }
    };

    setVal("quoteProductType", inputs.productType);
    setVal("quoteDim1", inputs.dim1);
    setVal("quoteDim2", inputs.dim2);
    setVal("quoteDim3", inputs.dim3);
    setVal("quoteDimExtra", inputs.dimExtra);
    setVal("quoteQty", targetQty !== null ? targetQty : inputs.qty);
    setVal("quoteBatDai", inputs.batDai);
    setVal("quoteBatRong", inputs.batRong);
    setVal("quotePaperWeight", inputs.paperWeight);
    setVal("quotePaperPrice", inputs.paperPrice);
    setVal("quoteMachineSize", inputs.machineSize);
    setVal("quotePlates", inputs.plates);
    setVal("quoteLaminating", inputs.laminating);
    setVal("quoteGluePrice", inputs.gluePrice);
    setVal("quoteShipFee", inputs.shipFee);
    setVal("quoteMarkup", inputs.markup);
    setVal("quoteCartonTrayType", inputs.cartonTrayType);
    setVal("quoteCartonTrayPrice", inputs.cartonTrayPrice);
    setVal("quoteCartonPrintWrap", inputs.cartonPrintWrap);
    setVal("quoteCartonMold", inputs.cartonMold);
    setVal("quoteCartonMagnets", inputs.cartonMagnets);
    setVal("quoteCartonFoamThickness", inputs.cartonFoamThickness);
    setVal("quoteCartonFoamBatRong", inputs.cartonFoamBatRong);
    setVal("quoteCartonFoamBatDai", inputs.cartonFoamBatDai);
    setVal("quoteCartonSilk", inputs.cartonSilk);
    setVal("quoteCartonDecal", inputs.cartonDecal);
    setVal("quoteCartonFinishingRate", inputs.cartonFinishingRate);
    setVal("quoteCartonOfficeCost", inputs.cartonOfficeCost);
    setVal("quoteSalesperson", inputs.salesperson);
    setVal("quoteCommissionRate", inputs.commissionRate);
    setVal("quoteDiscount", inputs.discount || "0");

    if (inputs.customBrackets) {
        window.customProdBrackets = Array.isArray(inputs.customBrackets) ? inputs.customBrackets : [];
    }

    if (inputs.dynamicFields) {
        Object.keys(inputs.dynamicFields).forEach(id => {
            setVal(id, inputs.dynamicFields[id]);
        });
    }
};

// Báo giá in toán học (Imposition & Cost Calculator)
function calculateRealtimeQuote(updateUI = true) {
    const productType = document.getElementById("quoteProductType").value;
    const dim1 = parseFloat(document.getElementById("quoteDim1").value) || 0; // Cao/Dài
    const dim2 = parseFloat(document.getElementById("quoteDim2").value) || 0; // Ngang/Rộng
    const dim3 = parseFloat(document.getElementById("quoteDim3").value) || 0; // Cạnh nhỏ/Cao
    const dimExtra = parseFloat(document.getElementById("quoteDimExtra").value) || 0; // Cạnh dày (hộp âm dương)
    
    const qty = parseInt(document.getElementById("quoteQty").value) || 0;

    // Auto pricing rules for production
    const pricingConfig = state.pricing_config;
    if (pricingConfig) {
        // 1. Auto Markup range check
        if (pricingConfig.production_markup_ranges && pricingConfig.production_markup_ranges.length > 0) {
            const matchingRange = pricingConfig.production_markup_ranges.find(r => {
                const minMatch = qty >= r.min_qty;
                const maxMatch = r.max_qty === null || r.max_qty === undefined || r.max_qty === "" || qty <= r.max_qty;
                return minMatch && maxMatch;
            });
            if (matchingRange) {
                const markupEl = document.getElementById("quoteMarkup");
                if (markupEl && document.activeElement !== markupEl) {
                    markupEl.value = matchingRange.markup;
                }
            }
        }
        
        // 2. Auto Discount tier check
        if (pricingConfig.production_discount_tiers && pricingConfig.production_discount_tiers.length > 0) {
            let maxDiscount = 0;
            pricingConfig.production_discount_tiers.forEach(t => {
                if (qty >= t.min_qty) {
                    maxDiscount = Math.max(maxDiscount, t.discount_percent);
                }
            });
            const discountEl = document.getElementById("quoteDiscount");
            if (discountEl && document.activeElement !== discountEl) {
                discountEl.value = maxDiscount;
            }
        }
    }

    const batDai = parseInt(document.getElementById("quoteBatDai").value) || 1;
    const batRong = parseInt(document.getElementById("quoteBatRong").value) || 1;
    const paperWeight = parseFloat(document.getElementById("quotePaperWeight").value) || 300;
    const paperPrice = parseFloat(document.getElementById("quotePaperPrice").value) || 0; // k/kg
    const machineSize = document.getElementById("quoteMachineSize").value;
    const plates = parseInt(document.getElementById("quotePlates").value) || 4;
    const laminatingRate = parseFloat(document.getElementById("quoteLaminating").value) || 0;
    const gluePrice = parseFloat(document.getElementById("quoteGluePrice").value) || 0;
    const shipFee = parseFloat(document.getElementById("quoteShipFee").value) || 0;
    const markup = parseFloat(document.getElementById("quoteMarkup").value) || 1.3;

    let layoutLength = 0;
    let layoutWidth = 0;
    let wasteSheets = 0;
    let totalSheets = 0;
    let paperCost = 0;
    let printCost = 0;
    let laminationCost = 0;
    let moldCost = 0;
    let glueCost = 0;
    let procCost = 0;
    let officeCost = 0;
    let totalCostReal = 0;
    let unitPrice = 0;
    let totalCostRevenue = 0;

    // Excel plate machine lookup
    const machineSpecs = {
        "B43/65": { base: 175000, run: 25 },
        "A32/43": { base: 115000, run: 25 },
        "C52/72": { base: 185000, run: 35 },
        "D54/79": { base: 290000, run: 60 },
        "E65/86": { base: 350000, run: 70 }
    };

    const spec = machineSpecs[machineSize] || { base: 175000, run: 25 };

    if (productType === "CAI_DAY") {
        // Tuck top box (Hộp cài đáy)
        // Dim1 = Cao, Dim2 = Ngang, Dim3 = Cạnh nhỏ
        layoutLength = dim1 * batDai + (dim3 + 1.8) * (batDai + 1);
        layoutWidth = ((dim2 + dim3) * 2 + 1.5) * batRong + 1;
        wasteSheets = Math.round((100 + qty / batDai * 0.01) * 100) / 100;
        totalSheets = Math.round((qty / batDai / batRong + wasteSheets) * 100) / 100;

        paperCost = totalSheets * layoutLength * layoutWidth * paperWeight * paperPrice * 0.0001;

        // Print offset cost
        printCost = spec.base * plates + spec.run * Math.max(0, totalSheets - 1000) * plates;

        // Mold cost
        moldCost = ((dim1 + dim2) * 7 + dim3 * 12) * 600 * batDai * batRong;

        // Gluing
        glueCost = gluePrice * (qty + 20);

        // Lamination
        if (laminatingRate > 0) {
            laminationCost = layoutLength * layoutWidth * Math.max(0, totalSheets - 100) * laminatingRate * 0.01;
        }

        procCost = laminationCost + moldCost + 100000 + glueCost; // 100k set up bế
        officeCost = shipFee + 200000;
        totalCostReal = paperCost + printCost + procCost + officeCost;

    } else if (productType === "KHOA_DAY") {
        // Lock bottom box (Hộp khóa đáy)
        // Dim1 = Cao, Dim2 = Ngang, Dim3 = Cạnh nhỏ
        layoutLength = dim1 * batDai + (dim3 + 1.8) * batDai / 2 + (dim3 / 2 + 1.8) * batDai;
        layoutWidth = ((dim2 + dim3) * 2 + 1.5) * batRong + 1;
        wasteSheets = Math.round((100 + qty / batDai * 0.01) * 100) / 100;
        totalSheets = Math.round((qty / batDai / batRong + wasteSheets) * 100) / 100;

        paperCost = totalSheets * layoutLength * layoutWidth * paperWeight * paperPrice * 0.0001;

        printCost = spec.base * plates + spec.run * Math.max(0, totalSheets - 1000) * plates;

        // Mold cost
        moldCost = (dim1 * 7 + dim2 * 8 + dim3 * 16) * 600 * batDai * batRong;

        glueCost = gluePrice * (qty + 20);

        if (laminatingRate > 0) {
            laminationCost = layoutLength * layoutWidth * Math.max(0, totalSheets - 100) * laminatingRate * 0.01;
        }

        procCost = laminationCost + moldCost + 100000 + glueCost;
        officeCost = shipFee + 200000;
        totalCostReal = paperCost + printCost + procCost + officeCost;

    } else if (productType === "AM_DUONG") {
        // Lid & base box (Hộp âm dương)
        // Dim1 = Dài, Dim2 = Rộng, Dim3 = Cao, DimExtra = Cạnh dày
        layoutLength = dim1 + (dim3 * 2 + dimExtra + 1) * 2 + 1;
        layoutWidth = dim2 + (dim3 * 2 + dimExtra + 1) * 2 + 1;
        wasteSheets = Math.round((100 + qty * 0.01) * 100) / 100;
        totalSheets = qty + wasteSheets;

        paperCost = totalSheets * layoutLength * layoutWidth * paperWeight * paperPrice * 0.0001;

        printCost = spec.base * plates + spec.run * Math.max(0, totalSheets - 1000) * plates;

        // Mold cost
        moldCost = ((dim1 + dim2) * 10 + 40 * dim3) * 600;

        glueCost = gluePrice * (qty + 20);

        if (laminatingRate > 0) {
            laminationCost = layoutLength * layoutWidth * Math.max(0, totalSheets - 100) * laminatingRate * 0.01;
        }

        procCost = laminationCost + moldCost + 100000 + glueCost;
        officeCost = shipFee + 200000;
        totalCostReal = paperCost + printCost + procCost + officeCost;

    } else if (productType === "TUI") {
        // Paper Bag (Túi giấy)
        // Dim1 = Cao, Dim2 = Ngang, Dim3 = Cạnh nhỏ (Hông)
        // BatDai = Số mặt dài chia hết 2 (1 or 2), BatRong = Số mặt rộng chia hết 2 (1 or 2)
        layoutLength = (dim1 + (dim3 / 2 + 1.5) + 4) * batDai;
        layoutWidth = (dim2 + dim3) * batRong + 2;
        wasteSheets = Math.round((100 + qty / batDai * 0.01) * 100) / 100;
        totalSheets = Math.round((qty / batDai / batRong * 2 + wasteSheets) * 100) / 100;

        paperCost = totalSheets * layoutLength * layoutWidth * paperWeight * paperPrice * 0.0001;

        printCost = spec.base * plates + spec.run * Math.max(0, totalSheets - 1000) * plates;

        // Mold cost
        moldCost = (dim1 + (dim3 / 2 + 2) + 4 + dim2 + (dim3 + 1.5)) * 3 * 700 * batDai * batRong;

        glueCost = gluePrice * (qty + 20);

        if (laminatingRate > 0) {
            laminationCost = layoutLength * layoutWidth * Math.max(0, totalSheets - 100) * laminatingRate * 0.01;
        }

        procCost = laminationCost + moldCost + 100000 + glueCost;
        officeCost = shipFee + 200000;
        totalCostReal = paperCost + printCost + procCost + officeCost;

    } else if (productType === "CARTON_LANH") {
        // Carton Lạnh (Rigid Box)
        // Dim1 = Ngang, Dim2 = Rộng, Dim3 = Cao
        // Công thức tính áo ngoài, quây viền và khay theo sheet Carton Lạnh
        const bat = batDai; // Số bát
        const sheetsCarton = Math.round((qty / bat + 100) * 100) / 100;
        totalSheets = sheetsCarton;
        wasteSheets = 100;

        // Dynamic coefficients from DOM inputs (with fallback defaults matching Excel)
        const coefWeight = document.getElementById("coefCartonWeight") ? (parseFloat(document.getElementById("coefCartonWeight").value) || 1250) : 1250;
        const offsetOuter = document.getElementById("coefCartonOffset1") ? (parseFloat(document.getElementById("coefCartonOffset1").value) || 2) : 2;
        const offsetVienCao = document.getElementById("coefCartonOffset2") ? (parseFloat(document.getElementById("coefCartonOffset2").value) || 3) : 3;
        const offsetVienDai = document.getElementById("coefCartonOffset3") ? (parseFloat(document.getElementById("coefCartonOffset3").value) || 2) : 2;
        const offsetKhayNgang = document.getElementById("coefCartonOffset4") ? (parseFloat(document.getElementById("coefCartonOffset4").value) || 1) : 1;
        const offsetKhayRong = document.getElementById("coefCartonOffset5") ? (parseFloat(document.getElementById("coefCartonOffset5").value) || 1) : 1;
        const magnetUnitPrice = document.getElementById("coefMagnetUnitPrice") ? (parseFloat(document.getElementById("coefMagnetUnitPrice").value) || 650) : 650;
        const magnetMarkup = document.getElementById("coefMagnetMarkup") ? (parseFloat(document.getElementById("coefMagnetMarkup").value) || 1.1) : 1.1;
        const foamCostPerSheet = document.getElementById("coefFoamCostPerSheet") ? (parseFloat(document.getElementById("coefFoamCostPerSheet").value) || 110000) : 110000;
        const lanhAoBoiNgoaiOffset1 = document.getElementById("coefLanhAoBoiNgoaiOffset1") ? (parseFloat(document.getElementById("coefLanhAoBoiNgoaiOffset1").value) || 4) : 4;
        const lanhAoBoiNgoaiOffset2 = document.getElementById("coefLanhAoBoiNgoaiOffset2") ? (parseFloat(document.getElementById("coefLanhAoBoiNgoaiOffset2").value) || 4) : 4;
        const lanhAoTrongOffset1 = document.getElementById("coefLanhAoTrongOffset1") ? (parseFloat(document.getElementById("coefLanhAoTrongOffset1").value) || 1) : 1;
        const lanhAoTrongOffset2 = document.getElementById("coefLanhAoTrongOffset2") ? (parseFloat(document.getElementById("coefLanhAoTrongOffset2").value) || 4) : 4;
        const lanhVienOffset1 = document.getElementById("coefLanhVienOffset1") ? (parseFloat(document.getElementById("coefLanhVienOffset1").value) || 3) : 3;
        const lanhVienOffset2 = document.getElementById("coefLanhVienOffset2") ? (parseFloat(document.getElementById("coefLanhVienOffset2").value) || 3) : 3;

        // 1. Carton áo ngoài
        const outerNgang = Math.ceil(dim1 * bat);
        const outerDai = Math.ceil((dim2 + dim3) * 2);
        const outerPaperCost = (outerNgang + offsetOuter) * (outerDai + offsetOuter) * coefWeight * paperPrice * 0.0001 * sheetsCarton;

        // 2. Viền quây
        const borderCao = Math.ceil((dim3 + offsetVienCao) * bat);
        const borderDai = Math.ceil((dim1 + dim2) * 2);
        const borderPaperCost = (borderDai + offsetVienDai) * (borderCao + offsetOuter) * coefWeight * paperPrice * 0.0001 * sheetsCarton;

        // 3. Khay
        const trayType = document.getElementById("quoteCartonTrayType") ? document.getElementById("quoteCartonTrayType").value : "NONE";
        let trayWeight = 0;
        let trayPrice = document.getElementById("quoteCartonTrayPrice") ? (parseFloat(document.getElementById("quoteCartonTrayPrice").value) || 0) : 0;
        if (trayType === "CARTON_LANH") {
            trayWeight = coefWeight;
        } else if (trayType === "DUPLEX") {
            trayWeight = 350;
        }
        
        const trayNgang = Math.ceil(dim1 + dim3 + offsetKhayNgang);
        const trayRong = Math.ceil((dim2 + dim3 + offsetKhayRong) * bat);
        const trayPaperCost = trayType !== "NONE" ? (trayNgang * trayRong * trayWeight * trayPrice * 0.0001 * sheetsCarton) : 0;

        paperCost = outerPaperCost + borderPaperCost + trayPaperCost;

        // 4. Chi phí in áo bồi & kẽm
        const cartonPrintWrap = document.getElementById("quoteCartonPrintWrap") ? (parseFloat(document.getElementById("quoteCartonPrintWrap").value) || 0) : 0;
        printCost = cartonPrintWrap;

        // 5. Cán màng & Khuôn bế
        const cartonMold = document.getElementById("quoteCartonMold") ? (parseFloat(document.getElementById("quoteCartonMold").value) || 0) : 0;
        moldCost = cartonMold;

        if (laminatingRate > 0) {
            // Cán áo bồi
            laminationCost = (outerNgang + 4) * ((dim2 + dim3) * 2 + 4) * Math.max(0, sheetsCarton - 100) * laminatingRate * 0.01;
        }

        // 6. Phụ kiện: Nam châm & Cao su non
        const cartonMagnets = document.getElementById("quoteCartonMagnets") ? (parseInt(document.getElementById("quoteCartonMagnets").value) || 0) : 0;
        const magnetCost = qty * cartonMagnets * magnetUnitPrice * magnetMarkup;

        const foamThickness = document.getElementById("quoteCartonFoamThickness") ? (parseFloat(document.getElementById("quoteCartonFoamThickness").value) || 0) : 0;
        const foamBatRong = document.getElementById("quoteCartonFoamBatRong") ? (parseInt(document.getElementById("quoteCartonFoamBatRong").value) || 8) : 8;
        const foamBatDai = document.getElementById("quoteCartonFoamBatDai") ? (parseInt(document.getElementById("quoteCartonFoamBatDai").value) || 24) : 24;
        const foamSheets = (qty + 100) / (foamBatDai * foamBatRong);
        const foamCost = foamThickness > 0 ? (foamSheets * foamThickness * foamCostPerSheet) : 0;

        // 7. Lụa, Decal & Hoàn thiện gia công
        const cartonSilk = document.getElementById("quoteCartonSilk") ? (parseFloat(document.getElementById("quoteCartonSilk").value) || 0) : 0;
        const cartonDecal = document.getElementById("quoteCartonDecal") ? (parseFloat(document.getElementById("quoteCartonDecal").value) || 0) : 0;
        const finishingRate = document.getElementById("quoteCartonFinishingRate") ? (parseFloat(document.getElementById("quoteCartonFinishingRate").value) || 0) : 0;
        const finishingCost = finishingRate * qty;

        // Bù thêm đơn giá hoàn thiện (Excel cộng thêm ô đơn giá hoàn thiện AO4 trực tiếp vào tổng cộng)
        const finishingRateUnitCost = finishingRate;

        // CP khác, vận chuyển, văn phòng
        const cartonOfficeCost = document.getElementById("quoteCartonOfficeCost") ? (parseFloat(document.getElementById("quoteCartonOfficeCost").value) || 0) : 0;

        // DYNAMIC FIELDS calculation
        let dynamicCostsSum = 0;
        const dynamicFields = JSON.parse(localStorage.getItem("ihp_carton_lanh_dynamic_fields") || "[]");
        dynamicFields.forEach(df => {
            const inputEl = document.getElementById(`dynamic_field_${df.id}`);
            if (inputEl) {
                const val = parseFloat(inputEl.value) || 0;
                if (df.type === 'per_pc') {
                    dynamicCostsSum += val * qty;
                } else {
                    dynamicCostsSum += val;
                }
            }
        });

        // Tổng hợp tiền gia công & phụ kiện hiển thị vào mục dán/gia công
        glueCost = finishingCost + magnetCost + foamCost + cartonSilk + cartonDecal + finishingRateUnitCost + dynamicCostsSum;

        procCost = laminationCost + moldCost + glueCost;
        
        // Vận chuyển & Văn phòng
        officeCost = shipFee + cartonOfficeCost;
        
        totalCostReal = paperCost + printCost + procCost + officeCost;

        // Gán kích thước trải rộng áo bồi để hiển thị kỹ thuật
        layoutLength = outerNgang;
        layoutWidth = outerDai;

        // Tính kích thước áo bồi làm tròn lên nguyên dương
        const aoBoiNgang = Math.ceil(dim1 + lanhAoBoiNgoaiOffset1);
        const aoBoiRong = Math.ceil((dim2 + dim3) * 2 + lanhAoBoiNgoaiOffset2);
        const aoTrongNgang = Math.ceil(dim1 + lanhAoTrongOffset1);
        const aoTrongDai = Math.ceil(dim2 + dim3 + lanhAoTrongOffset2);
        const vienCao = Math.ceil(dim3 + lanhVienOffset1 + (dim3 / 2 + 2));
        const vienDai = Math.ceil((dim1 + dim2) * 2 + lanhVienOffset2);

        // Cập nhật giá trị hiển thị cho từng nhóm cột của Carton Lạnh
        if (updateUI) {
            if (document.getElementById("lblOutNgang")) document.getElementById("lblOutNgang").textContent = formatMoney(outerNgang);
            if (document.getElementById("lblOutDai")) document.getElementById("lblOutDai").textContent = formatMoney(outerDai);
            if (document.getElementById("lblOutSoTo")) document.getElementById("lblOutSoTo").textContent = formatMoney(sheetsCarton);
            if (document.getElementById("lblOutChiPhi")) document.getElementById("lblOutChiPhi").textContent = formatMoney(Math.round(outerPaperCost));

            if (document.getElementById("lblVienCaoQuay")) document.getElementById("lblVienCaoQuay").textContent = formatMoney(borderCao);
            if (document.getElementById("lblVienDaiQuay")) document.getElementById("lblVienDaiQuay").textContent = formatMoney(borderDai);
            if (document.getElementById("lblVienChiPhiQuay")) document.getElementById("lblVienChiPhiQuay").textContent = formatMoney(Math.round(borderPaperCost));

            if (document.getElementById("lblKhayNgang")) document.getElementById("lblKhayNgang").textContent = formatMoney(trayNgang);
            if (document.getElementById("lblKhayRong")) document.getElementById("lblKhayRong").textContent = formatMoney(trayRong);
            if (document.getElementById("lblKhayChiPhi")) document.getElementById("lblKhayChiPhi").textContent = formatMoney(Math.round(trayPaperCost));

            if (document.getElementById("lblAoBoiNgoai")) document.getElementById("lblAoBoiNgoai").textContent = aoBoiNgang + "x" + aoBoiRong;
            if (document.getElementById("lblAoTrong")) document.getElementById("lblAoTrong").textContent = aoTrongNgang + "x" + aoTrongDai;
            if (document.getElementById("lblVien")) document.getElementById("lblVien").textContent = vienCao + "x" + vienDai;

            if (document.getElementById("lblNamChamTien")) document.getElementById("lblNamChamTien").textContent = formatMoney(Math.round(magnetCost));
            if (document.getElementById("lblFoamKhoRong")) document.getElementById("lblFoamKhoRong").textContent = formatMoney(Math.round(dim1 * foamBatRong * 10));
            if (document.getElementById("lblFoamKhoDai")) document.getElementById("lblFoamKhoDai").textContent = formatMoney(Math.round(dim2 * foamBatDai * 10));
            if (document.getElementById("lblFoamSoTam")) document.getElementById("lblFoamSoTam").textContent = formatMoney(foamSheets.toFixed(3));
            if (document.getElementById("lblFoamTien")) document.getElementById("lblFoamTien").textContent = formatMoney(Math.round(foamCost));
            if (document.getElementById("lblFinishingTotal")) document.getElementById("lblFinishingTotal").textContent = formatMoney(Math.round(finishingCost));

            if (document.getElementById("lblLanhAoNgoai")) document.getElementById("lblLanhAoNgoai").textContent = aoBoiNgang + "x" + aoBoiRong;
            if (document.getElementById("lblLanhAoTrong")) document.getElementById("lblLanhAoTrong").textContent = aoTrongNgang + "x" + aoTrongDai;
            if (document.getElementById("lblLanhVien")) document.getElementById("lblLanhVien").textContent = vienCao + "x" + vienDai;
        }

    } else {
        // SONG (Hộp sóng) & GENERIC
        // Generic 2D imposition math or fallback
        layoutLength = dim1 * batDai + 2;
        layoutWidth = dim2 * batRong + 2;
        wasteSheets = Math.round((100 + qty * 0.005) * 100) / 100;
        totalSheets = Math.round((qty / (batDai * batRong) + wasteSheets) * 100) / 100;

        paperCost = totalSheets * layoutLength * layoutWidth * paperWeight * paperPrice * 0.0001;

        printCost = spec.base * plates + spec.run * Math.max(0, totalSheets - 1000) * plates;

        moldCost = (dim1 + dim2) * 200 * batDai * batRong;

        glueCost = gluePrice * (qty + 20);

        if (laminatingRate > 0) {
            laminationCost = layoutLength * layoutWidth * Math.max(0, totalSheets - 100) * laminatingRate * 0.01;
        }

        procCost = laminationCost + moldCost + 100000 + glueCost;
        officeCost = shipFee + 200000;
        totalCostReal = paperCost + printCost + procCost + officeCost;
    }

    // Safety fallback
    if (isNaN(totalCostReal) || totalCostReal <= 0) {
        totalCostReal = 0;
    }

    // Sell calculations
    const discountPct = parseFloat(document.getElementById("quoteDiscount")?.value) || 0;
    const baseUnitPrice = totalCostReal * markup / qty;
    unitPrice = baseUnitPrice * (1 - discountPct / 100);
    totalCostRevenue = unitPrice * qty;

    // Render numbers in UI
    if (updateUI) {
        document.getElementById("lblLayoutLength").textContent = Math.ceil(layoutLength);
        document.getElementById("lblLayoutWidth").textContent = Math.ceil(layoutWidth);
        document.getElementById("lblWasteSheets").textContent = Math.ceil(wasteSheets);
        document.getElementById("lblTotalSheets").textContent = Math.ceil(totalSheets);

        document.getElementById("calcPaperCost").textContent = formatMoney(Math.round(paperCost));
        document.getElementById("calcPrintCost").textContent = formatMoney(Math.round(printCost));
        document.getElementById("calcFinLamination").textContent = formatMoney(Math.round(laminationCost));
        document.getElementById("calcFinMold").textContent = formatMoney(Math.round(moldCost));
        document.getElementById("calcFinGlue").textContent = formatMoney(Math.round(glueCost));
        document.getElementById("calcProcCost").textContent = formatMoney(Math.round(procCost));
        document.getElementById("calcOfficeCost").textContent = formatMoney(Math.round(officeCost));
        document.getElementById("calcCostTotalReal").textContent = formatMoney(Math.round(totalCostReal));
        document.getElementById("calcCostUnitPrice").textContent = formatMoney(Math.round(unitPrice));
        document.getElementById("calcTotalCost").textContent = formatMoney(Math.round(totalCostRevenue));

        const discountEl = document.getElementById("rowQuoteDiscount");
        const discountValEl = document.getElementById("calcCostDiscount");
        const discountPctEl = document.getElementById("lblQuoteDiscountPercent");
        if (discountPct > 0) {
            if (discountEl) discountEl.style.display = "flex";
            const totalBeforeDiscount = Math.round(totalCostReal * markup);
            const discountAmt = Math.round(totalBeforeDiscount * (discountPct / 100));
            if (discountValEl) discountValEl.textContent = "-" + formatMoney(discountAmt) + "đ";
            if (discountPctEl) discountPctEl.textContent = discountPct;
        } else {
            if (discountEl) discountEl.style.display = "none";
        }

        if (window.renderProdFormQuantityBrackets) {
            window.renderProdFormQuantityBrackets();
        }
    }

    return { 
        paperCost: Math.round(paperCost), 
        printCost: Math.round(printCost), 
        procCost: Math.round(procCost), 
        totalCost: Math.round(totalCostRevenue),
        subtotalBeforeDiscount: Math.round(totalCostReal * markup),
        discountAmt: Math.round(totalCostReal * markup * (discountPct / 100)),
        layoutLength,
        layoutWidth,
        wasteSheets,
        totalSheets,
        unitPrice: Math.round(unitPrice)
    };
}

/* ==========================================================================
   PRODUCTION VOLUME & DISCOUNT BRACKETS FUNCTIONS
   ========================================================================== */
window.customProdBrackets = [];

window.renderProdFormQuantityBrackets = function() {
    const body = document.getElementById("prodFormQuantityBracketsBody");
    if (!body) return;

    const qtyInput = document.getElementById("quoteQty");
    if (!qtyInput) return;
    const baseQty = parseFloat(qtyInput.value) || 1000;

    // Build list of tiers
    let defaultTiers = [
        { qty: baseQty, discountPercent: 0 }
    ];

    let steps = [];
    if (baseQty <= 100) steps = [200, 500, 1000, 2000, 5000];
    else if (baseQty <= 500) steps = [300, 500, 1000, 2000, 5000];
    else if (baseQty <= 1000) steps = [1000, 2000, 3000, 5000, 10000];
    else if (baseQty <= 2000) steps = [2000, 3000, 5000, 10000, 20000];
    else if (baseQty <= 5000) steps = [5000, 7000, 10000, 20000, 50000];
    else steps = [baseQty, Math.round(baseQty * 1.5), Math.round(baseQty * 2), Math.round(baseQty * 3), Math.round(baseQty * 5)];

    steps.forEach(q => {
        if (q > 0 && !defaultTiers.some(t => t.qty === q)) {
            defaultTiers.push({ qty: q, discountPercent: 0 });
        }
    });

    if (window.customProdBrackets && window.customProdBrackets.length > 0) {
        window.customProdBrackets.forEach(cb => {
            const existing = defaultTiers.find(t => t.qty === cb.qty);
            if (existing) {
                existing.discountPercent = cb.discountPercent;
                existing.isCustom = true;
            } else {
                defaultTiers.push({ qty: cb.qty, discountPercent: cb.discountPercent, isCustom: true });
            }
        });
    }

    defaultTiers.sort((a, b) => a.qty - b.qty);

    const currentFormSaved = window.captureCurrentFormInputs();

    // Calculate base unit price for baseQty
    window.applyQuoteInputsToForm(currentFormSaved, baseQty);
    const baseCalc = calculateRealtimeQuote(false);
    const baseUnitPrice = baseCalc ? baseCalc.unitPrice : 0;

    body.innerHTML = "";

    defaultTiers.forEach(tier => {
        window.applyQuoteInputsToForm(currentFormSaved, tier.qty);
        const calc = calculateRealtimeQuote(false);
        if (!calc) return;

        const rawUnitPrice = calc.unitPrice;
        const discountPct = parseFloat(tier.discountPercent) || 0;
        const finalUnitPrice = Math.round(rawUnitPrice * (1 - discountPct / 100));
        const totalRevenue = Math.round(finalUnitPrice * tier.qty);
        const savingsPerPc = baseUnitPrice - finalUnitPrice;
        const isCurrent = tier.qty === baseQty;

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border-color)";
        if (isCurrent) {
            tr.style.background = "rgba(16, 143, 83, 0.18)";
            tr.style.fontWeight = "bold";
        }

        const discountInputHtml = `
            <input type="number" value="${discountPct}" min="0" max="100" step="0.5"
                onchange="window.updateProdBracketDiscount(${tier.qty}, this.value)"
                style="width: 55px; padding: 2px 4px; font-size: 0.8rem; text-align: right; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); display:inline-block;">%
        `;

        const savingsHtml = isCurrent
            ? `<span style="background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem;">Đơn chọn</span>`
            : (savingsPerPc > 0 ? `<strong style="color: var(--success); font-weight:700;">-${formatMoney(Math.round(savingsPerPc))}đ</strong>` : "-");

        const actionHtml = isCurrent
            ? `<span style="font-size: 0.75rem; color: var(--accent); font-weight:700;">✓ Đang chọn</span>`
            : `<button type="button" class="btn btn-sm btn-primary" onclick="window.selectProdBracketQty(${tier.qty})" style="padding: 2px 8px; font-size: 0.75rem;">Chọn SL này</button>
               ${tier.isCustom ? `<button type="button" onclick="window.removeProdBracketRow(${tier.qty})" style="background:none; border:none; color:var(--danger); font-size:0.85rem; cursor:pointer; margin-left:4px;" title="Xóa mức này">✕</button>` : ''}`;

        tr.innerHTML = `
            <td style="padding: 7px 10px;"><strong>${tier.qty.toLocaleString('vi-VN')} SP</strong></td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(rawUnitPrice)}đ</td>
            <td style="padding: 7px 10px; text-align: right;">${discountInputHtml}</td>
            <td style="padding: 7px 10px; text-align: right; color: var(--accent); font-weight: 700;">${formatMoney(finalUnitPrice)}đ</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(totalRevenue)}đ</td>
            <td style="padding: 7px 10px; text-align: right;">${savingsHtml}</td>
            <td style="padding: 7px 10px; text-align: center;">${actionHtml}</td>
        `;
        body.appendChild(tr);
    });

    window.applyQuoteInputsToForm(currentFormSaved);
};

window.addProdBracketRow = function() {
    const qtyInput = document.getElementById("newProdBracketQty");
    const discInput = document.getElementById("newProdBracketDiscount");
    if (!qtyInput) return;

    const qty = parseInt(qtyInput.value);
    const disc = parseFloat(discInput ? discInput.value : 0) || 0;

    if (!qty || qty <= 0) {
        alert("Vui lòng nhập số lượng hợp lệ (lớn hơn 0)!");
        return;
    }

    if (!window.customProdBrackets) window.customProdBrackets = [];
    const idx = window.customProdBrackets.findIndex(b => b.qty === qty);
    if (idx >= 0) {
        window.customProdBrackets[idx].discountPercent = disc;
    } else {
        window.customProdBrackets.push({ qty: qty, discountPercent: disc });
    }

    qtyInput.value = "";
    if (discInput) discInput.value = "0";

    window.renderProdFormQuantityBrackets();
};

window.updateProdBracketDiscount = function(qty, discountVal) {
    if (!window.customProdBrackets) window.customProdBrackets = [];
    const disc = parseFloat(discountVal) || 0;
    const idx = window.customProdBrackets.findIndex(b => b.qty === qty);
    if (idx >= 0) {
        window.customProdBrackets[idx].discountPercent = disc;
    } else {
        window.customProdBrackets.push({ qty: qty, discountPercent: disc });
    }
    window.renderProdFormQuantityBrackets();
};

window.removeProdBracketRow = function(qty) {
    if (!window.customProdBrackets) return;
    window.customProdBrackets = window.customProdBrackets.filter(b => b.qty !== qty);
    window.renderProdFormQuantityBrackets();
};

window.selectProdBracketQty = function(qty) {
    const qtyEl = document.getElementById("quoteQty");
    if (qtyEl) {
        qtyEl.value = qty;
        let disc = 0;
        if (window.customProdBrackets) {
            const match = window.customProdBrackets.find(b => b.qty === qty);
            if (match) disc = parseFloat(match.discountPercent) || 0;
        }
        const discEl = document.getElementById("quoteDiscount");
        if (discEl) {
            discEl.value = disc;
        }
        calculateRealtimeQuote(true);
    }
};

function handleOrderSubmit(e) {
    e.preventDefault();
    
    // Check which action was triggered (Save quote vs Create order & production)
    const activeAction = e.submitter ? e.submitter.id : "btnCreateOrderProd";
    const customerId = document.getElementById("quoteCustomer").value || "p1";
    const calculations = calculateRealtimeQuote();
    const width = parseFloat(document.getElementById("quoteDim2").value) || 0; // Ngang/Rộng
    const length = parseFloat(document.getElementById("quoteDim1").value) || 0; // Cao/Dài
    const qty = parseInt(document.getElementById("quoteQty").value) || 0;
    const paperWeight = document.getElementById("quotePaperWeight").value;

    const paperNames = {
        "120": "Couche 120gsm",
        "150": "Couche 150gsm",
        "200": "Ivory/Couche 200gsm",
        "210": "Ivory/Couche 210gsm",
        "230": "Ivory/Couche 230gsm",
        "250": "Ivory 250gsm",
        "300": "Ivory 300gsm",
        "350": "Ivory 350gsm",
        "400": "Ivory 400gsm",
        "1250": "Carton Lạnh 1250gsm"
    };

    const post_processing = [];
    const laminatingVal = parseFloat(document.getElementById("quoteLaminating").value);
    if (laminatingVal > 0) post_processing.push(laminatingVal === 25 ? "Cán màng mờ" : "Cán màng bóng");
    post_processing.push("Bế thành phẩm theo khuôn");

    const orderId = "o_" + Math.random().toString(36).substring(2, 9);
    const codeSuffix = String(state.orders.length + 1).padStart(4, '0');
    const orderNumber = `SO-202606-${codeSuffix}`;

    const spSubmit = document.getElementById("quoteSalesperson").value || "Đại Hùng";
    const commRateSubmit = parseFloat(document.getElementById("quoteCommissionRate").value) || 0;
    const subtotalBeforeDiscount = Math.round(calculations.subtotalBeforeDiscount);
    const discountAmt = Math.round(calculations.discountAmt);
    const finalTotalAmountSubmit = Math.round((subtotalBeforeDiscount - discountAmt) * 1.08);
    const commAmountSubmit = Math.round(finalTotalAmountSubmit * (commRateSubmit / 100));

    // Determine initial order status
    const isOnlyQuote = (activeAction === "btnSaveQuoteOnly");
    const initialStatus = isOnlyQuote ? "WAITING_QUOTE" : "IN_PRODUCTION";

    // Check if editing instead of new order creation
    const editId = document.getElementById("quoteForm").dataset.editId;
    let finalOrderId = orderId;
    let finalOrderNumber = orderNumber;
    let finalCreatedAt = new Date().toISOString();

    if (editId) {
        const existingOrder = state.orders.find(o => o.id === editId);
        if (existingOrder) {
            finalOrderId = existingOrder.id;
            finalOrderNumber = existingOrder.order_number;
            finalCreatedAt = existingOrder.created_at;
        }
    }

    const newOrder = {
        id: finalOrderId,
        order_number: finalOrderNumber,
        customer_id: customerId,
        width_mm: Math.round(width * 10),
        length_mm: Math.round(length * 10),
        quantity: qty,
        paper_type: paperNames[paperWeight] || `Ivory ${paperWeight}gsm`,
        print_spec: `In Offset, Bình: ${calculations.layoutLength.toFixed(1)} x ${calculations.layoutWidth.toFixed(1)} cm`,
        post_processing: post_processing,
        subtotal: subtotalBeforeDiscount,
        discount: discountAmt,
        vat_rate: 8,
        total_amount: finalTotalAmountSubmit,
        deposit: 0, // No auto deposit
        payment_status: "UNPAID", // Initial state is UNPAID
        status: initialStatus,
        created_at: finalCreatedAt,
        delivery_date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0], // Hạn giao 5 ngày sau
        salesperson: spSubmit,
        commission_rate: commRateSubmit,
        commission_amount: commAmountSubmit,
        notes: document.getElementById("quoteNotes") ? document.getElementById("quoteNotes").value.trim() : "",
        quote_inputs: window.captureCurrentFormInputs()
    };

    // Update state
    let newOrders = [];
    if (editId) {
        newOrders = state.orders.map(o => o.id === editId ? newOrder : o);
    } else {
        newOrders = [newOrder, ...state.orders];
    }
    state.updateState("orders", newOrders);
    
    // Clear edit state
    delete document.getElementById("quoteForm").dataset.editId;

    let prodNumber = "N/A";
    if (!isOnlyQuote) {
        // If edit mode was used and we are now triggering production, make sure we delete any old PO to avoid duplication
        if (editId) {
            const cleanProds = state.productions.filter(p => p.sales_order_id !== editId);
            state.productions = cleanProds;
            const cleanTxs = state.transactions.filter(t => t.reference_id !== editId);
            state.transactions = cleanTxs;
        }

        // Auto generate Production Lệnh in
        const prodCodeSuffix = String(state.productions.length + 1).padStart(4, '0');
        prodNumber = `PO-202606-${prodCodeSuffix}`;
        const prodId = "pr_" + Math.random().toString(36).substring(2, 9);
        
        const inputQty = Math.ceil(calculations.totalSheets);

        const newProd = {
            id: prodId,
            production_number: prodNumber,
            sales_order_id: finalOrderId,
            start_date: new Date().toISOString(),
            due_date: newOrder.delivery_date + "T17:00:00Z",
            input_qty: inputQty,
            target_qty: qty,
            status: "THIETKE",
            current_stage: "THIETKE",
            operator_id: "Đại Hùng"
        };

        const newProductions = [newProd, ...state.productions];
        state.updateState("productions", newProductions);
        // Deposit receipt will NOT be auto-generated here. It is handled in the Payment step.
        // Deduct stock of paper
        const sheetsRequired = Math.ceil(calculations.totalSheets);

        const paperSkuMap = {
            "150": "GI-COUCHE-150-A3",
            "300": "GI-COUCHE-300-A3",
            "250": "GI-DUPLEX-250-A3",
            "1250": "GI-DUPLEX-250-A3"
        };
        
        const matSku = paperSkuMap[paperWeight] || "GI-COUCHE-300-A3";
        const newMaterials = state.materials.map(m => {
            if (m.sku === matSku) {
                return { ...m, stock_qty: Math.max(0, m.stock_qty - sheetsRequired) };
            }
            return m;
        });
        state.updateState("materials", newMaterials);
    }

    // Reset forms & notify
    closeModal("quoteModal");
    initDataInForms();
    renderAll();
    
    // Send automated Telegram notification if enabled
    if (localStorage.getItem("ihp_tg_enable_notifications") !== "false") {
        sendTelegramOrderAlert(newOrder);
    }

    if (isOnlyQuote) {
        alert(`Đã lưu Báo giá ${orderNumber}. Trạng thái: Chưa tạo đơn sản xuất.`);
    } else {
        alert(`Đã tạo Đơn hàng ${orderNumber} & Đơn sản xuất ${prodNumber}. Trạng thái: Chờ thanh toán tạm ứng.`);
    }

    // Automatically open order details with payment, print, and pdf export features
    window.openOnlineOrderInvoicePdf(finalOrderId);
}

// ==========================================================================
// KANBAN ACTIONS & DRAG AND DROP
// ==========================================================================
window.allowDrop = function(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add("drag-over");
}

document.querySelectorAll(".kanban-cards").forEach(col => {
    col.addEventListener("dragleave", () => {
        col.classList.remove("drag-over");
    });
});

window.drop = function(ev, targetStatus) {
    ev.preventDefault();
    ev.currentTarget.classList.remove("drag-over");
    const jobId = ev.dataTransfer.getData("text/plain");
    
    updateJobStatus(jobId, targetStatus);
}

function updateJobStatus(jobId, targetStatus) {
    const newProds = state.productions.map(job => {
        if (job.id === jobId) {
            // If moved to finished, mark associated order as complete if needed
            if (targetStatus === "FINISHED") {
                // Done
            }
            return { ...job, status: targetStatus, current_stage: targetStatus };
        }
        return job;
    });

    state.updateState("productions", newProds);
    renderAll();
}
window.updateJobStatus = updateJobStatus;

window.editOrder = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.quote_inputs) {
        window.applyQuoteInputsToForm(order.quote_inputs);
        document.getElementById("quoteCustomer").value = order.customer_id;
    } else {
        // Fallback for legacy orders
        document.getElementById("quoteCustomer").value = order.customer_id;
        document.getElementById("quoteQty").value = order.quantity;
        
        // Set dims
        document.getElementById("quoteDim2").value = order.width_mm / 10;
        document.getElementById("quoteDim1").value = order.length_mm / 10;
        
        // Try to guess paper type weight
        let weight = "300";
        if (order.paper_type.includes("120")) weight = "120";
        else if (order.paper_type.includes("150")) weight = "150";
        else if (order.paper_type.includes("200")) weight = "200";
        else if (order.paper_type.includes("210")) weight = "210";
        else if (order.paper_type.includes("230")) weight = "230";
        else if (order.paper_type.includes("250")) weight = "250";
        else if (order.paper_type.includes("350")) weight = "350";
        else if (order.paper_type.includes("400")) weight = "400";
        else if (order.paper_type.includes("1250")) weight = "1250";
        document.getElementById("quotePaperWeight").value = weight;

        if (document.getElementById("quoteSalesperson")) {
            document.getElementById("quoteSalesperson").value = order.salesperson || "Đại Hùng";
        }
        if (document.getElementById("quoteCommissionRate")) {
            document.getElementById("quoteCommissionRate").value = order.commission_rate || 5;
        }
    }

    if (document.getElementById("quoteNotes")) {
        document.getElementById("quoteNotes").value = order.notes || "";
    }

    // Recalculate and open Modal
    calculateRealtimeQuote();
    openModal("quoteModal");

    // Temporarily save order ID on form element to update instead of inserting new one
    document.getElementById("quoteForm").dataset.editId = orderId;
};

window.cancelOrder = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    if (confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${order.order_number}?`)) {
        // Change status to CANCELLED instead of removing
        const newOrders = state.orders.map(o => {
            if (o.id === orderId) {
                return { ...o, status: "CANCELLED" };
            }
            return o;
        });
        state.updateState("orders", newOrders);

        // Remove associated productions
        const newProds = state.productions.filter(p => p.sales_order_id !== orderId);
        state.updateState("productions", newProds);

        // Remove associated transactions
        const newTxs = state.transactions.filter(t => t.reference_id !== orderId);
        state.updateState("transactions", newTxs);

        renderAll();
        alert(`Đã hủy thành công đơn hàng ${order.order_number}.`);
    }
};

window.openNewProdOrderModal = function() {
    // Clear edit state
    const form = document.getElementById("quoteForm");
    if (form) {
        delete form.dataset.editId;
        form.reset();
    }
    // Initialize form defaults
    if (typeof initDataInForms === "function") {
        initDataInForms();
    }
    openModal("quoteModal");
};

window.deleteProdOrder = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng sản xuất ${order.order_number}?`)) {
        // Remove from state.orders
        state.orders = state.orders.filter(o => o.id !== orderId);
        state.updateState("orders", state.orders);
        
        // Remove associated productions
        state.productions = state.productions.filter(p => p.sales_order_id !== orderId);
        state.updateState("productions", state.productions);
        
        // Remove associated transactions
        state.transactions = state.transactions.filter(t => t.reference_id !== orderId);
        state.updateState("transactions", state.transactions);
        
        renderProdOrders();
        try {
            if (typeof renderAll === "function") renderAll();
            if (typeof renderKanban === "function") renderKanban();
            if (typeof renderCRM === "function") renderCRM();
            if (typeof renderFinance === "function") renderFinance();
        } catch (err) {
            console.error(err);
        }
        alert(`Đã xóa thành công đơn hàng sản xuất ${order.order_number}.`);
    }
};

window.startProductionForOrder = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm(`Chuyển đơn hàng ${order.order_number} sang trạng thái sản xuất?`)) {
        // Update Order status
        const newOrders = state.orders.map(o => {
            if (o.id === orderId) {
                return { ...o, status: "IN_PRODUCTION", payment_status: "PARTIALLY_PAID", deposit: Math.round(o.total_amount * 0.5) };
            }
            return o;
        });
        state.updateState("orders", newOrders);

        // Generate Đơn sản xuất PO
        const prodCodeSuffix = String(state.productions.length + 1).padStart(4, '0');
        const prodNumber = `PO-202606-${prodCodeSuffix}`;
        const prodId = "pr_" + Math.random().toString(36).substring(2, 9);

        // Calculate input qty with average waste sheets (approx 10% or from calculations if saved, default to adding 10%)
        const targetQty = order.quantity;
        const inputQty = Math.ceil(targetQty * 1.1);

        const newProd = {
            id: prodId,
            production_number: prodNumber,
            sales_order_id: orderId,
            start_date: new Date().toISOString(),
            due_date: order.delivery_date + "T17:00:00Z",
            input_qty: inputQty,
            target_qty: targetQty,
            status: "THIETKE",
            current_stage: "THIETKE",
            operator_id: "Đại Hùng"
        };

        const newProductions = [newProd, ...state.productions];
        state.updateState("productions", newProductions);

        // Create transaction for Deposit
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PT-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);
        
        const depositTx = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "RECEIPT",
            category: "CUSTOMER_DEPOSIT",
            amount: Math.round(order.total_amount * 0.5),
            payment_method: "BANK_TRANSFER",
            account_source: "VCB",
            partner_id: order.customer_id,
            reference_id: orderId,
            created_by: "Kế toán Lan"
        };

        const newTxs = [depositTx, ...state.transactions];
        state.updateState("transactions", newTxs);

        renderAll();
        alert(`Đã tạo Đơn hàng sản xuất & Đơn sản xuất ${prodNumber}. Đã thu cọc ${formatMoney(depositTx.amount)}.`);
    }
};

window.moveJobNext = function(jobId) {
    const job = state.productions.find(p => p.id === jobId);
    if (!job) return;

    const stages = ["THIETKE", "KEM", "IN", "GIACONG", "QC", "GIAOHANG", "FINISHED"];
    const currIdx = stages.indexOf(job.status);
    if (currIdx !== -1 && currIdx < stages.length - 1) {
        const nextStatus = stages[currIdx + 1];
        updateJobStatus(jobId, nextStatus);
    }
}

window.openProductionJobModal = function(jobId) {
    const job = state.productions.find(p => p.id === jobId);
    if (!job) return;

    const order = state.orders.find(o => o.id === job.sales_order_id) || (state.online_orders || []).find(o => o.id === job.sales_order_id);
    const customer = state.partners.find(p => p.id === order?.customer_id);

    const mfgLinkedOrderNum = document.getElementById("mfgLinkedOrderNum");
    const mfgLinkedCustomer = document.getElementById("mfgLinkedCustomer");
    const mfgLinkedSpecs = document.getElementById("mfgLinkedSpecs");

    if (mfgLinkedOrderNum) mfgLinkedOrderNum.textContent = order ? order.order_number : 'N/A';
    if (mfgLinkedCustomer) mfgLinkedCustomer.textContent = customer ? customer.name : 'Khách vãng lai';
    
    let specText = 'Lệnh in';
    if (order) {
        if (order.print_spec) {
            specText = order.print_spec;
        } else if (order.items) {
            specText = order.items.map(item => {
                const prod = state.online_products.find(p => p.sku === item.sku);
                return `${prod ? prod.name : item.sku} (x${item.qty})`;
            }).join(", ");
        }
    }
    if (mfgLinkedSpecs) mfgLinkedSpecs.textContent = specText;

    document.getElementById("mfgJobId").value = jobId;
    document.getElementById("mfgJobNumber").value = job.production_number;
    document.getElementById("mfgJobStatus").value = job.status;
    document.getElementById("mfgStartDate").value = job.start_date ? job.start_date.split('T')[0] : '';
    document.getElementById("mfgDueDate").value = job.due_date ? job.due_date.split('T')[0] : '';
    document.getElementById("mfgTargetQty").value = job.target_qty;
    document.getElementById("mfgInputQty").value = job.input_qty;

    const opSelect = document.getElementById("mfgJobOperator");
    if (opSelect) {
        opSelect.innerHTML = "";
        const activeOperators = new Set(["Văn Minh", "Thế Phương", "Thanh Sơn", "Đại Hùng", "Thiết kế Minh"]);
        (state.employees || []).forEach(emp => {
            if (emp && emp.name) activeOperators.add(emp.name);
        });
        (state.productions || []).forEach(p => {
            if (p && p.operator_id) activeOperators.add(p.operator_id);
        });
        Array.from(activeOperators).forEach(op => {
            const opt = document.createElement("option");
            opt.value = op;
            opt.textContent = op;
            opSelect.appendChild(opt);
        });
        opSelect.value = job.operator_id || "Văn Minh";
    }

    window.recalcMfgLoss();
    openModal("productionJobModal");
};

window.recalcMfgLoss = function() {
    const target = parseInt(document.getElementById("mfgTargetQty").value) || 0;
    const input = parseInt(document.getElementById("mfgInputQty").value) || 0;
    if (input > 0) {
        const lossPercent = ((input - target) / input * 100).toFixed(1);
        document.getElementById("mfgLossPercent").value = `${lossPercent}%`;
    } else {
        document.getElementById("mfgLossPercent").value = "0.0%";
    }
};

window.saveProductionJob = function(e) {
    if (e) e.preventDefault();
    const jobId = document.getElementById("mfgJobId").value;
    const job = state.productions.find(p => p.id === jobId);
    if (!job) return;

    job.status = document.getElementById("mfgJobStatus").value;
    job.operator_id = document.getElementById("mfgJobOperator").value;
    job.start_date = new Date(document.getElementById("mfgStartDate").value).toISOString();
    job.due_date = new Date(document.getElementById("mfgDueDate").value).toISOString();
    job.target_qty = parseInt(document.getElementById("mfgTargetQty").value) || 0;
    job.input_qty = parseInt(document.getElementById("mfgInputQty").value) || 0;

    state.updateState("productions", state.productions);
    closeModal("productionJobModal");
    renderAll();
};

window.deleteProductionJobClick = function() {
    const jobId = document.getElementById("mfgJobId").value;
    const job = state.productions.find(p => p.id === jobId);
    if (!job) return;
    if (confirm(`Bạn có chắc chắn muốn xóa Đơn sản xuất ${job.production_number}?`)) {
        const newProds = state.productions.filter(p => p.id !== jobId);
        state.updateState("productions", newProds);
        closeModal("productionJobModal");
        renderAll();
    }
};

// ==========================================================================
// INVENTORY STOCK CONTROL
// ==========================================================================
window.quickRestock = function(sku) {
    document.getElementById("stockMaterialSelect").value = sku;
    openModal("stockModal");
}

function handleStockSubmit(e) {
    e.preventDefault();
    const sku = document.getElementById("stockMaterialSelect").value;
    const qty = parseInt(document.getElementById("stockQtyInput").value);
    const supplierId = document.getElementById("stockSupplierSelect").value;
    const cost = parseInt(document.getElementById("stockCostInput").value);

    // Update material qty
    const newMaterials = state.materials.map(m => {
        if (m.sku === sku) {
            return { ...m, stock_qty: m.stock_qty + qty, avg_cost: Math.round((m.avg_cost + cost) / 2) };
        }
        return m;
    });
    state.updateState("materials", newMaterials);

    // Record restock in restocks history
    const restockId = "r_" + Math.random().toString(36).substring(2, 9);
    const newRestock = {
        id: restockId,
        created_at: new Date().toISOString(),
        supplier_id: supplierId,
        sku: sku,
        qty: qty,
        cost: cost,
        total_amount: qty * cost
    };
    const newRestocks = [newRestock, ...state.restocks];
    state.updateState("restocks", newRestocks);

    const paidImmediately = document.getElementById("stockPaidImmediately") ? document.getElementById("stockPaidImmediately").checked : true;

    if (paidImmediately) {
        // Record cost in finance
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PC-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);

        const expenseTx = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "PAYMENT",
            category: "SUPPLIER_PAY",
            amount: qty * cost,
            payment_method: "BANK_TRANSFER",
            account_source: "VCB",
            partner_id: supplierId,
            reference_id: null,
            created_by: "Quản lý Hùng"
        };

        const newTxs = [expenseTx, ...state.transactions];
        state.updateState("transactions", newTxs);
        
        closeModal("stockModal");
        renderAll();
        alert(`Đã nhập kho thêm ${qty} vật tư và tự động tạo phiếu chi ${txNumber} số tiền: ${formatMoney(qty * cost)}.`);
    } else {
        closeModal("stockModal");
        renderAll();
        alert(`Đã ghi nợ nhập kho ${qty} vật tư. Số tiền ghi nợ: ${formatMoney(qty * cost)}.`);
    }
}

// ==========================================================================
// OUTSOURCING & SUBCONTRACTING
// ==========================================================================
window.openSubcontractForOrder = function(orderId) {
    document.getElementById("subOrderSelect").value = orderId;
    openModal("subcontractModal");
}

function handleSubcontractSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById("subOrderSelect").value;
    const subcontractorId = document.getElementById("subPartnerSelect").value;
    const workDetail = document.getElementById("subWorkDetail").value;
    const cost = parseInt(document.getElementById("subCost").value);
    const deadline = document.getElementById("subDeadline").value;

    const contractCodeSuffix = String(state.subcontracts.length + 1).padStart(4, '0');
    const contractNumber = `SC-202606-${contractCodeSuffix}`;
    const subId = "sc_" + Math.random().toString(36).substring(2, 9);

    const newSub = {
        id: subId,
        contract_number: contractNumber,
        subcontractor_id: subcontractorId,
        sales_order_id: orderId,
        work_detail: workDetail,
        cost: cost,
        deadline: deadline,
        progress: 0,
        status: "PROCESSING",
        payment_status: "UNPAID"
    };

    const newSubs = [newSub, ...state.subcontracts];
    state.updateState("subcontracts", newSubs);

    closeModal("subcontractModal");
    renderAll();
    alert(`Đã bàn giao công việc cho đơn vị thuê ngoài. Hợp đồng ${contractNumber}.`);
}

window.updateSubcontractProgress = function(subId) {
    const sub = state.subcontracts.find(s => s.id === subId);
    if (!sub) return;

    const newProg = prompt(`Nhập tiến độ mới (%) cho hợp đồng ${sub.contract_number}:`, sub.progress);
    if (newProg !== null) {
        const percent = Math.min(100, Math.max(0, parseInt(newProg) || 0));
        const newSubs = state.subcontracts.map(s => {
            if (s.id === subId) {
                return { ...s, progress: percent, status: percent === 100 ? "FINISHED" : "PROCESSING" };
            }
            return s;
        });
        state.updateState("subcontracts", newSubs);
        renderAll();
    }
}

window.paySubcontractor = function(subId) {
    const sub = state.subcontracts.find(s => s.id === subId);
    if (!sub) return;

    const confirmPay = confirm(`Xác nhận chi trả số tiền ${formatMoney(sub.cost)} cho hợp đồng gia công ${sub.contract_number}?`);
    if (confirmPay) {
        // Record payment in transactions
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PC-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);

        const subTx = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "PAYMENT",
            category: "SUBCONTRACTOR_PAY",
            amount: sub.cost,
            payment_method: "BANK_TRANSFER",
            account_source: "VCB",
            partner_id: sub.subcontractor_id,
            reference_id: sub.sales_order_id,
            created_by: "Kế toán Lan"
        };

        const newTxs = [subTx, ...state.transactions];
        state.updateState("transactions", newTxs);

        // Update Subcontract payment status
        const newSubs = state.subcontracts.map(s => {
            if (s.id === subId) {
                return { ...s, payment_status: "PAID" };
            }
            return s;
        });
        state.updateState("subcontracts", newSubs);

        renderAll();
        alert(`Đã lập phiếu chi ${txNumber} trị giá ${formatMoney(sub.cost)} thanh toán gia công.`);
    }
}

// ==========================================================================
// FINANCE & TRANSACTION MANAGEMENT
// ==========================================================================
window.receivePaymentForOrder = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const unpaidAmount = order.total_amount - order.deposit;
    const confirmReceive = confirm(`Nhận thanh toán nốt ${formatMoney(unpaidAmount)} cho đơn hàng ${order.order_number}?`);
    if (confirmReceive) {
        // Create Receipt
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PT-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);

        const finalReceipt = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "RECEIPT",
            category: "CUSTOMER_FINAL",
            amount: unpaidAmount,
            payment_method: "BANK_TRANSFER",
            account_source: "VCB",
            partner_id: order.customer_id,
            reference_id: order.id,
            created_by: "Kế toán Lan"
        };

        const newTxs = [finalReceipt, ...state.transactions];
        state.updateState("transactions", newTxs);

        // Update Order payment status
        const newOrders = state.orders.map(o => {
            if (o.id === orderId) {
                return { ...o, payment_status: "PAID" };
            }
            return o;
        });
        state.updateState("orders", newOrders);

        renderAll();
        alert(`Đã thu nợ thành công số tiền ${formatMoney(unpaidAmount)}.`);
    }
}

document.getElementById("btnNewReceipt").addEventListener("click", () => {
    document.getElementById("financeModalTitle").textContent = "Lập phiếu THU dòng tiền";
    document.getElementById("finType").value = "RECEIPT";
    
    // Fill category list with thu options
    const categorySelect = document.getElementById("finCategory");
    categorySelect.innerHTML = `
        <option value="CUSTOMER_FINAL">Thu nợ khách hàng mua in</option>
        <option value="CUSTOMER_DEPOSIT">Thu tạm ứng cọc đơn hàng</option>
        <option value="OPERATIONAL">Khoản thu nhập tài chính khác</option>
    `;
    openModal("financeModal");
});

document.getElementById("btnNewPayment").addEventListener("click", () => {
    document.getElementById("financeModalTitle").textContent = "Lập phiếu CHI dòng tiền";
    document.getElementById("finType").value = "PAYMENT";
    
    // Fill category list with chi options
    const categorySelect = document.getElementById("finCategory");
    categorySelect.innerHTML = `
        <option value="SUPPLIER_PAY">Trả tiền giấy/mực/vật liệu</option>
        <option value="SUBCONTRACTOR_PAY">Trả tiền gia công ngoài</option>
        <option value="SALARY">Trả lương nhân sự xưởng</option>
        <option value="OPERATIONAL">Chi phí điện nước, mặt bằng, sửa máy</option>
    `;
    openModal("financeModal");
});

function handleFinanceSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("finType").value;
    const partnerId = document.getElementById("finPartner").value;
    const category = document.getElementById("finCategory").value;
    const amount = parseInt(document.getElementById("finAmount").value);
    const method = document.getElementById("finMethod").value;
    const account = document.getElementById("finAccount").value;

    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txPrefix = type === "RECEIPT" ? "PT" : "PC";
    const txNumber = `${txPrefix}-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);

    const newTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: type,
        category: category,
        amount: amount,
        payment_method: method,
        account_source: account,
        partner_id: partnerId,
        reference_id: null,
        created_by: "Quản lý Hùng"
    };

    const newTxs = [newTx, ...state.transactions];
    state.updateState("transactions", newTxs);

    // Update payment status of orders / subcontracts if debt is fully paid
    if (category === "CUSTOMER_FINAL" || category === "CUSTOMER_DEPOSIT") {
        const totalSales = state.orders.filter(o => o.customer_id === partnerId).reduce((sum, o) => sum + o.total_amount, 0);
        const totalPaid = newTxs.filter(t => t.partner_id === partnerId && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        if (totalPaid >= totalSales) {
            const newOrders = state.orders.map(o => {
                if (o.customer_id === partnerId) {
                    return { ...o, payment_status: "PAID" };
                }
                return o;
            });
            state.updateState("orders", newOrders);
        }
    } else if (category === "SUBCONTRACTOR_PAY") {
        const totalCost = state.subcontracts.filter(s => s.subcontractor_id === partnerId).reduce((sum, s) => sum + s.cost, 0);
        const totalPaid = newTxs.filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
        if (totalPaid >= totalCost) {
            const newSubs = state.subcontracts.map(s => {
                if (s.subcontractor_id === partnerId) {
                    return { ...s, payment_status: "PAID" };
                }
                return s;
            });
            state.updateState("subcontracts", newSubs);
        }
    }

    closeModal("financeModal");
    renderAll();
    alert(`Đã ghi nhận thành công phiếu ${txNumber} trị giá ${formatMoney(amount)}.`);
}

// ==========================================================================
// TABLE FILTERS
// ==========================================================================
function filterQuotesTable() {
    renderQuotes();
}

function filterProdOrdersTable() {
    renderProdOrders();
}

function filterInventoryTable(showOnlyAlerts = false) {
    const query = document.getElementById("inventorySearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTable tbody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesQuery = text.includes(query);
        let matchesAlert = true;

        if (showOnlyAlerts === true) {
            matchesAlert = row.innerHTML.includes("badge-danger");
        }

        if (matchesQuery && matchesAlert) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function filterSubcontractsTable() {
    const query = document.getElementById("subcontractSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#subcontractingTable tbody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function filterFinanceTable() {
    const query = document.getElementById("financeSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#financeTransactionsTable tbody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// ==========================================================================
// CRM MODULE & PARTNER MANAGEMENT
// ==========================================================================
let selectedCrmPartnerId = null;
let activeCrmRoleFilter = "all";

function updateCrmBadges() {
    const allCount = state.partners.length;
    const customerCount = state.partners.filter(p => p.role === "CUSTOMER" || p.role === "BOTH").length;
    const supplierCount = state.partners.filter(p => p.role === "SUPPLIER" || p.role === "BOTH").length;
    const subcontractorCount = state.partners.filter(p => p.role === "SUBCONTRACTOR").length;

    const badgeAll = document.getElementById("crmBadgeAll");
    const badgeCustomer = document.getElementById("crmBadgeCustomer");
    const badgeSupplier = document.getElementById("crmBadgeSupplier");
    const badgeSubcontractor = document.getElementById("crmBadgeSubcontractor");

    if (badgeAll) badgeAll.textContent = allCount;
    if (badgeCustomer) badgeCustomer.textContent = customerCount;
    if (badgeSupplier) badgeSupplier.textContent = supplierCount;
    if (badgeSubcontractor) badgeSubcontractor.textContent = subcontractorCount;
}

function renderCRM() {
    updateCrmBadges();

    const query = document.getElementById("crmSearchInput").value.toLowerCase();
    const roleFilter = activeCrmRoleFilter;

    const filteredPartners = state.partners.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || p.phone.includes(query);
        const matchesRole = roleFilter === "all" || p.role === roleFilter || (p.role === "BOTH" && (roleFilter === "CUSTOMER" || roleFilter === "SUPPLIER"));
        return matchesQuery && matchesRole;
    });

    const tableBody = document.querySelector("#crmTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (filteredPartners.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="13" class="text-muted text-center">Không tìm thấy đối tác nào</td></tr>`;
        return;
    }

    filteredPartners.forEach(p => {
        const roleLabels = { CUSTOMER: "Khách hàng", SUPPLIER: "Nhà cung cấp", SUBCONTRACTOR: "Đơn vị gia công", BOTH: "Khách & NCC" };
        
        // Compute spending/sales volume
        let spendVal = 0;
        let debtVal = 0;

        if (p.role === "CUSTOMER" || p.role === "BOTH") {
            spendVal = state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
            const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
            debtVal = Math.max(0, spendVal - paid);
        } else if (p.role === "SUBCONTRACTOR") {
            spendVal = state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
            const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
            debtVal = Math.max(0, spendVal - paid);
        } else if (p.role === "SUPPLIER") {
            spendVal = state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
            const paid = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
            debtVal = Math.max(0, spendVal - paid);
        }

        const statusBadge = p.status ? `<span class="badge badge-success">Đang làm việc</span>` : `<span class="badge badge-danger">Tạm dừng</span>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><a href="javascript:void(0)" onclick="window.openEditPartner('${p.id}')" style="text-decoration:underline; font-weight:700; color:var(--accent);"><strong>${p.code}</strong></a></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.company_name || 'N/A'}</td>
            <td>${p.tax_code || 'N/A'}</td>
            <td>${p.billing_address || 'N/A'}</td>
            <td>${p.billing_email || 'N/A'}</td>
            <td><span class="badge badge-info">${roleLabels[p.role] || p.role}</span></td>
            <td>${p.phone}</td>
            <td>${p.email || 'N/A'}</td>
            <td><strong>${formatMoney(spendVal)}</strong></td>
            <td class="${debtVal > 0 ? 'text-warning font-bold' : ''}">${formatMoney(debtVal)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.openCrmDetail('${p.id}')">Xem CRM</button>
                    <button class="btn-icon" onclick="window.openEditPartner('${p.id}')" title="Sửa"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="window.deletePartner('${p.id}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function filterCRMTable() {
    renderCRM();
}

function handlePartnerSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("partnerIdInput").value;
    const name = document.getElementById("partnerName").value;
    const phone = document.getElementById("partnerPhone").value;
    const email = document.getElementById("partnerEmail").value;
    const address = document.getElementById("partnerAddress").value;
    const role = document.getElementById("partnerRole").value;
    const limit = parseInt(document.getElementById("partnerLimit").value) || 0;

    const company_name = document.getElementById("partnerCompanyName").value.trim();
    const tax_code = document.getElementById("partnerTaxCode").value.trim();
    const billing_address = document.getElementById("partnerBillingAddress").value.trim();
    const billing_email = document.getElementById("partnerBillingEmail").value.trim();

    if (id) {
        // Edit Partner
        const newPartners = state.partners.map(p => {
            if (p.id === id) {
                return { ...p, name, phone, email, address, role, credit_limit: limit, company_name, tax_code, billing_address, billing_email };
            }
            return p;
        });
        state.updateState("partners", newPartners);
        alert("Đã cập nhật thông tin đối tác.");
    } else {
        // New Partner
        const prefix = role === "CUSTOMER" ? "KH" : role === "SUPPLIER" ? "NCC" : "TC";
        const codeSuffix = String(state.partners.length + 1).padStart(3, '0');
        const code = `${prefix}-${codeSuffix}`;
        const newId = "p_" + Math.random().toString(36).substring(2, 9);

        const newPartner = {
            id: newId,
            code: code,
            name: name,
            phone: phone,
            email: email,
            address: address,
            role: role,
            credit_limit: limit,
            status: true,
            company_name,
            tax_code,
            billing_address,
            billing_email
        };

        const newPartners = [...state.partners, newPartner];
        state.updateState("partners", newPartners);
        alert(`Đã thêm thành công đối tác ${code}: ${name}`);
    }

    closeModal("partnerModal");
    initDataInForms();
    renderAll();
}

window.openCrmDetail = function(partnerId) {
    window.goToPartnerCare(partnerId);
};

window.goToPartnerCare = function(partnerId) {
    selectedCrmPartnerId = partnerId;
    switchTab("crm-care");
};

window.initCrmCareTab = function() {
    const searchInput = document.getElementById("crmCareSearchInput");
    const roleFilterEl = document.getElementById("crmCareRoleFilter");
    const statusFilterEl = document.getElementById("crmCareStatusFilter");
    const selectEl = document.getElementById("crmCarePartnerSelect");
    if (!selectEl) return;

    if (searchInput) searchInput.value = "";
    if (statusFilterEl) statusFilterEl.value = "all";

    let currentRole = "all";
    if (selectedCrmPartnerId) {
        const partner = state.partners.find(p => p.id === selectedCrmPartnerId);
        if (partner) {
            currentRole = partner.role;
        }
    }
    
    if (roleFilterEl) {
        roleFilterEl.value = currentRole;
    }

    window.filterCarePartnerList(false);
};

window.filterCarePartnerList = function(autoSelectFirst = true) {
    const searchInput = document.getElementById("crmCareSearchInput");
    const roleFilterEl = document.getElementById("crmCareRoleFilter");
    const statusFilterEl = document.getElementById("crmCareStatusFilter");
    const selectEl = document.getElementById("crmCarePartnerSelect");
    if (!selectEl || !roleFilterEl || !statusFilterEl) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedRole = roleFilterEl.value;
    const selectedStatus = statusFilterEl.value;
    
    selectEl.innerHTML = "";

    // Helper to calculate days since last care interaction
    const getDaysSinceLastCare = (partnerId) => {
        const notes = state.crm_notes.filter(n => n.partner_id === partnerId);
        if (notes.length === 0) return 999999; // Never cared count as infinity
        
        const sorted = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const latestDate = new Date(sorted[0].created_at);
        const diffTime = Math.abs(new Date() - latestDate);
        return diffTime / (1000 * 60 * 60 * 24);
    };

    const filteredPartners = state.partners.filter(p => {
        // 1. Text Search Filter
        if (query) {
            const codeMatch = p.code ? p.code.toLowerCase().includes(query) : false;
            const nameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
            const phoneMatch = p.phone ? p.phone.toLowerCase().includes(query) : false;
            if (!codeMatch && !nameMatch && !phoneMatch) return false;
        }

        // 2. Role Filter
        if (selectedRole !== "all") {
            const roleMatch = p.role === selectedRole || (p.role === "BOTH" && (selectedRole === "CUSTOMER" || selectedRole === "SUPPLIER"));
            if (!roleMatch) return false;
        }

        // 3. Care Status Filter
        if (selectedStatus !== "all") {
            const days = getDaysSinceLastCare(p.id);
            if (selectedStatus === "active") {
                return days < 3;
            } else if (selectedStatus === "3days") {
                return days >= 3;
            } else if (selectedStatus === "7days") {
                return days >= 7;
            } else if (selectedStatus === "30days") {
                return days >= 30;
            }
        }

        return true;
    });

    const sortedPartners = [...filteredPartners].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    
    sortedPartners.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.name} (${p.code} - ${p.phone})`;
        selectEl.appendChild(option);
    });

    const hasSelected = sortedPartners.some(p => p.id === selectedCrmPartnerId);
    if ((autoSelectFirst || !hasSelected) && sortedPartners.length > 0) {
        selectedCrmPartnerId = sortedPartners[0].id;
    }

    if (selectedCrmPartnerId && hasSelected) {
        selectEl.value = selectedCrmPartnerId;
        window.loadCrmPartnerCareDetail(selectedCrmPartnerId);
    } else if (sortedPartners.length > 0) {
        selectedCrmPartnerId = sortedPartners[0].id;
        selectEl.value = selectedCrmPartnerId;
        window.loadCrmPartnerCareDetail(selectedCrmPartnerId);
    } else {
        // Clear profile card details if no partners found in filter
        selectedCrmPartnerId = null;
        const nameEl = document.getElementById("crmProfileName");
        if (nameEl) nameEl.innerHTML = `<em class="text-muted" style="font-size:0.9rem;">Không tìm thấy đối tác</em>`;
        const metaEl = document.getElementById("crmProfileMeta");
        if (metaEl) metaEl.textContent = "";
        const phoneLinkEl = document.getElementById("crmProfilePhoneLink");
        if (phoneLinkEl) { phoneLinkEl.textContent = ""; phoneLinkEl.href = "javascript:void(0)"; }
        const emailLinkEl = document.getElementById("crmProfileEmailLink");
        if (emailLinkEl) { emailLinkEl.textContent = ""; emailLinkEl.href = "javascript:void(0)"; }
        const addressEl = document.getElementById("crmProfileAddress");
        if (addressEl) addressEl.textContent = "";
        
        // Clear subtabs contents
        const timeline = document.getElementById("crmSubtab-notes");
        if (timeline) timeline.innerHTML = `<p class="text-muted text-center" style="padding:20px 0;">Không có dữ liệu đối tác phù hợp</p>`;
    }
};

window.selectCarePartnerFromSelect = function(partnerId) {
    selectedCrmPartnerId = partnerId;
    window.loadCrmPartnerCareDetail(partnerId);
};

window.loadCrmPartnerCareDetail = function(partnerId) {
    try {
        const partner = state.partners.find(p => p.id === partnerId);
        if (!partner) return;

        const roleLabels = { CUSTOMER: "Khách hàng", SUPPLIER: "Nhà cung cấp", SUBCONTRACTOR: "Đơn vị gia công", BOTH: "Khách & NCC" };

        const nameEl = document.getElementById("crmProfileName");
        const metaEl = document.getElementById("crmProfileMeta");
        const phoneLinkEl = document.getElementById("crmProfilePhoneLink");
        const emailLinkEl = document.getElementById("crmProfileEmailLink");
        const addressEl = document.getElementById("crmProfileAddress");

        if (nameEl) nameEl.textContent = partner.name;
        if (metaEl) metaEl.textContent = `Mã: ${partner.code} | Vai trò: ${roleLabels[partner.role] || partner.role}`;
        if (phoneLinkEl) {
            phoneLinkEl.textContent = partner.phone;
            phoneLinkEl.href = `tel:${partner.phone}`;
        }
        if (emailLinkEl) {
            emailLinkEl.textContent = partner.email || "Chưa cập nhật";
            emailLinkEl.href = partner.email ? `mailto:${partner.email}` : "javascript:void(0)";
        }
        if (addressEl) addressEl.textContent = partner.address || "Chưa cập nhật";

        const noteInputEl = document.getElementById("crmNoteInput");
        if (noteInputEl) noteInputEl.value = "";
        
        const channelInputEl = document.getElementById("crmNoteChannel");
        if (channelInputEl) {
            channelInputEl.value = "NOTE";
            document.querySelectorAll(".channel-btn").forEach(btn => {
                if (btn.getAttribute("data-channel") === "NOTE") {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
        }

        renderCrmDetailSubtabs(partnerId);
    } catch (err) {
        console.error(err);
    }
};

function renderCrmDetailSubtabs(partnerId) {
    try {
        const partner = state.partners.find(p => p.id === partnerId);
        if (!partner) return;

    // 1. Render Notes Timeline
    const timeline = document.getElementById("crmSubtab-notes");
    if (timeline) {
        timeline.innerHTML = "";

        const notes = state.crm_notes
            .filter(n => n.partner_id === partnerId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (notes.length === 0) {
            timeline.innerHTML = `<p class="text-muted text-center" style="padding:20px 0;">Chưa có lịch sử cuộc gọi hay ghi chú chăm sóc nào cho đối tác này.</p>`;
        } else {
            notes.forEach(note => {
            const timeStr = new Date(note.created_at).toLocaleString('vi-VN');
            const item = document.createElement("div");
            item.className = "crm-timeline-item";
            
            const channelInfo = {
                NOTE: { label: "Ghi chú", bg: "rgba(0,0,0,0.05)", text: "var(--text-secondary)", emoji: "📝" },
                CALL: { label: "Cuộc gọi", bg: "rgba(16, 143, 83, 0.1)", text: "var(--accent)", emoji: "📞" },
                ZALO: { label: "Zalo", bg: "rgba(0, 104, 255, 0.1)", text: "#0068ff", emoji: "💬" },
                FACEBOOK: { label: "Facebook", bg: "rgba(24, 119, 242, 0.1)", text: "#1877f2", emoji: "👥" },
                TELEGRAM: { label: "Telegram", bg: "rgba(0, 136, 204, 0.1)", text: "#0088cc", emoji: "✈️" },
                EMAIL: { label: "Email", bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", emoji: "✉️" },
                CHAT: { label: "Hộp thư", bg: "rgba(139, 92, 246, 0.1)", text: "#8b5cf6", emoji: "📥" }
            };
            
            const channel = note.channel || "NOTE";
            const info = channelInfo[channel] || channelInfo.NOTE;
            const badge = `<span class="badge" style="background:${info.bg}; color:${info.text}; display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${info.emoji} ${info.label}</span>`;

            item.innerHTML = `
                <div class="crm-timeline-meta" style="display: flex; align-items: center; gap: 8px;">
                    <span>${timeStr}</span>
                    <span class="accent-color" style="font-weight:600;">${note.created_by}</span>
                    ${badge}
                </div>
                <div class="crm-timeline-content" style="margin-top: 4px; color: var(--text-primary); font-size: 0.88rem; line-height: 1.4;">${note.content}</div>
            `;
            timeline.appendChild(item);
        });
        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
        }
    }

    // 2. Render Orders Log
    const ordersBody = document.querySelector("#crmOrdersLogTable tbody");
    if (ordersBody) {
        ordersBody.innerHTML = "";
        const partnerOrders = state.orders.filter(o => o.customer_id === partnerId);
        if (partnerOrders.length === 0) {
            ordersBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">Không có đơn đặt hàng nào</td></tr>`;
        } else {
            partnerOrders.forEach(o => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.print_spec}</td>
                    <td><strong>${formatMoney(o.total_amount)}</strong></td>
                    <td><span class="badge badge-info">${o.status}</span></td>
                `;
                ordersBody.appendChild(row);
            });
        }
    }

    // 3. Render Finance Log
    const financeBody = document.querySelector("#crmFinanceLogTable tbody");
    if (financeBody) {
        financeBody.innerHTML = "";
        const partnerTxs = state.transactions.filter(t => t.partner_id === partnerId);
        if (partnerTxs.length === 0) {
            financeBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">Chưa có giao dịch thu chi nào phát sinh</td></tr>`;
        } else {
            partnerTxs.forEach(t => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${t.tx_number}</strong></td>
                    <td>${new Date(t.created_at).toLocaleDateString('vi-VN')}</td>
                    <td><span class="badge ${t.type === 'RECEIPT' ? 'badge-success' : 'badge-danger'}">${t.type === 'RECEIPT' ? 'Thu' : 'Chi'}</span></td>
                    <td><strong class="${t.type === 'RECEIPT' ? 'text-success' : 'text-danger'}">${t.type === 'RECEIPT' ? '+' : '-'}${formatMoney(t.amount)}</strong></td>
                `;
                financeBody.appendChild(row);
            });
        }
    }

    // 4. Render Debts and Payment history
    let spendVal = 0;
    let debtVal = 0;
    let paidVal = 0;

    if (partner.role === "CUSTOMER" || partner.role === "BOTH") {
        spendVal = state.orders.filter(o => o.customer_id === partnerId).reduce((sum, o) => sum + o.total_amount, 0);
        paidVal = state.transactions.filter(t => t.partner_id === partnerId && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        debtVal = Math.max(0, spendVal - paidVal);
    } else if (partner.role === "SUBCONTRACTOR") {
        spendVal = state.subcontracts.filter(s => s.subcontractor_id === partnerId).reduce((sum, s) => sum + s.cost, 0);
        paidVal = state.transactions.filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
        debtVal = Math.max(0, spendVal - paidVal);
    } else if (partner.role === "SUPPLIER") {
        spendVal = state.restocks.filter(r => r.supplier_id === partnerId).reduce((sum, r) => sum + r.total_amount, 0);
        paidVal = state.transactions.filter(t => t.partner_id === partnerId && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
        debtVal = Math.max(0, spendVal - paidVal);
    }

    const totalSpendEl = document.getElementById("crmDebtTotalSpend");
    const totalPaidEl = document.getElementById("crmDebtTotalPaid");
    const remainingDebtEl = document.getElementById("crmDebtRemaining");
    if (totalSpendEl) totalSpendEl.textContent = formatMoney(spendVal);
    if (totalPaidEl) totalPaidEl.textContent = formatMoney(paidVal);
    if (remainingDebtEl) remainingDebtEl.textContent = formatMoney(debtVal);

    // Render Debt Orders Table
    const debtOrdersBody = document.querySelector("#crmDebtOrdersTable tbody");
    if (debtOrdersBody) {
        debtOrdersBody.innerHTML = "";
        const partnerOrders = state.orders.filter(o => o.customer_id === partnerId);
        if (partnerOrders.length === 0) {
            debtOrdersBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">Không có đơn đặt hàng nào</td></tr>`;
        } else {
            partnerOrders.forEach(o => {
                const oPaid = state.transactions
                    .filter(t => t.reference_id === o.id && t.type === "RECEIPT")
                    .reduce((sum, t) => sum + t.amount, 0);
                const oDebt = Math.max(0, o.total_amount - oPaid);
                
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.print_spec}</td>
                    <td><strong>${formatMoney(o.total_amount)}</strong></td>
                    <td><span class="text-success">${formatMoney(oPaid)}</span></td>
                    <td class="${oDebt > 0 ? 'text-warning font-bold' : ''}">${formatMoney(oDebt)}</td>
                    <td>
                        ${oDebt > 0 ? `
                            <button class="btn btn-primary btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="payOrderFromCrm('${o.id}')">Thu tiền</button>
                        ` : '<span class="text-success">Đã hoàn thành</span>'}
                    </td>
                `;
                debtOrdersBody.appendChild(row);
            });
        }
    }

    // Render Installment Payments History Table
    const installmentHistoryBody = document.querySelector("#crmInstallmentHistoryTable tbody");
    if (installmentHistoryBody) {
        installmentHistoryBody.innerHTML = "";
        const partnerTxs = state.transactions.filter(t => t.partner_id === partnerId && t.type === "RECEIPT");
        if (partnerTxs.length === 0) {
            installmentHistoryBody.innerHTML = `<tr><td colspan="5" class="text-muted text-center">Chưa có lịch sử thanh toán nào</td></tr>`;
        } else {
            partnerTxs.forEach(t => {
                const orderObj = state.orders.find(o => o.id === t.reference_id);
                const orderText = orderObj ? orderObj.order_number : (t.reference_id || "Đặt cọc chung");
                
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${t.tx_number}</strong></td>
                    <td>${new Date(t.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>${orderText}</td>
                    <td><strong class="text-success">+${formatMoney(t.amount)}</strong></td>
                    <td>
                        ${t.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                        ${t.bill_image ? `<a href="#" onclick="window.viewPaymentBill('${t.id}'); return false;" style="margin-left:6px; color:var(--accent);" title="Xem bill chuyển khoản"><i data-lucide="image" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></a>` : ''}
                    </td>
                `;
                installmentHistoryBody.appendChild(row);
            });
        }
    }

    // 5. Render Contracts Log
    const contractsBody = document.querySelector("#crmContractsLogTable tbody");
    if (contractsBody) {
        contractsBody.innerHTML = "";
        const partnerContracts = state.contracts.filter(c => c.partner_id === partnerId);
        if (partnerContracts.length === 0) {
            contractsBody.innerHTML = `<tr><td colspan="5" class="text-muted text-center">Chưa có hợp đồng nào được ký kết</td></tr>`;
        } else {
            partnerContracts.forEach(c => {
                let linkedOrderNum = "N/A";
                if (c.order_type === "PRODUCTION") {
                    const order = state.orders.find(o => o.id === c.order_id);
                    if (order) linkedOrderNum = order.order_number;
                } else {
                    const onlineOrder = state.online_orders.find(o => o.id === c.order_id);
                    if (onlineOrder) linkedOrderNum = onlineOrder.order_number;
                }

                const statusLabels = {
                    ACTIVE: '<span class="badge badge-info">Đang thực hiện</span>',
                    LIQUIDATED: '<span class="badge badge-success">Đã thanh lý</span>',
                    EXPIRED: '<span class="badge badge-danger">Đã hết hạn</span>'
                };

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${c.contract_number}</strong></td>
                    <td>${new Date(c.signing_date).toLocaleDateString('vi-VN')}</td>
                    <td><strong>${linkedOrderNum}</strong></td>
                    <td><strong>${formatMoney(c.value)}</strong></td>
                    <td>${statusLabels[c.status] || c.status}</td>
                `;
                contractsBody.appendChild(row);
            });
        }
    }
    } catch (err) {
        alert("Lỗi trong renderCrmDetailSubtabs: " + err.message + "\n" + err.stack);
        console.error(err);
    }
}

window.payOrderFromCrm = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const oPaid = state.transactions
        .filter(t => t.reference_id === order.id && t.type === "RECEIPT")
        .reduce((sum, t) => sum + t.amount, 0);
    const remainingDebt = Math.max(0, order.total_amount - oPaid);

    if (remainingDebt <= 0) {
        alert("Đơn hàng này đã được thanh toán đầy đủ.");
        return;
    }

    const amountStr = prompt(`Đơn hàng ${order.order_number} cần thu nợ.\nTổng giá trị: ${formatMoney(order.total_amount)}\nĐã thanh toán: ${formatMoney(oPaid)}\nCòn nợ: ${formatMoney(remainingDebt)}\nNhập số tiền hoặc % muốn thu nợ (ví dụ: 50% hoặc 2000000):`, remainingDebt);
    if (amountStr === null) return; // Cancelled

    const rawVal = amountStr.trim();
    let payAmount = 0;
    if (rawVal.endsWith('%')) {
        const percent = parseFloat(rawVal.replace('%', '')) || 0;
        payAmount = Math.round(order.total_amount * percent / 100);
    } else {
        payAmount = parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0;
    }

    if (payAmount <= 0) {
        alert("Số tiền không hợp lệ.");
        return;
    }

    if (payAmount > remainingDebt) {
        if (!confirm(`Số tiền thu nợ (${formatMoney(payAmount)}) lớn hơn số nợ còn lại (${formatMoney(remainingDebt)}). Tiếp tục?`)) {
            return;
        }
    }

    const method = confirm(`Xác nhận thu nợ ${formatMoney(payAmount)} cho đơn hàng ${order.order_number}?\nOK = CHUYỂN KHOẢN, Cancel = TIỀN MẶT`) ? "BANK_TRANSFER" : "CASH";

    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txNumber = `PT-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);

    const receiptTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: "RECEIPT",
        category: "CUSTOMER_DEPOSIT",
        amount: payAmount,
        payment_method: method,
        account_source: method === "CASH" ? "CASH" : "VCB",
        partner_id: order.customer_id,
        reference_id: order.id,
        created_by: "Kế toán Hùng"
    };

    state.transactions = [receiptTx, ...state.transactions];
    state.updateState("transactions", state.transactions);

    // Update order deposit (accumulate all payments for this order)
    const orderPayments = state.transactions
        .filter(t => t.reference_id === order.id && t.type === 'RECEIPT')
        .reduce((sum, t) => sum + t.amount, 0);

    let paymentStatus = "UNPAID";
    if (orderPayments >= order.total_amount) {
        paymentStatus = "PAID";
    } else if (orderPayments > 0) {
        paymentStatus = "PARTIALLY_PAID";
    }

    const newOrders = state.orders.map(o => o.id === order.id ? { ...o, deposit: orderPayments, payment_status: paymentStatus } : o);
    state.updateState("orders", newOrders);

    alert(`Đã ghi nhận thu nợ ${formatMoney(payAmount)} cho đơn hàng ${order.order_number}`);
    
    // Refresh views
    renderCrmDetailSubtabs(order.customer_id);
    renderCRM();
    renderProdOrders();
    renderFinance();
};

function handleCrmNoteSubmit(e) {
    e.preventDefault();
    const content = document.getElementById("crmNoteInput").value;
    if (!selectedCrmPartnerId || !content) return;

    const channel = document.getElementById("crmNoteChannel") ? document.getElementById("crmNoteChannel").value : "NOTE";
    const noteId = "n_" + Math.random().toString(36).substring(2, 9);
    const newNote = {
        id: noteId,
        partner_id: selectedCrmPartnerId,
        created_at: new Date().toISOString(),
        created_by: "Quản lý Hùng",
        content: content,
        channel: channel
    };

    const newNotes = [newNote, ...state.crm_notes];
    state.updateState("crm_notes", newNotes);

    // Re-render subtabs timeline
    renderCrmDetailSubtabs(selectedCrmPartnerId);
    document.getElementById("crmNoteInput").value = "";
    renderCRM();
}

window.openEditPartner = function(partnerId) {
    const partner = state.partners.find(p => p.id === partnerId);
    if (!partner) return;

    document.getElementById("partnerIdInput").value = partner.id;
    document.getElementById("partnerName").value = partner.name;
    document.getElementById("partnerPhone").value = partner.phone;
    document.getElementById("partnerEmail").value = partner.email || "";
    document.getElementById("partnerAddress").value = partner.address || "";
    document.getElementById("partnerRole").value = partner.role;
    document.getElementById("partnerLimit").value = partner.credit_limit;

    document.getElementById("partnerCompanyName").value = partner.company_name || "";
    document.getElementById("partnerTaxCode").value = partner.tax_code || "";
    document.getElementById("partnerBillingAddress").value = partner.billing_address || "";
    document.getElementById("partnerBillingEmail").value = partner.billing_email || "";

    document.getElementById("partnerModalTitle").textContent = `Chỉnh sửa đối tác: ${partner.code}`;
    openModal("partnerModal");
};

window.deletePartner = function(partnerId) {
    const partner = state.partners.find(p => p.id === partnerId);
    if (!partner) return;

    const confirmDelete = confirm(`Bạn có chắc muốn xoá đối tác ${partner.name} (${partner.code}) khỏi hệ thống?`);
    if (confirmDelete) {
        const newPartners = state.partners.filter(p => p.id !== partnerId);
        state.updateState("partners", newPartners);
        renderAll();
        initDataInForms();
        alert("Đã xoá đối tác thành công.");
    }
};

// ==========================================================================
// OMNICHANNEL CHAT INBOX SYSTEM
// ==========================================================================
let activeChannelFilter = "all";
let activeConversationId = "c1";

const MOCK_REPLIES = [
    "Dạ vâng, bên xưởng chốt giúp em kích thước vậy in nhanh nhé anh.",
    "Decal nhựa này cán thêm màng mờ thì bao nhiêu tiền 1 mét vuông vậy ạ?",
    "Chào xưởng, lô bao bì carton đợt trước in rất đạt, đợt này bên em muốn in thêm 3000 cái nữa.",
    "File thiết kế AI em vừa gửi vào email hotro@inlachong.vn, anh check giúp em nhé.",
    "Em cần giao gấp trước 12h trưa mai, xưởng có chạy kịp máy offset không anh?",
    "Chất lượng bế hộp rất khít và đẹp, cảm ơn đội ngũ kỹ thuật xưởng mình nha!",
    "Bên mình in bạt hiflex có nhận treo thi công thi công biển quảng cáo ngoài trời không ạ?"
];

function getConversationUnreadCount(c) {
    if (!c.unread) return 0;
    // Find all messages in this conversation
    const msgs = state.messages.filter(m => m.conversation_id === c.id);
    if (msgs.length === 0) return 1;
    // Count customer messages from the end of the list back to the last agent message
    let count = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].sender === "CUSTOMER") {
            count++;
        } else {
            break; // Stop when we hit the agent's reply
        }
    }
    return count > 0 ? count : 1;
}

function updateChannelUnreadBadges() {
    const channels = ["all", "ZALO", "FACEBOOK", "TELEGRAM", "EMAIL", "LIVECHAT"];
    channels.forEach(ch => {
        let count = 0;
        if (ch === "all") {
            count = state.conversations.reduce((sum, c) => sum + getConversationUnreadCount(c), 0);
        } else {
            count = state.conversations.filter(c => c.channel === ch).reduce((sum, c) => sum + getConversationUnreadCount(c), 0);
        }
        
        const badge = document.getElementById(`unread-count-${ch}`);
        if (badge) {
            if (count > 0) {
                badge.innerText = count;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        }
    });
}

function renderChat() {
    renderChatConversations();
    renderActiveChatThread();
    updateChannelUnreadBadges();
}

function renderChatConversations() {
    const listContainer = document.getElementById("chatConversationsList");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const query = document.getElementById("chatSearchInput").value.toLowerCase();

    const filteredConvs = state.conversations.filter(c => {
        const partner = state.partners.find(p => p.id === c.partner_id);
        const matchesQuery = partner ? partner.name.toLowerCase().includes(query) : false;
        const matchesChannel = activeChannelFilter === "all" || c.channel === activeChannelFilter;
        return matchesQuery && matchesChannel;
    }).sort((a, b) => new Date(b.last_time) - new Date(a.last_time));

    if (filteredConvs.length === 0) {
        listContainer.innerHTML = `<p class="text-muted text-center" style="padding:20px;">Không có cuộc trò chuyện nào</p>`;
        return;
    }

    filteredConvs.forEach(c => {
        const partner = state.partners.find(p => p.id === c.partner_id);
        const name = partner ? partner.name : "Khách vãng lai";
        const isActive = c.id === activeConversationId;
        const timeStr = new Date(c.last_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const unreadCount = getConversationUnreadCount(c);
        const isUnread = c.unread && unreadCount > 0;

        const channelBadges = {
            ZALO: `<span class="conv-channel-badge zalo-color">Z</span>`,
            FACEBOOK: `<span class="conv-channel-badge facebook-color"><i data-lucide="facebook" style="width:8px; height:8px;"></i></span>`,
            TELEGRAM: `<span class="conv-channel-badge telegram-color"><i data-lucide="send" style="width:8px; height:8px;"></i></span>`,
            EMAIL: `<span class="conv-channel-badge email-color"><i data-lucide="mail" style="width:8px; height:8px;"></i></span>`,
            LIVECHAT: `<span class="conv-channel-badge livechat-color"><i data-lucide="message-circle" style="width:8px; height:8px;"></i></span>`
        };

        const item = document.createElement("div");
        item.className = `conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`;
        item.onclick = () => selectConversation(c.id);

        item.innerHTML = `
            <div class="conv-avatar-wrapper">
                <img src="https://api.dicebear.com/7.x/initials/svg?seed=${name}" alt="Avatar" class="avatar" style="border:none">
                ${channelBadges[c.channel] || ''}
            </div>
            <div class="conv-details">
                <div class="conv-name-row">
                    <span class="conv-name">${name}</span>
                    <span class="conv-time">${timeStr}</span>
                </div>
                <div class="conv-preview-row">
                    <span class="conv-msg-preview text-secondary">${c.last_message}</span>
                    ${isUnread ? `<span class="unread-dot">${unreadCount}</span>` : ''}
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
    lucide.createIcons();
}

window.selectConversation = function(convId) {
    activeConversationId = convId;
    
    // Mark as read
    const newConvs = state.conversations.map(c => {
        if (c.id === convId) {
            return { ...c, unread: false };
        }
        return c;
    });
    state.updateState("conversations", newConvs);

    renderChatConversations();
    renderActiveChatThread();
};

function renderActiveChatThread() {
    const header = document.getElementById("chatAreaHeader");
    const thread = document.getElementById("chatMessagesThread");
    const crmSidebar = document.getElementById("chatCrmSidebar");

    const conv = state.conversations.find(c => c.id === activeConversationId);
    if (!conv) {
        header.innerHTML = `<h3>Hộp thư trống</h3>`;
        thread.innerHTML = `<p class="text-muted text-center" style="margin-top:100px;">Hãy chọn một cuộc hội thoại từ danh sách để bắt đầu chat</p>`;
        crmSidebar.innerHTML = ``;
        return;
    }

    const partner = state.partners.find(p => p.id === conv.partner_id);
    const clientName = partner ? partner.name : "Khách vãng lai";

    // 1. Render Header
    const channelLabels = { ZALO: "Zalo Chat", FACEBOOK: "Facebook Inbox", TELEGRAM: "Telegram Channel", EMAIL: "Email Inbox", LIVECHAT: "Livechat Web" };
    header.innerHTML = `
        <div>
            <h3>${clientName}</h3>
            <span class="text-secondary" style="font-size:0.8rem">${channelLabels[conv.channel] || conv.channel}</span>
        </div>
        <div>
            <span class="badge badge-success">Online</span>
        </div>
    `;

    // 2. Render messages thread
    thread.innerHTML = "";
    const msgs = state.messages.filter(m => m.conversation_id === activeConversationId);
    
    msgs.forEach(msg => {
        const isAgent = msg.sender === "AGENT";
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${isAgent ? 'sent' : 'received'}`;
        
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        bubble.innerHTML = `
            <span>${msg.content}</span>
            <span class="chat-msg-time">${timeStr}</span>
        `;
        thread.appendChild(bubble);
    });

    // Scroll thread to bottom
    setTimeout(() => {
        thread.scrollTop = thread.scrollHeight;
    }, 50);

    // 3. Render CRM Right Sidebar Info
    let spendVal = 0;
    let debtVal = 0;

    if (partner) {
        spendVal = state.orders.filter(o => o.customer_id === partner.id).reduce((sum, o) => sum + o.total_amount, 0);
        const paid = state.transactions.filter(t => t.partner_id === partner.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
        debtVal = Math.max(0, spendVal - paid);
    }

    crmSidebar.innerHTML = `
        <div class="chat-crm-avatar-card">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${clientName}" alt="Avatar" class="avatar" style="width:60px; height:60px; border:none">
            <h3>${clientName}</h3>
            <span>Mã: ${partner ? partner.code : 'N/A'}</span>
        </div>
        <div class="chat-crm-details-list">
            <div class="chat-crm-item">
                <span>Số điện thoại</span>
                <strong>${partner ? partner.phone : 'N/A'}</strong>
            </div>
            <div class="chat-crm-item">
                <span>Doanh số/Chi tiêu</span>
                <strong class="text-success">${formatMoney(spendVal)}</strong>
            </div>
            <div class="chat-crm-item">
                <span>Công nợ</span>
                <strong class="${debtVal > 0 ? 'text-danger' : ''}">${formatMoney(debtVal)}</strong>
            </div>
        </div>
        <button class="btn btn-primary mt-auto" style="width:100%" onclick="createOrderForChatPartner('${partner ? partner.id : ''}')">
            <i data-lucide="plus-circle"></i>
            <span>Tạo đơn in</span>
        </button>
    `;
    lucide.createIcons();
}

function handleChatSend(e) {
    e.preventDefault();
    const input = document.getElementById("chatMessageInput");
    const content = input.value.trim();
    if (!content || !activeConversationId) return;

    const msgId = "m_" + Math.random().toString(36).substring(2, 9);
    const newMsg = {
        id: msgId,
        conversation_id: activeConversationId,
        sender: "AGENT",
        content: content,
        timestamp: new Date().toISOString()
    };

    // Append to list of messages
    const newMessages = [...state.messages, newMsg];
    state.updateState("messages", newMessages);

    // Update conversation last message
    const newConvs = state.conversations.map(c => {
        if (c.id === activeConversationId) {
            return { ...c, last_message: content, last_time: newMsg.timestamp };
        }
        return c;
    });
    state.updateState("conversations", newConvs);

    // If conversation is on Telegram, send reply to user on Telegram via Bot API
    const activeConv = state.conversations.find(c => c.id === activeConversationId);
    if (activeConv && activeConv.channel === "TELEGRAM" && activeConv.tg_chat_id) {
        sendTelegramReply(activeConv.tg_chat_id, content);
    }

    // Clean inputs and re-render
    input.value = "";
    renderChat();

    // Trigger BOT response after 1.5 seconds
    const convId = activeConversationId;
    setTimeout(() => {
        triggerBotReply(convId);
    }, 1500);
}

function triggerBotReply(convId) {
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;

    const randReply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    const msgId = "m_" + Math.random().toString(36).substring(2, 9);
    const newMsg = {
        id: msgId,
        conversation_id: convId,
        sender: "CUSTOMER",
        content: randReply,
        timestamp: new Date().toISOString()
    };

    // Add to messages list
    const newMessages = [...state.messages, newMsg];
    state.updateState("messages", newMessages);

    // Update conversation
    const newConvs = state.conversations.map(c => {
        if (c.id === convId) {
            // If we are currently active on this conv, mark read, otherwise unread
            return { ...c, unread: activeConversationId !== convId, last_message: randReply, last_time: newMsg.timestamp };
        }
        return c;
    });
    state.updateState("conversations", newConvs);

    renderChat();
}

window.createOrderForChatPartner = function(partnerId) {
    if (!partnerId) return;
    switchTab("orders");
    openModal("quoteModal");
    document.getElementById("quoteCustomer").value = partnerId;
};

// ==========================================================================
// TELEGRAM BOT INTEGRATION API HELPERS
// ==========================================================================
let tgPollingInterval = null;
let tgLastUpdateId = parseInt(localStorage.getItem("ihp_tg_last_update_id")) || 0;

async function startTelegramPolling() {
    if (tgPollingInterval) return;
    
    const token = localStorage.getItem("ihp_tg_bot_token");
    if (token) {
        try {
            await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
            console.log("Telegram: Webhook cleared on startup.");
        } catch (e) {
            console.warn("Error clearing webhook on startup:", e);
        }
    }
    
    pollTelegramMessages();
    tgPollingInterval = setInterval(pollTelegramMessages, 5000);
}

function stopTelegramPolling() {
    if (tgPollingInterval) {
        clearInterval(tgPollingInterval);
        tgPollingInterval = null;
    }
}

function logTelegramSync(message) {
    const el = document.getElementById("tgDebugLog");
    if (!el) return;
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    el.innerHTML += `<br>[${timestamp}] ${message}`;
    el.scrollTop = el.scrollHeight;
}

async function pollTelegramMessages() {
    const token = localStorage.getItem("ihp_tg_bot_token");
    if (!token) {
        logTelegramSync("Chưa cấu hình Bot Token.");
        return;
    }

    try {
        logTelegramSync(`Đang quét API Telegram (offset: ${tgLastUpdateId + 1})...`);
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${tgLastUpdateId + 1}&timeout=3`);
        const data = await res.json();
        if (!data.ok) {
            logTelegramSync(`<span style="color: var(--danger)">Lỗi: ${data.description}</span>`);
            console.warn("Telegram polling error:", data.description);
            return;
        }
        if (data.result.length === 0) {
            logTelegramSync("Không có tin nhắn mới nào.");
            return;
        }

        logTelegramSync(`<span style="color: #6ee7b7">Phát hiện ${data.result.length} update mới!</span>`);
        let stateUpdated = false;

        data.result.forEach(update => {
            tgLastUpdateId = Math.max(tgLastUpdateId, update.update_id);
            localStorage.setItem("ihp_tg_last_update_id", tgLastUpdateId);

            const msg = update.message || update.edited_message;
            if (!msg) {
                logTelegramSync("Update không chứa message.");
                return;
            }
            if (!msg.text) {
                logTelegramSync("Message không có nội dung text.");
                return;
            }

            const fromUser = msg.from;
            if (!fromUser) {
                logTelegramSync("Bỏ qua tin nhắn hệ thống (không có người gửi).");
                return;
            }

            const chatObj = msg.chat;
            const textContent = msg.text;

            logTelegramSync(`Nhận tin từ <strong>${fromUser.first_name || 'Khách'}</strong>: "${textContent.substring(0, 15)}..."`);

            // Resolve or create partner for this telegram user
            let partner = state.partners.find(p => p.email === `tg_${fromUser.id}@telegram.com` || p.phone === `tg_${fromUser.id}`);
            if (!partner) {
                const newId = "p_tg_" + fromUser.id;
                const codeSuffix = String(state.partners.length + 1).padStart(3, '0');
                partner = {
                    id: newId,
                    code: `KH-${codeSuffix}`,
                    name: `${fromUser.first_name || ""} ${fromUser.last_name || ""} (Telegram)`,
                    phone: `tg_${fromUser.id}`,
                    email: `tg_${fromUser.id}@telegram.com`,
                    role: "CUSTOMER",
                    credit_limit: 10000000,
                    status: true
                };
                state.partners.push(partner);
                state.save("partners", state.partners);
                stateUpdated = true;
                logTelegramSync(`Đã tạo đối tác CRM mới: ${partner.name}`);
            }

            // Find or create conversation
            let conv = state.conversations.find(c => c.partner_id === partner.id && c.channel === "TELEGRAM");
            if (!conv) {
                const newConvId = "c_tg_" + fromUser.id;
                conv = {
                    id: newConvId,
                    partner_id: partner.id,
                    channel: "TELEGRAM",
                    unread: true,
                    last_message: textContent,
                    last_time: new Date(msg.date * 1000).toISOString(),
                    tg_chat_id: chatObj.id
                };
                state.conversations.push(conv);
                stateUpdated = true;
                logTelegramSync(`Tạo phiên chat mới cho: ${partner.name}`);
            } else {
                conv.last_message = textContent;
                conv.last_time = new Date(msg.date * 1000).toISOString();
                conv.unread = true;
                conv.tg_chat_id = chatObj.id; // update chat id
            }

            // Add message
            const newMsgId = "m_tg_" + msg.message_id;
            if (!state.messages.some(m => m.id === newMsgId)) {
                const newMsg = {
                    id: newMsgId,
                    conversation_id: conv.id,
                    sender: "CUSTOMER",
                    content: textContent,
                    timestamp: new Date(msg.date * 1000).toISOString()
                };
                state.messages.push(newMsg);
                stateUpdated = true;
            }
        });

        if (stateUpdated) {
            state.save("conversations", state.conversations);
            state.save("messages", state.messages);
            renderChat();
            renderCRM();
        }
    } catch (err) {
        console.warn("Lỗi đồng bộ tin nhắn Telegram:", err);
    }
}

async function sendTelegramReply(tgChatId, text) {
    const token = localStorage.getItem("ihp_tg_bot_token");
    if (!token) return;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: tgChatId,
                text: text
            })
        });
    } catch (err) {
        console.warn("Lỗi gửi tin phản hồi Telegram:", err);
    }
}

async function sendTelegramOrderAlert(order) {
    if (!order) return;
    
    let token = localStorage.getItem("ihp_tg_bot_token");
    let chatId = localStorage.getItem("ihp_tg_chat_id");
    let enableNotif = localStorage.getItem("ihp_tg_enable_notifications");

    const sysConfig = (state.system_settings && state.system_settings.telegram_config) || {};
    if (!token && sysConfig.bot_token) token = sysConfig.bot_token;
    if (!chatId && sysConfig.chat_id) chatId = sysConfig.chat_id;
    if (enableNotif === null && sysConfig.enable_notifications !== undefined) {
        enableNotif = sysConfig.enable_notifications ? "true" : "false";
    }

    if (enableNotif === "false") return;
    if (!token || !chatId) {
        console.warn("Lỗi gửi thông báo Telegram: Chưa cấu hình Bot Token hoặc Chat ID.");
        return;
    }

    const customer = (state.partners || []).find(p => p.id === order.customer_id);
    const clientName = customer ? customer.name : "Khách vãng lai";
    
    let postProcessingStr = "Không gia công";
    if (Array.isArray(order.post_processing)) {
        postProcessingStr = order.post_processing.length > 0 ? order.post_processing.join(", ") : "Không gia công";
    } else if (order.post_processing) {
        postProcessingStr = order.post_processing;
    }

    const deliveryStr = order.delivery_date 
        ? new Date(order.delivery_date).toLocaleDateString('vi-VN') 
        : 'Theo thỏa thuận';

    const notesLine = order.notes ? `\n📌 *Ghi chú:* ${order.notes}` : '';

    const text = `📦 *ĐƠN HÀNG MỚI ĐÃ ĐƯỢC TẠO*
--------------------------------
👉 *Mã đơn hàng:* \`${order.order_number || 'N/A'}\`
👤 *Khách hàng:* ${clientName}
📝 *Quy cách:* ${order.print_spec || 'N/A'}
📐 *Kích thước:* ${order.width_mm || 0}x${order.length_mm || 0} mm
🔢 *Số lượng:* ${(order.quantity || 0).toLocaleString('vi-VN')}
📄 *Loại giấy:* ${order.paper_type || 'Thành phẩm kho sẵn'}
⚙️ *Gia công:* ${postProcessingStr}${notesLine}
--------------------------------
💰 *Tổng trị giá:* *${formatMoney(order.total_amount || 0)}*
💵 *Đã cọc:* *${formatMoney(order.deposit || 0)}*
📅 *Hạn giao hàng:* ${deliveryStr}
--------------------------------
💻 _Hệ thống quản trị In Lạc Hồng_`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "Markdown"
            })
        });
        const data = await res.json();
        if (data.ok) {
            console.log("✅ Đã gửi thông báo Telegram thành công cho đơn:", order.order_number);
        } else {
            console.warn("⚠️ Telegram API trả về lỗi:", data);
        }
    } catch (err) {
        console.warn("Lỗi kết nối Telegram:", err);
    }
}


// ==========================================================================
// AIRTABLE-LIKE TABLE TOOLBAR AND FILTERS DYNAMIC CONTROLLER
// ==========================================================================

// TableToolbarController dynamic loader and manager
(function() {
    console.log("IHP: Loading TableToolbarController module with dynamic columns and grouping fixes...");

    const TableConfigs = {
        quotesTable: {
            dataKey: 'orders',
            originalRender: 'renderQuotes',
            addBtnId: 'btnNewOrder',
            columns: [
                { name: 'Thời gian tạo', type: 'text', getValue: (o) => new Date(o.created_at).toLocaleString('vi-VN') },
                { name: 'Mã đơn', type: 'text', getValue: (o) => o.order_number },
                { name: 'Khách hàng', type: 'text', getValue: (o) => {
                    const c = state.partners.find(p => p.id === o.customer_id);
                    return c ? c.name : 'Khách vãng lai';
                }},
                { name: 'Quy cách', type: 'text', getValue: (o) => o.print_spec },
                { name: 'Số lượng', type: 'number', getValue: (o) => o.quantity },
                { name: 'Đơn giá', type: 'number', getValue: (o) => Math.round(o.total_amount / o.quantity) },
                { name: 'Tổng giá trị', type: 'number', getValue: (o) => o.total_amount },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        prodOrdersTable: {
            dataKey: 'orders',
            originalRender: 'renderProdOrders',
            columns: [
                { name: 'Thời gian tạo', type: 'text', getValue: (o) => new Date(o.created_at).toLocaleString('vi-VN') },
                { name: 'Mã đơn', type: 'text', getValue: (o) => o.order_number },
                { name: 'Khách hàng', type: 'text', getValue: (o) => {
                    const c = state.partners.find(p => p.id === o.customer_id);
                    return c ? c.name : 'Khách vãng lai';
                }},
                { name: 'Quy cách', type: 'text', getValue: (o) => o.print_spec },
                { name: 'Số lượng', type: 'number', getValue: (o) => o.quantity },
                { name: 'Đơn giá', type: 'number', getValue: (o) => Math.round(o.total_amount / o.quantity) },
                { name: 'Tổng giá trị', type: 'number', getValue: (o) => o.total_amount },
                { name: 'Trạng thái', type: 'text', getValue: (o) => {
                    if (o.status === "WAITING_QUOTE") return "Chưa báo giá";
                    if (o.status === "CANCELLED") return "Đã hủy";
                    const prod = state.productions.find(p => p.sales_order_id === o.id);
                    if (!prod) return "Chờ sản xuất";
                    if (prod.status === "FINISHED") return "Sản xuất xong";
                    return "Đang sản xuất (" + prod.status + ")";
                }},
                { name: 'Thanh toán', type: 'text', getValue: (o) => {
                    if (o.payment_status === 'PAID') return 'Đã thanh toán';
                    return `Đã cọc: ${formatMoney(o.deposit)} (${Math.round(o.deposit / o.total_amount * 100)}%)`;
                }},
                { name: 'Ngày giao hàng', type: 'text', getValue: (o) => o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('vi-VN') : 'N/A' },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        crmTable: {
            dataKey: 'partners',
            originalRender: 'renderCRM',
            addBtnId: 'partnerModal',
            columns: [
                { name: 'Mã', type: 'text', getValue: (p) => p.code },
                { name: 'Họ và tên', type: 'text', getValue: (p) => p.name },
                { name: 'Tên công ty xuất HĐ', type: 'text', getValue: (p) => p.company_name || 'N/A', hiddenByDefault: true },
                { name: 'Mã số thuế', type: 'text', getValue: (p) => p.tax_code || 'N/A', hiddenByDefault: true },
                { name: 'Địa chỉ xuất HĐ', type: 'text', getValue: (p) => p.billing_address || 'N/A', hiddenByDefault: true },
                { name: 'Email nhận HĐ', type: 'text', getValue: (p) => p.billing_email || 'N/A', hiddenByDefault: true },
                { name: 'Vai trò', type: 'text', getValue: (p) => {
                    const roles = { CUSTOMER: "Khách hàng", SUPPLIER: "Nhà cung cấp", SUBCONTRACTOR: "Đơn vị gia công", BOTH: "Khách & NCC" };
                    return roles[p.role] || p.role;
                }},
                { name: 'Điện thoại', type: 'text', getValue: (p) => p.phone },
                { name: 'Email', type: 'text', getValue: (p) => p.email || 'N/A' },
                { name: 'Chi tiêu', type: 'number', getValue: (p) => {
                    if (p.role === "CUSTOMER" || p.role === "BOTH") {
                        return state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
                    } else if (p.role === "SUBCONTRACTOR") {
                        return state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
                    } else if (p.role === "SUPPLIER") {
                        return state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
                    }
                    return 0;
                }},
                { name: 'Công nợ', type: 'number', getValue: (p) => {
                    let spendVal = 0;
                    let paidVal = 0;
                    if (p.role === "CUSTOMER" || p.role === "BOTH") {
                        spendVal = state.orders.filter(o => o.customer_id === p.id).reduce((sum, o) => sum + o.total_amount, 0);
                        paidVal = state.transactions.filter(t => t.partner_id === p.id && t.type === "RECEIPT").reduce((sum, t) => sum + t.amount, 0);
                    } else if (p.role === "SUBCONTRACTOR") {
                        spendVal = state.subcontracts.filter(s => s.subcontractor_id === p.id).reduce((sum, s) => sum + s.cost, 0);
                        paidVal = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUBCONTRACTOR_PAY").reduce((sum, t) => sum + t.amount, 0);
                    } else if (p.role === "SUPPLIER") {
                        spendVal = state.restocks.filter(r => r.supplier_id === p.id).reduce((sum, r) => sum + r.total_amount, 0);
                        paidVal = state.transactions.filter(t => t.partner_id === p.id && t.type === "PAYMENT" && t.category === "SUPPLIER_PAY").reduce((sum, t) => sum + t.amount, 0);
                    }
                    return Math.max(0, spendVal - paidVal);
                }},
                { name: 'Trạng thái', type: 'text', getValue: (p) => p.status ? "Đang làm việc" : "Tạm dừng" },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        inventoryTable: {
            dataKey: 'materials',
            originalRender: 'renderInventory',
            addBtnId: 'btnRestockMaterial',
            columns: [
                { name: 'SKU', type: 'text', getValue: (m) => m.sku },
                { name: 'Tên vật tư', type: 'text', getValue: (m) => m.name },
                { name: 'Nhóm', type: 'text', getValue: (m) => m.category },
                { name: 'Tồn hiện tại', type: 'number', getValue: (m) => m.stock_qty },
                { name: 'Tồn tối thiểu', type: 'number', getValue: (m) => m.min_stock_qty },
                { name: 'Đơn vị', type: 'text', getValue: (m) => m.unit },
                { name: 'Đơn giá nhập TB', type: 'number', getValue: (m) => m.avg_cost },
                { name: 'Tình trạng', type: 'text', getValue: (m) => m.stock_qty < m.min_stock_qty ? "Hết hàng/Cảnh báo" : "An toàn" },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        subcontractingTable: {
            dataKey: 'subcontracts',
            originalRender: 'renderSubcontracting',
            addBtnId: 'btnCreateSubcontract',
            columns: [
                { name: 'Hợp đồng', type: 'text', getValue: (s) => s.contract_number },
                { name: 'Đơn vị nhận', type: 'text', getValue: (s) => {
                    const p = state.partners.find(p => p.id === s.subcontractor_id);
                    return p ? p.name : 'Đơn vị thi công';
                }},
                { name: 'Công việc', type: 'text', getValue: (s) => s.work_detail },
                { name: 'Đơn hàng', type: 'text', getValue: (s) => {
                    const o = state.orders.find(o => o.id === s.sales_order_id);
                    return o ? o.order_number : 'N/A';
                }},
                { name: 'Chi phí', type: 'number', getValue: (s) => s.cost },
                { name: 'Thời hạn', type: 'text', getValue: (s) => new Date(s.deadline).toLocaleDateString('vi-VN') },
                { name: 'Tiến độ', type: 'number', getValue: (s) => s.progress },
                { name: 'Thanh toán', type: 'text', getValue: (s) => s.payment_status === "PAID" ? "Đã trả" : "Chưa thanh toán" },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        financeTransactionsTable: {
            dataKey: 'transactions',
            originalRender: 'renderFinance',
            addBtnId: 'btnNewReceipt',
            columns: [
                { name: 'Mã giao dịch', type: 'text', getValue: (t) => t.tx_number },
                { name: 'Thời gian', type: 'text', getValue: (t) => new Date(t.created_at).toLocaleString('vi-VN') },
                { name: 'Phân loại', type: 'text', getValue: (t) => {
                    const categories = {
                        CUSTOMER_DEPOSIT: "Thu cọc đơn in",
                        CUSTOMER_FINAL: "Thu nợ đơn in",
                        SUPPLIER_PAY: "Thanh toán vật tư",
                        SUBCONTRACTOR_PAY: "Thanh toán gia công",
                        SALARY: "Chi lương nhân sự",
                        OPERATIONAL: "Chi phí vận hành"
                    };
                    return categories[t.category] || t.category;
                }},
                { name: 'Đối tác', type: 'text', getValue: (t) => {
                    const p = state.partners.find(p => p.id === t.partner_id);
                    return p ? p.name : 'Vãng lai';
                }},
                { name: 'Số tiền', type: 'number', getValue: (t) => t.amount },
                { name: 'Hình thức', type: 'text', getValue: (t) => t.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt' },
                { name: 'Tài khoản quỹ', type: 'text', getValue: (t) => t.account_source === 'VCB' ? 'MBBank' : 'Két tiền' },
                { name: 'Người lập', type: 'text', getValue: (t) => t.created_by }
            ]
        },
        onlineOrdersTable: {
            dataKey: 'online_orders',
            originalRender: 'renderOnlineSales',
            addBtnId: 'btnNewOnlineOrder',
            columns: [
                { name: 'Mã đơn', type: 'text', getValue: (o) => o.order_number },
                { name: 'Thời gian', type: 'text', getValue: (o) => new Date(o.created_at).toLocaleString('vi-VN') },
                { name: 'Khách hàng', type: 'text', getValue: (o) => {
                    const c = state.partners.find(p => p.id === o.customer_id);
                    return c ? c.name : 'Khách vãng lai';
                }},
                { name: 'Sản phẩm', type: 'text', getValue: (o) => o.items.map(item => {
                    const p = state.online_products.find(prod => prod.sku === item.sku);
                    return (p ? p.name : item.sku) + ' (x' + item.qty + ')';
                }).join(', ') },
                { name: 'Sales & Hoa hồng', type: 'text', getValue: (o) => (o.salesperson || 'Chưa phân công') + ' (' + o.commission_rate + '%: ' + formatMoney(o.commission_amount || 0) + ')' },
                { name: 'Tổng tiền', type: 'number', getValue: (o) => o.total_amount },
                { name: 'Còn nợ', type: 'number', getValue: (o) => {
                    const payments = state.transactions.filter(t => t.reference_id === o.id && t.type === 'RECEIPT');
                    const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
                    return Math.max(0, o.total_amount - totalPaid);
                }},
                { name: 'Thanh toán', type: 'text', getValue: (o) => o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Ghi nợ' }
            ]
        },
        onlineProductsTable: {
            dataKey: 'online_products',
            originalRender: 'renderOnlineProducts',
            addBtnId: 'btnNewOnlineProduct',
            columns: [
                { name: 'Mã SKU', type: 'text', getValue: (p) => p.sku },
                { name: 'Ảnh', type: 'image', getValue: (p) => p.image || '' },
                { name: 'Mã vạch', type: 'text', getValue: (p) => p.barcode || 'N/A' },
                { name: 'Tên hàng hóa', type: 'text', getValue: (p) => p.name },
                { name: 'Đơn vị', type: 'text', getValue: (p) => p.unit },
                { name: 'Giá bán lẻ', type: 'number', getValue: (p) => p.price },
                { name: 'Giá bán sỉ', type: 'number', getValue: (p) => p.wholesale_price },
                { name: 'Tồn kho', type: 'number', getValue: (p) => p.stock_qty },
                { name: 'Tồn tối thiểu', type: 'number', getValue: (p) => p.min_stock_qty }
            ]
        },
        onlineStockLogsTable: {
            dataKey: 'online_stock_logs',
            originalRender: 'renderOnlineStockLogs',
            addBtnId: 'btnRestockOnlineProduct',
            columns: [
                { name: 'Thời gian', type: 'text', getValue: (l) => new Date(l.created_at).toLocaleString('vi-VN') },
                { name: 'SKU', type: 'text', getValue: (l) => l.sku },
                { name: 'Sản phẩm', type: 'text', getValue: (l) => {
                    const p = state.online_products.find(prod => prod.sku === l.sku);
                    return p ? p.name : 'Sản phẩm đã bị xóa';
                }},
                { name: 'Loại', type: 'text', getValue: (l) => l.type === 'IMPORT' ? 'Nhập kho' : l.type === 'EXPORT' ? 'Xuất kho' : 'Điều chỉnh' },
                { name: 'Số lượng', type: 'number', getValue: (l) => l.qty },
                { name: 'Ghi chú', type: 'text', getValue: (l) => l.note }
            ]
        },
        onlineInventoryChecksTable: {
            dataKey: 'online_inventory_checks',
            originalRender: 'renderOnlineInventoryChecks',
            columns: [
                { name: 'Thời gian', type: 'text', getValue: (c) => new Date(c.created_at).toLocaleString('vi-VN') },
                { name: 'SKU', type: 'text', getValue: (c) => c.sku },
                { name: 'Sản phẩm', type: 'text', getValue: (c) => {
                    const prod = state.online_products.find(p => p.sku === c.sku);
                    return prod ? prod.name : 'Sản phẩm đã bị xóa';
                }},
                { name: 'Tồn sổ sách', type: 'number', getValue: (c) => c.book_qty },
                { name: 'Tồn thực tế', type: 'number', getValue: (c) => c.actual_qty },
                { name: 'Chênh lệch', type: 'number', getValue: (c) => c.actual_qty - c.book_qty },
                { name: 'Người kiểm', type: 'text', getValue: (c) => c.operator },
                { name: 'Ghi chú', type: 'text', getValue: (c) => c.notes }
            ]
        },
        onlineInternalExitsTable: {
            dataKey: 'online_internal_exits',
            originalRender: 'renderOnlineInternalExits',
            columns: [
                { name: 'Thời gian', type: 'text', getValue: (e) => new Date(e.created_at).toLocaleString('vi-VN') },
                { name: 'SKU', type: 'text', getValue: (e) => e.sku },
                { name: 'Sản phẩm', type: 'text', getValue: (e) => {
                    const prod = state.online_products.find(p => p.sku === e.sku);
                    return prod ? prod.name : 'Sản phẩm đã bị xóa';
                }},
                { name: 'Số lượng', type: 'number', getValue: (e) => e.qty },
                { name: 'Lý do', type: 'text', getValue: (e) => e.reason === 'INTERNAL_USE' ? 'Dùng nội bộ' : 'Hủy hàng hỏng' },
                { name: 'Người xuất', type: 'text', getValue: (e) => e.operator },
                { name: 'Ghi chú', type: 'text', getValue: (e) => e.notes }
            ]
        },
        onlineInvoicesTable: {
            dataKey: 'online_orders',
            originalRender: 'renderOnlineInvoices',
            columns: [
                { name: 'Số hóa đơn', type: 'text', getValue: (o) => 'HD-ON-' + o.order_number.split('-').pop() },
                { name: 'Thời gian lập', type: 'text', getValue: (o) => new Date(o.created_at).toLocaleString('vi-VN') },
                { name: 'Khách hàng', type: 'text', getValue: (o) => {
                    const customer = state.partners.find(p => p.id === o.customer_id);
                    return customer ? customer.name : 'Khách vãng lai';
                }},
                { name: 'Tổng tiền', type: 'number', getValue: (o) => o.total_amount },
                { name: 'Hình thức', type: 'text', getValue: (o) => o.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt' },
                { name: 'Tài khoản quỹ', type: 'text', getValue: (o) => o.payment_method === 'BANK_TRANSFER' ? 'MBBank' : 'Két tiền' },
                { name: 'Người lập', type: 'text', getValue: (o) => o.salesperson || 'N/A' }
            ]
        },
        onlineReturnsTable: {
            dataKey: 'online_returns',
            originalRender: 'renderOnlineReturns',
            columns: [
                { name: 'Thời gian', type: 'text', getValue: (r) => new Date(r.created_at).toLocaleString('vi-VN') },
                { name: 'Mã đơn gốc', type: 'text', getValue: (r) => r.order_number },
                { name: 'Khách hàng', type: 'text', getValue: (r) => {
                    const customer = state.partners.find(p => p.id === r.customer_id);
                    return customer ? customer.name : 'Khách vãng lai';
                }},
                { name: 'Sản phẩm trả', type: 'text', getValue: (r) => r.items.map(item => {
                    const prod = state.online_products.find(p => p.sku === item.sku);
                    return (prod ? prod.name : item.sku) + ' (x' + item.qty + ')';
                }).join(', ') },
                { name: 'Tiền hoàn lại', type: 'number', getValue: (r) => r.refund_amount },
                { name: 'Người thực hiện', type: 'text', getValue: (r) => r.operator },
                { name: 'Ghi chú', type: 'text', getValue: (r) => r.notes }
            ]
        },
        contractsTable: {
            dataKey: 'contracts',
            originalRender: 'renderContracts',
            addBtnId: 'btnNewContract',
            columns: [
                { name: 'Mã hợp đồng', type: 'text', getValue: (c) => c.contract_number },
                { name: 'Khách hàng', type: 'text', getValue: (c) => {
                    const p = state.partners.find(x => x.id === c.partner_id);
                    return p ? p.name : 'N/A';
                }},
                { name: 'Ngày ký', type: 'text', getValue: (c) => new Date(c.signing_date).toLocaleDateString('vi-VN') },
                { name: 'Giá trị hợp đồng', type: 'number', getValue: (c) => c.value },
                { name: 'Loại đơn hàng', type: 'text', getValue: (c) => c.order_type === 'PRODUCTION' ? 'Sản xuất' : 'Online' },
                { name: 'Mã đơn liên kết', type: 'text', getValue: (c) => {
                    if (c.order_type === "PRODUCTION") {
                        const order = state.orders.find(o => o.id === c.order_id);
                        return order ? order.order_number : 'N/A';
                    } else {
                        const onlineOrder = state.online_orders.find(o => o.id === c.order_id);
                        return onlineOrder ? onlineOrder.order_number : 'N/A';
                    }
                }},
                { name: 'Trạng thái', type: 'text', getValue: (c) => c.status === 'ACTIVE' ? 'Đang thực hiện' : c.status === 'LIQUIDATED' ? 'Đã thanh lý' : 'Đã hết hạn' },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        employeesTable: {
            dataKey: 'salespersons',
            originalRender: 'renderEmployees',
            addBtnId: 'btnNewEmployee',
            columns: [
                { name: 'Mã số', type: 'text', getValue: (s) => s.code },
                { name: 'Họ và tên', type: 'text', getValue: (s) => s.name },
                { name: 'Chức vụ', type: 'text', getValue: (s) => s.title || 'N/A' },
                { name: 'Bộ phận', type: 'text', getValue: (s) => s.department || 'N/A' },
                { name: 'Chi nhánh', type: 'text', getValue: (s) => s.branch || 'N/A' },
                { name: 'Ngày sinh', type: 'text', getValue: (s) => s.birthday || 'N/A' },
                { name: 'Địa chỉ', type: 'text', getValue: (s) => s.address || 'N/A' },
                { name: 'Số Zalo', type: 'text', getValue: (s) => s.zalo || 'N/A' },
                { name: 'Facebook', type: 'text', getValue: (s) => s.facebook || 'N/A' },
                { name: 'Số điện thoại', type: 'text', getValue: (s) => s.phone },
                { name: 'Email', type: 'text', getValue: (s) => s.email || 'N/A' },
                { name: 'Tỷ lệ hoa hồng (%)', type: 'number', getValue: (s) => s.commission_rate },
                { name: 'Mã giới thiệu', type: 'text', getValue: (s) => s.referral_code },
                { name: 'Link giới thiệu', type: 'text', getValue: (s) => s.referral_link },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        collaboratorsTable: {
            dataKey: 'salespersons',
            originalRender: 'renderCollaborators',
            addBtnId: 'btnNewCollaborator',
            columns: [
                { name: 'Mã số', type: 'text', getValue: (s) => s.code },
                { name: 'Họ và tên', type: 'text', getValue: (s) => s.name },
                { name: 'Chức vụ', type: 'text', getValue: (s) => s.title || 'N/A' },
                { name: 'Bộ phận', type: 'text', getValue: (s) => s.department || 'N/A' },
                { name: 'Chi nhánh', type: 'text', getValue: (s) => s.branch || 'N/A' },
                { name: 'Ngày sinh', type: 'text', getValue: (s) => s.birthday || 'N/A' },
                { name: 'Địa chỉ', type: 'text', getValue: (s) => s.address || 'N/A' },
                { name: 'Số Zalo', type: 'text', getValue: (s) => s.zalo || 'N/A' },
                { name: 'Facebook', type: 'text', getValue: (s) => s.facebook || 'N/A' },
                { name: 'Số điện thoại', type: 'text', getValue: (s) => s.phone },
                { name: 'Email', type: 'text', getValue: (s) => s.email || 'N/A' },
                { name: 'Tỷ lệ hoa hồng (%)', type: 'number', getValue: (s) => s.commission_rate },
                { name: 'Mã giới thiệu', type: 'text', getValue: (s) => s.referral_code },
                { name: 'Link giới thiệu', type: 'text', getValue: (s) => s.referral_link },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        },
        laborContractsTable: {
            dataKey: 'labor_contracts',
            originalRender: 'renderLaborContracts',
            addBtnId: 'btnNewLaborContract',
            columns: [
                { name: 'Số HĐLĐ', type: 'text', getValue: (c) => c.contract_number },
                { name: 'Nhân viên', type: 'text', getValue: (c) => {
                    const emp = state.salespersons.find(s => s.id === c.employee_id);
                    return emp ? emp.name : 'N/A';
                }},
                { name: 'Ngày ký', type: 'text', getValue: (c) => new Date(c.sign_date).toLocaleDateString('vi-VN') },
                { name: 'Ngày bắt đầu', type: 'text', getValue: (c) => new Date(c.start_date).toLocaleDateString('vi-VN') },
                { name: 'Ngày kết thúc', type: 'text', getValue: (c) => c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : 'Không xác định' },
                { name: 'Lương cơ bản', type: 'number', getValue: (c) => c.base_salary },
                { name: 'Loại hợp đồng', type: 'text', getValue: (c) => c.contract_type },
                { name: 'Trạng thái', type: 'text', getValue: (c) => c.status === 'ACTIVE' ? 'Đang hiệu lực' : c.status === 'EXPIRED' ? 'Đã hết hạn' : 'Đã chấm dứt' },
                { name: 'Thao tác', type: 'text', getValue: () => '' }
            ]
        }
    };

    const ImportMappings = {
        quotesTable: {
            idField: 'order_number',
            excelIdCol: 'Mã đơn',
            dataKey: 'orders',
            fields: {
                'Mã đơn': 'order_number',
                'Quy cách': 'print_spec',
                'Số lượng': (item, val) => { item.quantity = Number(val) || 0; },
                'Đơn giá': () => {},
                'Tổng giá trị': (item, val) => { item.total_amount = Number(val) || 0; },
                'Khách hàng': (item, val) => {
                    const c = state.partners.find(p => p.name === val);
                    item.customer_id = c ? c.id : (state.partners[0]?.id || 'p1');
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'o_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                order_number: excelId,
                created_at: new Date().toISOString(),
                status: 'WAITING_QUOTE',
                deposit: 0,
                payment_status: 'UNPAID',
                print_spec: '',
                quantity: 1,
                total_amount: 0,
                customer_id: state.partners[0]?.id || 'p1'
            })
        },
        prodOrdersTable: {
            idField: 'order_number',
            excelIdCol: 'Mã đơn',
            dataKey: 'orders',
            fields: {
                'Mã đơn': 'order_number',
                'Quy cách': 'print_spec',
                'Số lượng': (item, val) => { item.quantity = Number(val) || 0; },
                'Đơn giá': () => {},
                'Tổng giá trị': (item, val) => { item.total_amount = Number(val) || 0; },
                'Khách hàng': (item, val) => {
                    const c = state.partners.find(p => p.name === val);
                    item.customer_id = c ? c.id : (state.partners[0]?.id || 'p1');
                },
                'Trạng thái': (item, val) => {
                    if (val === "Chưa báo giá") item.status = "WAITING_QUOTE";
                    else if (val === "Đã hủy") item.status = "CANCELLED";
                    else if (val === "Sản xuất xong") item.status = "FINISHED";
                    else item.status = "IN_PRODUCTION";
                },
                'Thanh toán': (item, val) => {
                    if (val === 'Đã thanh toán') {
                        item.payment_status = 'PAID';
                        item.deposit = item.total_amount;
                    } else {
                        item.payment_status = 'PARTIALLY_PAID';
                        const match = String(val).match(/Đã cọc:\s*([\d\.,]+)/);
                        if (match) {
                            item.deposit = Number(match[1].replace(/[\.,]/g, '')) || 0;
                        } else {
                            item.deposit = 0;
                        }
                    }
                },
                'Ngày giao hàng': (item, val) => {
                    if (val && val !== 'N/A') {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.delivery_date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.delivery_date = new Date(val).toISOString().slice(0, 10);
                        }
                    }
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'o_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                order_number: excelId,
                created_at: new Date().toISOString(),
                status: 'IN_PRODUCTION',
                deposit: 0,
                payment_status: 'UNPAID',
                print_spec: '',
                quantity: 1,
                total_amount: 0,
                customer_id: state.partners[0]?.id || 'p1'
            })
        },
        crmTable: {
            idField: 'code',
            excelIdCol: 'Mã',
            dataKey: 'partners',
            fields: {
                'Mã': 'code',
                'Họ và tên': 'name',
                'Điện thoại': 'phone',
                'Email': 'email',
                'Vai trò': (item, val) => {
                    const roles = { "Khách hàng": "CUSTOMER", "Nhà cung cấp": "SUPPLIER", "Đơn vị gia công": "SUBCONTRACTOR", "Khách & NCC": "BOTH" };
                    item.role = roles[val] || "CUSTOMER";
                },
                'Trạng thái': (item, val) => {
                    item.status = val === "Đang làm việc";
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                code: excelId,
                name: '',
                phone: '',
                email: '',
                role: 'CUSTOMER',
                credit_limit: 50000000,
                status: true
            })
        },
        inventoryTable: {
            idField: 'sku',
            excelIdCol: 'SKU',
            dataKey: 'materials',
            fields: {
                'SKU': 'sku',
                'Tên vật tư': 'name',
                'Nhóm': 'category',
                'Tồn hiện tại': (item, val) => { item.stock_qty = Number(val) || 0; },
                'Tồn tối thiểu': (item, val) => { item.min_stock_qty = Number(val) || 0; },
                'Đơn vị': 'unit',
                'Đơn giá nhập TB': (item, val) => { item.avg_cost = Number(val) || 0; }
            },
            newRecordGenerator: (excelId) => ({
                sku: excelId,
                name: '',
                category: 'Giấy',
                stock_qty: 0,
                min_stock_qty: 10,
                unit: 'Cái',
                avg_cost: 0
            })
        },
        subcontractingTable: {
            idField: 'contract_number',
            excelIdCol: 'Hợp đồng',
            dataKey: 'subcontracts',
            fields: {
                'Hợp đồng': 'contract_number',
                'Đơn vị nhận': (item, val) => {
                    const p = state.partners.find(x => x.name === val && x.role === 'SUBCONTRACTOR');
                    item.subcontractor_id = p ? p.id : (state.partners.find(x => x.role === 'SUBCONTRACTOR')?.id || 'p1');
                },
                'Công việc': 'work_detail',
                'Đơn hàng': (item, val) => {
                    const o = state.orders.find(x => x.order_number === val);
                    item.sales_order_id = o ? o.id : (state.orders[0]?.id || 'o1');
                },
                'Chi phí': (item, val) => { item.cost = Number(val) || 0; },
                'Thời hạn': (item, val) => {
                    if (val) {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.deadline = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.deadline = new Date(val).toISOString().slice(0, 10);
                        }
                    }
                },
                'Tiến độ': (item, val) => { item.progress = Number(val) || 0; },
                'Thanh toán': (item, val) => {
                    item.payment_status = val === "Đã trả" ? "PAID" : "UNPAID";
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                contract_number: excelId,
                subcontractor_id: state.partners.find(x => x.role === 'SUBCONTRACTOR')?.id || 'p1',
                work_detail: '',
                sales_order_id: state.orders[0]?.id || 'o1',
                cost: 0,
                deadline: new Date().toISOString().slice(0, 10),
                progress: 0,
                payment_status: 'UNPAID'
            })
        },
        financeTransactionsTable: {
            idField: 'tx_number',
            excelIdCol: 'Mã giao dịch',
            dataKey: 'transactions',
            fields: {
                'Mã giao dịch': 'tx_number',
                'Thời gian': (item, val) => {
                    if (val) {
                        item.created_at = new Date(val).toISOString();
                    }
                },
                'Phân loại': (item, val) => {
                    const cats = {
                        "Thu cọc đơn in": "CUSTOMER_DEPOSIT",
                        "Thu nợ đơn in": "CUSTOMER_FINAL",
                        "Thanh toán vật tư": "SUPPLIER_PAY",
                        "Thanh toán gia công": "SUBCONTRACTOR_PAY",
                        "Chi lương nhân sự": "SALARY",
                        "Chi phí vận hành": "OPERATIONAL"
                    };
                    item.category = cats[val] || "OPERATIONAL";
                },
                'Đối tác': (item, val) => {
                    const p = state.partners.find(x => x.name === val);
                    item.partner_id = p ? p.id : '';
                },
                'Số tiền': (item, val) => { item.amount = Number(val) || 0; },
                'Hình thức': (item, val) => {
                    item.payment_method = val === 'Chuyển khoản' ? 'BANK_TRANSFER' : 'CASH';
                },
                'Tài khoản quỹ': (item, val) => {
                    item.account_source = val === 'MBBank' ? 'VCB' : 'CASH_BOX';
                },
                'Người lập': 'created_by'
            },
            newRecordGenerator: (excelId) => ({
                id: 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                tx_number: excelId,
                created_at: new Date().toISOString(),
                category: 'OPERATIONAL',
                partner_id: '',
                amount: 0,
                payment_method: 'CASH',
                account_source: 'CASH_BOX',
                created_by: 'Admin'
            })
        },
        onlineOrdersTable: {
            idField: 'order_number',
            excelIdCol: 'Mã đơn',
            dataKey: 'online_orders',
            fields: {
                'Mã đơn': 'order_number',
                'Thời gian': (item, val) => { if(val) item.created_at = new Date(val).toISOString(); },
                'Khách hàng': (item, val) => {
                    const c = state.partners.find(p => p.name === val);
                    item.customer_id = c ? c.id : (state.partners[0]?.id || 'p1');
                },
                'Sản phẩm': (item, val) => {
                    const items = [];
                    String(val).split(',').forEach(part => {
                        const match = part.trim().match(/(.+)\s*\(x(\d+)\)/);
                        if (match) {
                            const nameOrSku = match[1].trim();
                            const qty = Number(match[2]) || 1;
                            const p = state.online_products.find(prod => prod.name === nameOrSku || prod.sku === nameOrSku);
                            items.push({
                                sku: p ? p.sku : nameOrSku,
                                qty: qty,
                                price: p ? p.price : 10000
                            });
                        }
                    });
                    item.items = items;
                },
                'Sales & Hoa hồng': (item, val) => {
                    const match = String(val).match(/(.+)\s*\((\d+)%:\s*([\d\.,]+)\)/);
                    if (match) {
                        item.salesperson = match[1].trim();
                        item.commission_rate = Number(match[2]) || 0;
                        item.commission_amount = Number(match[3].replace(/[^0-9]/g, '')) || 0;
                    } else {
                        item.salesperson = String(val).split('(')[0].trim();
                    }
                },
                'Tổng tiền': (item, val) => { item.total_amount = Number(val) || 0; },
                'Thanh toán': (item, val) => {
                    item.payment_status = val === 'Đã thanh toán' ? 'PAID' : 'UNPAID';
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'oo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                order_number: excelId,
                created_at: new Date().toISOString(),
                customer_id: state.partners[0]?.id || 'p1',
                items: [],
                total_amount: 0,
                payment_status: 'UNPAID',
                salesperson: 'Admin',
                commission_rate: 5,
                commission_amount: 0
            })
        },
        onlineProductsTable: {
            idField: 'sku',
            excelIdCol: 'Mã SKU',
            dataKey: 'online_products',
            fields: {
                'Mã SKU': (item, val) => { item.sku = String(val).trim().toUpperCase(); },
                'Ảnh': 'image',
                'Hình ảnh': 'image',
                'Ảnh sản phẩm': 'image',
                'Link ảnh': 'image',
                'Mã vạch': 'barcode',
                'Tên hàng hóa': 'name',
                'Đơn vị': 'unit',
                'Giá bán lẻ': (item, val) => { item.price = Number(val) || 0; },
                'Giá bán sỉ': (item, val) => { item.wholesale_price = Number(val) || 0; },
                'Tồn kho': (item, val) => { item.stock_qty = Number(val) || 0; },
                'Tồn tối thiểu': (item, val) => { item.min_stock_qty = Number(val) || 0; }
            },
            newRecordGenerator: (excelId) => ({
                sku: excelId,
                image: '',
                barcode: '',
                name: '',
                unit: 'Cái',
                price: 0,
                wholesale_price: 0,
                stock_qty: 0,
                min_stock_qty: 5
            })
        },
        onlineStockLogsTable: {
            idField: 'id',
            excelIdCol: 'Thời gian',
            dataKey: 'online_stock_logs',
            fields: {
                'Thời gian': (item, val) => { if (val) item.created_at = new Date(val).toISOString(); },
                'SKU': 'sku',
                'Sản phẩm': () => {},
                'Loại': (item, val) => {
                    const types = { "Nhập kho": "IMPORT", "Xuất kho": "EXPORT", "Điều chỉnh": "ADJUST" };
                    item.type = types[val] || "IMPORT";
                },
                'Số lượng': (item, val) => { item.qty = Number(val) || 0; },
                'Ghi chú': 'note'
            },
            newRecordGenerator: (excelId) => ({
                id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                created_at: new Date().toISOString(),
                sku: '',
                type: 'IMPORT',
                qty: 0,
                note: ''
            })
        },
        contractsTable: {
            idField: 'contract_number',
            excelIdCol: 'Mã hợp đồng',
            dataKey: 'contracts',
            fields: {
                'Mã hợp đồng': 'contract_number',
                'Khách hàng': (item, val) => {
                    const p = state.partners.find(x => x.name === val);
                    item.partner_id = p ? p.id : (state.partners[0]?.id || 'p1');
                },
                'Ngày ký': (item, val) => {
                    if (val) {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.signing_date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.signing_date = new Date(val).toISOString().slice(0,10);
                        }
                    }
                },
                'Giá trị hợp đồng': (item, val) => { item.value = Number(val) || 0; },
                'Loại đơn hàng': (item, val) => {
                    item.order_type = val === 'Sản xuất' ? 'PRODUCTION' : 'ONLINE';
                },
                'Mã đơn liên kết': (item, val) => {
                    if (item.order_type === 'PRODUCTION') {
                        const o = state.orders.find(x => x.order_number === val);
                        item.order_id = o ? o.id : '';
                    } else {
                        const oo = state.online_orders.find(x => x.order_number === val);
                        item.order_id = oo ? oo.id : '';
                    }
                },
                'Trạng thái': (item, val) => {
                    const states = { "Đang thực hiện": "ACTIVE", "Đã thanh lý": "LIQUIDATED", "Đã hết hạn": "EXPIRED" };
                    item.status = states[val] || "ACTIVE";
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'ct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                contract_number: excelId,
                partner_id: state.partners[0]?.id || 'p1',
                signing_date: new Date().toISOString().slice(0, 10),
                value: 0,
                order_type: 'PRODUCTION',
                order_id: '',
                status: 'ACTIVE',
                details: ''
            })
        },
        employeesTable: {
            idField: 'code',
            excelIdCol: 'Mã số',
            dataKey: 'salespersons',
            fields: {
                'Mã số': 'code',
                'Họ và tên': 'name',
                'Số điện thoại': 'phone',
                'Email': 'email',
                'Tỷ lệ hoa hồng (%)': (item, val) => { item.commission_rate = Number(val) || 0; },
                'Mã giới thiệu': 'referral_code',
                'Link giới thiệu': 'referral_link'
            },
            newRecordGenerator: (excelId) => ({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                code: excelId,
                name: '',
                phone: '',
                email: '',
                role: 'SALESPERSON',
                commission_rate: 5,
                referral_code: 'ref' + Date.now().toString().slice(-4),
                referral_link: '',
                status: true
            })
        },
        collaboratorsTable: {
            idField: 'code',
            excelIdCol: 'Mã số',
            dataKey: 'salespersons',
            fields: {
                'Mã số': 'code',
                'Họ và tên': 'name',
                'Số điện thoại': 'phone',
                'Email': 'email',
                'Tỷ lệ hoa hồng (%)': (item, val) => { item.commission_rate = Number(val) || 0; },
                'Mã giới thiệu': 'referral_code',
                'Link giới thiệu': 'referral_link'
            },
            newRecordGenerator: (excelId) => ({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                code: excelId,
                name: '',
                phone: '',
                email: '',
                role: 'COLLABORATOR',
                commission_rate: 10,
                referral_code: 'ref' + Date.now().toString().slice(-4),
                referral_link: '',
                status: true
            })
        },
        laborContractsTable: {
            idField: 'contract_number',
            excelIdCol: 'Số HĐLĐ',
            dataKey: 'labor_contracts',
            fields: {
                'Số HĐLĐ': 'contract_number',
                'Nhân viên': (item, val) => {
                    const emp = state.salespersons.find(x => x.name === val);
                    item.employee_id = emp ? emp.id : (state.salespersons[0]?.id || 's1');
                },
                'Ngày ký': (item, val) => {
                    if (val) {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.sign_date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.sign_date = new Date(val).toISOString().slice(0, 10);
                        }
                    }
                },
                'Ngày bắt đầu': (item, val) => {
                    if (val) {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.start_date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.start_date = new Date(val).toISOString().slice(0, 10);
                        }
                    }
                },
                'Ngày kết thúc': (item, val) => {
                    if (val && val !== 'Không xác định') {
                        const parts = String(val).split('/');
                        if (parts.length === 3) {
                            item.end_date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        } else {
                            item.end_date = new Date(val).toISOString().slice(0, 10);
                        }
                    } else {
                        item.end_date = '';
                    }
                },
                'Lương cơ bản': (item, val) => { item.base_salary = Number(val) || 0; },
                'Loại hợp đồng': 'contract_type',
                'Trạng thái': (item, val) => {
                    item.status = val === 'Đang hiệu lực' ? 'ACTIVE' : val === 'Đã hết hạn' ? 'EXPIRED' : 'TERMINATED';
                }
            },
            newRecordGenerator: (excelId) => ({
                id: 'lc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                employee_id: state.salespersons[0]?.id || 's1',
                sign_date: new Date().toISOString().slice(0, 10),
                start_date: new Date().toISOString().slice(0, 10),
                end_date: '',
                base_salary: 10000000,
                contract_type: 'Xác định thời hạn',
                status: 'ACTIVE'
            })
        }
    };

    class TableToolbarController {
        constructor(tableId) {
            console.log("IHP: Initializing controller for " + tableId);
            this.tableId = tableId;
            this.config = TableConfigs[tableId];
            this.containerId = `${tableId}-toolbar-container`;
            
            // Load persistent settings
            const savedSettings = localStorage.getItem(`ihp_toolbar_${tableId}`);
            if (savedSettings) {
                try {
                    this.settings = JSON.parse(savedSettings) || {};
                } catch (e) {
                    this.settings = {};
                }
                
                // Ensure defaults for all fields
                if (!this.settings.visibleCols) this.settings.visibleCols = this.config.columns.filter(c => !c.hiddenByDefault && c.name !== 'Thời gian thao tác').map(c => c.name);
                if (!this.settings.hiddenCols) this.settings.hiddenCols = this.config.columns.filter(c => c.hiddenByDefault).map(c => c.name);
                if (!this.settings.filters) this.settings.filters = [];
                if (!this.settings.filterMatch) this.settings.filterMatch = 'and';
                if (!this.settings.groupBy) this.settings.groupBy = '';
                if (!this.settings.sortBy) this.settings.sortBy = '';
                if (!this.settings.sortDir) this.settings.sortDir = 'asc';
                if (!this.settings.rowHeight) this.settings.rowHeight = 'vua';
                if (!this.settings.conditionalColors) this.settings.conditionalColors = [];
                if (!this.settings.customCols) this.settings.customCols = [];
                if (!this.settings.customColValues) this.settings.customColValues = {};
                
                // Automatically add newly introduced columns to visibleCols if not hidden previously
                const defaultColNames = this.config.columns.map(c => c.name);
                const allConfiguredCols = [...(this.settings.visibleCols || []), ...(this.settings.hiddenCols || [])];
                defaultColNames.forEach(colName => {
                    if (!allConfiguredCols.includes(colName)) {
                        const colConfig = this.config.columns.find(c => c.name === colName);
                        if (colConfig && colConfig.hiddenByDefault) {
                            if (!this.settings.hiddenCols.includes(colName)) {
                                this.settings.hiddenCols.push(colName);
                            }
                        } else {
                            this.settings.visibleCols.push(colName);
                        }
                    }
                });
                
                // Force sync and add time columns if not present
                if ((this.tableId === 'ordersTable' || this.tableId === 'quotesTable' || this.tableId === 'prodOrdersTable') && !this.settings.visibleCols.includes('Thời gian tạo')) {
                    this.settings.visibleCols = ['Thời gian tạo', ...this.settings.visibleCols.filter(c => c !== 'Thời gian thao tác')];
                }
            } else {
                this.settings = {
                    visibleCols: this.config.columns.filter(c => !c.hiddenByDefault && c.name !== 'Thời gian thao tác').map(c => c.name),
                    hiddenCols: this.config.columns.filter(c => c.hiddenByDefault).map(c => c.name),
                    filters: [],
                    filterMatch: 'and',
                    groupBy: '',
                    sortBy: '',
                    sortDir: 'asc',
                    rowHeight: 'vua',
                    conditionalColor: { enabled: false, col: '', op: 'bằng', val: '', color: '#ff4d4f' },
                    customCols: [],
                    customColValues: {}
                };
            }

            // Saved views list
            this.savedViews = JSON.parse(localStorage.getItem(`ihp_views_${tableId}`) || '[]');

            // Inject custom columns definitions dynamically into config columns array
            this.syncConfigColumns();

            this.initToolbar();
        }

        syncConfigColumns() {
            // Remove previous custom columns to prevent duplicates
            this.config.columns = this.config.columns.filter(c => !c.isCustom);
            
            // Inject custom columns from settings
            this.settings.customCols.forEach(col => {
                this.config.columns.push({
                    name: col.name,
                    type: col.type,
                    isCustom: true,
                    getValue: (item) => {
                        const rowId = this.getRowId(item);
                        return this.settings.customColValues[`${rowId}_${col.name}`] || '';
                    }
                });
            });
        }

        getRowId(item) {
            if (this.tableId === 'ordersTable' || this.tableId === 'quotesTable' || this.tableId === 'prodOrdersTable') return item.id || item.order_number;
            if (this.tableId === 'crmTable') return item.id || item.code;
            if (this.tableId === 'inventoryTable') return item.sku;
            if (this.tableId === 'subcontractingTable') return item.id || item.contract_number;
            if (this.tableId === 'financeTransactionsTable') return item.id || item.tx_number;
            if (this.tableId === 'onlineOrdersTable') return item.id || item.order_number;
            if (this.tableId === 'onlineProductsTable') return item.sku;
            if (this.tableId === 'onlineStockLogsTable') return item.id;
            if (this.tableId === 'contractsTable') return item.id || item.contract_number;
            if (this.tableId === 'employeesTable' || this.tableId === 'collaboratorsTable') return item.id || item.code;
            if (this.tableId === 'laborContractsTable') return item.id || item.contract_number;
            return '';
        }

        saveSettings() {
            localStorage.setItem(`ihp_toolbar_${this.tableId}`, JSON.stringify(this.settings));
        }

        initToolbar() {
            const table = document.getElementById(this.tableId);
            if (!table) return;

            const responsiveParent = table.closest('.table-responsive');
            if (!responsiveParent) return;

            // Check if already has toolbar
            let toolbarDiv = document.getElementById(this.containerId);
            if (toolbarDiv) {
                this.updateBadgeTexts();
                return;
            }

            // Create Toolbar Container
            toolbarDiv = document.createElement('div');
            toolbarDiv.id = this.containerId;
            toolbarDiv.className = 'db-view-toolbar';
            
            // Generate Buttons HTML
            toolbarDiv.innerHTML = `
                ${this.tableId !== 'onlineOrdersTable' ? `
                <button class="db-toolbar-btn toolbar-add-btn" style="background:var(--accent); color:white; border-radius:8px;">
                    <i data-lucide="plus"></i> <span>Thêm bản ghi</span>
                </button>
                ` : ''}
                <button class="db-toolbar-btn toolbar-trigger-btn" style="border: 1px solid var(--border-color); border-radius: 8px;">
                    <i data-lucide="menu"></i> <span>Công cụ</span>
                </button>
                <div class="toolbar-actions-group">
                    <button class="db-toolbar-btn toolbar-cols-btn">
                        <i data-lucide="settings"></i> <span>Tùy chỉnh trường</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-filter-btn">
                        <i data-lucide="filter"></i> <span class="filter-btn-text">Lọc</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-group-btn">
                        <i data-lucide="folder"></i> <span>Nhóm theo</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-sort-btn">
                        <i data-lucide="arrow-up-down"></i> <span>Sắp xếp</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-height-btn">
                        <i data-lucide="align-justify"></i> <span>Độ cao hàng</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-color-btn">
                        <i data-lucide="palette"></i> <span>Tô màu điều kiện</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-export-btn" style="background-color: var(--success-light); color: var(--success); border: none;">
                        <i data-lucide="download"></i> <span>Xuất Excel</span>
                    </button>
                    <button class="db-toolbar-btn toolbar-import-btn" style="background-color: var(--warning-light); color: var(--warning); border: none;">
                        <i data-lucide="upload"></i> <span>Nhập Excel</span>
                    </button>
                    <input type="file" class="toolbar-import-input" accept=".xlsx, .xls, .csv" style="display: none;">
                </div>

                <!-- Popovers -->
                <div class="db-popover cols-popover"></div>
                <div class="db-popover filter-popover db-filter-popover"></div>
                <div class="db-popover group-popover"></div>
                <div class="db-popover sort-popover"></div>
                <div class="db-popover height-popover"></div>
                <div class="db-popover color-popover"></div>
            `;

            responsiveParent.parentNode.insertBefore(toolbarDiv, responsiveParent);
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons({ attrs: { class: 'lucide-icon' } });
            }

            // Setup listeners
            this.setupListeners(toolbarDiv);
            this.updateBadgeTexts();
        }

        setupListeners(toolbar) {
            // Add Record Button
            toolbar.querySelector('.toolbar-add-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                const addId = this.config ? this.config.addBtnId : null;
                
                // Try to find the button on page and click it programmatically
                if (addId) {
                    const btn = document.getElementById(addId);
                    if (btn) {
                        if (btn.classList.contains('modal')) {
                            btn.classList.add('active');
                            return;
                        }
                        try {
                            btn.click();
                            return;
                        } catch (err) {
                            console.error("IHP Toolbar: Error clicking button " + addId, err);
                        }
                    }
                }
                
                // Fallback direct modal opening if button click fails or button is missing
                if (this.tableId === 'quotesTable' || this.tableId === 'prodOrdersTable') {
                    document.getElementById('quoteModal')?.classList.add('active');
                } else if (this.tableId === 'crmTable') {
                    document.getElementById('partnerModal')?.classList.add('active');
                } else if (this.tableId === 'inventoryTable') {
                    document.getElementById('stockModal')?.classList.add('active');
                } else if (this.tableId === 'subcontractingTable') {
                    document.getElementById('subcontractModal')?.classList.add('active');
                } else if (this.tableId === 'financeTransactionsTable') {
                    document.getElementById("newInternalTxForm")?.reset();
                    document.getElementById('newInternalTxModal')?.classList.add('active');
                } else if (this.tableId === 'onlineOrdersTable') {
                    if (typeof window.openNewOnlineOrderModal === 'function') {
                        window.openNewOnlineOrderModal();
                    } else {
                        document.getElementById("onlineOrderModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineProductsTable') {
                    if (typeof window.openNewOnlineProductModal === 'function') {
                        window.openNewOnlineProductModal('ADD');
                    } else {
                        document.getElementById("onlineProductModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineStockLogsTable') {
                    if (typeof window.openOnlineImportStockModal === 'function') {
                        window.openOnlineImportStockModal();
                    } else {
                        document.getElementById("onlineImportStockModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineInventoryChecksTable') {
                    if (typeof window.openNewInventoryCheckModal === 'function') {
                        window.openNewInventoryCheckModal();
                    } else {
                        document.getElementById("onlineInventoryCheckModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineInternalExitsTable') {
                    if (typeof window.openNewInternalExitModal === 'function') {
                        window.openNewInternalExitModal();
                    } else {
                        document.getElementById("onlineInternalExitModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineInvoicesTable') {
                    if (typeof window.openNewOnlineOrderModal === 'function') {
                        window.openNewOnlineOrderModal();
                    } else {
                        document.getElementById("onlineOrderModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'onlineReturnsTable') {
                    if (typeof window.openNewOrderReturnModal === 'function') {
                        window.openNewOrderReturnModal();
                    } else {
                        document.getElementById("onlineOrderReturnModal")?.classList.add("active");
                    }
                } else if (this.tableId === 'contractsTable') {
                    document.getElementById("contractForm")?.reset();
                    if (document.getElementById("contractIdInput")) document.getElementById("contractIdInput").value = "";
                    if (document.getElementById("contractModalTitle")) document.getElementById("contractModalTitle").textContent = "Thêm hợp đồng nguyên tắc mới";
                    document.getElementById('contractModal')?.classList.add('active');
                } else if (this.tableId === 'employeesTable') {
                    document.getElementById("salespersonForm")?.reset();
                    if (document.getElementById("salespersonIdInput")) document.getElementById("salespersonIdInput").value = "";
                    if (document.getElementById("salespersonModalTitle")) document.getElementById("salespersonModalTitle").textContent = "Thêm nhân viên mới";
                    const codeSuffix = String((state.salespersons || []).length + 1).padStart(3, '0');
                    if (document.getElementById("salespersonCode")) document.getElementById("salespersonCode").value = `SALES-${codeSuffix}`;
                    if (document.getElementById("salespersonRole")) document.getElementById("salespersonRole").value = "SALESPERSON";
                    if (document.getElementById("salespersonCommissionRate")) document.getElementById("salespersonCommissionRate").value = 5;
                    if (document.getElementById("salespersonReferralCode")) document.getElementById("salespersonReferralCode").value = `ref${codeSuffix}`;
                    document.getElementById('salespersonModal')?.classList.add('active');
                } else if (this.tableId === 'collaboratorsTable') {
                    document.getElementById("salespersonForm")?.reset();
                    if (document.getElementById("salespersonIdInput")) document.getElementById("salespersonIdInput").value = "";
                    if (document.getElementById("salespersonModalTitle")) document.getElementById("salespersonModalTitle").textContent = "Thêm cộng tác viên mới";
                    const codeSuffix = String((state.salespersons || []).length + 1).padStart(3, '0');
                    if (document.getElementById("salespersonCode")) document.getElementById("salespersonCode").value = `CTV-${codeSuffix}`;
                    if (document.getElementById("salespersonRole")) document.getElementById("salespersonRole").value = "COLLABORATOR";
                    if (document.getElementById("salespersonCommissionRate")) document.getElementById("salespersonCommissionRate").value = 10;
                    if (document.getElementById("salespersonReferralCode")) document.getElementById("salespersonReferralCode").value = `ref${codeSuffix}`;
                    document.getElementById('salespersonModal')?.classList.add('active');
                } else if (this.tableId === 'laborContractsTable') {
                    document.getElementById("laborContractForm")?.reset();
                    if (document.getElementById("laborContractIdInput")) document.getElementById("laborContractIdInput").value = "";
                    if (document.getElementById("laborContractModalTitle")) document.getElementById("laborContractModalTitle").textContent = "Thêm hợp đồng lao động mới";
                    document.getElementById('laborContractModal')?.classList.add('active');
                }
            });


            // Export Excel Button
            const expBtn = toolbar.querySelector('.toolbar-export-btn');
            if (expBtn) {
                expBtn.addEventListener('click', () => this.exportToExcel());
            }

            // Import Excel Button
            const impBtn = toolbar.querySelector('.toolbar-import-btn');
            const impInput = toolbar.querySelector('.toolbar-import-input');
            if (impBtn && impInput) {
                impBtn.addEventListener('click', () => impInput.click());
                impInput.addEventListener('change', (e) => this.importFromExcel(e));
            }

            // Toggle Popovers
            const buttons = [
                { btn: '.toolbar-cols-btn', pop: '.cols-popover', render: () => this.renderColsPopover() },
                { btn: '.toolbar-filter-btn', pop: '.filter-popover', render: () => this.renderFilterPopover() },
                { btn: '.toolbar-group-btn', pop: '.group-popover', render: () => this.renderGroupPopover() },
                { btn: '.toolbar-sort-btn', pop: '.sort-popover', render: () => this.renderSortPopover() },
                { btn: '.toolbar-height-btn', pop: '.height-popover', render: () => this.renderHeightPopover() },
                { btn: '.toolbar-color-btn', pop: '.color-popover', render: () => this.renderColorPopover() }
            ];

            buttons.forEach(item => {
                const buttonEl = toolbar.querySelector(item.btn);
                const popEl = toolbar.querySelector(item.pop);
                if (!buttonEl || !popEl) return;
                buttonEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const alreadyShow = popEl.classList.contains('show');
                    
                    // Hide all other popovers
                    toolbar.querySelectorAll('.db-popover').forEach(p => p.classList.remove('show'));
                    toolbar.querySelectorAll('.db-toolbar-btn').forEach(b => b.classList.remove('active'));

                    if (!alreadyShow) {
                        item.render();
                        popEl.classList.add('show');
                        buttonEl.classList.add('active');
                    }
                });
                
                popEl.addEventListener('click', (e) => e.stopPropagation());
            });

            // Mobile Menu Trigger
            const triggerBtn = toolbar.querySelector('.toolbar-trigger-btn');
            const actionsGroup = toolbar.querySelector('.toolbar-actions-group');
            if (triggerBtn && actionsGroup) {
                triggerBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    actionsGroup.classList.toggle('show');
                });
                
                actionsGroup.addEventListener('click', (e) => {
                    if (e.target.closest('.db-toolbar-btn')) {
                        actionsGroup.classList.remove('show');
                    }
                });
            }

            // Click outside to close popovers
            document.addEventListener('click', () => {
                toolbar.querySelectorAll('.db-popover').forEach(p => p.classList.remove('show'));
                toolbar.querySelectorAll('.db-toolbar-btn').forEach(b => b.classList.remove('active'));
                toolbar.querySelector('.toolbar-actions-group')?.classList.remove('show');
            });
        }

        exportToExcel() {
            // Get visible columns
            const cols = this.config.columns.filter(c => this.settings.visibleCols.includes(c.name));
            if (cols.length === 0) {
                alert("Không có cột nào được hiển thị để xuất!");
                return;
            }
            
            // Get data
            const originalDataList = state[this.config.dataKey] || [];
            const dataArr = this.getProcessedData(originalDataList);
            
            // Map data to rows
            const rows = dataArr.map(item => {
                const rowObj = {};
                cols.forEach(col => {
                    if (col.name === 'Thao tác') return; // Skip Action column
                    let val = col.getValue(item);
                    if (typeof val === 'string' && val.length > 32760) {
                        if (val.startsWith('data:image/')) {
                            val = '[Hình ảnh Base64]';
                        } else {
                            val = val.substring(0, 32750) + '...';
                        }
                    }
                    rowObj[col.name] = val;
                });
                return rowObj;
            });

            if (rows.length === 0 && cols.length > 0) {
                const emptyRow = {};
                cols.forEach(col => {
                    if (col.name !== 'Thao tác') emptyRow[col.name] = '';
                });
                rows.push(emptyRow);
            }

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
            // Generate filename
            const filename = `${this.tableId}_export_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, filename);
        }

        importFromExcel(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const ws = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

                    if (rows.length === 0) {
                        alert("Không có dữ liệu trong file Excel!");
                        return;
                    }

                    const mapping = ImportMappings[this.tableId];
                    if (!mapping) {
                        alert("Không tìm thấy cấu hình nhập cho bảng này!");
                        return;
                    }

                    const dataKey = mapping.dataKey;
                    const existingData = [...state[dataKey]];
                    const idField = mapping.idField;
                    const excelIdCol = mapping.excelIdCol;

                    let addedCustomCols = false;

                    rows.forEach(excelRow => {
                        const excelIdVal = String(excelRow[excelIdCol] || "").trim();
                        if (!excelIdVal) return;

                        // Find existing item
                        let item = existingData.find(x => String(x[idField] || "").trim() === excelIdVal);
                        let isNew = false;
                        if (!item) {
                            item = mapping.newRecordGenerator(excelIdVal);
                            isNew = true;
                        }

                        // Map standard fields
                        Object.keys(excelRow).forEach(key => {
                            const fieldVal = excelRow[key];
                            const fieldMapper = mapping.fields[key];

                            if (fieldMapper !== undefined) {
                                if (typeof fieldMapper === 'function') {
                                    fieldMapper(item, fieldVal);
                                } else if (typeof fieldMapper === 'string') {
                                    item[fieldMapper] = fieldVal;
                                }
                            } else {
                                // Dynamic custom columns setup
                                if (key !== 'Thao tác' && key !== excelIdCol && key.trim() !== '') {
                                    // Register custom column if not already registered
                                    let colDef = this.settings.customCols.find(c => c.name === key);
                                    if (!colDef) {
                                        this.settings.customCols.push({ name: key, type: typeof fieldVal === 'number' ? 'number' : 'text' });
                                        if (!this.settings.visibleCols.includes(key)) {
                                            this.settings.visibleCols.push(key);
                                        }
                                        addedCustomCols = true;
                                    }
                                    
                                    // Save the custom field value
                                    const rowId = this.getRowId(item);
                                    this.settings.customColValues[`${rowId}_${key}`] = fieldVal;
                                }
                            }
                        });

                        if (isNew) {
                            existingData.push(item);
                        }
                    });

                    // Save custom columns configs
                    if (addedCustomCols) {
                        this.saveSettings();
                        this.syncConfigColumns();
                    }

                    // Update app state
                    state.updateState(dataKey, existingData);

                    // Re-render
                    this.triggerRerender();

                    alert(`Đã nhập thành công ${rows.length} dòng từ Excel!`);
                } catch (err) {
                    console.error("Excel import error:", err);
                    alert("Lỗi khi đọc file Excel: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
            e.target.value = ""; // Reset input
        }

        updateBadgeTexts() {
            const container = document.getElementById(this.containerId);
            if (!container) return;
            const filterBtnText = container.querySelector('.filter-btn-text');
            if (filterBtnText) {
                const count = this.settings.filters.length;
                filterBtnText.textContent = count > 0 ? `${count} Lọc` : 'Lọc';
                const filterBtn = filterBtnText.closest('.db-toolbar-btn');
                if (count > 0) {
                    filterBtn.classList.add('active');
                } else {
                    filterBtn.classList.remove('active');
                }
            }
        }

        // ==========================================
        // 1. Column Customizer Popover (with New Custom Columns)
        // ==========================================
        renderColsPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.cols-popover');
            pop.innerHTML = `
                <h4>Hiển thị trường cột (Kéo thả để sắp xếp)</h4>
                <div class="db-col-toggle-list" style="margin-bottom: 8px;">
                    ${this.config.columns.map((col, index) => {
                        const checked = this.settings.visibleCols.includes(col.name) ? 'checked' : '';
                        const customTag = col.isCustom ? '<span style="font-size:0.65rem; background:var(--accent); color:white; padding:1px 4px; border-radius:4px; margin-left:4px;">Cột mới</span>' : '';
                        return `
                            <div class="draggable-col-item" draggable="true" data-name="${col.name}" data-index="${index}" style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px; margin:2px 0; border:1px dashed transparent; cursor:move; border-radius:4px; transition:all 0.15s ease;">
                                <div style="display:flex; align-items:center; gap:6px; flex-grow:1;">
                                    <i data-lucide="grip-vertical" style="width:12px; height:12px; color:var(--text-muted);"></i>
                                    <label class="db-col-toggle-item" style="flex-grow:1; cursor:pointer; display:flex; align-items:center; gap:6px;">
                                        <input type="checkbox" data-col="${col.name}" ${checked}>
                                        <span>${col.name}${customTag}</span>
                                    </label>
                                </div>
                                ${col.isCustom ? `
                                    <div style="display:flex; gap:6px; align-items:center;">
                                        <span class="btn-edit-custom-col" data-name="${col.name}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i data-lucide="edit-2" style="width:12px; height:12px; color:var(--warning);"></i></span>
                                        <span class="btn-delete-custom-col" data-name="${col.name}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i data-lucide="trash-2" style="width:12px; height:12px; color:var(--danger);"></i></span>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                    <h5 style="margin: 0 0 8px 0; font-size: 0.8rem; font-weight:700;">Thêm cột tùy chỉnh mới</h5>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <input type="text" placeholder="Tên cột mới..." class="new-col-name" style="padding:6px; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-body); color:var(--text-primary);">
                        <select class="new-col-type" style="padding:6px; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-body); color:var(--text-primary);">
                            <option value="text">Chữ (Text)</option>
                            <option value="number">Số (Number)</option>
                            <option value="date">Ngày tháng (Date)</option>
                        </select>
                        <button class="btn btn-primary btn-add-custom-col" style="padding:6px; font-size:0.8rem;">+ Tạo cột</button>
                    </div>
                </div>
            `;
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons({ attrs: { class: 'lucide-icon' } });
            }

            // Drag and Drop ordering handler
            const toggleList = pop.querySelector('.db-col-toggle-list');
            let dragSourceEl = null;

            toggleList.querySelectorAll('.draggable-col-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    dragSourceEl = item;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', item.innerHTML);
                    item.style.opacity = '0.4';
                });

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    item.style.border = '1px dashed var(--accent)';
                    return false;
                });

                item.addEventListener('dragleave', () => {
                    item.style.border = '1px dashed transparent';
                });

                item.addEventListener('drop', (e) => {
                    e.stopPropagation();
                    item.style.border = '1px dashed transparent';
                    if (dragSourceEl !== item) {
                        const sourceIdx = parseInt(dragSourceEl.dataset.index);
                        const targetIdx = parseInt(item.dataset.index);

                        // Swap / Reorder config columns
                        const sourceCol = this.config.columns[sourceIdx];
                        this.config.columns.splice(sourceIdx, 1);
                        this.config.columns.splice(targetIdx, 0, sourceCol);

                        // Trigger visual re-render of columns
                        this.triggerRerender();
                        this.renderColsPopover();
                    }
                    return false;
                });

                item.addEventListener('dragend', () => {
                    item.style.opacity = '1';
                });
            });

            // Columns checkboxes
            pop.querySelectorAll('input[type="checkbox"]').forEach(chk => {
                chk.addEventListener('change', () => {
                    const colName = chk.dataset.col;
                    if (chk.checked) {
                        if (!this.settings.visibleCols.includes(colName)) this.settings.visibleCols.push(colName);
                    } else {
                        this.settings.visibleCols = this.settings.visibleCols.filter(c => c !== colName);
                    }
                    this.saveSettings();
                    this.applyColumnVisibility();
                });
            });

            // Create custom column action
            pop.querySelector('.btn-add-custom-col').addEventListener('click', () => {
                const nameInput = pop.querySelector('.new-col-name');
                const typeInput = pop.querySelector('.new-col-type');
                const name = nameInput.value.trim();
                const type = typeInput.value;

                if (!name) return;
                if (this.config.columns.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                    alert("Tên cột này đã tồn tại!");
                    return;
                }

                // Add to settings customCols
                this.settings.customCols.push({ name, type });
                // Make visible by default
                this.settings.visibleCols.push(name);
                this.saveSettings();
                
                // Re-sync configs
                this.syncConfigColumns();
                
                // Refresh list and table
                this.triggerRerender();
                this.renderColsPopover();
            });

            // Edit custom column action
            pop.querySelectorAll('.btn-edit-custom-col').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const oldName = btn.dataset.name;
                    const col = this.settings.customCols.find(c => c.name === oldName);
                    if (!col) return;

                    const newName = prompt(`Nhập tên mới cho cột "${oldName}":`, oldName);
                    if (newName === null) return;
                    const trimmedNewName = newName.trim();
                    if (!trimmedNewName) return;

                    if (trimmedNewName !== oldName && this.config.columns.some(c => c.name.toLowerCase() === trimmedNewName.toLowerCase())) {
                        alert("Tên cột này đã tồn tại!");
                        return;
                    }

                    const newType = prompt(`Nhập kiểu dữ liệu mới cho cột (text, number, date):`, col.type || 'text');
                    if (newType === null) return;
                    const cleanType = newType.toLowerCase().trim();
                    if (!['text', 'number', 'date'].includes(cleanType)) {
                        alert("Kiểu dữ liệu không hợp lệ! Chỉ chấp nhận: text, number, date.");
                        return;
                    }

                    // Rename key values if name changed
                    if (trimmedNewName !== oldName) {
                        for (const key in this.settings.customColValues) {
                            if (key.endsWith(`_${oldName}`)) {
                                const newKey = key.substring(0, key.length - oldName.length) + trimmedNewName;
                                this.settings.customColValues[newKey] = this.settings.customColValues[key];
                                delete this.settings.customColValues[key];
                            }
                        }
                        this.settings.visibleCols = this.settings.visibleCols.map(c => c === oldName ? trimmedNewName : c);
                    }

                    col.name = trimmedNewName;
                    col.type = cleanType;

                    this.saveSettings();
                    this.syncConfigColumns();
                    this.triggerRerender();
                    this.renderColsPopover();
                });
            });

            // Delete custom column action
            pop.querySelectorAll('.btn-delete-custom-col').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const name = btn.dataset.name;
                    if (!confirm(`Bạn có chắc chắn muốn xóa cột "${name}"? Tất cả dữ liệu của cột này sẽ bị xóa.`)) return;

                    this.settings.customCols = this.settings.customCols.filter(c => c.name !== name);
                    this.settings.visibleCols = this.settings.visibleCols.filter(c => c !== name);
                    
                    // Clear values belonging to this column
                    for (const key in this.settings.customColValues) {
                        if (key.endsWith(`_${name}`)) {
                            delete this.settings.customColValues[key];
                        }
                    }

                    this.saveSettings();
                    this.syncConfigColumns();
                    this.triggerRerender();
                    this.renderColsPopover();
                });
            });
        }

        getColDomIndex(col, table) {
            const headers = Array.from(table.querySelectorAll('thead tr th'));
            if (col.isCustom) {
                return headers.findIndex(th => th.getAttribute('data-custom-col-name') === col.name);
            }
            // First try exact match
            let idx = headers.findIndex(th => th.textContent.trim() === col.name);
            if (idx !== -1) return idx;

            // Try fuzzy match
            const colNameLower = col.name.toLowerCase();
            idx = headers.findIndex(th => {
                const text = th.textContent.trim().toLowerCase();
                return text.includes(colNameLower) || colNameLower.includes(text);
            });
            return idx;
        }

        applyColumnVisibility() {
            const table = document.getElementById(this.tableId);
            if (!table) return;
            
            this.config.columns.forEach((col) => {
                const show = this.settings.visibleCols.includes(col.name);
                const domIdx = this.getColDomIndex(col, table);
                if (domIdx === -1) return;

                // Toggle header cell
                const headerCell = table.querySelector(`thead tr th:nth-child(${domIdx + 1})`);
                if (headerCell) headerCell.style.display = show ? "" : "none";

                // Toggle body cells
                const bodyCells = table.querySelectorAll(`tbody tr:not(.grouped-header-row) td:nth-child(${domIdx + 1})`);
                bodyCells.forEach(cell => cell.style.display = show ? "" : "none");
            });
        }

        // ==========================================
        // 2. Saved Views Popover
        // ==========================================
        renderViewsPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.views-popover');
            pop.innerHTML = `
                <h4>Cài đặt chế độ xem</h4>
                <div class="db-col-toggle-list" style="max-height: 150px;">
                    ${this.savedViews.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-muted);">Chưa có chế độ xem tùy chỉnh nào.</p>' : ''}
                    ${this.savedViews.map((v, i) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:0.82rem; padding:4px 0;">
                            <span class="view-item-btn" style="cursor:pointer; color:var(--accent); font-weight:600;" data-idx="${i}">${v.name}</span>
                            <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--danger); cursor:pointer;" class="btn-delete-view" data-idx="${i}"></i>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:12px; display:flex; gap:8px;">
                    <input type="text" placeholder="Tên chế độ xem..." class="view-name-input" style="flex-grow:1; padding:6px; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-body); color:var(--text-primary);">
                    <button class="btn btn-primary btn-save-new-view" style="padding:6px 12px; font-size:0.8rem;">Lưu</button>
                </div>
            `;
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons({ attrs: { class: 'lucide-icon' } });
            }

            pop.querySelector('.btn-save-new-view').addEventListener('click', () => {
                const input = pop.querySelector('.view-name-input');
                const name = input.value.trim();
                if (!name) return;

                const view = {
                    name: name,
                    settings: JSON.parse(JSON.stringify(this.settings))
                };
                this.savedViews.push(view);
                localStorage.setItem(`ihp_views_${this.tableId}`, JSON.stringify(this.savedViews));
                
                input.value = '';
                this.renderViewsPopover();
            });

            pop.querySelectorAll('.view-item-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.dataset.idx;
                    const view = this.savedViews[idx];
                    if (view) {
                        this.settings = JSON.parse(JSON.stringify(view.settings));
                        this.saveSettings();
                        this.syncConfigColumns();
                        this.triggerRerender();
                        
                        // Close popover
                        pop.classList.remove('show');
                        container.querySelector('.toolbar-views-btn')?.classList.remove('active');
                    }
                });
            });

            pop.querySelectorAll('.btn-delete-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = btn.dataset.idx;
                    this.savedViews.splice(idx, 1);
                    localStorage.setItem(`ihp_views_${this.tableId}`, JSON.stringify(this.savedViews));
                    this.renderViewsPopover();
                });
            });
        }

        // ==========================================
        // 3. Dynamic Filter Popover
        // ==========================================
        renderFilterPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.filter-popover');
            pop.innerHTML = `
                <h4>Lọc bản ghi <i data-lucide="help-circle" style="width:12px; height:12px; cursor:pointer;" title="Lọc dữ liệu thông minh hoặc bằng AI."></i></h4>
                
                <div class="ai-query-box">
                    <input type="text" placeholder="Cho AI biết bạn muốn xem gì..." class="ai-filter-input">
                    <button class="ai-query-btn"><i data-lucide="send" style="width:14px; height:14px;"></i></button>
                </div>

                <div class="filter-match-line">
                    <span>Khớp với</span>
                    <select class="filter-match-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:2px 4px;">
                        <option value="and" ${this.settings.filterMatch === 'and' ? 'selected' : ''}>tất cả</option>
                        <option value="or" ${this.settings.filterMatch === 'or' ? 'selected' : ''}>bất kỳ</option>
                    </select>
                    <span>điều kiện</span>
                </div>

                <div class="filter-conditions-container">
                    ${this.settings.filters.map((f, i) => this.generateFilterRowHtml(f, i)).join('')}
                </div>

                <button class="btn-add-condition"><i data-lucide="plus"></i> Thêm điều kiện</button>

                <div class="db-popover-footer">
                    <button class="btn-save-view btn-clear-filters" style="color:var(--danger)">Xóa bộ lọc</button>
                    <button class="btn btn-primary btn-apply-filters" style="padding:6px 12px; font-size:0.8rem;">Áp dụng</button>
                </div>
            `;
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons({ attrs: { class: 'lucide-icon' } });
            }

            // Events
            pop.querySelector('.btn-add-condition').addEventListener('click', () => {
                this.settings.filters.push({ col: this.config.columns[0].name, op: 'chứa', val: '' });
                this.renderFilterPopover();
            });

            pop.querySelector('.btn-clear-filters').addEventListener('click', () => {
                this.settings.filters = [];
                this.saveSettings();
                this.updateBadgeTexts();
                this.triggerRerender();
                pop.classList.remove('show');
                container.querySelector('.toolbar-filter-btn').classList.remove('active');
            });

            pop.querySelector('.btn-apply-filters').addEventListener('click', () => {
                // Collect condition states
                const rows = pop.querySelectorAll('.filter-condition-row');
                this.settings.filters = Array.from(rows).map(row => {
                    return {
                        col: row.querySelector('.filter-col-select').value,
                        op: row.querySelector('.filter-op-select').value,
                        val: row.querySelector('.filter-val-input').value
                    };
                });
                this.settings.filterMatch = pop.querySelector('.filter-match-select').value;
                this.saveSettings();
                this.updateBadgeTexts();
                this.triggerRerender();
                pop.classList.remove('show');
            });

            // AI filter event
            const aiInput = pop.querySelector('.ai-filter-input');
            const aiBtn = pop.querySelector('.ai-query-btn');
            
            const handleAiSubmit = () => {
                const q = aiInput.value.trim();
                if (!q) return;
                this.parseNaturalLanguageFilter(q);
                this.renderFilterPopover();
            };

            aiBtn.addEventListener('click', handleAiSubmit);
            aiInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleAiSubmit(); });

            // Bind individual row remove / input updates
            pop.querySelectorAll('.filter-condition-row').forEach((row, i) => {
                row.querySelector('.btn-remove-condition').addEventListener('click', () => {
                    this.settings.filters.splice(i, 1);
                    this.renderFilterPopover();
                });
            });
        }

        generateFilterRowHtml(filter, idx) {
            return `
                <div class="filter-condition-row" data-idx="${idx}">
                    <select class="filter-col-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; max-width:110px;">
                        ${this.config.columns.map(c => `<option value="${c.name}" ${filter.col === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                    <select class="filter-op-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px;">
                        <option value="chứa" ${filter.op === 'chứa' ? 'selected' : ''}>chứa</option>
                        <option value="không chứa" ${filter.op === 'không chứa' ? 'selected' : ''}>ko chứa</option>
                        <option value="bằng" ${filter.op === 'bằng' ? 'selected' : ''}>bằng</option>
                        <option value="khác" ${filter.op === 'khác' ? 'selected' : ''}>khác</option>
                        <option value="lớn hơn" ${filter.op === 'lớn hơn' ? 'selected' : ''}>&gt;</option>
                        <option value="nhỏ hơn" ${filter.op === 'nhỏ hơn' ? 'selected' : ''}>&lt;</option>
                        <option value="trống" ${filter.op === 'trống' ? 'selected' : ''}>rỗng</option>
                        <option value="không trống" ${filter.op === 'không trống' ? 'selected' : ''}>ko rỗng</option>
                    </select>
                    <input type="text" class="filter-val-input" value="${filter.val || ''}" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; flex-grow:1; min-width:60px;">
                    <i data-lucide="x" class="btn-remove-condition" style="width:14px; height:14px; cursor:pointer; color:var(--danger);"></i>
                </div>
            `;
        }

        parseNaturalLanguageFilter(query) {
            const cleanQ = query.toLowerCase();
            const parts = cleanQ.split(/\band\b|\bvà\b/i);

            parts.forEach(part => {
                let matchedCol = null;
                let matchedOp = 'chứa';
                let matchedVal = '';

                // Try finding matched column
                this.config.columns.forEach(col => {
                    if (part.includes(col.name.toLowerCase())) {
                        matchedCol = col.name;
                    }
                });

                if (!matchedCol) return;

                // Try finding operators
                if (part.includes('lớn hơn') || part.includes('nhiều hơn') || part.includes('>') || part.includes('trên')) {
                    matchedOp = 'lớn hơn';
                } else if (part.includes('nhỏ hơn') || part.includes('ít hơn') || part.includes('<') || part.includes('dưới')) {
                    matchedOp = 'nhỏ hơn';
                } else if (part.includes('không bằng') || part.includes('khác') || part.includes('!=')) {
                    matchedOp = 'khác';
                } else if (part.includes('bằng') || part.includes('là') || part.includes('==') || part.includes('=')) {
                    matchedOp = 'bằng';
                } else if (part.includes('rỗng') || part.includes('trống') || part.includes('chưa có')) {
                    matchedOp = 'trống';
                } else if (part.includes('không rỗng') || part.includes('có rồi') || part.includes('đầy đủ')) {
                    matchedOp = 'không trống';
                }

                // Try extracting value
                matchedVal = part.replace(/chứa|có|giá|trị|đơn|vị|:|=/g, '').trim();
                if (matchedOp === 'lớn hơn' || matchedOp === 'nhỏ hơn') {
                    matchedVal = matchedVal.replace(/[\.\,\đ\s]/g, '');
                }

                this.settings.filters.push({ col: matchedCol, op: matchedOp, val: matchedVal });
            });
        }

        // ==========================================
        // 4. Grouping Popover
        // ==========================================
        renderGroupPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.group-popover');
            pop.innerHTML = `
                <h4>Nhóm theo trường</h4>
                <select class="group-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); width:100%; padding:6px; border-radius:6px;">
                    <option value="">(Không nhóm)</option>
                    ${this.config.columns.map(c => `
                        <option value="${c.name}" ${this.settings.groupBy === c.name ? 'selected' : ''}>${c.name}</option>
                    `).join('')}
                </select>
            `;

            pop.querySelector('.group-select').addEventListener('change', (e) => {
                this.settings.groupBy = e.target.value;
                this.saveSettings();
                this.triggerRerender();
            });
        }

        // ==========================================
        // 5. Sorting Popover
        // ==========================================
        renderSortPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.sort-popover');
            pop.innerHTML = `
                <h4>Sắp xếp theo trường</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <select class="sort-col-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); padding:6px; border-radius:6px;">
                        <option value="">(Không sắp xếp)</option>
                        ${this.config.columns.map(c => `
                            <option value="${c.name}" ${this.settings.sortBy === c.name ? 'selected' : ''}>${c.name}</option>
                        `).join('')}
                    </select>
                    <select class="sort-dir-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); padding:6px; border-radius:6px;">
                        <option value="asc" ${this.settings.sortDir === 'asc' ? 'selected' : ''}>Tăng dần (A-Z, 0-9)</option>
                        <option value="desc" ${this.settings.sortDir === 'desc' ? 'selected' : ''}>Giảm dần (Z-A, 9-0)</option>
                    </select>
                </div>
            `;

            const updateSort = () => {
                this.settings.sortBy = pop.querySelector('.sort-col-select').value;
                this.settings.sortDir = pop.querySelector('.sort-dir-select').value;
                this.saveSettings();
                this.triggerRerender();
            };

            pop.querySelector('.sort-col-select').addEventListener('change', updateSort);
            pop.querySelector('.sort-dir-select').addEventListener('change', updateSort);
        }

        // ==========================================
        // 6. Row Height Popover
        // ==========================================
        renderHeightPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.height-popover');
            pop.innerHTML = `
                <h4>Độ cao hàng</h4>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <label class="db-col-toggle-item"><input type="radio" name="height-r" value="nho" ${this.settings.rowHeight === 'nho' ? 'checked' : ''}> Nhỏ (padding 4px)</label>
                    <label class="db-col-toggle-item"><input type="radio" name="height-r" value="vua" ${this.settings.rowHeight === 'vua' ? 'checked' : ''}> Vừa (padding 10px)</label>
                    <label class="db-col-toggle-item"><input type="radio" name="height-r" value="rong" ${this.settings.rowHeight === 'rong' ? 'checked' : ''}> Rộng (padding 16px)</label>
                </div>
            `;

            pop.querySelectorAll('input').forEach(r => {
                r.addEventListener('change', () => {
                    this.settings.rowHeight = r.value;
                    this.saveSettings();
                    this.applyRowHeight();
                });
            });
        }

        applyRowHeight() {
            const table = document.getElementById(this.tableId);
            if (!table) return;
            table.classList.remove('height-nhopadding', 'height-vuapadding', 'height-rongpadding');
            if (this.settings.rowHeight === 'nho') table.classList.add('height-nhopadding');
            if (this.settings.rowHeight === 'vua') table.classList.add('height-vuapadding');
            if (this.settings.rowHeight === 'rong') table.classList.add('height-rongpadding');
        }

        // ==========================================
        // 7. Conditional Color Popover
        // ==========================================
        renderColorPopover() {
            const container = document.getElementById(this.containerId);
            const pop = container.querySelector('.color-popover');
            const cc = this.settings.conditionalColor;
            pop.innerHTML = `
                <h4>Tô màu có điều kiện</h4>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:0.82rem;">
                    <label style="display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" class="cc-enable" ${cc.enabled ? 'checked' : ''}>
                        <span>Kích hoạt</span>
                    </label>
                    <div style="display:flex; flex-direction:column; gap:6px;" class="cc-inputs-wrapper" ${!cc.enabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                        <span>Nếu cột:</span>
                        <select class="cc-col-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); padding:4px;">
                            ${this.config.columns.map(c => `<option value="${c.name}" ${cc.col === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                        <span>toán tử:</span>
                        <select class="cc-op-select" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); padding:4px;">
                            <option value="chứa" ${cc.op === 'chứa' ? 'selected' : ''}>chứa</option>
                            <option value="bằng" ${cc.op === 'bằng' ? 'selected' : ''}>bằng</option>
                            <option value="khác" ${cc.op === 'khác' ? 'selected' : ''}>khác</option>
                            <option value="lớn hơn" ${cc.op === 'lớn hơn' ? 'selected' : ''}>lớn hơn</option>
                            <option value="nhỏ hơn" ${cc.op === 'nhỏ hơn' ? 'selected' : ''}>nhỏ hơn</option>
                        </select>
                        <span>giá trị:</span>
                        <input type="text" class="cc-val-input" value="${cc.val || ''}" style="background:var(--bg-body); color:var(--text-primary); border:1px solid var(--border-color); padding:4px;">
                        <span>Màu tô chữ:</span>
                        <input type="color" class="cc-color-input" value="${cc.color || '#ff4d4f'}" style="width:100%; height:30px; border:none; padding:0; cursor:pointer;">
                    </div>
                    <button class="btn btn-primary btn-apply-cc" style="padding:6px; font-size:0.8rem; margin-top:8px;">Áp dụng</button>
                </div>
            `;

            pop.querySelector('.cc-enable').addEventListener('change', (e) => {
                const en = e.target.checked;
                pop.querySelector('.cc-inputs-wrapper').style.opacity = en ? '1' : '0.5';
                pop.querySelector('.cc-inputs-wrapper').style.pointerEvents = en ? 'auto' : 'none';
            });

            pop.querySelector('.btn-apply-cc').addEventListener('click', () => {
                this.settings.conditionalColor = {
                    enabled: pop.querySelector('.cc-enable').checked,
                    col: pop.querySelector('.cc-col-select').value,
                    op: pop.querySelector('.cc-op-select').value,
                    val: pop.querySelector('.cc-val-input').value,
                    color: pop.querySelector('.cc-color-input').value
                };
                this.saveSettings();
                this.triggerRerender();
                pop.classList.remove('show');
                const btn = container.querySelector('.toolbar-color-btn');
                if (btn) btn.classList.remove('active');
            });
        }

        // ==========================================
        // DATA PROCESSING & INTERCEPTION
        // ==========================================
        getProcessedData(originalData) {
            let processed = [...originalData];

            // 1. Inject custom column values into objects dynamically so filters and sorting work on them!
            processed = processed.map(item => {
                const rowId = this.getRowId(item);
                const itemWithCustom = { ...item };
                this.settings.customCols.forEach(col => {
                    const val = this.settings.customColValues[`${rowId}_${col.name}`] || '';
                    itemWithCustom[col.name] = val;
                });
                return itemWithCustom;
            });

            // 2. Apply Filtering
            if (this.settings.filters.length > 0) {
                processed = processed.filter(item => {
                    const matchResults = this.settings.filters.map(filter => {
                        const colDef = this.config.columns.find(c => c.name === filter.col);
                        if (!colDef) return true;
                        
                        const itemVal = colDef.getValue(item);
                        const filterVal = filter.val;

                        return this.evaluateCondition(itemVal, filter.op, filterVal);
                    });

                    if (this.settings.filterMatch === 'and') {
                        return matchResults.every(r => r === true);
                    } else {
                        return matchResults.some(r => r === true);
                    }
                });
            }

            // 3. Apply Sorting
            if (this.settings.sortBy) {
                const colDef = this.config.columns.find(c => c.name === this.settings.sortBy);
                if (colDef) {
                    processed.sort((a, b) => {
                        let valA = colDef.getValue(a);
                        let valB = colDef.getValue(b);

                        // Cast numbers for sorting if type is number
                        if (colDef.type === 'number') {
                            const numA = Number(String(valA).replace(/[^0-9.-]/g, ''));
                            const numB = Number(String(valB).replace(/[^0-9.-]/g, ''));
                            return this.settings.sortDir === 'asc' ? numA - numB : numB - numA;
                        }

                        if (typeof valA === 'string') valA = valA.toLowerCase();
                        if (typeof valB === 'string') valB = valB.toLowerCase();

                        if (valA < valB) return this.settings.sortDir === 'asc' ? -1 : 1;
                        if (valA > valB) return this.settings.sortDir === 'asc' ? 1 : -1;
                        return 0;
                    });
                }
            }

            return processed;
        }

        evaluateCondition(itemVal, op, filterVal) {
            const sVal = itemVal === null || itemVal === undefined ? '' : String(itemVal).toLowerCase().trim();
            const fVal = String(filterVal).toLowerCase().trim();

            switch (op) {
                case 'chứa':
                    return sVal.includes(fVal);
                case 'không chứa':
                    return !sVal.includes(fVal);
                case 'bằng':
                    return sVal === fVal;
                case 'khác':
                    return sVal !== fVal;
                case 'lớn hơn':
                    return Number(String(itemVal).replace(/[^0-9.-]/g, '')) > Number(filterVal);
                case 'nhỏ hơn':
                    return Number(String(itemVal).replace(/[^0-9.-]/g, '')) < Number(filterVal);
                case 'trống':
                    return sVal === '';
                case 'không trống':
                    return sVal !== '';
                default:
                    return true;
            }
        }

        postRender() {
            // Render custom columns DOM structures first
            this.renderCustomHeadersAndCells();
            
            // Apply other settings
            this.applyColumnVisibility();
            this.applyRowHeight();
            this.applyConditionalColor();
            this.applyGrouping();
        }

        renderCustomHeadersAndCells() {
            const table = document.getElementById(this.tableId);
            if (!table) return;

            // Remove existing custom columns in DOM to prevent duplication
            table.querySelectorAll('[data-custom-col]').forEach(el => el.remove());

            // 1. Render Headers
            const theadRow = table.querySelector('thead tr');
            if (theadRow) {
                const headers = Array.from(theadRow.querySelectorAll('th'));
                const targetHeader = headers.find(th => th.textContent.includes('Thao tác') || th.textContent.includes('Thao tác'));
                
                this.settings.customCols.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = col.name;
                    th.setAttribute('data-custom-col', 'true');
                    th.setAttribute('data-custom-col-name', col.name);
                    
                    if (targetHeader) {
                        theadRow.insertBefore(th, targetHeader);
                    } else {
                        theadRow.appendChild(th);
                    }
                });
            }

            // 2. Render Cells in tbody rows
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr:not(.grouped-header-row)'));
            const dataArr = state[this.config.dataKey] || [];

            rows.forEach(row => {
                const firstCellText = row.querySelector('td:first-child')?.textContent?.trim();
                if (!firstCellText) return;

                // Find data object
                const matchedItem = dataArr.find(item => {
                    if (this.tableId === 'ordersTable' || this.tableId === 'quotesTable' || this.tableId === 'prodOrdersTable') return item.order_number === firstCellText;
                    if (this.tableId === 'crmTable') return item.code === firstCellText;
                    if (this.tableId === 'inventoryTable') return item.sku === firstCellText;
                    if (this.tableId === 'subcontractingTable') return item.contract_number === firstCellText;
                    if (this.tableId === 'financeTransactionsTable') return item.tx_number === firstCellText;
                    if (this.tableId === 'contractsTable') return item.contract_number === firstCellText;
                    if (this.tableId === 'employeesTable' || this.tableId === 'collaboratorsTable') return item.code === firstCellText;
                    if (this.tableId === 'laborContractsTable') return item.contract_number === firstCellText;
                    return false;
                });

                if (matchedItem) {
                    const rowId = this.getRowId(matchedItem);
                    const actionCell = row.querySelector('td:last-child');

                    this.settings.customCols.forEach(col => {
                        const td = document.createElement('td');
                        td.setAttribute('data-custom-col', 'true');
                        td.setAttribute('data-custom-col-name', col.name);
                        
                        const valKey = `${rowId}_${col.name}`;
                        const currentVal = this.settings.customColValues[valKey] || '';

                        // Render editable field input based on data type
                        const inputType = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text';
                        const input = document.createElement('input');
                        input.type = inputType;
                        input.value = currentVal;
                        input.style.width = '100%';
                        input.style.border = 'none';
                        input.style.background = 'transparent';
                        input.style.color = 'var(--text-primary)';
                        input.style.outline = 'none';
                        input.style.padding = '4px';
                        input.className = 'custom-col-input';

                        // Save on blur/change
                        const saveValue = () => {
                            const val = input.value;
                            this.settings.customColValues[valKey] = val;
                            this.saveSettings();
                        };
                        input.addEventListener('blur', saveValue);
                        input.addEventListener('change', saveValue);

                        td.appendChild(input);

                        if (actionCell && this.tableId !== 'financeTransactionsTable') {
                            row.insertBefore(td, actionCell);
                        } else {
                            row.appendChild(td);
                        }
                    });
                }
            });
        }

        applyConditionalColor() {
            const cc = this.settings.conditionalColor;
            if (!cc || !cc.enabled) return;

            const table = document.getElementById(this.tableId);
            if (!table) return;

            const colDef = this.config.columns.find(c => c.name === cc.col);
            if (!colDef) return;

            const dataArr = state[this.config.dataKey] || [];
            
            const rows = table.querySelectorAll('tbody tr:not(.grouped-header-row)');
            rows.forEach((row) => {
                const firstCellText = row.querySelector('td:first-child')?.textContent?.trim();
                if (!firstCellText) return;

                const matchedItem = dataArr.find(item => {
                    if (this.tableId === 'ordersTable' || this.tableId === 'quotesTable' || this.tableId === 'prodOrdersTable') return item.order_number === firstCellText;
                    if (this.tableId === 'crmTable') return item.code === firstCellText;
                    if (this.tableId === 'inventoryTable') return item.sku === firstCellText;
                    if (this.tableId === 'subcontractingTable') return item.contract_number === firstCellText;
                    if (this.tableId === 'financeTransactionsTable') return item.tx_number === firstCellText;
                    if (this.tableId === 'contractsTable') return item.contract_number === firstCellText;
                    if (this.tableId === 'employeesTable' || this.tableId === 'collaboratorsTable') return item.code === firstCellText;
                    if (this.tableId === 'laborContractsTable') return item.contract_number === firstCellText;
                    return false;
                });

                if (matchedItem) {
                    const itemVal = colDef.getValue(matchedItem);
                    const match = this.evaluateCondition(itemVal, cc.op, cc.val);
                    if (match) {
                        row.style.color = cc.color;
                        row.style.fontWeight = '600';
                        row.style.backgroundColor = 'rgba(var(--accent-rgb, 16, 143, 83), 0.03)';
                    } else {
                        row.style.color = '';
                        row.style.fontWeight = '';
                        row.style.backgroundColor = '';
                    }
                }
            });
        }

        applyGrouping() {
            const grp = this.settings.groupBy;
            if (!grp) return;

            const table = document.getElementById(this.tableId);
            if (!table) return;

            // Find column definition in configs
            const colIdx = this.config.columns.findIndex(c => c.name === grp);
            if (colIdx === -1) return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            // Select only actual content rows (not our grouped-headers)
            const rows = Array.from(tbody.querySelectorAll('tr:not(.grouped-header-row)'));
            if (rows.length === 0) return;

            const groups = {};
            rows.forEach(row => {
                let key = 'Khác';
                if (this.config.columns[colIdx].isCustom) {
                    // Custom column value from cell input
                    const input = row.querySelector(`[data-custom-col-name="${grp}"] input`);
                    if (input) key = input.value.trim() || '(Rỗng)';
                } else {
                    // Standard column
                    const domIdx = this.getColDomIndex(this.config.columns[colIdx], table);
                    const cell = domIdx !== -1 ? row.querySelector(`td:nth-child(${domIdx + 1})`) : null;
                    if (cell) {
                        const rawText = cell.textContent.replace(/\s+/g, ' ').trim();
                        key = rawText.split('\n')[0].trim();
                        if (key.includes('(')) {
                            key = key.split('(')[0].trim();
                        }
                    }
                }
                
                if (!groups[key]) groups[key] = [];
                groups[key].push(row);
            });

            tbody.innerHTML = '';

            Object.keys(groups).forEach(grpKey => {
                const grpRows = groups[grpKey];
                const headerRow = document.createElement('tr');
                headerRow.className = 'grouped-header-row';
                
                const standardHeadersCount = table.querySelectorAll('thead tr th').length;
                headerRow.innerHTML = `
                    <td colspan="${standardHeadersCount}" style="padding: 10px 16px; font-weight:700;">
                        <span style="display:flex; align-items:center; gap:8px;">
                            <i data-lucide="chevron-down" style="width:14px; height:14px; transition:transform 0.2s;"></i>
                            <span>${grp} : <strong>${grpKey}</strong> (${grpRows.length} dòng)</span>
                        </span>
                    </td>
                `;
                tbody.appendChild(headerRow);
                if (window.lucide && typeof lucide.createIcons === 'function') {
                    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
                }

                grpRows.forEach(r => tbody.appendChild(r));

                headerRow.addEventListener('click', () => {
                    const icon = headerRow.querySelector('i, svg');
                    const isCollapsed = icon ? (icon.style.transform === 'rotate(-90deg)') : false;
                    if (icon) {
                        icon.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
                    }
                    grpRows.forEach(r => {
                        r.style.display = isCollapsed ? '' : 'none';
                    });
                });
            });
        }

        triggerRerender() {
            const renderFnName = this.config.originalRender;
            if (typeof window[renderFnName] === 'function') {
                window[renderFnName]();
            }
        }
    }

    // Export global controller mapping
    window.IhpTableControllers = {};

    function initTableToolbar(tableId) {
        if (!window.IhpTableControllers[tableId]) {
            window.IhpTableControllers[tableId] = new TableToolbarController(tableId);
        } else {
            window.IhpTableControllers[tableId].initToolbar();
        }
    }

    const renderersToWrap = [
        { name: 'renderQuotes', tableId: 'quotesTable', dataKey: 'orders' },
        { name: 'renderProdOrders', tableId: 'prodOrdersTable', dataKey: 'orders' },
        { name: 'renderCRM', tableId: 'crmTable', dataKey: 'partners' },
        { name: 'renderInventory', tableId: 'inventoryTable', dataKey: 'materials' },
        { name: 'renderSubcontracting', tableId: 'subcontractingTable', dataKey: 'subcontracts' },
        { name: 'renderFinance', tableId: 'financeTransactionsTable', dataKey: 'transactions' },
        { name: 'renderOnlineSales', tableId: 'onlineOrdersTable', dataKey: 'online_orders' },
        { name: 'renderOnlineProducts', tableId: 'onlineProductsTable', dataKey: 'online_products' },
        { name: 'renderOnlineStockLogs', tableId: 'onlineStockLogsTable', dataKey: 'online_stock_logs' },
        { name: 'renderOnlineInventoryChecks', tableId: 'onlineInventoryChecksTable', dataKey: 'online_inventory_checks' },
        { name: 'renderOnlineInternalExits', tableId: 'onlineInternalExitsTable', dataKey: 'online_internal_exits' },
        { name: 'renderOnlineInvoices', tableId: 'onlineInvoicesTable', dataKey: 'online_orders' },
        { name: 'renderOnlineReturns', tableId: 'onlineReturnsTable', dataKey: 'online_returns' },
        { name: 'renderContracts', tableId: 'contractsTable', dataKey: 'contracts' },
        { name: 'renderEmployees', tableId: 'employeesTable', dataKey: 'salespersons' },
        { name: 'renderCollaborators', tableId: 'collaboratorsTable', dataKey: 'salespersons' },
        { name: 'renderLaborContracts', tableId: 'laborContractsTable', dataKey: 'labor_contracts' }
    ];

    document.addEventListener("DOMContentLoaded", () => {
        /*
        renderersToWrap.forEach(item => {
            if (typeof window[item.name] === 'function') {
                const origFn = window[item.name];
                
                const wrappedFn = function() {
                    initTableToolbar(item.tableId);
                    const controller = window.IhpTableControllers[item.tableId];

                    // Backup original data list
                    const originalDataList = state[item.dataKey];
                    
                    // Swap in filtered & sorted list
                    state[item.dataKey] = controller.getProcessedData(originalDataList);

                    // Run original renderer
                    origFn();

                    // Restore original data list
                    state[item.dataKey] = originalDataList;

                    // Run post processing (column hide, row height, colors, grouping)
                    controller.postRender();
                };

                // Bind to global references
                window[item.name] = wrappedFn;
                
                // Overwrite hoisted local identifier if writable
                try {
                    eval(`${item.name} = wrappedFn;`);
                } catch (e) {
                    console.warn("IHP: Failed to overwrite local scope identifier for " + item.name + ", using global window scope.");
                }
            }
        });

        console.log("IHP: Wrapped all table render functions successfully.");
        */
        console.log("IHP: TableToolbarController wrapping disabled.");
    });
})();








// ==========================================================================
// ONLINE SALES SUBMODULE BUSINESS LOGIC & COMMISSION SYSTEM
// ==========================================================================

window.switchOnlineSalesSubTab = function(subtab) {
    document.querySelectorAll(".online-subtab-pane").forEach(pane => {
        pane.style.display = "none";
    });
    const targetPane = document.getElementById(`subtab-${subtab}`);
    if (targetPane) {
        targetPane.style.display = "block";
    }
    
    // Dynamically update the header title
    const titleEl = document.getElementById("onlineSalesTabTitle");
    if (titleEl) {
        let label = "🛍️ Bán hàng online";
        if (subtab === "online-dashboard") label = "📊 Báo cáo bán hàng online";
        else if (subtab === "online-orders") label = "🛍️ Đơn hàng online";
        else if (subtab === "online-returns") label = "🔄 Trả hàng";
        else if (subtab === "online-invoices") label = "📄 Xuất hoá đơn";
        else if (subtab === "online-products") label = "📦 Danh sách Hàng hóa";
        else if (subtab === "online-prices" || subtab === "online-pricing") label = "🏷️ Thiết lập Giá";
        titleEl.innerHTML = label;
    }
    
    if (subtab === "online-dashboard") {
        if (window.renderOnlineDashboard) window.renderOnlineDashboard();
    } else if (subtab === "online-orders") {
        renderOnlineSales();
    } else if (subtab === "online-prices") {
        renderOnlinePrices();
    } else if (subtab === "online-products") {
        renderOnlineProducts();
    } else if (subtab === "online-stock") {
        window.renderOnlineStock();
        window.renderOnlineStockLogs();
    }
    
    document.querySelectorAll(".sub-tab-btn").forEach(btn => {
        if (btn.getAttribute("onclick")?.includes(subtab)) {
            btn.classList.add("active");
            btn.style.color = "var(--text-primary)";
            btn.style.borderBottom = "2px solid var(--accent)";
        } else {
            btn.classList.remove("active");
            btn.style.color = "var(--text-secondary)";
            btn.style.borderBottom = "none";
        }
    });
};

window.initOnlineSales = function() {
    console.log("IHP: Initializing Online Sales Submodule & Commission System...");
    
    // Fill customer options in modal
    const onlineOrderCustomer = document.getElementById("onlineOrderCustomer");
    if (onlineOrderCustomer) {
        onlineOrderCustomer.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
        const partnersList = Array.isArray(state.partners) ? state.partners : [];
        partnersList.filter(p => p && p.role === "CUSTOMER").forEach(p => {
            onlineOrderCustomer.innerHTML += `<option value="${p.id}">${p.name} - ${p.code}</option>`;
        });
    }
    
    // Search input listeners
    document.getElementById("onlineOrderSearchInput")?.addEventListener("input", renderOnlineSales);
    document.getElementById("onlineOrderStatusFilter")?.addEventListener("change", renderOnlineSales);
    document.getElementById("onlineProductSearchInput")?.addEventListener("input", renderOnlineProducts);
    document.getElementById("onlineStockSearchInput")?.addEventListener("input", renderOnlineStockLogs);
    
    // Action modal triggers
    document.getElementById("btnNewOnlineOrder")?.addEventListener("click", window.openNewOnlineOrderModal);
    document.getElementById("btnNewOnlineProduct")?.addEventListener("click", () => window.openNewOnlineProductModal("ADD"));
    document.getElementById("btnRestockOnlineProduct")?.addEventListener("click", window.openOnlineImportStockModal);
    
    // Image upload preview listener
    document.getElementById("onlineProductImageInput")?.addEventListener("change", function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById("onlineProductImagePreview");
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                preview.src = evt.target.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    // Form cancellations
    document.getElementById("btnCancelOnlineOrder")?.addEventListener("click", () => {
        document.getElementById("onlineOrderModal")?.classList.remove("active");
    });
    document.getElementById("btnDraftOnlineOrder")?.addEventListener("click", () => {
        window.isDraftSubmit = true;
        document.getElementById("onlineOrderForm")?.requestSubmit();
    });
    document.getElementById("btnCloseOnlineOrderModal")?.addEventListener("click", () => {
        document.getElementById("onlineOrderModal")?.classList.remove("active");
    });

    // Mobile Zoom toggle for printArea
    const printArea = document.getElementById("printArea");
    if (printArea) {
        const handleZoom = (e) => {
            if (window.innerWidth > 768) return;
            e.preventDefault();
            e.stopPropagation();
            if (printArea.classList.contains("scaled-preview")) {
                printArea.classList.remove("scaled-preview");
                printArea.classList.add("full-view");
                printArea.style.cursor = "zoom-out";
            } else {
                printArea.classList.remove("full-view");
                printArea.classList.add("scaled-preview");
                printArea.style.cursor = "zoom-in";
            }
        };
        printArea.addEventListener("click", handleZoom);
        printArea.addEventListener("touchstart", handleZoom, { passive: false });
    }
    
    document.getElementById("btnCancelOnlineProduct")?.addEventListener("click", () => {
        document.getElementById("onlineProductModal")?.classList.remove("active");
    });
    document.getElementById("btnCloseOnlineProductModal")?.addEventListener("click", () => {
        document.getElementById("onlineProductModal")?.classList.remove("active");
    });
    
    document.getElementById("btnCancelOnlineImportStock")?.addEventListener("click", () => {
        document.getElementById("onlineImportStockModal")?.classList.remove("active");
    });
    document.getElementById("btnCloseOnlineImportStockModal")?.addEventListener("click", () => {
        document.getElementById("onlineImportStockModal")?.classList.remove("active");
    });
    
    // Row adding
    document.getElementById("btnAddOnlineOrderRow")?.addEventListener("click", () => window.addOnlineOrderRow());
    document.getElementById("btnAddOnlineOrderProdRow")?.addEventListener("click", () => window.addOnlineOrderProdRow());
    
    // Form submits
    document.getElementById("onlineOrderForm")?.addEventListener("submit", handleOnlineOrderSubmit);
    document.getElementById("onlineProductForm")?.addEventListener("submit", handleOnlineProductSubmit);
    document.getElementById("onlineImportStockForm")?.addEventListener("submit", handleOnlineImportStockSubmit);
    
    // Interactive fields watch
    document.getElementById("onlineOrderDiscount")?.addEventListener("input", window.recalcOnlineOrderTotal);
    document.getElementById("onlineOrderVat")?.addEventListener("input", window.recalcOnlineOrderTotal);
    document.getElementById("onlineOrderCommissionRate")?.addEventListener("input", window.recalcOnlineOrderTotal);
    
    // Shipping fields watch & toggles
    const shipMethodEl = document.getElementById("onlineOrderShipMethod");
    const shipFeeEl = document.getElementById("onlineOrderShipFee");
    
    function toggleOnlineOrderShipFields() {
        if (!shipMethodEl || !shipFeeEl) return;
        const method = shipMethodEl.value;
        if (method === "INTERNAL_FREE") {
            shipFeeEl.value = 0;
            shipFeeEl.readOnly = true;
        } else if (method === "INTERNAL_TIER") {
            shipFeeEl.value = 300000;
            shipFeeEl.readOnly = true;
        } else {
            shipFeeEl.readOnly = false;
        }
        window.recalcOnlineOrderTotal();
    }
    
    shipMethodEl?.addEventListener("change", toggleOnlineOrderShipFields);
    shipFeeEl?.addEventListener("input", window.recalcOnlineOrderTotal);
    
    // Kanban, Table & Calendar view toggler via dropdown
    const btnOnlineOrderViewToggle = document.getElementById("btnOnlineOrderViewToggle");
    const dropdownMenu = document.getElementById("onlineViewDropdownMenu");
    
    btnOnlineOrderViewToggle?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdownMenu) {
            dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
        }
    });
    
    document.addEventListener("click", () => {
        if (dropdownMenu) {
            dropdownMenu.style.display = "none";
        }
    });

    // Production Kanban & Table toggle view handler
    const btnProductionViewTable = document.getElementById("btnProductionViewTable");
    const btnProductionViewKanban = document.getElementById("btnProductionViewKanban");
    const prodTableContainer = document.getElementById("productionTableContainer");
    const prodKanbanContainer = document.getElementById("productionKanbanContainer");

    btnProductionViewTable?.addEventListener("click", () => {
        window.activeProductionView = "TABLE";
        btnProductionViewTable.style.background = "var(--bg-card)";
        btnProductionViewTable.style.color = "var(--accent)";
        btnProductionViewKanban.style.background = "transparent";
        btnProductionViewKanban.style.color = "var(--text-secondary)";
        
        if (prodTableContainer) prodTableContainer.style.display = "block";
        if (prodKanbanContainer) prodKanbanContainer.style.display = "none";
        renderKanban();
    });

    btnProductionViewKanban?.addEventListener("click", () => {
        window.activeProductionView = "KANBAN";
        btnProductionViewKanban.style.background = "var(--bg-card)";
        btnProductionViewKanban.style.color = "var(--accent)";
        btnProductionViewTable.style.background = "transparent";
        btnProductionViewTable.style.color = "var(--text-secondary)";
        
        if (prodTableContainer) prodTableContainer.style.display = "none";
        if (prodKanbanContainer) prodKanbanContainer.style.display = "flex";
        renderKanban();
    });
    
    const hasProdCheck = document.getElementById("onlineOrderHasProduction");
    hasProdCheck?.addEventListener("change", () => {
        const prodFields = document.getElementById("onlineOrderProductionFields");
        if (prodFields) {
            prodFields.style.display = hasProdCheck.checked ? "flex" : "none";
        }
    });
};

window.openNewOnlineOrderModal = function(mode = "ADD", orderId = "") {
    window.isDraftSubmit = false;
    try {
        const modal = document.getElementById("onlineOrderModal");
        if (!modal) {
            alert("Lỗi: Không tìm thấy modal onlineOrderModal");
            return;
        }
        
        if (!modal.dataset) modal.dataset = {};
        modal.dataset.mode = mode;
        modal.dataset.orderId = orderId;
        
        document.getElementById("onlineOrderForm")?.reset();
        
        const titleEl = document.getElementById("onlineOrderModalTitle");
        if (titleEl) {
            titleEl.textContent = mode === "EDIT" ? "Cập nhật đơn hàng online" : "Tạo đơn hàng online mới";
        }
        
        const container = document.getElementById("onlineOrderRowsContainer");
        if (container) {
            container.innerHTML = "";
        }
        
        const prodFields = document.getElementById("onlineOrderProductionFields");
        if (prodFields) {
            prodFields.style.display = "none";
        }
        
        const prodRowsContainer = document.getElementById("onlineOrderProdRowsContainer");
        if (prodRowsContainer) {
            prodRowsContainer.innerHTML = "";
        }
        
        if (mode === "EDIT") {
            const order = state.online_orders.find(o => o.id === orderId);
            if (!order) {
                alert("Lỗi: Không tìm thấy đơn hàng cần sửa.");
                return;
            }
            
            const customerEl = document.getElementById("onlineOrderCustomer");
            if (customerEl) customerEl.value = order.customer_id;
            
            const salespersonEl = document.getElementById("onlineOrderSalesPerson");
            if (salespersonEl) salespersonEl.value = order.salesperson || "";
            
            const discountEl = document.getElementById("onlineOrderDiscount");
            if (discountEl) discountEl.value = order.discount || 0;
            
            const vatEl = document.getElementById("onlineOrderVat");
            if (vatEl) vatEl.value = order.vat_rate || 0;
            
            const commEl = document.getElementById("onlineOrderCommissionRate");
            if (commEl) commEl.value = order.commission_rate || 5;
            
            const shipMethodEl = document.getElementById("onlineOrderShipMethod");
            if (shipMethodEl) shipMethodEl.value = order.ship_method || "INTERNAL_FREE";
            
            const shipFeeEl = document.getElementById("onlineOrderShipFee");
            if (shipFeeEl) {
                shipFeeEl.value = order.ship_fee || 0;
                shipFeeEl.readOnly = (order.ship_method !== "THIRD_PARTY");
            }
            
            const paymentMethodEl = document.getElementById("onlineOrderPaymentMethod");
            if (paymentMethodEl) paymentMethodEl.value = order.payment_method || "CASH";
            
            const paymentStatusEl = document.getElementById("onlineOrderPaymentStatus");
            if (paymentStatusEl) paymentStatusEl.value = order.payment_status || "UNPAID";
            
            const notesEl = document.getElementById("onlineOrderNotes");
            if (notesEl) notesEl.value = order.notes || "";
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    window.addOnlineOrderRow(item.sku, item.qty, item.price);
                });
            } else {
                window.addOnlineOrderRow();
            }
            
            const hasProdEl = document.getElementById("onlineOrderHasProduction");
            if (hasProdEl) {
                hasProdEl.checked = !!order.has_production;
                if (order.has_production) {
                    if (prodFields) prodFields.style.display = "block";
                    const prod = state.productions.find(p => p.sales_order_id === order.id);
                    const prodOperatorEl = document.getElementById("onlineOrderProdOperator");
                    if (prodOperatorEl && prod) {
                        prodOperatorEl.value = prod.operator_id || "Chưa phân công";
                    }
                    if (order.production_steps && order.production_steps.length > 0) {
                        order.production_steps.forEach(step => {
                            window.addOnlineOrderProdRow(step.name, step.qty, step.price);
                        });
                    }
                }
            }
        } else {
            window.addOnlineOrderRow();
            
            const paymentStatusEl = document.getElementById("onlineOrderPaymentStatus");
            if (paymentStatusEl) paymentStatusEl.value = "UNPAID";
            
            const shipMethodEl = document.getElementById("onlineOrderShipMethod");
            const shipFeeEl = document.getElementById("onlineOrderShipFee");
            if (shipMethodEl) {
                shipMethodEl.value = "INTERNAL_FREE";
            }
            if (shipFeeEl) {
                txFee = 0;
                shipFeeEl.value = 0;
                shipFeeEl.readOnly = true;
            }
            
            const hasProdEl = document.getElementById("onlineOrderHasProduction");
            if (hasProdEl) hasProdEl.checked = false;
        }
        
        modal.classList.add("active");
        window.recalcOnlineOrderTotal();
    } catch (e) {
        console.error("Lỗi khi mở modal tạo đơn hàng:", e);
        alert("Lỗi khi mở giao diện tạo đơn: " + e.message);
    }
};

window.openNewOnlineProductModal = function(mode, sku = "") {
    const modal = document.getElementById("onlineProductModal");
    if (!modal) return;
    
    const form = document.getElementById("onlineProductForm");
    form?.reset();
    
    const imgPreview = document.getElementById("onlineProductImagePreview");
    if (imgPreview) {
        imgPreview.src = "";
        imgPreview.style.display = "none";
    }
    
    const titleEl = document.getElementById("onlineProductModalTitle");
    const skuInput = document.getElementById("onlineProductSku");
    const stockGroup = document.getElementById("onlineProductStockQtyGroup");
    
    if (mode === "ADD") {
        titleEl.textContent = "Thêm hàng hóa mới";
        skuInput.readOnly = false;
        if (stockGroup) stockGroup.style.display = "block";
        document.getElementById("onlineProductAction").value = "ADD";
    } else {
        titleEl.textContent = "Sửa thông tin hàng hóa";
        skuInput.value = sku;
        skuInput.readOnly = true;
        if (stockGroup) stockGroup.style.display = "none";
        document.getElementById("onlineProductAction").value = "EDIT";
        
        const cleanSku = String(sku).trim().toUpperCase();
        const prod = state.online_products.find(p => String(p.sku).trim().toUpperCase() === cleanSku);
        if (prod) {
            document.getElementById("onlineProductName").value = prod.name;
            document.getElementById("onlineProductUnit").value = prod.unit;
            document.getElementById("onlineProductPrice").value = prod.price;
            document.getElementById("onlineProductWholesalePrice").value = prod.wholesale_price;
            document.getElementById("onlineProductMinStock").value = prod.min_stock_qty;
            document.getElementById("onlineProductBarcode").value = prod.barcode || "";
            if (prod.image && imgPreview) {
                imgPreview.src = prod.image;
                imgPreview.style.display = "block";
            }
        }
    }
    
    modal.classList.add("active");
}

window.openOnlineImportStockModal = function() {
    const modal = document.getElementById("onlineImportStockModal");
    if (!modal) return;
    
    const form = document.getElementById("onlineImportStockForm");
    form?.reset();
    
    const productSelect = document.getElementById("onlineImportProduct");
    if (productSelect) {
        productSelect.innerHTML = "";
        state.online_products.forEach(p => {
            productSelect.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
        });
    }

    // Load supplier options
    const supplierSelect = document.getElementById("onlineImportSupplier");
    if (supplierSelect) {
        supplierSelect.innerHTML = "";
        const suppliers = (state.partners || []).filter(p => p.role === "SUPPLIER" || p.role === "BOTH");
        suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    // Bind dynamic source toggle behavior
    const sourceSelect = document.getElementById("onlineImportSource");
    const supplierGroup = document.getElementById("onlineImportSupplierGroup");
    const supplierInput = document.getElementById("onlineImportSupplier");
    if (sourceSelect && supplierGroup && supplierInput) {
        const toggleGroup = () => {
            if (sourceSelect.value === "EXTERNAL_SUPPLIER") {
                supplierGroup.style.display = "block";
                supplierInput.required = true;
            } else {
                supplierGroup.style.display = "none";
                supplierInput.required = false;
            }
        };
        sourceSelect.onchange = toggleGroup;
        toggleGroup();
    }
    
    modal.classList.add("active");
}

window.getAvailableStockForSku = function(sku) {
    if (!sku) return 0;
    const p = (state.online_products || []).find(prod => prod.sku === sku);
    if (!p) return 0;
    
    let available = p.stock_qty || 0;
    const modal = document.getElementById("onlineOrderModal");
    const isEdit = modal && modal.dataset ? modal.dataset.mode === "EDIT" : false;
    const oldOrderId = modal && modal.dataset ? modal.dataset.orderId : "";
    
    if (isEdit && oldOrderId) {
        const existingOrder = (state.online_orders || []).find(o => o.id === oldOrderId);
        if (existingOrder && existingOrder.payment_status !== "DRAFT" && Array.isArray(existingOrder.items)) {
            const oldItem = existingOrder.items.find(i => i.sku === sku);
            if (oldItem) {
                available += (oldItem.qty || 0);
            }
        }
    }
    return available;
};

window.validateRowStock = function(row, triggerAlert = false) {
    if (!row) return true;
    const selectEl = row.querySelector(".item-sku");
    const qtyEl = row.querySelector(".item-qty");
    const stockInfoEl = row.querySelector(".line-stock-info");
    
    if (!selectEl || !qtyEl) return true;
    
    const sku = selectEl.value;
    if (!sku) {
        if (stockInfoEl) stockInfoEl.style.display = "none";
        return true;
    }
    
    const p = (state.online_products || []).find(prod => prod.sku === sku);
    if (!p) return true;
    
    const maxAvailable = window.getAvailableStockForSku(sku);
    let qtyVal = parseFloat(qtyEl.value) || 0;
    
    qtyEl.setAttribute("max", maxAvailable);
    
    let isOk = true;
    
    if (maxAvailable <= 0) {
        isOk = false;
        qtyEl.style.borderColor = "var(--danger)";
        qtyEl.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
        if (stockInfoEl) {
            stockInfoEl.innerHTML = `<span style="color: var(--danger); font-weight: 600;">❌ Sản phẩm "${p.name}" đã HẾT HÀNG trong kho (Tồn: 0)!</span>`;
            stockInfoEl.style.display = "block";
        }
        if (triggerAlert) {
            alert(`⚠️ SẢN PHẨM HẾT HÀNG!\n\nSản phẩm "${p.name}" (${p.sku}) hiện tại đã HẾT HÀNG trong kho (Tồn: 0).\nVui lòng nhập thêm hàng vào kho hoặc chọn sản phẩm khác!`);
        }
    } else if (qtyVal > maxAvailable) {
        isOk = false;
        qtyEl.style.borderColor = "var(--danger)";
        qtyEl.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
        
        if (triggerAlert) {
            alert(`⚠️ SỐ LƯỢNG VƯỢT QUÁ TỒN KHO!\n\nSản phẩm "${p.name}" (${p.sku}) hiện chỉ còn TỒN KHO khả dụng: ${maxAvailable} cái.\n\nSố lượng bạn nhập (${qtyVal}) vượt quá tồn kho nên đã được tự động điều chỉnh về ${maxAvailable} cái.`);
            qtyEl.value = maxAvailable;
            qtyVal = maxAvailable;
            qtyEl.style.borderColor = "";
            qtyEl.style.backgroundColor = "";
            isOk = true;
        }
        
        if (stockInfoEl) {
            stockInfoEl.innerHTML = `<span style="color: var(--danger); font-weight: 600;">⚠️ Nhập ${qtyVal} cái vượt quá tồn kho khả dụng (${maxAvailable} cái)!</span>`;
            stockInfoEl.style.display = "block";
        }
    } else {
        qtyEl.style.borderColor = "";
        qtyEl.style.backgroundColor = "";
        if (stockInfoEl) {
            stockInfoEl.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.75rem;">📦 Tồn kho khả dụng: <strong style="color: var(--success);">${maxAvailable}</strong> sản phẩm</span>`;
            stockInfoEl.style.display = "block";
        }
    }
    
    return isOk;
};

window.addOnlineOrderRow = function(sku = "", qty = 1, price = null) {
    const container = document.getElementById("onlineOrderRowsContainer");
    if (!container) return;
    
    const rowId = "row_" + Math.random().toString(36).substring(2, 9);
    const row = document.createElement("div");
    row.className = "online-order-row";
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.alignItems = "flex-start";
    row.style.gap = "4px";
    row.style.width = "100%";
    row.id = rowId;
    
    let optionsHtml = `<option value="">-- Chọn sản phẩm --</option>`;
    (state.online_products || []).forEach(p => {
        const selectedAttr = p.sku === sku ? "selected" : "";
        optionsHtml += `<option value="${p.sku}" ${selectedAttr}>${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
    });
    
    const initialPrice = price !== null ? price : (sku ? window.calculateOnlineProductUnitPrice(sku, qty) : 0);
    
    row.innerHTML = `
        <div style="display: flex; gap: 10px; width: 100%; align-items: center;">
            <select class="form-select item-sku" style="flex-grow:2;" required>
                ${optionsHtml}
            </select>
            <input type="number" class="form-input item-qty" placeholder="SL" value="${qty}" min="1" style="width:100px;" required>
            <input type="number" class="form-input item-price" placeholder="Đơn giá" value="${initialPrice}" min="0" style="width:140px;" required>
            <button type="button" class="btn btn-danger btn-remove-row" style="padding: 0; display: flex; align-items: center; justify-content: center; height: 38px; width: 38px; min-width: 38px; border-radius: 8px; font-size: 1.1rem; line-height: 1; cursor: pointer; flex-shrink: 0;" title="Xóa dòng">🗑️</button>
        </div>
        <div class="line-stock-info" style="font-size: 0.75rem; margin-top: 2px; padding-left: 8px; width: 100%; display: none;"></div>
        <div class="line-discount-info" style="font-size: 0.75rem; color: var(--success); margin-top: 2px; padding-left: 8px; width: 100%; display: none;"></div>
    `;
    
    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("Lucide error in addOnlineOrderRow:", e);
        }
    }
    
    const selectEl = row.querySelector(".item-sku");
    const qtyEl = row.querySelector(".item-qty");
    const priceEl = row.querySelector(".item-price");
    const removeBtn = row.querySelector(".btn-remove-row");
    
    selectEl.addEventListener("change", () => {
        const sku = selectEl.value;
        window.validateRowStock(row, true);
        const qty = parseFloat(qtyEl.value) || 1;
        priceEl.value = window.calculateOnlineProductUnitPrice(sku, qty);
        window.recalcOnlineOrderTotal();
    });
    qtyEl.addEventListener("input", () => {
        const sku = selectEl.value;
        window.validateRowStock(row, false);
        const qty = parseFloat(qtyEl.value) || 1;
        priceEl.value = window.calculateOnlineProductUnitPrice(sku, qty);
        window.recalcOnlineOrderTotal();
    });
    qtyEl.addEventListener("change", () => {
        const sku = selectEl.value;
        window.validateRowStock(row, true);
        const qty = parseFloat(qtyEl.value) || 1;
        priceEl.value = window.calculateOnlineProductUnitPrice(sku, qty);
        window.recalcOnlineOrderTotal();
    });
    priceEl.addEventListener("input", window.recalcOnlineOrderTotal);
    removeBtn.addEventListener("click", () => {
        row.remove();
        window.recalcOnlineOrderTotal();
    });
    window.makeSearchableSelect(selectEl, "-- Chọn sản phẩm --");
    
    container.appendChild(row);
    window.validateRowStock(row, false);
    window.recalcOnlineOrderTotal();
};

window.addOnlineOrderProdRow = function(name = "", qty = 1, price = 0) {
    const container = document.getElementById("onlineOrderProdRowsContainer");
    if (!container) return;
    
    const rowId = "prod_row_" + Math.random().toString(36).substring(2, 9);
    const row = document.createElement("div");
    row.className = "online-order-prod-row";
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "center";
    row.id = rowId;
    
    row.innerHTML = `
        <select class="form-select prod-name" style="flex-grow:2;" required>
            <option value="">-- Chọn công đoạn --</option>
            <option value="In ấn logo" ${name === "In ấn logo" ? "selected" : ""}>In ấn logo (In lụa/ép kim)</option>
            <option value="Bế decal dán" ${name === "Bế decal dán" ? "selected" : ""}>Bế decal dán</option>
            <option value="Cán màng thêm" ${name === "Cán màng thêm" ? "selected" : ""}>Cán màng thêm</option>
            <option value="Dán hộp thủ công" ${name === "Dán hộp thủ công" ? "selected" : ""}>Dán hộp thủ công</option>
            <option value="Đóng mắt cáo / Khoen" ${name === "Đóng mắt cáo / Khoen" ? "selected" : ""}>Đóng mắt cáo / Khoen</option>
            <option value="Xỏ dây túi giấy" ${name === "Xỏ dây túi giấy" ? "selected" : ""}>Xỏ dây túi giấy</option>
        </select>
        <input type="number" class="form-input prod-qty" placeholder="SL" value="${qty}" min="1" style="width:100px;" required>
        <input type="number" class="form-input prod-price" placeholder="Đơn giá" value="${price}" min="0" style="width:140px;" required>
        <button type="button" class="btn btn-danger btn-remove-prod-row" style="padding: 0; display: flex; align-items: center; justify-content: center; height: 38px; width: 38px; min-width: 38px; border-radius: 8px; font-size: 1.1rem; line-height: 1; cursor: pointer; flex-shrink: 0;" title="Xóa dòng">🗑️</button>
    `;
    
    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("Lucide error in addOnlineOrderProdRow:", e);
        }
    }
    
    row.querySelector(".prod-name").addEventListener("change", window.recalcOnlineOrderTotal);
    row.querySelector(".prod-qty").addEventListener("input", window.recalcOnlineOrderTotal);
    row.querySelector(".prod-price").addEventListener("input", window.recalcOnlineOrderTotal);
    row.querySelector(".btn-remove-prod-row").addEventListener("click", () => {
        row.remove();
        window.recalcOnlineOrderTotal();
    });
    
    container.appendChild(row);
    window.recalcOnlineOrderTotal();
};

window.recalcOnlineOrderTotal = function() {
    let subtotal = 0;
    let totalExtraDiscount = 0;
    
    const rows = document.querySelectorAll("#onlineOrderRowsContainer .online-order-row");
    rows.forEach(row => {
        const sku = row.querySelector(".item-sku").value;
        const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
        const price = parseFloat(row.querySelector(".item-price").value) || 0;
        
        const lineSubtotal = qty * price;
        subtotal += lineSubtotal;
        
        // Calculate extra discount
        const dPct = window.calculateOnlineProductDiscountPercent(sku, qty);
        const lineDiscount = Math.round(lineSubtotal * (dPct / 100));
        totalExtraDiscount += lineDiscount;
        
        // Show discount info inline
        const infoEl = row.querySelector(".line-discount-info");
        if (infoEl && infoEl.style) {
            if (dPct > 0) {
                infoEl.textContent = `✓ Đạt số lượng sỉ: Chiết khấu thêm ${dPct}% (Giảm -${formatMoney(lineDiscount)}đ)`;
                infoEl.style.display = "block";
                infoEl.style.marginBottom = "8px";
            } else {
                infoEl.style.display = "none";
                infoEl.style.marginBottom = "0";
            }
        }
    });
    
    // Calculate extra production cost
    let prodSubtotal = 0;
    const hasProd = document.getElementById("onlineOrderHasProduction")?.checked;
    if (hasProd) {
        const prodRows = document.querySelectorAll("#onlineOrderProdRowsContainer .online-order-prod-row");
        prodRows.forEach(row => {
            const qty = parseFloat(row.querySelector(".prod-qty").value) || 0;
            const price = parseFloat(row.querySelector(".prod-price").value) || 0;
            prodSubtotal += qty * price;
        });
    }
    
    const prodSubtotalEl = document.getElementById("onlineOrderProdSubtotal");
    if (prodSubtotalEl) {
        prodSubtotalEl.value = formatMoney(prodSubtotal);
    }
    
    // Add production cost to overall subtotal
    subtotal += prodSubtotal;
    
    const manualDiscount = parseFloat(document.getElementById("onlineOrderDiscount").value) || 0;
    const vatRate = parseFloat(document.getElementById("onlineOrderVat").value) || 0;
    const commRate = parseFloat(document.getElementById("onlineOrderCommissionRate").value) || 0;
    const shipFee = parseFloat(document.getElementById("onlineOrderShipFee")?.value) || 0;
    
    const totalDiscount = manualDiscount + totalExtraDiscount;
    
    // Render dynamic badge info next to the summary label
    const discountInfoEl = document.getElementById("lblOnlineOrderExtraDiscountInfo");
    if (discountInfoEl) {
        if (totalExtraDiscount > 0) {
            discountInfoEl.textContent = `(Bao gồm ${formatMoney(totalExtraDiscount)}đ CK sỉ)`;
            discountInfoEl.style.display = "inline-block";
        } else {
            discountInfoEl.style.display = "none";
        }
    }
    
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const vatAmount = Math.round(taxableAmount * (vatRate / 100));
    const totalAmount = taxableAmount + vatAmount + shipFee;
    
    const commAmount = Math.round(totalAmount * (commRate / 100));
    
    const lblSubtotal = document.getElementById("lblOnlineOrderSubtotal");
    const lblDiscount = document.getElementById("lblOnlineOrderDiscount");
    const lblVat = document.getElementById("lblOnlineOrderVat");
    const lblShipFee = document.getElementById("lblOnlineOrderShipFee");
    const lblTotal = document.getElementById("lblOnlineOrderTotal");
    const lblComm = document.getElementById("lblCalculatedCommission");
    
    if (lblSubtotal) lblSubtotal.textContent = formatMoney(subtotal);
    if (lblDiscount) lblDiscount.textContent = "-" + formatMoney(totalDiscount);
    if (lblVat) lblVat.textContent = formatMoney(vatAmount);
    if (lblShipFee) lblShipFee.textContent = formatMoney(shipFee);
    if (lblTotal) lblTotal.textContent = formatMoney(totalAmount);
    if (lblComm) lblComm.textContent = `(Tính: ${formatMoney(commAmount)})`;
};

async function handleOnlineOrderSubmit(e) {
    try {
        e.preventDefault();
        
        const modal = document.getElementById("onlineOrderModal");
        const isEdit = modal && modal.dataset ? modal.dataset.mode === "EDIT" : false;
        const oldOrderId = modal && modal.dataset ? modal.dataset.orderId : "";
        
        const customerId = document.getElementById("onlineOrderCustomer").value;
        const salesperson = document.getElementById("onlineOrderSalesPerson").value;
        const commissionRate = parseFloat(document.getElementById("onlineOrderCommissionRate").value) || 0;
        const discount = parseFloat(document.getElementById("onlineOrderDiscount").value) || 0;
        const vatRate = parseFloat(document.getElementById("onlineOrderVat").value) || 0;
        const paymentMethod = document.getElementById("onlineOrderPaymentMethod").value;
        const paymentStatus = window.isDraftSubmit ? "DRAFT" : document.getElementById("onlineOrderPaymentStatus").value;
        const hasProduction = document.getElementById("onlineOrderHasProduction").checked;
        
        const rows = document.querySelectorAll("#onlineOrderRowsContainer .online-order-row");
        if (rows.length === 0) {
            alert("Vui lòng chọn ít nhất một sản phẩm.");
            return;
        }
        
        const items = [];
        let subtotal = 0;
        let stockError = null;
        let invalidInputEl = null;
        const requestedQtyPerSku = {};
        
        for (let row of rows) {
            const selectEl = row.querySelector(".item-sku");
            const qtyEl = row.querySelector(".item-qty");
            const priceEl = row.querySelector(".item-price");
            
            const sku = selectEl ? selectEl.value : "";
            const qty = parseInt(qtyEl ? qtyEl.value : 0) || 0;
            const price = parseFloat(priceEl ? priceEl.value : 0) || 0;
            
            if (!sku) {
                stockError = "Vui lòng chọn sản phẩm cho tất cả các dòng.";
                invalidInputEl = selectEl;
                break;
            }
            
            const p = (state.online_products || []).find(prod => prod.sku === sku);
            if (!p) {
                stockError = `Sản phẩm mã "${sku}" không tồn tại trong hệ thống.`;
                invalidInputEl = selectEl;
                break;
            }
            
            if (qty <= 0) {
                stockError = `Số lượng đặt hàng cho sản phẩm "${p.name}" (${sku}) phải lớn hơn 0.`;
                invalidInputEl = qtyEl;
                break;
            }
            
            requestedQtyPerSku[sku] = (requestedQtyPerSku[sku] || 0) + qty;
            
            items.push({ sku, qty, price });
            subtotal += qty * price;
        }
        
        if (!stockError) {
            for (let sku of Object.keys(requestedQtyPerSku)) {
                const totalReq = requestedQtyPerSku[sku];
                const maxAvailable = window.getAvailableStockForSku(sku);
                const p = (state.online_products || []).find(prod => prod.sku === sku);
                const prodName = p ? p.name : sku;
                
                if (maxAvailable <= 0) {
                    stockError = `Sản phẩm "${prodName}" (${sku}) hiện tại đã HẾT HÀNG trong kho (Tồn: 0). Không thể tạo đơn!`;
                    break;
                } else if (totalReq > maxAvailable) {
                    stockError = `Sản phẩm "${prodName}" (${sku}) không đủ số lượng tồn kho!\n\n- Tồn kho khả dụng: ${maxAvailable} cái\n- Bạn đặt tổng cộng: ${totalReq} cái\n\nVui lòng giảm số lượng đặt về tối đa ${maxAvailable} cái!`;
                    break;
                }
            }
        }
        
        if (stockError) {
            alert("⚠️ CẢNH BÁO TỒN KHO KHÔNG ĐỦ:\n\n" + stockError + "\n\n❌ Hệ thống ĐÃ HỦY THAO TÁC và KHÔNG TẠO ĐƠN HÀNG NÀY!");
            if (invalidInputEl) {
                invalidInputEl.focus();
                invalidInputEl.style.borderColor = "var(--danger)";
            }
            return;
        }
        
        const shipMethod = document.getElementById("onlineOrderShipMethod")?.value || "INTERNAL_FREE";
        const shipFee = parseFloat(document.getElementById("onlineOrderShipFee")?.value) || 0;
        const taxableAmount = Math.max(0, subtotal - discount);
        const vatAmount = Math.round(taxableAmount * (vatRate / 100));
        const totalAmount = taxableAmount + vatAmount + shipFee;
        const commissionAmount = Math.round(totalAmount * (commissionRate / 100));
        
        const prodSteps = [];
        if (hasProduction) {
            const pRows = document.querySelectorAll("#onlineOrderProdRowsContainer .online-order-prod-row");
            pRows.forEach(r => {
                const sName = r.querySelector(".prod-name").value;
                const sQty = parseInt(r.querySelector(".prod-qty").value) || 0;
                const sPrice = parseFloat(r.querySelector(".prod-price").value) || 0;
                if (sName) {
                    prodSteps.push({ name: sName, qty: sQty, price: sPrice });
                }
            });
        }
        
        let orderId = oldOrderId;
        let orderNumber = "";
        let existingOrder = null;
        
        if (isEdit && oldOrderId) {
            existingOrder = state.online_orders.find(o => o.id === oldOrderId);
            if (existingOrder) {
                orderNumber = existingOrder.order_number;
                if (existingOrder.payment_status !== "DRAFT") {
                    existingOrder.items.forEach(oldItem => {
                        const p = state.online_products.find(prod => prod.sku === oldItem.sku);
                        if (p) p.stock_qty += oldItem.qty;
                    });
                }
            }
        }
        
        if (!orderNumber) {
            const orderCodeSuffix = String(state.online_orders.length + 1).padStart(4, '0');
            orderNumber = `SO-ON-202606-${orderCodeSuffix}`;
            orderId = "oo_" + Math.random().toString(36).substring(2, 9);
        }
        
        const onlineNotes = document.getElementById("onlineOrderNotes") ? document.getElementById("onlineOrderNotes").value.trim() : "";
        
        const newOrder = {
            id: orderId,
            order_number: orderNumber,
            customer_id: customerId,
            salesperson,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            items,
            subtotal,
            discount,
            vat_rate: vatRate,
            ship_method: shipMethod,
            ship_fee: shipFee,
            total_amount: totalAmount,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            created_at: existingOrder ? existingOrder.created_at : new Date().toISOString(),
            has_production: hasProduction,
            production_steps: prodSteps,
            kanban_status: existingOrder ? existingOrder.kanban_status : "ORDER",
            notes: onlineNotes
        };
        
        if (paymentStatus !== "DRAFT") {
            state.online_products.forEach(p => {
                const item = items.find(i => i.sku === p.sku);
                if (item) {
                    p.stock_qty -= item.qty;
                    const logId = "log_" + Math.random().toString(36).substring(2, 9);
                    const newLog = {
                        id: logId,
                        created_at: new Date().toISOString(),
                        sku: p.sku,
                        type: "EXPORT",
                        qty: -item.qty,
                        note: `Xuất kho bán hàng đơn ${orderNumber}`
                    };
                    state.online_stock_logs.push(newLog);
                }
            });
        }
        
        if (isEdit && existingOrder) {
            state.online_orders = state.online_orders.map(o => o.id === oldOrderId ? newOrder : o);
        } else {
            state.online_orders = [newOrder, ...state.online_orders];
        }
        
        state.updateState("online_orders", state.online_orders);
        state.updateState("online_products", state.online_products);
        state.updateState("online_stock_logs", state.online_stock_logs);
        
        if (paymentStatus === "DRAFT") {
            // Remove from standard orders, productions, and transactions if existed
            state.orders = state.orders.filter(o => o.id !== orderId);
            state.productions = state.productions.filter(p => p.sales_order_id !== orderId);
            state.transactions = state.transactions.filter(t => t.reference_id !== orderId);
            
            state.updateState("orders", state.orders);
            state.updateState("productions", state.productions);
            state.updateState("transactions", state.transactions);
        } else {
            // Sync to standard orders table (state.orders)
            const itemSpecs = items.map(i => {
                const prod = state.online_products.find(p => p.sku === i.sku);
                return `${prod ? prod.name : i.sku} (SL: ${i.qty})`;
            }).join(", ");

            let stdPostProcessing = "Không gia công thêm";
            if (hasProduction && prodSteps.length > 0) {
                stdPostProcessing = "Yêu cầu gia công: " + prodSteps.map(s => `${s.name} (SL: ${s.qty}, ĐG: ${formatMoney(s.price)})`).join(" | ");
            } else if (hasProduction) {
                stdPostProcessing = "Có sản xuất/gia công thêm";
            }

            const stdOrder = state.orders.find(o => o.id === orderId);
            if (stdOrder) {
                stdOrder.customer_id = customerId;
                stdOrder.quantity = items.reduce((sum, i) => sum + i.qty, 0);
                stdOrder.print_spec = itemSpecs;
                stdOrder.post_processing = stdPostProcessing;
                stdOrder.subtotal = subtotal;
                stdOrder.discount = discount;
                stdOrder.vat_rate = vatRate;
                stdOrder.ship_method = shipMethod;
                stdOrder.ship_fee = shipFee;
                stdOrder.total_amount = totalAmount;
                stdOrder.deposit = paymentStatus === "PAID" ? totalAmount : 0;
                stdOrder.payment_status = paymentStatus;
                stdOrder.payment_method = paymentMethod;
                stdOrder.salesperson = salesperson;
                stdOrder.commission_rate = commissionRate;
                stdOrder.status = hasProduction ? "IN_PRODUCTION" : "DELIVERED";
                stdOrder.notes = onlineNotes;
            } else {
                const stdCodeSuffix = String(state.orders.length + 1).padStart(4, '0');
                const stdOrderNumber = `SO-202606-${stdCodeSuffix}`;
                const newStdOrder = {
                    id: orderId,
                    order_number: stdOrderNumber,
                    customer_id: customerId,
                    width_mm: 0,
                    length_mm: 0,
                    quantity: items.reduce((sum, i) => sum + i.qty, 0),
                    paper_type: "Thành phẩm kho sẵn",
                    print_spec: itemSpecs,
                    post_processing: stdPostProcessing,
                    subtotal: subtotal,
                    discount: discount,
                    vat_rate: vatRate,
                    ship_method: shipMethod,
                    ship_fee: shipFee,
                    total_amount: totalAmount,
                    deposit: paymentStatus === "PAID" ? totalAmount : 0,
                    payment_status: paymentStatus,
                    payment_method: paymentMethod,
                    salesperson: salesperson,
                    commission_rate: commissionRate,
                    created_at: new Date().toISOString(),
                    status: hasProduction ? "IN_PRODUCTION" : "DELIVERED",
                    delivery_date: null,
                    notes: onlineNotes || `Đơn hàng online ${orderNumber}`
                };
                state.orders = [newStdOrder, ...state.orders];
            }
            state.updateState("orders", state.orders);

            // Send automated Telegram notification if enabled
            if (!isEdit && typeof sendTelegramOrderAlert === "function") {
                sendTelegramOrderAlert(stdOrder || state.orders[0]);
            }

            // Sync standard UI view modules
            try {
                if (typeof renderQuotes === "function") renderQuotes();
                if (typeof renderProdOrders === "function") renderProdOrders();
                if (typeof renderKanban === "function") renderKanban();
                if (typeof renderCRM === "function") renderCRM();
                if (typeof renderAll === "function") renderAll();
            } catch (uiErr) {
                console.error("Lỗi đồng bộ UI chuẩn:", uiErr);
            }
            
            // Auto generate Kanban PO if needed
            if (hasProduction) {
                const prodOperator = document.getElementById("onlineOrderProdOperator").value || "Chưa phân công";
                const prodNotes = prodSteps.length > 0 ? "Yêu cầu gia công: " + prodSteps.map(s => `${s.name} (SL: ${s.qty}, ĐG: ${formatMoney(s.price)})`).join(" | ") : "Yêu cầu gia công thêm";
                
                const existingProd = state.productions.find(p => p.sales_order_id === orderId);
                if (existingProd) {
                    existingProd.input_qty = items.reduce((sum, i) => sum + i.qty, 0);
                    existingProd.target_qty = items.reduce((sum, i) => sum + i.qty, 0);
                    existingProd.operator_id = prodOperator;
                    existingProd.notes = prodNotes;
                } else {
                    const prodCodeSuffix = String(state.productions.length + 1).padStart(4, '0');
                    const prodNumber = `PO-202606-${prodCodeSuffix}`;
                    const prodId = "pr_" + Math.random().toString(36).substring(2, 9);
                    
                    const newProd = {
                        id: prodId,
                        production_number: prodNumber,
                        sales_order_id: orderId,
                        start_date: new Date().toISOString(),
                        due_date: new Date(Date.now() + 5*24*60*60*1000).toISOString(),
                        input_qty: items.reduce((sum, i) => sum + i.qty, 0),
                        target_qty: items.reduce((sum, i) => sum + i.qty, 0),
                        status: "THIETKE",
                        current_stage: "THIETKE",
                        operator_id: prodOperator,
                        notes: prodNotes
                    };
                    state.productions = [newProd, ...state.productions];
                }
                state.updateState("productions", state.productions);
            } else {
                state.productions = state.productions.filter(p => p.sales_order_id !== orderId);
                state.updateState("productions", state.productions);
            }
            
            // Generate Finance Receipt Transaction if PAID
            if (paymentStatus === "PAID") {
                const existingTx = state.transactions.find(t => t.reference_id === orderId && t.type === "RECEIPT");
                if (existingTx) {
                    existingTx.amount = totalAmount;
                    existingTx.payment_method = paymentMethod;
                    existingTx.account_source = paymentMethod === "BANK_TRANSFER" ? "VCB" : "CASH";
                    existingTx.partner_id = customerId;
                    existingTx.created_by = salesperson;
                } else {
                    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
                    const txNumber = `PT-202606-${txCodeSuffix}`;
                    const txId = "t_" + Math.random().toString(36).substring(2, 9);
                    
                    const receiptTx = {
                        id: txId,
                        tx_number: txNumber,
                        created_at: new Date().toISOString(),
                        type: "RECEIPT",
                        category: "CUSTOMER_FINAL",
                        amount: totalAmount,
                        payment_method: paymentMethod,
                        account_source: paymentMethod === "BANK_TRANSFER" ? "VCB" : "CASH",
                        partner_id: customerId,
                        reference_id: orderId,
                        created_by: salesperson
                    };
                    state.transactions = [receiptTx, ...state.transactions];
                }
                state.updateState("transactions", state.transactions);
            } else {
                state.transactions = state.transactions.filter(t => !(t.reference_id === orderId && t.type === "RECEIPT"));
                state.updateState("transactions", state.transactions);
            }
        }
        
        document.getElementById("onlineOrderModal")?.classList.remove("active");
        renderOnlineSales();
        renderOnlineProducts();
        renderOnlineStockLogs();
        
        window.openOnlineOrderInvoicePdf(orderId);
    } catch (err) {
        console.error("Lỗi tạo đơn hàng:", err);
        alert("Lỗi khi lưu đơn hàng: " + err.message);
    }
}

window.openOnlineOrderInvoicePdf = function(orderId) {
    try {
        const order = state.online_orders.find(o => o.id === orderId) || state.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const modal = document.getElementById("onlineOrderInvoicePdfModal");
        if (modal) {
            modal.dataset.orderId = orderId;
        }

        const isOnline = !!order.items;
        const invoiceTitleEl = document.getElementById("pdfInvoiceTitle");
        if (invoiceTitleEl) {
            invoiceTitleEl.textContent = isOnline ? "ĐƠN HÀNG ONLINE" : "ĐƠN HÀNG SẢN XUẤT";
        }
        
        const customer = state.partners.find(p => p.id === order.customer_id);
        
        document.getElementById("pdfOrderNumber").textContent = order.order_number;
        document.getElementById("pdfCustomerName").textContent = customer ? customer.name : "Khách vãng lai";
        document.getElementById("pdfCustomerPhone").textContent = customer ? customer.phone : "N/A";
        document.getElementById("pdfCustomerEmail").textContent = customer ? customer.email : "N/A";
        document.getElementById("pdfOrderDate").textContent = new Date(order.created_at).toLocaleDateString('vi-VN');
        document.getElementById("pdfPaymentMethod").textContent = order.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản MBBank';
        
        // Calculate total payments received for this order
        const payments = state.transactions.filter(t => t.reference_id === order.id && t.type === 'RECEIPT');
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
        const remainingDebt = Math.max(0, order.total_amount - totalPaid);
        
        let statusText = "";
        if (totalPaid === 0) {
            statusText = "Chưa thanh toán";
        } else if (remainingDebt > 0) {
            statusText = "Thanh toán một phần";
        } else {
            statusText = "Đã thanh toán đủ";
        }
        document.getElementById("pdfPaymentStatus").textContent = statusText;
        
        // Items table
        const pdfItemsBody = document.getElementById("pdfItemsBody");
        pdfItemsBody.innerHTML = "";
        
        if (order.items) {
            order.items.forEach(item => {
                const prod = state.online_products.find(p => p.sku === item.sku);
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="padding:10px; border:1px solid #ddd;"><strong>${item.sku}</strong> - ${prod ? prod.name : 'Sản phẩm'}</td>
                    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${prod ? prod.unit : 'Cái'}</td>
                    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${item.qty}</td>
                    <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatMoney(item.price)}</td>
                    <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatMoney(item.qty * item.price)}</td>
                `;
                pdfItemsBody.appendChild(row);
            });
        } else {
            // Normal production order
            const row = document.createElement("tr");
            const realSubtotal = (order.subtotal && order.subtotal > 0 && Math.abs(order.subtotal * 1.08 - order.total_amount) < 100)
                ? order.subtotal
                : Math.round((order.total_amount || 0) / 1.08);
            const unitPriceVal = order.quantity > 0 ? Math.round(realSubtotal / order.quantity) : 0;
            const specText = `${order.print_spec}<br><small style="color:#555;">Giấy: ${order.paper_type} | Gia công: ${order.post_processing ? order.post_processing.join(", ") : 'Bế thành phẩm'}</small>`;
            row.innerHTML = `
                <td style="padding:10px; border:1px solid #ddd;"><strong>Sản xuất</strong> - ${specText}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">Lô</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">${order.quantity.toLocaleString('vi-VN')}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatMoney(unitPriceVal)}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatMoney(realSubtotal)}</td>
            `;
            pdfItemsBody.appendChild(row);
        }
        
        const discountVal = order.discount || 0;
        const subtotalVal = !isOnline 
            ? ((order.subtotal && order.subtotal > 0 && Math.abs(order.subtotal * 1.08 - order.total_amount) < 100) ? order.subtotal : Math.round((order.total_amount || 0) / 1.08))
            : (order.subtotal || order.total_amount);
        const vatRateVal = order.vat_rate || 8;
        const vatVal = Math.round(Math.max(0, subtotalVal - discountVal) * (vatRateVal / 100));
        const shipFee = order.ship_fee || 0;
        
        document.getElementById("pdfSubtotal").textContent = formatMoney(subtotalVal);
        document.getElementById("pdfDiscount").textContent = "-" + formatMoney(discountVal);
        document.getElementById("pdfVat").textContent = formatMoney(vatVal);
        document.getElementById("pdfShipFee").textContent = formatMoney(shipFee);
        document.getElementById("pdfTotal").textContent = formatMoney(order.total_amount);
        
        // QR Code Container - VietQR image generator URL dynamic integration
        const amountToPay = remainingDebt > 0 ? remainingDebt : order.total_amount;
        const addInfo = encodeURIComponent(order.order_number);
        const qrUrl = `https://img.vietqr.io/image/MB-0907861111-compact2.png?amount=${amountToPay}&addInfo=${addInfo}&accountName=HOANG%20QUANG%20HUY`;
        
        const pdfQrContainer = document.getElementById("pdfQrContainer");
        if (pdfQrContainer) {
            pdfQrContainer.innerHTML = `<img crossorigin="anonymous" src="${qrUrl}" alt="VietQR Payment Code" style="max-width: 100%; max-height: 100%; object-fit: contain;"/>`;
        }

        const pdfNotesContainer = document.getElementById("pdfNotesContainer");
        const pdfNotesText = document.getElementById("pdfNotesText");
        if (pdfNotesContainer && pdfNotesText) {
            if (order.notes && order.notes.trim()) {
                pdfNotesText.textContent = order.notes.trim();
                pdfNotesContainer.style.display = "block";
            } else {
                pdfNotesContainer.style.display = "none";
            }
        }

        // Quantity Brackets Calculation for Production Orders
        const bracketsContainer = document.getElementById("pdfProductionBracketsContainer");
        const bracketsBody = document.getElementById("pdfProductionBracketsBody");
        if (bracketsContainer && bracketsBody) {
            if (!isOnline && order.quantity > 0) {
                bracketsContainer.style.display = "block";
                bracketsBody.innerHTML = "";

                // Determine quantity steps (support custom config if set)
                const baseQty = order.quantity;
                let tierQtys = [];
                const customBrackets = state.pricing_config?.production_brackets;
                if (customBrackets && Array.isArray(customBrackets) && customBrackets.length > 0) {
                    tierQtys = [baseQty, ...customBrackets];
                } else if (baseQty <= 100) {
                    tierQtys = [baseQty, 200, 500, 1000, 2000];
                } else if (baseQty <= 500) {
                    tierQtys = [baseQty, 1000, 2000, 5000, 10000];
                } else if (baseQty <= 1000) {
                    tierQtys = [baseQty, 2000, 3000, 5000, 10000];
                } else if (baseQty <= 2000) {
                    tierQtys = [baseQty, 3000, 5000, 10000, 20000];
                } else if (baseQty <= 5000) {
                    tierQtys = [baseQty, 7000, 10000, 20000, 50000];
                } else {
                    tierQtys = [
                        baseQty,
                        Math.round(baseQty * 1.5 / 1000) * 1000,
                        Math.round(baseQty * 2 / 1000) * 1000,
                        Math.round(baseQty * 3 / 1000) * 1000,
                        Math.round(baseQty * 5 / 1000) * 1000
                    ];
                }
                // Filter out duplicates and keep unique sorted
                tierQtys = [...new Set(tierQtys)].sort((a, b) => a - b);

                // Save active form inputs
                const currentFormSaved = window.captureCurrentFormInputs();

                // Get inputs to use (either order.quote_inputs or fallback)
                let inputsToUse = order.quote_inputs;
                if (!inputsToUse) {
                    inputsToUse = {
                        productType: "CAI_DAY",
                        dim1: order.length_mm ? (order.length_mm / 10).toString() : "10",
                        dim2: order.width_mm ? (order.width_mm / 10).toString() : "10",
                        dim3: "5",
                        dimExtra: "0",
                        qty: order.quantity.toString(),
                        batDai: "1",
                        batRong: "1",
                        paperWeight: "300",
                        paperPrice: "28",
                        machineSize: "B43/65",
                        plates: "4",
                        laminating: "25",
                        gluePrice: "150",
                        shipFee: "50000",
                        markup: "1.3"
                    };
                }

                // First calculate base unit price
                window.applyQuoteInputsToForm(inputsToUse, baseQty);
                const baseCalc = calculateRealtimeQuote(false);
                const baseUnitPrice = baseCalc ? baseCalc.unitPrice : 0;

                tierQtys.forEach(tQty => {
                    window.applyQuoteInputsToForm(inputsToUse, tQty);
                    const calc = calculateRealtimeQuote(false);
                    if (!calc) return;

                    const uPrice = calc.unitPrice;
                    const subtotal = calc.totalCost;
                    const totalVat = Math.round(subtotal * 1.08);
                    const savingsPerPc = baseUnitPrice - uPrice;
                    const isCurrent = tQty === baseQty;

                    const row = document.createElement("tr");
                    row.style.cursor = "pointer";
                    if (isCurrent) {
                        row.style.background = "#fffbe0";
                        row.style.fontWeight = "bold";
                    } else {
                        row.onmouseover = () => row.style.background = "#f0fdf4";
                        row.onmouseout = () => row.style.background = "";
                    }

                    const savingsText = isCurrent ? 
                        `<span style="background:#108f53; color:white; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Đơn hiện tại</span>` : 
                        (savingsPerPc > 0 
                            ? `<strong style="color:#d97706; display:block; margin-bottom:2px;">-${formatMoney(Math.round(savingsPerPc))}</strong><button type="button" style="background:#108f53; color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.72rem; cursor:pointer; font-weight:600;" onclick="event.stopPropagation(); window.applyProductionQuantityTier('${order.id}', ${tQty})">➕ Chọn mức này</button>` 
                            : `<button type="button" style="background:#108f53; color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.72rem; cursor:pointer; font-weight:600;" onclick="event.stopPropagation(); window.applyProductionQuantityTier('${order.id}', ${tQty})">➕ Chọn mức này</button>`);

                    row.innerHTML = `
                        <td style="padding:7px; border:1px solid #c2e5d3;">${tQty.toLocaleString('vi-VN')} SP</td>
                        <td style="padding:7px; border:1px solid #c2e5d3; text-align:right;">${formatMoney(uPrice)}</td>
                        <td style="padding:7px; border:1px solid #c2e5d3; text-align:right;">${formatMoney(subtotal)}</td>
                        <td style="padding:7px; border:1px solid #c2e5d3; text-align:right;">${formatMoney(totalVat)}</td>
                        <td style="padding:7px; border:1px solid #c2e5d3; text-align:right;">${savingsText}</td>
                    `;
                    row.onclick = () => window.applyProductionQuantityTier(order.id, tQty);
                    bracketsBody.appendChild(row);
                });

                // Restore active form inputs
                window.applyQuoteInputsToForm(currentFormSaved);
            } else {
                bracketsContainer.style.display = "none";
            }
        }
        
        const printAreaEl = document.getElementById("printArea");
        if (printAreaEl) {
            printAreaEl.classList.remove("full-view");
            printAreaEl.classList.add("scaled-preview");
            printAreaEl.style.cursor = "zoom-in";
        }
        
        openModal("onlineOrderInvoicePdfModal");
    } catch (err) {
        console.error("Lỗi kết xuất PDF hóa đơn:", err);
    }
};

window.applyProductionQuantityTier = function(orderId, newQty) {
    const order = (state.orders || []).find(o => o.id === orderId);
    if (!order) return;
    
    if (!confirm(`Xác nhận đổi số lượng đơn hàng ${order.order_number} sang ${newQty.toLocaleString('vi-VN')} SP?`)) {
        return;
    }
    
    // Save current form
    const currentFormSaved = window.captureCurrentFormInputs();
    let inputsToUse = order.quote_inputs;
    if (!inputsToUse) {
        inputsToUse = {
            productType: "CAI_DAY",
            dim1: order.length_mm ? (order.length_mm / 10).toString() : "10",
            dim2: order.width_mm ? (order.width_mm / 10).toString() : "10",
            dim3: "5",
            dimExtra: "0",
            qty: newQty.toString(),
            batDai: "1",
            batRong: "1",
            paperWeight: "300",
            paperPrice: "28",
            machineSize: "B43/65",
            plates: "4",
            laminating: "25",
            gluePrice: "150",
            shipFee: "50000",
            markup: "1.3"
        };
    }
    
    window.applyQuoteInputsToForm(inputsToUse, newQty);
    const calc = calculateRealtimeQuote(false);
    window.applyQuoteInputsToForm(currentFormSaved);
    
    if (calc) {
        order.quantity = newQty;
        order.subtotal = Math.round(calc.totalCost);
        order.total_amount = Math.round(calc.totalCost * 1.08);
        if (!order.quote_inputs) order.quote_inputs = inputsToUse;
        order.quote_inputs.qty = newQty.toString();
        
        saveState();
        syncWithServer();
        if (typeof showToast === 'function') {
            showToast(`✓ Đã đổi đơn hàng ${order.order_number} sang số lượng ${newQty.toLocaleString('vi-VN')} SP!`);
        } else {
            alert(`✓ Đã đổi đơn hàng ${order.order_number} sang số lượng ${newQty.toLocaleString('vi-VN')} SP!`);
        }
        openOnlineOrderInvoicePdf(orderId);
    }
};

window.openPricingConfigModal = function() {
    const config = state.pricing_config || DEFAULT_PRICING_CONFIG;
    
    // Set Production Tab fields
    const markupInput = document.getElementById("cfgProdDefaultMarkup");
    if (markupInput) {
        markupInput.value = config.production_markup || 1.30;
    }
    const plateInput = document.getElementById("cfgProdDefaultPlateCost");
    if (plateInput) {
        plateInput.value = config.production_plate_cost || 150000;
    }

    // Render Production Markup Ranges
    const markupTbody = document.getElementById("cfgProdMarkupRangesBody");
    if (markupTbody) {
        markupTbody.innerHTML = "";
        const ranges = config.production_markup_ranges || [
            { min_qty: 0, max_qty: 500, markup: 1.40 },
            { min_qty: 501, max_qty: 1000, markup: 1.35 },
            { min_qty: 1001, max_qty: 5000, markup: 1.30 },
            { min_qty: 5001, max_qty: null, markup: 1.25 }
        ];
        ranges.forEach(r => {
            window.addProdMarkupRangeRow(r.min_qty, r.max_qty || "", r.markup);
        });
    }

    // Render Production Discount Tiers
    const discountTbody = document.getElementById("cfgProdDiscountTiersBody");
    if (discountTbody) {
        discountTbody.innerHTML = "";
        const tiers = config.production_discount_tiers || [
            { min_qty: 1000, discount_percent: 2 },
            { min_qty: 5000, discount_percent: 5 },
            { min_qty: 10000, discount_percent: 8 }
        ];
        tiers.forEach(t => {
            window.addProdDiscountTierRow(t.min_qty, t.discount_percent);
        });
    }
    
    // Render Online Discount Tiers
    const tbody = document.getElementById("cfgOnlineDiscountTiersBody");
    if (tbody) {
        tbody.innerHTML = "";
        const tiers = config.online_discount_tiers || [
            { min_qty: 50, discount_percent: 5 },
            { min_qty: 100, discount_percent: 10 },
            { min_qty: 500, discount_percent: 15 }
        ];
        tiers.forEach(t => {
            window.addOnlineDiscountTierRow(t.min_qty, t.discount_percent);
        });
    }
    
    window.switchPricingConfigTab('prod');
    openModal("pricingConfigModal");
};

window.switchPricingConfigTab = function(tab) {
    const tabProd = document.getElementById("pricingConfigTab-prod");
    const tabOnline = document.getElementById("pricingConfigTab-online");
    const btnProd = document.getElementById("btnPricingTabProd");
    const btnOnline = document.getElementById("btnPricingTabOnline");
    
    if (tab === 'prod') {
        if (tabProd) tabProd.style.display = "block";
        if (tabOnline) tabOnline.style.display = "none";
        if (btnProd) btnProd.className = "btn btn-primary";
        if (btnOnline) btnOnline.className = "btn btn-secondary";
    } else {
        if (tabProd) tabProd.style.display = "none";
        if (tabOnline) tabOnline.style.display = "block";
        if (btnProd) btnProd.className = "btn btn-secondary";
        if (btnOnline) btnOnline.className = "btn btn-primary";
    }
};

window.addOnlineDiscountTierRow = function(minQty = 100, discountPct = 10) {
    const tbody = document.getElementById("cfgOnlineDiscountTiersBody");
    if (!tbody) return;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="padding: 6px;">
            <input type="number" class="form-input tier-min-qty" value="${minQty}" min="1" style="width:100%;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" class="form-input tier-pct" value="${discountPct}" min="0.1" max="99" step="0.5" style="width:100%;" required>
        </td>
        <td style="padding: 6px; text-align: center;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()" style="padding: 4px 8px;">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
};

window.addProdMarkupRangeRow = function(minQty = 1, maxQty = 500, markup = 1.30) {
    const tbody = document.getElementById("cfgProdMarkupRangesBody");
    if (!tbody) return;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="padding: 6px;">
            <input type="number" class="form-input range-min-qty" value="${minQty}" min="0" style="width:100%;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" class="form-input range-max-qty" value="${maxQty}" min="1" style="width:100%;" placeholder="Vô hạn">
        </td>
        <td style="padding: 6px;">
            <input type="number" class="form-input range-markup" value="${markup}" min="1" step="0.01" style="width:100%;" required>
        </td>
        <td style="padding: 6px; text-align: center;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()" style="padding: 4px 8px;">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
};

window.addProdDiscountTierRow = function(minQty = 1000, discountPct = 5) {
    const tbody = document.getElementById("cfgProdDiscountTiersBody");
    if (!tbody) return;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="padding: 6px;">
            <input type="number" class="form-input tier-min-qty" value="${minQty}" min="1" style="width:100%;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" class="form-input tier-pct" value="${discountPct}" min="0" max="100" step="0.5" style="width:100%;" required>
        </td>
        <td style="padding: 6px; text-align: center;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()" style="padding: 4px 8px;">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
};

window.savePricingConfigSettings = function() {
    try {
        const markup = parseFloat(document.getElementById("cfgProdDefaultMarkup")?.value) || 1.30;
        const plateCost = parseFloat(document.getElementById("cfgProdDefaultPlateCost")?.value) || 150000;
        
        const markupRows = document.querySelectorAll("#cfgProdMarkupRangesBody tr");
        const prodMarkupRanges = [];
        markupRows.forEach(tr => {
            const minQty = parseInt(tr.querySelector(".range-min-qty")?.value) || 0;
            const maxVal = tr.querySelector(".range-max-qty")?.value;
            const maxQty = maxVal ? parseInt(maxVal) : null;
            const mk = parseFloat(tr.querySelector(".range-markup")?.value) || 1.30;
            prodMarkupRanges.push({ min_qty: minQty, max_qty: maxQty, markup: mk });
        });
        prodMarkupRanges.sort((a, b) => a.min_qty - b.min_qty);

        const discountRows = document.querySelectorAll("#cfgProdDiscountTiersBody tr");
        const prodDiscountTiers = [];
        discountRows.forEach(tr => {
            const minQty = parseInt(tr.querySelector(".tier-min-qty")?.value) || 0;
            const pct = parseFloat(tr.querySelector(".tier-pct")?.value) || 0;
            if (minQty > 0) {
                prodDiscountTiers.push({ min_qty: minQty, discount_percent: pct });
            }
        });
        prodDiscountTiers.sort((a, b) => a.min_qty - b.min_qty);

        const tierRows = document.querySelectorAll("#cfgOnlineDiscountTiersBody tr");
        const onlineTiers = [];
        tierRows.forEach(tr => {
            const minQty = parseInt(tr.querySelector(".tier-min-qty")?.value) || 0;
            const pct = parseFloat(tr.querySelector(".tier-pct")?.value) || 0;
            if (minQty > 0 && pct > 0) {
                onlineTiers.push({ min_qty: minQty, discount_percent: pct });
            }
        });
        onlineTiers.sort((a, b) => a.min_qty - b.min_qty);
        
        state.pricing_config = {
            production_brackets: [500, 1000, 2000, 5000, 10000],
            production_markup: markup,
            production_plate_cost: plateCost,
            production_markup_ranges: prodMarkupRanges,
            production_discount_tiers: prodDiscountTiers,
            online_discount_tiers: onlineTiers
        };
        
        state.save("pricing_config", state.pricing_config);
        syncWithServer();
        
        closeModal("pricingConfigModal");
        if (typeof showToast === 'function') {
            showToast("✓ Đã lưu cấu hình giá & chiết khấu thành công!");
        } else {
            alert("✓ Đã lưu cấu hình giá & chiết khấu thành công!");
        }
    } catch (e) {
        console.error("Lỗi savePricingConfigSettings:", e);
        alert("Lỗi lưu cấu hình: " + e.message);
    }
};

window.saveOnlineOrderDraft = function() {
    try {
        const modal = document.getElementById("onlineOrderInvoicePdfModal");
        const orderId = modal?.dataset.orderId;
        if (!orderId) {
            alert("Lỗi: Không tìm thấy ID đơn hàng.");
            return;
        }
        const order = state.online_orders.find(o => o.id === orderId);
        if (!order) {
            alert("Lỗi: Đơn hàng không tồn tại.");
            return;
        }
        
        order.payment_status = "DRAFT";
        state.updateState("online_orders", state.online_orders);
        
        const std = state.orders.find(o => o.id === orderId);
        if (std) {
            std.status = "WAITING_QUOTE";
            state.updateState("orders", state.orders);
        }
        
        closeModal("onlineOrderInvoicePdfModal");
        renderOnlineSales();
        try {
            if (typeof renderQuotes === "function") renderQuotes();
            if (typeof renderProdOrders === "function") renderProdOrders();
            if (typeof renderKanban === "function") renderKanban();
            if (typeof renderCRM === "function") renderCRM();
            if (typeof renderAll === "function") renderAll();
        } catch (uiErr) {
            console.error(uiErr);
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi lưu nháp: " + e.message);
    }
};

window.quickExportInvoiceMisa = function() {
    try {
        const modal = document.getElementById("onlineOrderInvoicePdfModal");
        const orderId = modal?.dataset.orderId;
        if (!orderId) {
            alert("Lỗi: Không tìm thấy ID đơn hàng.");
            return;
        }
        const order = state.online_orders.find(o => o.id === orderId);
        if (!order) {
            alert("Lỗi: Đơn hàng không tồn tại.");
            return;
        }
        
        const invoiceNum = "HD-MISA-202606-" + Math.floor(1000 + Math.random() * 9000);
        alert("Đang kết nối hệ thống MISA SME / MISA meInvoice...\nĐã đồng bộ dữ liệu hóa đơn thành công!\nMã hóa đơn phát hành điện tử: " + invoiceNum);
        
        order.kanban_status = "INVOICE";
        order.misa_invoice_number = invoiceNum; // Store invoice number for tracking
        state.updateState("online_orders", state.online_orders);
        
        const std = state.orders.find(o => o.id === orderId);
        if (std) {
            std.status = "DELIVERED";
            state.updateState("orders", state.orders);
        }
        
        closeModal("onlineOrderInvoicePdfModal");
        renderOnlineSales();
        if (window.renderOnlineInvoices) window.renderOnlineInvoices();
        try {
            if (typeof renderQuotes === "function") renderQuotes();
            if (typeof renderProdOrders === "function") renderProdOrders();
            if (typeof renderKanban === "function") renderKanban();
            if (typeof renderCRM === "function") renderCRM();
            if (typeof renderAll === "function") renderAll();
        } catch (uiErr) {
            console.error(uiErr);
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi xuất hóa đơn Misa: " + e.message);
    }
};

window.quickPaymentForOnlineOrder = function() {
    try {
        const modal = document.getElementById("onlineOrderInvoicePdfModal");
        const orderId = modal?.dataset.orderId;
        if (!orderId) {
            alert("Lỗi: Không tìm thấy ID đơn hàng.");
            return;
        }
        
        closeModal("onlineOrderInvoicePdfModal");
        window.openOrderPaymentModal(orderId);
    } catch (e) {
        console.error(e);
        alert("Lỗi chuyển giao dịch thanh toán: " + e.message);
    }
};

window.printInvoice = function() {
    const printContent = document.getElementById("printArea").innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Basic dynamic window printing that isolates printArea and maintains styling
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write('<html><head><title>In Hóa Đơn</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: 'Be Vietnam Pro', sans-serif; background: #fff; padding: 20px; color: #111; }
        @media print {
            body { padding: 0; margin: 0; }
            button { display: none; }
        }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};

window.copyInvoiceLink = function() {
    try {
        const orderNo = document.getElementById("pdfOrderNumber")?.textContent || "SO-ON-001";
        const shareLink = `${window.location.origin}${window.location.pathname}?order=${orderNo}`;
        navigator.clipboard.writeText(shareLink).then(() => {
            alert("Đã sao chép link hóa đơn vào bộ nhớ tạm: " + shareLink);
        }).catch(err => {
            const tempInput = document.createElement("input");
            tempInput.value = shareLink;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
            alert("Đã sao chép link hóa đơn vào bộ nhớ tạm: " + shareLink);
        });
    } catch (e) {
        console.error(e);
        alert("Lỗi khi sao chép link: " + e.message);
    }
};

window.shareToZalo = function() {
    try {
        const orderNo = document.getElementById("pdfOrderNumber")?.textContent || "SO-ON-001";
        const shareLink = `${window.location.origin}${window.location.pathname}?order=${orderNo}`;
        const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(shareLink)}`;
        window.open(zaloUrl, '_blank');
    } catch (e) {
        console.error(e);
        alert("Lỗi khi chia sẻ Zalo: " + e.message);
    }
};

window.toggleAppTheme = function() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("ihp_app_theme", newTheme);
    window.syncThemeToggleIcons();
};

window.syncThemeToggleIcons = function() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const lightIcons = document.querySelectorAll(".theme-icon-light");
    const darkIcons = document.querySelectorAll(".theme-icon-dark");
    
    if (currentTheme === "dark") {
        lightIcons.forEach(i => i.style.display = "none");
        darkIcons.forEach(i => i.style.display = "block");
    } else {
        lightIcons.forEach(i => i.style.display = "block");
        darkIcons.forEach(i => i.style.display = "none");
    }
};

// Sync icons immediately on script parse if DOM is loaded, or inside DOMContentLoaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.syncThemeToggleIcons);
} else {
    setTimeout(window.syncThemeToggleIcons, 10);
}

window.toggleInvoiceZoom = function() {
    const printArea = document.getElementById("printArea");
    if (!printArea) return;
    if (window.innerWidth > 768) return; // Only zoom on mobile viewports
    
    if (printArea.classList.contains("scaled-preview")) {
        printArea.classList.remove("scaled-preview");
        printArea.classList.add("full-view");
        printArea.style.cursor = "zoom-out";
    } else {
        printArea.classList.remove("full-view");
        printArea.classList.add("scaled-preview");
        printArea.style.cursor = "zoom-in";
    }
};

window.payOnlineOrder = function(orderId) {
    const order = state.online_orders.find(o => o.id === orderId);
    if (!order) return;
    
    const payments = state.transactions.filter(t => t.reference_id === order.id && t.type === 'RECEIPT');
    const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
    const remainingDebt = Math.max(0, order.total_amount - totalPaid);
    
    if (remainingDebt <= 0) {
        alert("Đơn hàng này đã được thanh toán đầy đủ.");
        return;
    }
    
    const amountStr = prompt(`Đơn hàng ${order.order_number} cần thanh toán thêm.\nCòn nợ: ${formatMoney(remainingDebt)}\nNhập số tiền muốn thanh toán:`, remainingDebt);
    if (amountStr === null) return; // Cancelled
    
    const payAmount = parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) || 0;
    if (payAmount <= 0) {
        alert("Số tiền không hợp lệ.");
        return;
    }
    
    if (payAmount > remainingDebt) {
        if (!confirm(`Số tiền thanh toán (${formatMoney(payAmount)}) lớn hơn số nợ còn lại (${formatMoney(remainingDebt)}). Tiếp tục?`)) {
            return;
        }
    }
    
    const method = confirm("Thanh toán qua CHUYỂN KHOẢN (OK) hay TIỀN MẶT (Cancel)?") ? "BANK_TRANSFER" : "CASH";
    
    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txNumber = `PT-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);
    
    const receiptTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: "RECEIPT",
        category: "CUSTOMER_FINAL",
        amount: payAmount,
        payment_method: method,
        account_source: method === "CASH" ? "CASH" : "VCB",
        partner_id: order.customer_id,
        reference_id: order.id,
        created_by: order.salesperson || "Kế toán"
    };
    
    state.transactions = [receiptTx, ...state.transactions];
    state.updateState("transactions", state.transactions);
    
    // Automatically synchronize payment status and state for both tables
    window.syncOrderPaymentStatus(orderId);
    
    renderOnlineSales();
    renderCustomerDebts();
    try {
        if (typeof renderKanban === "function") renderKanban();
        if (typeof renderCRM === "function") renderCRM();
        if (typeof renderAll === "function") renderAll();
    } catch (e) {
        console.error("UI sync error in payOnlineOrder:", e);
    }
};
window.cancelOnlineOrder = function(orderId) {
    const order = state.online_orders.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.kanban_status === "CANCELLED") {
        alert("Đơn hàng này đã bị hủy trước đó.");
        return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn hủy đơn hàng online ${order.order_number}? Hệ thống sẽ tự động hoàn kho sản phẩm.`)) {
        order.items.forEach(item => {
            const prod = state.online_products.find(p => p.sku === item.sku);
            if (prod) {
                prod.stock_qty += item.qty;
                const logId = "log_" + Math.random().toString(36).substring(2, 9);
                const newLog = {
                    id: logId,
                    created_at: new Date().toISOString(),
                    sku: item.sku,
                    type: "ADJUST",
                    qty: item.qty,
                    note: `Hoàn tồn kho do hủy đơn ${order.order_number}`
                };
                state.online_stock_logs.push(newLog);
            }
        });
        
        order.kanban_status = "CANCELLED";
        order.payment_status = "CANCELLED";
        
        const std = state.orders.find(o => o.id === orderId);
        if (std) {
            std.status = "CANCELLED";
            state.updateState("orders", state.orders);
        }
        
        state.productions = state.productions.filter(p => p.sales_order_id !== orderId);
        state.updateState("productions", state.productions);
        
        state.updateState("online_orders", state.online_orders);
        state.updateState("online_products", state.online_products);
        state.updateState("online_stock_logs", state.online_stock_logs);
        
        renderOnlineSales();
        renderOnlineProducts();
        renderOnlineStockLogs();
        try {
            if (typeof renderQuotes === "function") renderQuotes();
            if (typeof renderProdOrders === "function") renderProdOrders();
            if (typeof renderKanban === "function") renderKanban();
            if (typeof renderCRM === "function") renderCRM();
            if (typeof renderAll === "function") renderAll();
        } catch (uiErr) {
            console.error(uiErr);
        }
    }
};

window.deleteOnlineOrder = function(orderId) {
    const orderIndex = state.online_orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    
    const order = state.online_orders[orderIndex];
    if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng online ${order.order_number}?`)) {
        if (order.kanban_status !== "CANCELLED") {
            order.items.forEach(item => {
                const prod = state.online_products.find(p => p.sku === item.sku);
                if (prod) {
                    prod.stock_qty += item.qty;
                    const logId = "log_" + Math.random().toString(36).substring(2, 9);
                    const newLog = {
                        id: logId,
                        created_at: new Date().toISOString(),
                        sku: item.sku,
                        type: "ADJUST",
                        qty: item.qty,
                        note: `Hoàn tồn kho do xóa đơn ${order.order_number}`
                    };
                    state.online_stock_logs.push(newLog);
                }
            });
        }
        
        state.orders = state.orders.filter(o => o.id !== orderId);
        state.updateState("orders", state.orders);
        
        state.productions = state.productions.filter(p => p.sales_order_id !== orderId);
        state.updateState("productions", state.productions);
        
        state.transactions = state.transactions.filter(t => t.reference_id !== orderId);
        state.updateState("transactions", state.transactions);
        
        state.online_orders.splice(orderIndex, 1);
        state.updateState("online_orders", state.online_orders);
        state.updateState("online_products", state.online_products);
        state.updateState("online_stock_logs", state.online_stock_logs);
        
        renderOnlineSales();
        renderOnlineProducts();
        renderOnlineStockLogs();
        try {
            if (typeof renderQuotes === "function") renderQuotes();
            if (typeof renderProdOrders === "function") renderProdOrders();
            if (typeof renderKanban === "function") renderKanban();
            if (typeof renderCRM === "function") renderCRM();
            if (typeof renderAll === "function") renderAll();
        } catch (uiErr) {
            console.error(uiErr);
        }
    }
};

window.deleteOnlineProduct = function(sku) {
    const cleanSku = String(sku).trim().toUpperCase();
    const prodIndex = state.online_products.findIndex(p => String(p.sku).trim().toUpperCase() === cleanSku);
    if (prodIndex === -1) return;
    
    const prod = state.online_products[prodIndex];
    if (confirm(`Bạn có chắc chắn muốn xóa hàng hóa ${prod.name} (${sku})?`)) {
        state.online_products.splice(prodIndex, 1);
        state.updateState("online_products", state.online_products);
        renderOnlineProducts();
    }
};

window.editOnlineProduct = function(sku) {
    window.openNewOnlineProductModal("EDIT", String(sku));
};

window.importOnlineStockFromTable = function(sku) {
    window.openOnlineImportStockModal();
    const productSelect = document.getElementById("onlineImportProduct");
    if (productSelect) {
        productSelect.value = String(sku);
    }
};

function handleOnlineProductSubmit(e) {
    e.preventDefault();
    const action = document.getElementById("onlineProductAction").value;
    const sku = document.getElementById("onlineProductSku").value.trim().toUpperCase();
    const name = document.getElementById("onlineProductName").value.trim();
    const unit = document.getElementById("onlineProductUnit").value.trim();
    const price = parseFloat(document.getElementById("onlineProductPrice").value) || 0;
    const wholesalePrice = parseFloat(document.getElementById("onlineProductWholesalePrice").value) || 0;
    const minStock = parseInt(document.getElementById("onlineProductMinStock").value) || 0;
    const barcode = document.getElementById("onlineProductBarcode").value.trim();
    
    const imgPreview = document.getElementById("onlineProductImagePreview");
    const image = (imgPreview && imgPreview.style.display !== "none") ? imgPreview.src : "";
    
    if (action === "ADD") {
        if (state.online_products.some(p => p.sku === sku)) {
            alert("Mã SKU này đã tồn tại.");
            return;
        }
        const initialStock = parseInt(document.getElementById("onlineProductStockQty").value) || 0;
        const newProd = {
            sku,
            image,
            barcode,
            name,
            unit,
            price,
            wholesale_price: wholesalePrice,
            stock_qty: initialStock,
            min_stock_qty: minStock
        };
        state.online_products.push(newProd);
        
        if (initialStock > 0) {
            const logId = "log_" + Math.random().toString(36).substring(2, 9);
            state.online_stock_logs.push({
                id: logId,
                created_at: new Date().toISOString(),
                sku,
                type: "IMPORT",
                qty: initialStock,
                note: "Nhập số lượng tồn khởi tạo"
            });
            state.updateState("online_stock_logs", state.online_stock_logs);
        }
    } else {
        const prod = state.online_products.find(p => p.sku === sku);
        if (prod) {
            prod.name = name;
            prod.unit = unit;
            prod.price = price;
            prod.wholesale_price = wholesalePrice;
            prod.min_stock_qty = minStock;
            prod.barcode = barcode;
            prod.image = image;
        }
    }
    
    state.updateState("online_products", state.online_products);
    document.getElementById("onlineProductModal")?.classList.remove("active");
    renderOnlineProducts();
}

function handleOnlineImportStockSubmit(e) {
    e.preventDefault();
    const sku = document.getElementById("onlineImportProduct").value;
    const qty = parseInt(document.getElementById("onlineImportQty").value) || 0;
    const note = document.getElementById("onlineImportNote").value.trim();
    const source = document.getElementById("onlineImportSource")?.value || "EXTERNAL_SUPPLIER";
    
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    prod.stock_qty += qty;
    
    let sourceLabel = "[Tự sản xuất]";
    if (source === "EXTERNAL_SUPPLIER") {
        const supplierName = document.getElementById("onlineImportSupplier")?.value || "NCC Khác";
        sourceLabel = `[NCC: ${supplierName}]`;
    }
    const fullNote = `${sourceLabel} ${note}`;
    
    const logId = "log_" + Math.random().toString(36).substring(2, 9);
    const newLog = {
        id: logId,
        created_at: new Date().toISOString(),
        sku,
        type: "IMPORT",
        qty,
        note: fullNote
    };
    state.online_stock_logs.push(newLog);
    
    state.updateState("online_products", state.online_products);
    state.updateState("online_stock_logs", state.online_stock_logs);
    
    document.getElementById("onlineImportStockModal")?.classList.remove("active");
    renderOnlineProducts();
    renderOnlineStockLogs();
}

window.renderOnlineSales = function() {
    const tableBody = document.querySelector("#onlineOrdersTable tbody");
    if (!tableBody) return;
    
    // Automatically synchronize payment status based on receipts before rendering
    (state.online_orders || []).forEach(o => {
        if (o && o.id) {
            window.syncOrderPaymentStatus(o.id);
        }
    });
    
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineOrderSearchInput")?.value.toLowerCase() || "";
    
    let totalSales = 0;
    let totalCommission = 0;
    const salesPerformance = {};
    const ctvPerformance = {};
    
    state.online_orders.forEach(o => {
        totalSales += o.total_amount;
        const comm = o.commission_amount || 0;
        totalCommission += comm;
        
        if (o.salesperson) {
            const spObj = state.salespersons.find(s => s.name === o.salesperson || s.code === o.salesperson);
            const isCollaborator = spObj ? spObj.role === "COLLABORATOR" : (o.salesperson.includes("CTV") || o.salesperson === "Van Minh");
            if (isCollaborator) {
                ctvPerformance[o.salesperson] = (ctvPerformance[o.salesperson] || 0) + comm;
            } else {
                salesPerformance[o.salesperson] = (salesPerformance[o.salesperson] || 0) + comm;
            }
        }
    });
    
    let topSales = "N/A";
    let maxComm = -1;
    for (const sp in salesPerformance) {
        if (salesPerformance[sp] > maxComm) {
            maxComm = salesPerformance[sp];
            topSales = `${sp} (${formatMoney(maxComm)})`;
        }
    }
    
    let topCTV = "N/A";
    let maxCTVComm = -1;
    for (const ctv in ctvPerformance) {
        if (ctvPerformance[ctv] > maxCTVComm) {
            maxCTVComm = ctvPerformance[ctv];
            topCTV = `${ctv} (${formatMoney(maxCTVComm)})`;
        }
    }
    
    const lblTotalSales = document.getElementById("lblOnlineTotalSales");
    const lblTotalCommission = document.getElementById("lblOnlineTotalCommission");
    const lblTopSales = document.getElementById("lblOnlineTopSales");
    const lblTopCTV = document.getElementById("lblOnlineTopCTV");
    
    if (lblTotalSales) lblTotalSales.textContent = formatMoney(totalSales);
    if (lblTotalCommission) lblTotalCommission.textContent = formatMoney(totalCommission);
    if (lblTopSales) lblTopSales.textContent = topSales;
    if (lblTopCTV) lblTopCTV.textContent = topCTV;
    
    const statusFilter = document.getElementById("onlineOrderStatusFilter")?.value || "";
    const filteredOrders = state.online_orders.filter(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const customerName = customer ? customer.name.toLowerCase() : "";
        const matchesQuery = o.order_number.toLowerCase().includes(query) || customerName.includes(query) || (o.salesperson || "").toLowerCase().includes(query);
        
        const oStatus = o.kanban_status || (o.payment_status === "PAID" ? "PAYMENT" : "ORDER");
        const matchesStatus = !statusFilter || oStatus === statusFilter;
        
        return matchesQuery && matchesStatus;
    });
    
    filteredOrders.forEach(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const custName = customer ? customer.name : "Khách vãng lai";
        const productsStr = o.items.map(item => {
            const prod = state.online_products.find(p => p.sku === item.sku);
            return `${prod ? prod.name : item.sku} (x${item.qty})`;
        }).join(", ");
        
        const row = document.createElement("tr");
        
        let payBadge = '';
        if (o.kanban_status === "CANCELLED") {
            payBadge = '<span class="badge badge-danger" style="background:#ef4444; color:#fff;">Đã hủy</span>';
        } else if (o.payment_status === "DRAFT") {
            payBadge = '<span class="badge badge-secondary" style="background:#6b7280; color:#fff;">Lưu nháp</span>';
        } else {
            let statusText = "";
            let badgeClass = "";
            let badgeStyle = "";
            if (o.payment_status === "PAID") {
                statusText = "Đã thanh toán";
                badgeClass = "badge-success";
            } else if (o.payment_status === "PARTIALLY_PAID") {
                const payments = state.transactions.filter(t => t.reference_id === o.id && t.type === 'RECEIPT');
                const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
                statusText = `T.Toán 1 phần (${formatMoney(totalPaid)})`;
                badgeClass = "badge-warning";
                badgeStyle = "background:#d97706; color:#fff;";
            } else {
                statusText = "Ghi nợ";
                badgeClass = "badge-danger";
            }
            
            payBadge = `<span class="badge ${badgeClass}" style="${badgeStyle}">${statusText}</span>`;
            
            const kb = o.kanban_status || "ORDER";
            if (kb === "DESIGN") {
                payBadge += `<div style="font-size:0.75rem; color:#3b82f6; margin-top:4px; font-weight:600;">🛠️ Đang thiết kế</div>`;
            } else if (kb === "PRODUCTION") {
                payBadge += `<div style="font-size:0.75rem; color:#8b5cf6; margin-top:4px; font-weight:600;">🏭 Đang sản xuất</div>`;
            } else if (kb === "SHIPPING") {
                payBadge += `<div style="font-size:0.75rem; color:#f59e0b; margin-top:4px; font-weight:600;">🚚 Đang giao hàng</div>`;
            } else if (kb === "COMPLETED") {
                payBadge += `<div style="font-size:0.75rem; color:#10b981; margin-top:4px; font-weight:600;">✅ Đã hoàn thành</div>`;
            }
        }
            
        const viewPdfButton = `<button class="btn-icon" onclick="openOnlineOrderInvoicePdf('${o.id}')" title="Xem Hóa Đơn PDF"><i data-lucide="file-text" style="color:var(--info);"></i></button>`;
        const editButton = `<button class="btn-icon" onclick="window.openNewOnlineOrderModal('EDIT', '${o.id}')" title="Sửa đơn hàng"><i data-lucide="edit" style="color:var(--accent);"></i></button>`;
        const contractButton = `<button class="btn-icon" onclick="window.quickCreateContract('${o.id}', true)" title="Làm hợp đồng nhanh"><i data-lucide="file-signature" style="color:#6366f1;"></i></button>`;
        
        let payButton = '';
        if (o.payment_status !== "PAID" && o.kanban_status !== "CANCELLED") {
            payButton = `<button class="btn-icon" onclick="payOnlineOrder('${o.id}')" title="Thanh toán"><i data-lucide="check-circle" style="color:var(--success);"></i></button>`;
        }
        
        let cancelButton = '';
        if (o.kanban_status !== "CANCELLED") {
            cancelButton = `<button class="btn-icon" onclick="window.cancelOnlineOrder('${o.id}')" title="Hủy đơn hàng"><i data-lucide="x-circle" style="color:#d97706;"></i></button>`;
        }
        
        let actionButtons = `<div style="display:flex; gap:6px;">${viewPdfButton}${editButton}${payButton}${cancelButton}${contractButton}</div>`;
            
        const payments = state.transactions.filter(t => t.reference_id === o.id && t.type === 'RECEIPT');
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
        const remainingDebt = Math.max(0, o.total_amount - totalPaid);

        row.innerHTML = `
            <td><strong>${o.order_number}</strong></td>
            <td>${new Date(o.created_at).toLocaleString('vi-VN')}</td>
            <td>${custName}</td>
            <td>${productsStr}</td>
            <td>
                <div><strong>${o.salesperson || "Chưa phân công"}</strong></div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">Hoa hồng: ${o.commission_rate}% (${formatMoney(o.commission_amount || 0)})</div>
            </td>
            <td><strong>${formatMoney(o.total_amount)}</strong></td>
            <td style="color:${remainingDebt > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">${formatMoney(remainingDebt)}</td>
            <td>${payBadge}</td>
            <td>
                <div class="card-actions-row">
                    ${actionButtons}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("Lucide error in renderOnlineSales:", e);
        }
    }
    if (window.activeOnlineSalesView === "KANBAN") {
        renderOnlineSalesKanban(filteredOrders);
    } else if (window.activeOnlineSalesView === "CALENDAR") {
        window.renderOnlineOrdersCalendar();
    }
};

window.renderOnlineProducts = function() {
    const tableBody = document.querySelector("#onlineProductsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineProductSearchInput")?.value.toLowerCase() || "";
    
    const filteredProducts = (state.online_products || []).filter(p => {
        if (!p) return false;
        const sku = String(p.sku || "").toLowerCase();
        const name = String(p.name || "").toLowerCase();
        return sku.includes(query) || name.includes(query);
    });
    
    filteredProducts.forEach(prod => {
        const row = document.createElement("tr");
        const isLow = prod.stock_qty < prod.min_stock_qty;
        
        let imgHtml = ``;
        if (prod.image) {
            imgHtml = `<img src="${prod.image}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color); cursor:pointer;" onclick="viewFullOnlineProductImage('${prod.sku}')">`;
        } else {
            imgHtml = `<div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.04); border-radius:4px; border:1px dashed var(--border-color); color:var(--text-secondary);"><i data-lucide="image" style="width:14px; height:14px;"></i></div>`;
        }
        
        row.innerHTML = `
            <td><strong>${prod.sku}</strong></td>
            <td>${imgHtml}</td>
            <td>${prod.barcode || 'N/A'}</td>
            <td>${prod.name}</td>
            <td>${prod.unit}</td>
            <td>${formatMoney(prod.price)}</td>
            <td>${formatMoney(prod.wholesale_price)}</td>
            <td><strong class="${isLow ? 'text-danger' : 'text-success'}">${prod.stock_qty}</strong> / ${prod.min_stock_qty}</td>
            <td>
                <div class="card-actions-row">
                    <button class="btn-icon" onclick="editOnlineProduct('${prod.sku}')" title="Sửa thông tin"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="importOnlineStockFromTable('${prod.sku}')" title="Nhập thêm kho"><i data-lucide="plus-circle"></i></button>
                    <button class="btn-icon" onclick="deleteOnlineProduct('${prod.sku}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
};

window.viewFullOnlineProductImage = function(sku) {
    const prod = state.online_products.find(p => p.sku === sku);
    if (prod && prod.image) {
        const w = window.open();
        if (!w) {
            alert("Vui lòng cho phép popup để xem ảnh sản phẩm kích thước đầy đủ.");
            return;
        }
        w.document.title = "Hình ảnh sản phẩm " + prod.name;
        w.document.body.style.margin = "0";
        w.document.body.style.display = "flex";
        w.document.body.style.justifyContent = "center";
        w.document.body.style.alignItems = "center";
        w.document.body.style.background = "#1a1a1a";
        w.document.body.style.height = "100vh";
        
        const img = w.document.createElement("img");
        img.src = prod.image;
        img.style.maxWidth = "90%";
        img.style.maxHeight = "90vh";
        img.style.borderRadius = "8px";
        img.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
        w.document.body.appendChild(img);
    }
};


// ==========================================================================
// REDESIGNED STOCK MANAGEMENT: KHO HÀNG (TỔNG NHẬP, TỔNG XUẤT, TỒN KHO)
// ==========================================================================
window.stockViewMode = "SUMMARY"; // default mode

window.toggleStockViewMode = function() {
    const summaryContainer = document.getElementById("onlineStockSummaryContainer");
    const logsContainer = document.getElementById("onlineStockLogsContainer");
    const lblMode = document.getElementById("lblStockViewMode");
    
    if (window.stockViewMode === "SUMMARY") {
        window.stockViewMode = "LOGS";
        if (summaryContainer) summaryContainer.style.display = "none";
        if (logsContainer) logsContainer.style.display = "block";
        if (lblMode) lblMode.textContent = "Xem Tổng hợp";
    } else {
        window.stockViewMode = "SUMMARY";
        if (summaryContainer) summaryContainer.style.display = "block";
        if (logsContainer) logsContainer.style.display = "none";
        if (lblMode) lblMode.textContent = "Xem Nhật ký";
        window.renderOnlineStock();
    }
};

window.renderOnlineStock = function() {
    const tableBody = document.querySelector("#onlineStockSummaryTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineStockSearchInput")?.value.toLowerCase() || "";
    
    state.online_products.forEach(p => {
        // Calculate total import and export from logs for this SKU
        const productLogs = (state.online_stock_logs || []).filter(log => log.sku === p.sku);
        
        const totalImport = productLogs
            .filter(log => log.type === "IMPORT")
            .reduce((sum, log) => sum + Math.abs(log.qty), 0);
            
        const totalExport = productLogs
            .filter(log => log.type === "EXPORT")
            .reduce((sum, log) => sum + Math.abs(log.qty), 0);
            
        const qtyStr = `${p.stock_qty} ${p.unit || 'cái'}`;
        const matchText = `${p.sku} ${p.name} +${totalImport} -${totalExport} ${qtyStr}`.toLowerCase();
        
        if (query && !matchText.includes(query)) {
            return;
        }
            
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${p.sku}</strong></td>
            <td>${p.name}</td>
            <td style="text-align:center; color:var(--success); font-weight:600;">+${totalImport}</td>
            <td style="text-align:center; color:var(--danger); font-weight:600;">-${totalExport}</td>
            <td style="text-align:center; font-weight:700; font-size:1.05rem;">${p.stock_qty} ${p.unit || 'cái'}</td>
        `;
        tableBody.appendChild(row);
    });
};

window.openOnlineExportStockModal = function() {
    const modal = document.getElementById("onlineExportStockModal");
    if (!modal) return;
    
    const form = document.getElementById("onlineExportStockForm");
    form?.reset();
    
    const productSelect = document.getElementById("onlineExportProduct");
    if (productSelect) {
        productSelect.innerHTML = "";
        state.online_products.forEach(p => {
            productSelect.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
        });
    }

    // Load customer options
    const customerSelect = document.getElementById("onlineExportCustomer");
    if (customerSelect) {
        customerSelect.innerHTML = "";
        const customers = (state.partners || []).filter(p => p.role === "CUSTOMER" || p.role === "BOTH");
        customers.forEach(c => {
            customerSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }

    // Toggle customer selection group based on export type
    const exportTypeSelect = document.getElementById("onlineExportType");
    const customerGroup = document.getElementById("onlineExportCustomerGroup");
    const customerInput = document.getElementById("onlineExportCustomer");
    if (exportTypeSelect && customerGroup && customerInput) {
        const toggleGroup = () => {
            if (exportTypeSelect.value === "CUSTOMER_DELIVERY") {
                customerGroup.style.display = "block";
                customerInput.required = true;
            } else {
                customerGroup.style.display = "none";
                customerInput.required = false;
            }
        };
        exportTypeSelect.onchange = toggleGroup;
        toggleGroup();
    }
    
    modal.classList.add("active");
};

function handleOnlineExportStockSubmit(e) {
    e.preventDefault();
    const sku = document.getElementById("onlineExportProduct").value;
    const qty = parseInt(document.getElementById("onlineExportQty").value) || 0;
    const note = document.getElementById("onlineExportNote").value.trim();
    const exportType = document.getElementById("onlineExportType")?.value || "CUSTOMER_DELIVERY";
    
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    if (prod.stock_qty < qty) {
        alert(`Lỗi: Số lượng xuất kho (${qty}) vượt quá số lượng tồn kho hiện tại (${prod.stock_qty})!`);
        return;
    }
    
    prod.stock_qty -= qty; // Deduct from stock
    
    let sourceLabel = "[Xuất nội bộ]";
    if (exportType === "CUSTOMER_DELIVERY") {
        const customerName = document.getElementById("onlineExportCustomer")?.value || "Khách vãng lai";
        sourceLabel = `[Xuất KH: ${customerName}]`;
    }
    const fullNote = `${sourceLabel} ${note}`;
    
    const logId = "log_" + Math.random().toString(36).substring(2, 9);
    const newLog = {
        id: logId,
        created_at: new Date().toISOString(),
        sku,
        type: "EXPORT",
        qty: -qty, // negative quantity representing export
        note: fullNote
    };
    
    state.online_stock_logs.push(newLog);
    state.updateState("online_products", state.online_products);
    state.updateState("online_stock_logs", state.online_stock_logs);
    
    closeModal("onlineExportStockModal");
    window.renderOnlineStock();
    window.renderOnlineStockLogs();
    renderOnlineProducts(); // sync products view
}

// Bind submit event for export form on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("onlineExportStockForm")?.addEventListener("submit", handleOnlineExportStockSubmit);
});

window.renderOnlineStockLogs = function() {
    const tableBody = document.querySelector("#onlineStockLogsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineStockSearchInput")?.value.toLowerCase() || "";
    
    const sortedLogs = [...state.online_stock_logs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    const filteredLogs = sortedLogs.filter(log => {
        const prod = state.online_products.find(p => p.sku === log.sku);
        const prodName = prod ? prod.name : "";
        const timeStr = new Date(log.created_at).toLocaleString('vi-VN');
        
        let typeStr = "Nhập kho";
        if (log.type === "EXPORT") typeStr = "Xuất kho";
        else if (log.type === "ADJUST") typeStr = "Điều chỉnh";
        
        const qtyStr = `${log.qty > 0 ? '+' : ''}${log.qty}`;
        const noteStr = log.note || "";
        
        const matchText = `${timeStr} ${log.sku} ${prodName} ${typeStr} ${qtyStr} ${noteStr}`.toLowerCase();
        return matchText.includes(query);
    });
    
    filteredLogs.forEach(log => {
        const prod = state.online_products.find(p => p.sku === log.sku);
        const row = document.createElement("tr");
        
        let typeBadge = `<span class="badge badge-success">Nhập kho</span>`;
        if (log.type === "EXPORT") {
            typeBadge = `<span class="badge badge-danger">Xuất kho</span>`;
        } else if (log.type === "ADJUST") {
            typeBadge = `<span class="badge badge-warning">Điều chỉnh</span>`;
        }
        
        row.innerHTML = `
            <td>${new Date(log.created_at).toLocaleString('vi-VN')}</td>
            <td><strong>${log.sku}</strong> - ${prod ? prod.name : 'Sản phẩm đã bị xóa'}</td>
            <td>${typeBadge}</td>
            <td><strong>${log.qty > 0 ? '+' : ''}${log.qty}</strong></td>
            <td>${log.note}</td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();

};


// ==========================================================================
// PRODUCTION ORDER QUOTING HANDLERS (STEP 2 OF PRINT PROCESS)
// ==========================================================================

window.openProductionQuoteModal = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById("productionQuoteModal");
    if (!modal) return;

    document.getElementById("quoteOrderId").value = orderId;
    document.getElementById("quoteOrderNumber").value = order.order_number;
    document.getElementById("quoteProductionCost").value = order.production_cost || 0;
    
    // Set default markup 120%
    const markupInput = document.getElementById("quoteMarkupPercent");
    markupInput.value = 120;
    
    // Initial calculation
    recalcProductionQuote();

    // Show modal
    modal.classList.add("active");
};

function updateQuoteDepositHint(totalAmount) {
    const depositInput = document.getElementById("quoteDepositAmount");
    const hintEl = document.getElementById("quoteDepositCalcHint");
    if (!depositInput || !hintEl) return 0;
    
    const rawVal = depositInput.value.trim();
    let calculated = 0;
    let percent = 0;
    
    if (rawVal.endsWith('%')) {
        percent = parseFloat(rawVal.replace('%', '')) || 0;
        calculated = Math.round(totalAmount * percent / 100);
    } else {
        calculated = parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0;
        percent = totalAmount > 0 ? Math.round(calculated / totalAmount * 100) : 0;
    }
    
    hintEl.textContent = `Số tiền cọc: ${formatMoney(calculated)} (${percent}%)`;
    return calculated;
}

function recalcProductionQuote() {
    const prodCost = parseFloat(document.getElementById("quoteProductionCost").value) || 0;
    const markup = parseFloat(document.getElementById("quoteMarkupPercent").value) || 100;
    const calculatedPrice = Math.round(prodCost * (markup / 100));
    
    document.getElementById("quoteCalculatedPrice").value = formatMoney(calculatedPrice);
    
    const depositInput = document.getElementById("quoteDepositAmount");
    if (depositInput && !depositInput.value) {
        depositInput.value = "50%";
    }
    updateQuoteDepositHint(calculatedPrice);
}

// Watch inputs
document.getElementById("quoteMarkupPercent")?.addEventListener("input", recalcProductionQuote);
document.getElementById("quoteDepositAmount")?.addEventListener("input", () => {
    const prodCost = parseFloat(document.getElementById("quoteProductionCost").value) || 0;
    const markup = parseFloat(document.getElementById("quoteMarkupPercent").value) || 100;
    const calculatedPrice = Math.round(prodCost * (markup / 100));
    updateQuoteDepositHint(calculatedPrice);
});

const recordDepositSelect = document.getElementById("quoteRecordDeposit");
recordDepositSelect?.addEventListener("change", () => {
    const payFields = document.getElementById("quoteDepositPaymentFields");
    if (payFields) {
        payFields.style.display = recordDepositSelect.value === "YES" ? "grid" : "none";
    }
});

document.getElementById("btnCancelProductionQuote")?.addEventListener("click", () => {
    document.getElementById("productionQuoteModal")?.classList.remove("active");
});
document.getElementById("btnCloseProductionQuoteModal")?.addEventListener("click", () => {
    document.getElementById("productionQuoteModal")?.classList.remove("active");
});

document.getElementById("productionQuoteForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const orderId = document.getElementById("quoteOrderId").value;
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const markup = parseFloat(document.getElementById("quoteMarkupPercent").value) || 100;
    const totalAmount = Math.round((order.production_cost || 0) * (markup / 100));
    
    const rawDeposit = document.getElementById("quoteDepositAmount").value.trim();
    let depositAmount = 0;
    if (rawDeposit.endsWith('%')) {
        const percent = parseFloat(rawDeposit.replace('%', '')) || 0;
        depositAmount = Math.round(totalAmount * percent / 100);
    } else {
        depositAmount = parseFloat(rawDeposit.replace(/[^0-9]/g, '')) || 0;
    }
    
    const recordDeposit = document.getElementById("quoteRecordDeposit").value;

    order.total_amount = totalAmount;
    order.status = "IN_PRODUCTION"; // move from WAITING_QUOTE to IN_PRODUCTION
    
    if (recordDeposit === "YES" && depositAmount > 0) {
        order.deposit = depositAmount;
        order.payment_status = depositAmount >= totalAmount ? "PAID" : "PARTIALLY_PAID";

        // Generate Transaction
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PT-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);
        const paymentMethod = document.getElementById("quoteDepositMethod").value;

        const depositTx = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "RECEIPT",
            category: "CUSTOMER_DEPOSIT",
            amount: depositAmount,
            payment_method: paymentMethod,
            account_source: paymentMethod === 'BANK_TRANSFER' ? 'VCB' : 'CASH',
            partner_id: order.customer_id,
            reference_id: order.id,
            created_by: "Kế toán Lan"
        };
        state.transactions = [depositTx, ...state.transactions];
        state.updateState("transactions", state.transactions);
    } else {
        order.deposit = 0;
        order.payment_status = "UNPAID";
    }

    state.updateState("orders", state.orders);
    document.getElementById("productionQuoteModal")?.classList.remove("active");
    renderQuotes();
    renderProdOrders();
    renderCRM();
    renderFinance();
});



// ==========================================================================
// KIOTVIET-INSPIRED WORKFLOWS BUSINESS LOGIC & HANDLERS
// ==========================================================================

// Bulk Prices Editor

// --------------------------------------------------------------------------
// RICH BULK PRICE SETUP MODAL HANDLERS
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// RICH BULK PRICE SETUP MODAL HANDLERS
// --------------------------------------------------------------------------
window.addBulkPriceTierRow = function(min = '', max = '', ratio = 100) {
    const container = document.getElementById("bulkPriceTiersContainer");
    if (!container) return;
    
    if (min === '') {
        const lastMaxInput = container.querySelector("div:last-child .tier-max");
        if (lastMaxInput && lastMaxInput.value) {
            min = parseInt(lastMaxInput.value) + 1;
        } else {
            min = 1;
        }
    }
    
    const rowId = "tier_row_" + Math.random().toString(36).substring(2, 9);
    const row = document.createElement("div");
    row.id = rowId;
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.innerHTML = `
        <input type="number" class="form-input tier-min" value="${min}" placeholder="Min" style="width:70px; height:32px; padding:4px;" required>
        <span>đến</span>
        <input type="number" class="form-input tier-max" value="${max}" placeholder="Vô hạn" style="width:80px; height:32px; padding:4px;">
        <span>-> Giảm còn</span>
        <input type="number" step="0.01" class="form-input tier-ratio" value="${ratio}" style="width:70px; height:32px; padding:4px;" required>
        <span>% Giá lẻ</span>
        <button type="button" class="btn-icon" onclick="document.getElementById('${rowId}').remove()" style="color:var(--danger); border:none; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
    `;
    container.appendChild(row);
    lucide.createIcons();
};

window.addBulkPriceDiscountRow = function(min = '', max = '', percent = 0) {
    const container = document.getElementById("bulkPriceDiscountsContainer");
    if (!container) return;
    
    if (min === '') {
        const lastMaxInput = container.querySelector("div:last-child .disc-max");
        if (lastMaxInput && lastMaxInput.value) {
            min = parseInt(lastMaxInput.value) + 1;
        } else {
            min = 1000;
        }
    }
    
    const rowId = "disc_row_" + Math.random().toString(36).substring(2, 9);
    const row = document.createElement("div");
    row.id = rowId;
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.innerHTML = `
        <span>Từ SL</span>
        <input type="number" class="form-input disc-min" value="${min}" style="width:80px; height:32px; padding:4px;" required>
        <span>đến</span>
        <input type="number" class="form-input disc-max" value="${max}" style="width:80px; height:32px; padding:4px;" placeholder="Vô hạn">
        <span>-> Giảm</span>
        <input type="number" class="form-input disc-percent" value="${percent}" style="width:60px; height:32px; padding:4px;" required>
        <span>%</span>
        <button type="button" class="btn-icon" onclick="document.getElementById('${rowId}').remove()" style="color:var(--danger); border:none; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
    `;
    container.appendChild(row);
    lucide.createIcons();
};

window.openOnlineBulkPriceModal = function() {
    const modal = document.getElementById("onlineBulkPriceModal");
    if (!modal) return;

    // Reset Form
    const form = document.getElementById("onlineBulkPriceForm");
    form?.reset();

    // Populate Product Checkbox List
    const productListContainer = document.getElementById("bulkPriceProductList");
    if (productListContainer) {
        productListContainer.innerHTML = "";
        (state.online_products || []).forEach(p => {
            productListContainer.innerHTML += `
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.9rem;">
                    <input type="checkbox" class="chk-bulk-price-prod" value="${p.sku}" checked>
                    <span>${p.sku} - ${p.name}</span>
                </label>
            `;
        });
    }

    // Set Select All Checkbox to true
    const selectAllChk = document.getElementById("chkBulkPriceSelectAll");
    if (selectAllChk) selectAllChk.checked = true;

    // Clear and Populate default 6 Tiers Inputs (Based on Lạc Hồng values)
    const tiersContainer = document.getElementById("bulkPriceTiersContainer");
    if (tiersContainer) {
        tiersContainer.innerHTML = "";
        const defaultTiers = [
            { min: 1, max: 100, ratio: 100 },
            { min: 101, max: 300, ratio: 93.75 },
            { min: 301, max: 500, ratio: 91 },
            { min: 501, max: 700, ratio: 87.5 },
            { min: 701, max: 900, ratio: 86.25 },
            { min: 901, max: 1000, ratio: 85 }
        ];
        defaultTiers.forEach(tier => {
            window.addBulkPriceTierRow(tier.min, tier.max, tier.ratio);
        });
    }

    // Clear and Populate default 2 Discount Levels
    const discountsContainer = document.getElementById("bulkPriceDiscountsContainer");
    if (discountsContainer) {
        discountsContainer.innerHTML = "";
        const defaultDiscounts = [
            { min: 1000, max: 4999, percent: 3 },
            { min: 5000, max: '', percent: 5 }
        ];
        defaultDiscounts.forEach(disc => {
            window.addBulkPriceDiscountRow(disc.min, disc.max, disc.percent);
        });
    }

    openModal("onlineBulkPriceModal");
};


window.toggleBulkPriceSelectAll = function(el) {
    document.querySelectorAll(".chk-bulk-price-prod").forEach(chk => {
        chk.checked = el.checked;
    });
};

function handleOnlineBulkPriceSubmit(e) {
    e.preventDefault();

    // 1. Get Checked Product SKUs
    const checkedSkus = Array.from(document.querySelectorAll(".chk-bulk-price-prod:checked")).map(chk => chk.value);
    if (checkedSkus.length === 0) {
        alert("Vui lòng chọn ít nhất 1 sản phẩm để áp dụng thiết lập!");
        return;
    }

    // 2. Parse Tiers Inputs
    const tierRows = document.querySelectorAll("#bulkPriceTiersContainer > div");
    const parsedTiers = Array.from(tierRows).map(row => {
        const min = parseInt(row.querySelector(".tier-min").value) || 1;
        const maxVal = row.querySelector(".tier-max").value;
        const max = maxVal ? parseInt(maxVal) : null;
        const ratio = parseFloat(row.querySelector(".tier-ratio").value) || 100;
        return { min, max, ratio };
    });

    // 3. Parse Discount Inputs
    const discRows = document.querySelectorAll("#bulkPriceDiscountsContainer > div");
    const parsedDiscounts = Array.from(discRows).map(row => {
        const min = parseInt(row.querySelector(".disc-min").value) || 0;
        const maxVal = row.querySelector(".disc-max").value;
        const max = maxVal ? parseInt(maxVal) : null;
        const percent = parseFloat(row.querySelector(".disc-percent").value) || 0;
        return { min, max, percent };
    });

    // 4. Update the products in state
    state.online_products.forEach(p => {
        if (checkedSkus.includes(p.sku)) {
            const basePrice = p.price || 0;
            // Map ratios to actual prices
            p.wholesale_qty_prices = parsedTiers.map(t => ({
                min_qty: t.min,
                max_qty: t.max,
                price: Math.round(basePrice * (t.ratio / 100))
            }));
            p.wholesale_qty_discounts = parsedDiscounts.map(d => ({
                min_qty: d.min,
                max_qty: d.max,
                discount_percent: d.percent
            }));
        }
    });

    state.updateState("online_products", state.online_products);
    closeModal("onlineBulkPriceModal");
    if (typeof renderOnlinePrices === "function") renderOnlinePrices();
    alert(`Đã áp dụng thiết lập bảng giá sỉ hàng loạt thành công cho ${checkedSkus.length} sản phẩm!`);
}

// Bind submit event for bulk price form on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("onlineBulkPriceForm")?.addEventListener("submit", handleOnlineBulkPriceSubmit);
});


window.renderOnlinePrices = function() {
    const tableBody = document.querySelector("#onlinePricesTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlinePriceSearchInput")?.value.toLowerCase() || "";
    const filtered = (state.online_products || []).filter(p => {
        if (!p) return false;
        const sku = String(p.sku || "").toLowerCase();
        const name = String(p.name || "").toLowerCase();
        return sku.includes(query) || name.includes(query);
    });
    
    filtered.forEach(p => {
        const row = document.createElement("tr");
        const priceCount = p.wholesale_qty_prices ? p.wholesale_qty_prices.length : 0;
        const discountCount = p.wholesale_qty_discounts ? p.wholesale_qty_discounts.length : 0;
        const summaryText = `${priceCount} khoảng sỉ, ${discountCount} mức CK`;
        
        let imgHtml = ``;
        if (p.image) {
            imgHtml = `<img src="${p.image}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color); cursor:pointer;" onclick="viewFullOnlineProductImage('${p.sku}')">`;
        } else {
            imgHtml = `<div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.04); border-radius:4px; border:1px dashed var(--border-color); color:var(--text-secondary);"><i data-lucide="image" style="width:14px; height:14px;"></i></div>`;
        }

        // Generate tooltip contents
        const prices = p.wholesale_qty_prices || [];
        const discounts = p.wholesale_qty_discounts || [];
        
        let tooltipContentHtml = "";
        if (prices.length > 0) {
            tooltipContentHtml += `<div style="font-weight:700; color:var(--success); margin-bottom:4px;">Giá sỉ theo số lượng:</div>`;
            prices.forEach(x => {
                const range = x.max_qty ? `${x.min_qty} - ${x.max_qty}` : `≥ ${x.min_qty}`;
                tooltipContentHtml += `<div style="margin-bottom:2px;">• SL ${range}: <strong>${formatMoney(x.price)}</strong></div>`;
            });
        }
        if (discounts.length > 0) {
            if (tooltipContentHtml) tooltipContentHtml += `<div style="margin-top:8px; margin-bottom:4px; font-weight:700; color:var(--warning);">Chiết khấu theo số lượng:</div>`;
            else tooltipContentHtml += `<div style="font-weight:700; color:var(--warning); margin-bottom:4px;">Chiết khấu theo số lượng:</div>`;
            discounts.forEach(x => {
                const range = x.max_qty ? `${x.min_qty} - ${x.max_qty}` : `≥ ${x.min_qty}`;
                tooltipContentHtml += `<div style="margin-bottom:2px;">• SL ${range}: <strong>${x.discount_percent}%</strong></div>`;
            });
        }
        
        if (!tooltipContentHtml) {
            tooltipContentHtml = `<span style="color:var(--text-secondary);">Chưa thiết lập khoảng giá sỉ/chiết khấu.</span>`;
        }
        
        row.innerHTML = `
            <td><strong>${p.sku}</strong></td>
            <td>${imgHtml}</td>
            <td>${p.name}</td>
            <td>${p.unit}</td>
            <td><input type="number" class="form-input price-retail" data-sku="${p.sku}" value="${p.price}" min="0" style="width:160px; padding:4px 8px; font-size:0.85rem;"></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <div class="tooltip-container">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openAdvancedPricingModal('${p.sku}')" style="padding: 4px 8px; font-size:0.75rem; background:rgba(0,0,0,0.05); border:1px solid var(--border-color); color:var(--text-primary);">
                            <i data-lucide="eye" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Xem
                        </button>
                        <div class="tooltip-content">
                            ${tooltipContentHtml}
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openAdvancedPricingModal('${p.sku}')" style="padding: 4px 8px; font-size:0.75rem;">
                        <i data-lucide="settings" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Thiết lập SL
                    </button>
                    <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:8px; display:inline-block; vertical-align:middle;">(${summaryText})</span>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

document.getElementById("onlinePriceSearchInput")?.addEventListener("input", renderOnlinePrices);

window.saveOnlinePrices = function() {
    const retails = document.querySelectorAll("#onlinePricesTable .price-retail");
    
    let updatedCount = 0;
    retails.forEach((input) => {
        const sku = input.dataset.sku;
        const retailVal = parseFloat(input.value) || 0;
        
        const p = state.online_products.find(prod => String(prod.sku).trim().toUpperCase() === String(sku).trim().toUpperCase());
        if (p) {
            p.price = retailVal;
            updatedCount++;
        }
    });
    
    state.updateState("online_products", state.online_products);
    alert(`Đã lưu bảng giá cập nhật thành công cho ${updatedCount} mặt hàng!`);
    renderOnlineProducts();
    renderOnlinePrices();
};

window.saveSingleProductPrice = function(sku, buttonEl) {
    const row = buttonEl.closest("tr");
    if (!row) return;
    
    const retailVal = parseFloat(row.querySelector(".price-retail").value) || 0;
    
    const p = state.online_products.find(prod => String(prod.sku).trim().toUpperCase() === String(sku).trim().toUpperCase());
    if (p) {
        p.price = retailVal;
        state.updateState("online_products", state.online_products);
        alert(`Đã lưu cập nhật giá cho sản phẩm ${p.name} thành công!`);
        renderOnlineProducts();
        renderOnlinePrices();
    }
};

window.openAdvancedPricingModal = function(sku) {
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    document.getElementById("advPricingSku").value = sku;
    document.getElementById("advPricingProductName").textContent = prod.name;
    
    const priceTableBody = document.querySelector("#advPriceTable tbody");
    const discountTableBody = document.querySelector("#advDiscountTable tbody");
    priceTableBody.innerHTML = "";
    discountTableBody.innerHTML = "";
    
    const qtyPrices = prod.wholesale_qty_prices || [];
    qtyPrices.forEach(item => {
        addAdvPriceRow(item.min_qty, item.max_qty || "", item.price);
    });
    if (qtyPrices.length === 0) {
        addAdvPriceRow(100, "", prod.wholesale_price || 0);
    }
    
    const qtyDiscounts = prod.wholesale_qty_discounts || [];
    qtyDiscounts.forEach(item => {
        addAdvDiscountRow(item.min_qty, item.max_qty || "", item.discount_percent);
    });
    if (qtyDiscounts.length === 0) {
        addAdvDiscountRow(20000, 49999, 3);
        addAdvDiscountRow(50000, "", 5);
    }
    
    const modal = document.getElementById("onlineProductAdvancedPricingModal");
    if (modal) {
        modal.classList.add("active");
        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    }
};

window.addAdvPriceRow = function(minQty = "", maxQty = "", price = "") {
    const tableBody = document.querySelector("#advPriceTable tbody");
    if (!tableBody) return;
    
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="number" class="form-input row-min-qty" value="${minQty}" min="0" required style="padding:4px 8px;"></td>
        <td><input type="number" class="form-input row-max-qty" value="${maxQty}" min="0" placeholder="K.hạn" style="padding:4px 8px;"></td>
        <td><input type="number" class="form-input row-price" value="${price}" min="0" required style="padding:4px 8px;"></td>
        <td class="text-center"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" style="padding:4px 8px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></td>
    `;
    tableBody.appendChild(row);
    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

window.addAdvDiscountRow = function(minQty = "", maxQty = "", discount = "") {
    const tableBody = document.querySelector("#advDiscountTable tbody");
    if (!tableBody) return;
    
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="number" class="form-input row-min-qty" value="${minQty}" min="0" required style="padding:4px 8px;"></td>
        <td><input type="number" class="form-input row-max-qty" value="${maxQty}" min="0" placeholder="K.hạn" style="padding:4px 8px;"></td>
        <td><input type="number" class="form-input row-discount" value="${discount}" min="0" max="100" required style="padding:4px 8px;"></td>
        <td class="text-center"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" style="padding:4px 8px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></td>
    `;
    tableBody.appendChild(row);
    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

window.saveAdvancedPricingSettings = function() {
    const sku = document.getElementById("advPricingSku").value;
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    // Parse wholesale prices
    const priceRows = document.querySelectorAll("#advPriceTable tbody tr");
    const qtyPrices = [];
    priceRows.forEach(row => {
        const minQty = parseFloat(row.querySelector(".row-min-qty").value);
        const maxQty = parseFloat(row.querySelector(".row-max-qty").value);
        const price = parseFloat(row.querySelector(".row-price").value);
        if (!isNaN(minQty) && !isNaN(price)) {
            qtyPrices.push({
                min_qty: minQty,
                max_qty: isNaN(maxQty) ? "" : maxQty,
                price: price
            });
        }
    });
    
    // Parse extra discounts
    const discountRows = document.querySelectorAll("#advDiscountTable tbody tr");
    const qtyDiscounts = [];
    discountRows.forEach(row => {
        const minQty = parseFloat(row.querySelector(".row-min-qty").value);
        const maxQty = parseFloat(row.querySelector(".row-max-qty").value);
        const discount = parseFloat(row.querySelector(".row-discount").value);
        if (!isNaN(minQty) && !isNaN(discount)) {
            qtyDiscounts.push({
                min_qty: minQty,
                max_qty: isNaN(maxQty) ? "" : maxQty,
                discount_percent: discount
            });
        }
    });
    
    qtyPrices.sort((a, b) => a.min_qty - b.min_qty);
    qtyDiscounts.sort((a, b) => a.min_qty - b.min_qty);
    
    prod.wholesale_qty_prices = qtyPrices;
    prod.wholesale_qty_discounts = qtyDiscounts;
    
    state.updateState("online_products", state.online_products);
    
    closeModal("onlineProductAdvancedPricingModal");
    renderOnlinePrices();
    alert(`Đã lưu thiết lập nâng cao cho hàng hóa ${prod.name} thành công!`);
};

window.calculateOnlineProductUnitPrice = function(sku, qty) {
    const prod = (state.online_products || []).find(p => p.sku === sku);
    if (!prod) return 0;
    
    if (prod.wholesale_qty_prices && prod.wholesale_qty_prices.length > 0) {
        const match = prod.wholesale_qty_prices.find(item => {
            const minMatch = qty >= item.min_qty;
            const maxMatch = !item.max_qty || item.max_qty <= 0 || qty <= item.max_qty;
            return minMatch && maxMatch;
        });
        if (match) return match.price;
    }
    
    if (qty >= 10 && prod.wholesale_price > 0) {
        return prod.wholesale_price;
    }
    return prod.price;
};

window.calculateOnlineProductDiscountPercent = function(sku, qty) {
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod || !prod.wholesale_qty_discounts || prod.wholesale_qty_discounts.length === 0) return 0;
    
    const match = prod.wholesale_qty_discounts.find(item => {
        const minMatch = qty >= item.min_qty;
        const maxMatch = !item.max_qty || item.max_qty <= 0 || qty <= item.max_qty;
        return minMatch && maxMatch;
    });
    return match ? match.discount_percent : 0;
};

// Inventory Checks
window.openNewInventoryCheckModal = function() {
    const modal = document.getElementById("onlineInventoryCheckModal");
    if (!modal) return;
    
    document.getElementById("onlineInventoryCheckForm")?.reset();
    
    const select = document.getElementById("checkProductSelect");
    if (select) {
        select.innerHTML = '<option value="">-- Chọn hàng hóa --</option>';
        state.online_products.forEach(p => {
            select.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
        });
    }
    
    modal.classList.add("active");
};

document.getElementById("checkProductSelect")?.addEventListener("change", function() {
    const sku = this.value;
    const prod = state.online_products.find(p => p.sku === sku);
    const bookQtyInput = document.getElementById("checkBookQty");
    if (bookQtyInput) {
        bookQtyInput.value = prod ? prod.stock_qty : 0;
    }
});

document.getElementById("btnCancelOnlineInventoryCheck")?.addEventListener("click", () => {
    document.getElementById("onlineInventoryCheckModal")?.classList.remove("active");
});
document.getElementById("btnCloseOnlineInventoryCheckModal")?.addEventListener("click", () => {
    document.getElementById("onlineInventoryCheckModal")?.classList.remove("active");
});

document.getElementById("onlineInventoryCheckForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const sku = document.getElementById("checkProductSelect").value;
    const bookQty = parseInt(document.getElementById("checkBookQty").value) || 0;
    const actualQty = parseInt(document.getElementById("checkActualQty").value) || 0;
    const operator = document.getElementById("checkOperator").value.trim();
    const notes = document.getElementById("checkNotes").value.trim();
    
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    prod.stock_qty = actualQty;
    const diff = actualQty - bookQty;
    
    const checkId = "chk_" + Math.random().toString(36).substring(2, 9);
    const checkRecord = {
        id: checkId,
        created_at: new Date().toISOString(),
        sku,
        book_qty: bookQty,
        actual_qty: actualQty,
        operator,
        notes
    };
    
    // Add stock log
    const logId = "log_" + Math.random().toString(36).substring(2, 9);
    const newLog = {
        id: logId,
        created_at: new Date().toISOString(),
        sku,
        type: "ADJUST",
        qty: diff,
        note: `Kiểm kho: Thực tế ${actualQty} vs Sổ sách ${bookQty} (${diff >= 0 ? '+' : ''}${diff}). Ghi chú: ${notes}`
    };
    
    state.online_inventory_checks = [checkRecord, ...state.online_inventory_checks];
    state.online_stock_logs = [newLog, ...state.online_stock_logs];
    
    state.updateState("online_products", state.online_products);
    state.updateState("online_inventory_checks", state.online_inventory_checks);
    state.updateState("online_stock_logs", state.online_stock_logs);
    
    document.getElementById("onlineInventoryCheckModal")?.classList.remove("active");
    renderOnlineProducts();
    renderOnlineInventoryChecks();
    renderOnlineStockLogs();
});

window.renderOnlineInventoryChecks = function() {
    const tableBody = document.querySelector("#onlineInventoryChecksTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineInventoryCheckSearchInput")?.value.toLowerCase() || "";
    const filtered = state.online_inventory_checks.filter(c => {
        const prod = state.online_products.find(p => p.sku === c.sku);
        const name = prod ? prod.name.toLowerCase() : "";
        return c.sku.toLowerCase().includes(query) || name.includes(query) || c.operator.toLowerCase().includes(query);
    });
    
    filtered.forEach(c => {
        const prod = state.online_products.find(p => p.sku === c.sku);
        const diff = c.actual_qty - c.book_qty;
        const diffText = diff === 0 ? "Khớp" : (diff > 0 ? `+${diff}` : `${diff}`);
        const diffColor = diff === 0 ? "text-success" : (diff > 0 ? "text-success" : "text-danger");
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(c.created_at).toLocaleString('vi-VN')}</td>
            <td><strong>${c.sku}</strong></td>
            <td>${prod ? prod.name : 'Sản phẩm đã bị xóa'}</td>
            <td>${c.book_qty}</td>
            <td><strong>${c.actual_qty}</strong></td>
            <td><strong class="${diffColor}">${diffText}</strong></td>
            <td>${c.operator}</td>
            <td>${c.notes}</td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();

};

document.getElementById("onlineInventoryCheckSearchInput")?.addEventListener("input", renderOnlineInventoryChecks);

// Internal Exits
window.openNewInternalExitModal = function() {
    const modal = document.getElementById("onlineInternalExitModal");
    if (!modal) return;
    
    document.getElementById("onlineInternalExitForm")?.reset();
    
    const select = document.getElementById("exitProductSelect");
    if (select) {
        select.innerHTML = '<option value="">-- Chọn hàng hóa --</option>';
        state.online_products.forEach(p => {
            select.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
        });
    }
    
    modal.classList.add("active");
};

document.getElementById("btnCancelOnlineInternalExit")?.addEventListener("click", () => {
    document.getElementById("onlineInternalExitModal")?.classList.remove("active");
});
document.getElementById("btnCloseOnlineInternalExitModal")?.addEventListener("click", () => {
    document.getElementById("onlineInternalExitModal")?.classList.remove("active");
});

document.getElementById("onlineInternalExitForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const sku = document.getElementById("exitProductSelect").value;
    const qty = parseInt(document.getElementById("exitQty").value) || 0;
    const reason = document.getElementById("exitReason").value;
    const operator = document.getElementById("exitOperator").value.trim();
    const notes = document.getElementById("exitNotes").value.trim();
    
    const prod = state.online_products.find(p => p.sku === sku);
    if (!prod) return;
    
    if (prod.stock_qty < qty) {
        alert(`Số lượng tồn kho không đủ để xuất (Yêu cầu: ${qty}, Tồn: ${prod.stock_qty}).`);
        return;
    }
    
    prod.stock_qty -= qty;
    const exitId = "exit_" + Math.random().toString(36).substring(2, 9);
    const exitRecord = {
        id: exitId,
        created_at: new Date().toISOString(),
        sku,
        qty,
        reason,
        operator,
        notes
    };
    
    // Add stock log
    const logId = "log_" + Math.random().toString(36).substring(2, 9);
    const typeLabel = reason === 'INTERNAL_USE' ? 'Xuất dùng nội bộ' : 'Xuất hủy hàng hỏng';
    const newLog = {
        id: logId,
        created_at: new Date().toISOString(),
        sku,
        type: reason === 'INTERNAL_USE' ? 'EXPORT' : 'ADJUST',
        qty: -qty,
        note: `${typeLabel}: ${qty} cái. Người nhận/thực hiện: ${operator}. Lý do: ${notes}`
    };
    
    state.online_internal_exits = [exitRecord, ...state.online_internal_exits];
    state.online_stock_logs = [newLog, ...state.online_stock_logs];
    
    state.updateState("online_products", state.online_products);
    state.updateState("online_internal_exits", state.online_internal_exits);
    state.updateState("online_stock_logs", state.online_stock_logs);
    
    document.getElementById("onlineInternalExitModal")?.classList.remove("active");
    renderOnlineProducts();
    renderOnlineInternalExits();
    renderOnlineStockLogs();
});

window.renderOnlineInternalExits = function() {
    const tableBody = document.querySelector("#onlineInternalExitsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineInternalExitSearchInput")?.value.toLowerCase() || "";
    const filtered = state.online_internal_exits.filter(e => {
        const prod = state.online_products.find(p => p.sku === e.sku);
        const name = prod ? prod.name.toLowerCase() : "";
        return e.sku.toLowerCase().includes(query) || name.includes(query) || e.operator.toLowerCase().includes(query);
    });
    
    filtered.forEach(e => {
        const prod = state.online_products.find(p => p.sku === e.sku);
        const reasonBadge = e.reason === 'INTERNAL_USE' 
            ? '<span class="badge badge-info">Dùng nội bộ</span>'
            : '<span class="badge badge-danger">Hủy hàng hỏng</span>';
            
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(e.created_at).toLocaleString('vi-VN')}</td>
            <td><strong>${e.sku}</strong></td>
            <td>${prod ? prod.name : 'Sản phẩm đã bị xóa'}</td>
            <td><strong>-${e.qty}</strong></td>
            <td>${reasonBadge}</td>
            <td>${e.operator}</td>
            <td>${e.notes}</td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();

};

document.getElementById("onlineInternalExitSearchInput")?.addEventListener("input", renderOnlineInternalExits);

// Online Invoices
window.renderOnlineInvoices = function() {
    const tableBody = document.querySelector("#onlineInvoicesTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineInvoiceSearchInput")?.value.toLowerCase() || "";
    // Show both fully paid orders and explicitly invoiced (exported) orders
    const invoices = state.online_orders.filter(o => o.payment_status === "PAID" || o.kanban_status === "INVOICE");
    
    const filtered = invoices.filter(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const customerName = customer ? customer.name.toLowerCase() : "";
        const invoiceNum = o.misa_invoice_number || ('HD-ON-' + o.order_number.split('-').pop());
        return invoiceNum.toLowerCase().includes(query) || o.order_number.toLowerCase().includes(query) || customerName.includes(query);
    });
    
    filtered.forEach(o => {
        const customer = state.partners.find(p => p.id === o.customer_id);
        const row = document.createElement("tr");
        const invoiceNum = o.misa_invoice_number || `HD-ON-${o.order_number.split('-').pop()}`;
        row.innerHTML = `
            <td><strong>${invoiceNum}</strong></td>
            <td>${new Date(o.created_at).toLocaleString('vi-VN')}</td>
            <td>${customer ? customer.name : 'Khách vãng lai'}</td>
            <td><strong>${formatMoney(o.total_amount)}</strong></td>
            <td>${o.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
            <td>${o.payment_method === 'BANK_TRANSFER' ? 'MBBank' : 'Két tiền'}</td>
            <td>${o.salesperson || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();

};

document.getElementById("onlineInvoiceSearchInput")?.addEventListener("input", renderOnlineInvoices);

// Returns & Refunds
window.openNewOrderReturnModal = function() {
    const modal = document.getElementById("onlineOrderReturnModal");
    if (!modal) return;
    
    document.getElementById("onlineOrderReturnForm")?.reset();
    document.getElementById("returnItemsContainer").innerHTML = "";
    document.getElementById("returnRefundTotal").value = "0đ";
    
    const select = document.getElementById("returnOrderSelect");
    if (select) {
        select.innerHTML = '<option value="">-- Chọn đơn hàng mua gốc --</option>';
        state.online_orders.forEach(o => {
            const customer = state.partners.find(p => p.id === o.customer_id);
            select.innerHTML += `<option value="${o.id}">${o.order_number} - ${customer ? customer.name : 'Khách vãng lai'} (${formatMoney(o.total_amount)})</option>`;
        });
    }
    
    modal.classList.add("active");
};

document.getElementById("returnOrderSelect")?.addEventListener("change", function() {
    const orderId = this.value;
    const order = state.online_orders.find(o => o.id === orderId);
    const container = document.getElementById("returnItemsContainer");
    if (!container) return;
    
    container.innerHTML = "";
    if (!order) return;
    
    order.items.forEach(item => {
        const prod = state.online_products.find(p => p.sku === item.sku);
        const itemRow = document.createElement("div");
        itemRow.style.display = "flex";
        itemRow.style.alignItems = "center";
        itemRow.style.gap = "12px";
        itemRow.className = "return-item-row";
        
        itemRow.innerHTML = `
            <input type="checkbox" class="return-chk" data-sku="${item.sku}" data-price="${item.price}" style="width:16px; height:16px;">
            <span style="flex-grow:1; font-size:0.85rem;"><strong>${item.sku}</strong> - ${prod ? prod.name : 'Sản phẩm'}</span>
            <input type="number" class="form-input return-qty" data-max="${item.qty}" value="${item.qty}" min="1" max="${item.qty}" style="width:80px; padding:2px 6px; font-size:0.8rem;" disabled>
            <span style="font-size:0.85rem; color:var(--text-secondary);">/ ${item.qty} mua</span>
        `;
        container.appendChild(itemRow);
        
        const chk = itemRow.querySelector(".return-chk");
        const qtyInput = itemRow.querySelector(".return-qty");
        
        chk.addEventListener("change", function() {
            qtyInput.disabled = !this.checked;
            recalcReturnRefund();
        });
        qtyInput.addEventListener("input", recalcReturnRefund);
    });
    
    recalcReturnRefund();
});

window.recalcReturnRefund = function() {
    let refundTotal = 0;
    const rows = document.querySelectorAll("#returnItemsContainer .return-item-row");
    rows.forEach(row => {
        const chk = row.querySelector(".return-chk");
        const qtyInput = row.querySelector(".return-qty");
        if (chk && chk.checked) {
            const price = parseFloat(chk.dataset.price) || 0;
            const qty = parseInt(qtyInput.value) || 0;
            refundTotal += price * qty;
        }
    });
    
    const orderId = document.getElementById("returnOrderSelect").value;
    const order = state.online_orders.find(o => o.id === orderId);
    const vatRate = order ? order.vat_rate : 8;
    const refundTotalWithVat = Math.round(refundTotal * (1 + vatRate / 100));
    
    document.getElementById("returnRefundTotal").value = formatMoney(refundTotalWithVat);
};

document.getElementById("btnCancelOnlineOrderReturn")?.addEventListener("click", () => {
    document.getElementById("onlineOrderReturnModal")?.classList.remove("active");
});
document.getElementById("btnCloseOnlineOrderReturnModal")?.addEventListener("click", () => {
    document.getElementById("onlineOrderReturnModal")?.classList.remove("active");
});

document.getElementById("onlineOrderReturnForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const orderId = document.getElementById("returnOrderSelect").value;
    const order = state.online_orders.find(o => o.id === orderId);
    if (!order) return;
    
    const rows = document.querySelectorAll("#returnItemsContainer .return-item-row");
    const returnItems = [];
    let refundSubtotal = 0;
    
    rows.forEach(row => {
        const chk = row.querySelector(".return-chk");
        const qtyInput = row.querySelector(".return-qty");
        if (chk && chk.checked) {
            const sku = chk.dataset.sku;
            const price = parseFloat(chk.dataset.price) || 0;
            const qty = parseInt(qtyInput.value) || 0;
            
            returnItems.push({ sku, qty, price });
            refundSubtotal += price * qty;
            
            const prod = state.online_products.find(p => p.sku === sku);
            if (prod) {
                prod.stock_qty += qty;
            }
        }
    });
    
    if (returnItems.length === 0) {
        alert("Vui lòng chọn ít nhất một sản phẩm cần trả.");
        return;
    }
    
    const refundTotal = Math.round(refundSubtotal * (1 + order.vat_rate / 100));
    const refundMethod = document.getElementById("returnRefundMethod").value;
    const operator = document.getElementById("returnOperator").value.trim();
    
    const returnId = "ret_" + Math.random().toString(36).substring(2, 9);
    const returnRecord = {
        id: returnId,
        created_at: new Date().toISOString(),
        order_number: order.order_number,
        customer_id: order.customer_id,
        items: returnItems,
        refund_amount: refundTotal,
        operator
    };
    
    returnItems.forEach(item => {
        const logId = "log_" + Math.random().toString(36).substring(2, 9);
        state.online_stock_logs.push({
            id: logId,
            created_at: new Date().toISOString(),
            sku: item.sku,
            type: "IMPORT",
            qty: item.qty,
            note: `Khách trả hàng đơn ${order.order_number}`
        });
    });
    
    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txNumber = `PC-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);
    const refundTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: "PAYMENT",
        category: "OPERATIONAL",
        amount: refundTotal,
        payment_method: refundMethod,
        account_source: refundMethod === "BANK_TRANSFER" ? "VCB" : "CASH",
        partner_id: order.customer_id,
        reference_id: returnId,
        created_by: operator,
        note: `Hoàn tiền khách trả hàng đơn ${order.order_number}`
    };
    
    state.online_returns = [returnRecord, ...state.online_returns];
    state.transactions = [refundTx, ...state.transactions];
    
    state.updateState("online_products", state.online_products);
    state.updateState("online_stock_logs", state.online_stock_logs);
    state.updateState("online_returns", state.online_returns);
    state.updateState("transactions", state.transactions);
    
    document.getElementById("onlineOrderReturnModal")?.classList.remove("active");
    renderOnlineProducts();
    renderOnlineReturns();
    renderOnlineStockLogs();
});

window.renderOnlineReturns = function() {
    const tableBody = document.querySelector("#onlineReturnsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const query = document.getElementById("onlineReturnSearchInput")?.value.toLowerCase() || "";
    const filtered = state.online_returns.filter(r => {
        const customer = state.partners.find(p => p.id === r.customer_id);
        const name = customer ? customer.name.toLowerCase() : "";
        return r.order_number.toLowerCase().includes(query) || name.includes(query) || r.operator.toLowerCase().includes(query);
    });
    
    filtered.forEach(r => {
        const customer = state.partners.find(p => p.id === r.customer_id);
        const itemsText = r.items.map(item => {
            const prod = state.online_products.find(p => p.sku === item.sku);
            return `${prod ? prod.name : item.sku} (x${item.qty})`;
        }).join(", ");
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(r.created_at).toLocaleString('vi-VN')}</td>
            <td><strong>${r.order_number}</strong></td>
            <td>${customer ? customer.name : 'Khách vãng lai'}</td>
            <td>${itemsText}</td>
            <td><strong class="text-danger">-${formatMoney(r.refund_amount)}</strong></td>
            <td>${r.operator}</td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();

};

document.getElementById("onlineReturnSearchInput")?.addEventListener("input", renderOnlineReturns);


// Carton Lanh Dynamic Inputs and Default Save Manager
(function() {
    console.log("IHP: Initializing Carton Lanh Form Manager...");

    const DYNAMIC_FIELDS_KEY = "ihp_carton_lanh_dynamic_fields";

    window.IhpCartonLanhManager = {
        init() {
            this.loadDefaults();
            this.renderDynamicFields();
            this.setupListeners();
        },

        loadDefaults() {
            // Load defaults for hardcoded fields
            const checks = document.querySelectorAll(".default-val-check");
            checks.forEach(chk => {
                const fieldId = chk.dataset.field;
                const savedVal = localStorage.getItem(`ihp_quote_def_${fieldId}`);
                if (savedVal !== null) {
                    const input = document.getElementById(fieldId);
                    if (input) {
                        input.value = savedVal;
                        chk.checked = true;
                    }
                }
            });
        },

        setupListeners() {
            // Checkboxes to save current inputs as defaults
            const container = document.getElementById("cartonLanhExtraFields");
            if (!container) return;

            container.addEventListener('change', (e) => {
                const target = e.target;
                if (target.classList.contains('default-val-check')) {
                    const fieldId = target.dataset.field;
                    const input = document.getElementById(fieldId);
                    if (input) {
                        if (target.checked) {
                            localStorage.setItem(`ihp_quote_def_${fieldId}`, input.value);
                        } else {
                            localStorage.removeItem(`ihp_quote_def_${fieldId}`);
                        }
                    }
                }
            });

            container.addEventListener('input', (e) => {
                const target = e.target;
                // If value of input changes, and default checkbox is checked, update saved default
                const parentGroup = target.closest('.form-group-vertical');
                if (parentGroup) {
                    const chk = parentGroup.querySelector('.default-val-check');
                    if (chk && chk.checked) {
                        localStorage.setItem(`ihp_quote_def_${chk.dataset.field}`, target.value);
                    }
                }
            });

            // Add dynamic field button
            const btnAdd = document.getElementById("btnAddDynamicField");
            if (btnAdd) {
                btnAdd.addEventListener('click', () => {
                    this.addDynamicField();
                });
            }
        },

        getDynamicFields() {
            return JSON.parse(localStorage.getItem(DYNAMIC_FIELDS_KEY) || "[]");
        },

        saveDynamicFields(fields) {
            localStorage.setItem(DYNAMIC_FIELDS_KEY, JSON.stringify(fields));
        },

        addDynamicField() {
            const nameInput = document.getElementById("newDynamicFieldName");
            const typeInput = document.getElementById("newDynamicFieldType");
            const name = nameInput.value.trim();
            const type = typeInput.value;

            if (!name) return;

            const fields = this.getDynamicFields();
            if (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                alert("Tên chi phí này đã tồn tại!");
                return;
            }

            const id = "df_" + Math.random().toString(36).substring(2, 9);
            fields.push({ id, name, type, defaultVal: "0" });
            this.saveDynamicFields(fields);

            nameInput.value = "";
            this.renderDynamicFields();

            // Trigger quote recalculation
            if (typeof calculateRealtimeQuote === 'function') {
                calculateRealtimeQuote();
            }
        },

        deleteDynamicField(id) {
            let fields = this.getDynamicFields();
            fields = fields.filter(f => f.id !== id);
            this.saveDynamicFields(fields);
            
            // Clean saved default if any
            localStorage.removeItem(`ihp_quote_def_dynamic_field_${id}`);

            this.renderDynamicFields();

            if (typeof calculateRealtimeQuote === 'function') {
                calculateRealtimeQuote();
            }
        },

        renderDynamicFields() {
            const listEl = document.getElementById("cartonLanhDynamicFieldsList");
            if (!listEl) return;

            const fields = this.getDynamicFields();
            listEl.innerHTML = "";

            fields.forEach(df => {
                const inputId = `dynamic_field_${df.id}`;
                const savedDefVal = localStorage.getItem(`ihp_quote_def_${inputId}`);
                const isChecked = savedDefVal !== null ? 'checked' : '';
                const val = savedDefVal !== null ? savedDefVal : df.defaultVal;

                const row = document.createElement("div");
                row.className = "form-group-vertical";
                row.style.display = "flex";
                row.style.alignItems = "center";
                row.style.gap = "8px";

                const typeLabel = df.type === 'per_pc' ? ' (đ/SP)' : ' (đ)';

                row.innerHTML = `
                    <input type="checkbox" class="default-val-check" data-field="${inputId}" ${isChecked} title="Lưu làm mặc định">
                    <label for="${inputId}" style="flex-grow:1; font-weight:500; font-size:0.85rem; margin:0;">${df.name}${typeLabel}</label>
                    <input type="number" class="form-input" id="${inputId}" value="${val}" min="0" style="width: 220px;">
                    <i data-lucide="trash-2" style="width:16px; height:16px; color:var(--danger); cursor:pointer;" class="btn-delete-df" data-id="${df.id}"></i>
                `;

                listEl.appendChild(row);
            });

            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons({ attrs: { class: 'lucide-icon' } });
            }

            // Listeners for delete buttons inside listEl
            listEl.querySelectorAll('.btn-delete-df').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.deleteDynamicField(btn.dataset.id);
                });
            });
        }
    };

    // Auto load on DOMContentLoaded
    document.addEventListener("DOMContentLoaded", () => {
        window.IhpCartonLanhManager.init();
    });

})();

// ==========================================================================
// ONLINE ORDERS KANBAN IMPLEMENTATION
// ==========================================================================
window.dragOnlineOrder = function(ev, orderId) {
    ev.dataTransfer.setData("text/plain", orderId);
};

window.dropOnlineOrder = function(ev, targetStatus) {
    ev.preventDefault();
    ev.currentTarget.classList.remove("drag-over");
    const orderId = ev.dataTransfer.getData("text/plain");
    window.updateOnlineOrderStatus(orderId, targetStatus);
};

window.updateOnlineOrderStatus = function(orderId, targetStatus) {
    const order = state.online_orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.kanban_status = targetStatus;
    
    // Automatically transitions to PAID if moved beyond ORDER stage
    if (targetStatus === "PAYMENT" || targetStatus === "INVOICE" || targetStatus === "DELIVERY") {
        if (order.payment_status !== "PAID") {
            order.payment_status = "PAID";
            
            // Generate Finance Receipt Transaction if not already generated
            const payments = state.transactions.filter(t => t.reference_id === order.id && t.type === 'RECEIPT');
            if (payments.length === 0) {
                const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
                const txNumber = `PT-202606-${txCodeSuffix}`;
                const txId = "t_" + Math.random().toString(36).substring(2, 9);
                
                const receiptTx = {
                    id: txId,
                    tx_number: txNumber,
                    created_at: new Date().toISOString(),
                    type: "RECEIPT",
                    category: "CUSTOMER_FINAL",
                    amount: order.total_amount,
                    payment_method: order.payment_method || "BANK_TRANSFER",
                    account_source: order.payment_method === "BANK_TRANSFER" ? "VCB" : "CASH",
                    partner_id: order.customer_id,
                    reference_id: order.id,
                    created_by: order.salesperson || "Đại Hùng"
                };
                state.transactions = [receiptTx, ...state.transactions];
                state.updateState("transactions", state.transactions);
            }
        }
    }
    
    state.updateState("online_orders", state.online_orders);
    renderOnlineSales();
};

window.renderOnlineSalesKanban = function(filteredOrders) {
    if (!filteredOrders) {
        const query = document.getElementById("onlineOrderSearchInput")?.value.toLowerCase() || "";
        const statusFilter = document.getElementById("onlineOrderStatusFilter")?.value || "";
        filteredOrders = (state.online_orders || []).filter(o => {
            const customer = state.partners.find(p => p.id === o.customer_id);
            const customerName = customer ? customer.name.toLowerCase() : "";
            const matchesQuery = o.order_number.toLowerCase().includes(query) || customerName.includes(query) || (o.salesperson || "").toLowerCase().includes(query);
            const oStatus = o.kanban_status || (o.payment_status === "PAID" ? "PAYMENT" : "ORDER");
            const matchesStatus = !statusFilter || oStatus === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }

    const columns = {
        'ORDER': document.getElementById("cards-online-ORDER"),
        'PAYMENT': document.getElementById("cards-online-PAYMENT"),
        'INVOICE': document.getElementById("cards-online-INVOICE"),
        'DELIVERY': document.getElementById("cards-online-DELIVERY")
    };
    
    for (const key in columns) {
        if (columns[key]) {
            columns[key].innerHTML = "";
            const badge = document.getElementById(`badge-online-${key}`);
            if (badge) badge.textContent = "0";
        }
    }
    
    const counts = { 'ORDER': 0, 'PAYMENT': 0, 'INVOICE': 0, 'DELIVERY': 0 };
    
    filteredOrders.forEach(o => {
        const status = o.kanban_status || (o.payment_status === "PAID" ? "PAYMENT" : "ORDER");
        if (!columns[status]) return;
        
        counts[status]++;
        
        const customer = (state.partners || []).find(p => p.id === o.customer_id);
        const custName = customer ? customer.name : "Khách vãng lai";
        const productsStr = (o.items || []).map(item => {
            const prod = (state.online_products || []).find(p => p.sku === item.sku);
            return `${prod ? prod.name : item.sku} (x${item.qty})`;
        }).join(", ");
        
        let payBadge = '';
        if (o.payment_status === "PAID") {
            payBadge = '<span class="badge badge-success">Đã thanh toán</span>';
        } else if (o.payment_status === "PARTIALLY_PAID") {
            const payments = (state.transactions || []).filter(t => t.reference_id === o.id && t.type === 'RECEIPT');
            const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
            payBadge = `<span class="badge badge-warning" style="background:#d97706; color:#fff;">T.Toán một phần (${formatMoney(totalPaid)})</span>`;
        } else if (o.payment_status === "DRAFT") {
            payBadge = '<span class="badge badge-secondary" style="background:#6b7280; color:#fff;">Lưu nháp</span>';
        } else {
            payBadge = '<span class="badge badge-danger">Ghi nợ</span>';
        }
        
        const card = document.createElement("div");
        card.className = "kanban-card";
        card.draggable = true;
        card.setAttribute("ondragstart", `dragOnlineOrder(event, '${o.id}')`);
        card.style.background = "var(--bg-card)";
        card.style.border = "1px solid var(--border-color)";
        card.style.borderRadius = "10px";
        card.style.padding = "12px";
        card.style.marginBottom = "8px";
        card.style.cursor = "grab";
        
        const viewPdfButton = `<button class="btn-icon" onclick="openOnlineOrderInvoicePdf('${o.id}')" title="Xem Hóa Đơn PDF"><i data-lucide="file-text" style="color:var(--info); width:16px; height:16px;"></i></button>`;
        const editButton = `<button class="btn-icon" onclick="window.openNewOnlineOrderModal('EDIT', '${o.id}')" title="Sửa đơn hàng"><i data-lucide="edit" style="color:var(--accent); width:16px; height:16px;"></i></button>`;
        const contractButton = `<button class="btn-icon" onclick="window.quickCreateContract('${o.id}', true)" title="Làm hợp đồng nhanh"><i data-lucide="file-signature" style="color:#6366f1; width:16px; height:16px;"></i></button>`;
        
        let payButton = '';
        if (o.payment_status !== "PAID" && o.kanban_status !== "CANCELLED") {
            payButton = `<button class="btn-icon" onclick="payOnlineOrder('${o.id}')" title="Thanh toán"><i data-lucide="check-circle" style="color:var(--success); width:16px; height:16px;"></i></button>`;
        }
        
        let cancelButton = '';
        if (o.kanban_status !== "CANCELLED") {
            cancelButton = `<button class="btn-icon" onclick="window.cancelOnlineOrder('${o.id}')" title="Hủy đơn hàng"><i data-lucide="x-circle" style="color:#d97706; width:16px; height:16px;"></i></button>`;
        }
        
        let actionButtons = `<div style="display:flex; gap:4px;">${viewPdfButton}${editButton}${payButton}${cancelButton}${contractButton}</div>`;
        
        let nextButton = "";
        if (status === "ORDER") {
            nextButton = `<button class="btn btn-sm btn-primary" onclick="updateOnlineOrderStatus('${o.id}', 'PAYMENT')" style="padding: 2px 6px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;"><i data-lucide="arrow-right" style="width: 10px; height: 10px;"></i>Thanh toán</button>`;
        } else if (status === "PAYMENT") {
            nextButton = `<button class="btn btn-sm btn-primary" onclick="updateOnlineOrderStatus('${o.id}', 'INVOICE')" style="padding: 2px 6px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;"><i data-lucide="arrow-right" style="width: 10px; height: 10px;"></i>Hóa đơn</button>`;
        } else if (status === "INVOICE") {
            nextButton = `<button class="btn btn-sm btn-primary" onclick="updateOnlineOrderStatus('${o.id}', 'DELIVERY')" style="padding: 2px 6px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;"><i data-lucide="arrow-right" style="width: 10px; height: 10px;"></i>Giao hàng</button>`;
        }
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="color:var(--accent); font-size:0.85rem;">${o.order_number}</strong>
                <span style="font-size:0.7rem; color:var(--text-secondary);">${new Date(o.created_at).toLocaleTimeString('vi-VN')}</span>
            </div>
            <div style="font-size:0.8rem; font-weight:600; margin-bottom:4px; color:var(--text-primary);">${custName}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${productsStr}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--border-color); padding-top:8px; margin-top:8px;">
                <strong style="font-size:0.9rem; color:var(--text-primary);">${formatMoney(o.total_amount)}</strong>
                <div style="display:flex; gap:4px; align-items:center;">
                    ${payBadge}
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px;">
                <div style="display:flex; gap:8px;">
                    ${actionButtons}
                </div>
                ${nextButton}
            </div>
        `;
        columns[status].appendChild(card);
    });
    
    for (const key in counts) {
        const badge = document.getElementById(`badge-online-${key}`);
        if (badge) badge.textContent = counts[key];
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// ==========================================================================
// SALES COMMISSION STATISTICS
// ==========================================================================
window.activeCommissionFilter = "ALL";

window.switchCommissionView = function(role) {
    window.activeCommissionFilter = role;
    switchTab('finance');
    switchFinanceSubTab('sales-commission');
};

window.renderSalesCommissions = function() {
    const tableBody = document.querySelector("#salesCommissionsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const titleEl = document.getElementById("commissionSubtabTitle");
    if (titleEl) {
        if (window.activeCommissionFilter === "SALESPERSON") {
            titleEl.textContent = "Thống kê Hoa hồng Nhân viên Kinh doanh (NVKD)";
        } else if (window.activeCommissionFilter === "COLLABORATOR") {
            titleEl.textContent = "Thống kê Hoa hồng Cộng tác viên (CTV)";
        } else {
            titleEl.textContent = "Thống kê Hoa hồng doanh số tổng hợp";
        }
    }
    
    const stats = {};
    
    // Filter salespeople based on active filter role
    let filteredSalespersons = state.salespersons || [];
    if (window.activeCommissionFilter === "SALESPERSON") {
        filteredSalespersons = filteredSalespersons.filter(s => s.role === "SALESPERSON");
    } else if (window.activeCommissionFilter === "COLLABORATOR") {
        filteredSalespersons = filteredSalespersons.filter(s => s.role === "COLLABORATOR");
    }
    
    const names = filteredSalespersons.map(s => s.name);
    // Include "Chưa phân công" only for general ALL views
    if (window.activeCommissionFilter === "ALL") {
        names.push("Chưa phân công");
    }
    
    names.forEach(sp => {
        stats[sp] = { onlineSales: 0, onlineComm: 0, prodSales: 0, prodComm: 0 };
    });
    
    // 1. Process regular production orders (state.orders)
    state.orders.forEach(o => {
        const sp = o.salesperson || "Chưa phân công";
        if (stats[sp] !== undefined) {
            stats[sp].prodSales += o.total_amount || 0;
            stats[sp].prodComm += o.commission_amount || 0;
        }
    });
    
    // 2. Process online sales orders (state.online_orders)
    state.online_orders.forEach(o => {
        const sp = o.salesperson || "Chưa phân công";
        if (stats[sp] !== undefined) {
            stats[sp].onlineSales += o.total_amount || 0;
            stats[sp].onlineComm += o.commission_amount || 0;
        }
    });

    let grandAccrued = 0;
    let grandPaid = 0;
    
    // Calculate total commission payments for filtered salespeople
    state.transactions.forEach(t => {
        if (t.type === "PAYMENT" && t.category === "SALES_COMMISSION" && names.includes(t.partner_id)) {
            grandPaid += t.amount || 0;
        }
    });
    
    // Render rows
    for (const sp in stats) {
        const s = stats[sp];
        const totalComm = s.onlineComm + s.prodComm;
        grandAccrued += totalComm;
        
        // Paid for this specific salesperson
        const paidComm = state.transactions
            .filter(t => t.partner_id === sp && t.type === "PAYMENT" && t.category === "SALES_COMMISSION")
            .reduce((sum, t) => sum + t.amount, 0);
        
        const owedComm = Math.max(0, totalComm - paidComm);
        
        const isUnassigned = sp === "Chưa phân công";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${sp}</strong></td>
            <td>${formatMoney(s.onlineSales)}</td>
            <td><strong style="color:var(--success);">${formatMoney(s.onlineComm)}</strong></td>
            <td>${formatMoney(s.prodSales)}</td>
            <td><strong style="color:var(--success);">${formatMoney(s.prodComm)}</strong></td>
            <td>
                <div><strong class="accent-color" style="font-size:1.05rem;">${formatMoney(totalComm)}</strong></div>
                <small class="text-muted" style="display:block; font-size:0.75rem;">Còn nợ: ${formatMoney(owedComm)}</small>
            </td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.75rem; background-color: var(--info-light); color: var(--info); border: none;" onclick="viewSalesCommissionDetails('${sp}')">Chi tiết đơn</button>
                    <button class="btn btn-danger btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="paySalesCommission('${sp}')" ${owedComm <= 0 || isUnassigned ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Chi trả</button>
                    <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="viewSalesCommissionPaymentHistory('${sp}')" ${isUnassigned ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Lịch sử</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    }
    
    const grandOwed = Math.max(0, grandAccrued - grandPaid);
    
    if (document.getElementById("lblTotalCommissionAccrued")) document.getElementById("lblTotalCommissionAccrued").textContent = formatMoney(grandAccrued);
    if (document.getElementById("lblTotalCommissionPaid")) document.getElementById("lblTotalCommissionPaid").textContent = formatMoney(grandPaid);
    if (document.getElementById("lblTotalCommissionOwed")) document.getElementById("lblTotalCommissionOwed").textContent = formatMoney(grandOwed);
    
    lucide.createIcons();
};

window.viewSalesCommissionDetails = function(salesperson) {
    const standardOrders = state.orders.filter(o => (o.salesperson || "Chưa phân công") === salesperson);
    const onlineOrders = state.online_orders.filter(o => (o.salesperson || "Chưa phân công") === salesperson);
    const allOrders = [...standardOrders, ...onlineOrders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    let modal = document.getElementById("salesCommissionDetailsModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "salesCommissionDetailsModal";
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 850px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Chi tiết đơn hàng nhận hoa hồng - <span id="commDetailsSpName"></span></h2>
                        <button class="btn-close" onclick="closeModal('salesCommissionDetailsModal')"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;">
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Loại</th>
                                        <th>Khách hàng</th>
                                        <th>Tổng giá trị</th>
                                        <th>Tỷ lệ</th>
                                        <th>Hoa hồng</th>
                                        <th>Đã chi trả</th>
                                        <th>Còn nợ</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody id="commDetailsTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('salesCommissionDetailsModal')">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById("commDetailsSpName").textContent = salesperson;
    const tbody = document.getElementById("commDetailsTableBody");
    tbody.innerHTML = "";

    if (allOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary);">Chưa phát sinh đơn hàng nào được nhận hoa hồng.</td></tr>`;
    } else {
        allOrders.forEach(o => {
            const isOnline = !!o.items;
            const customer = state.partners.find(p => p.id === o.customer_id);
            const commVal = o.commission_amount || 0;
            
            const paidForOrder = state.transactions
                .filter(t => t.reference_id === o.id && t.type === "PAYMENT" && t.category === "SALES_COMMISSION")
                .reduce((sum, t) => sum + t.amount, 0);
            
            const remaining = Math.max(0, commVal - paidForOrder);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${o.order_number}</strong></td>
                <td><span class="badge ${isOnline ? 'badge-info' : 'badge-primary'}">${isOnline ? 'Online' : 'Sản xuất'}</span></td>
                <td>${customer ? customer.name : 'Khách vãng lai'}</td>
                <td>${formatMoney(o.total_amount)}</td>
                <td>${o.commission_rate}%</td>
                <td><strong style="color:var(--success);">${formatMoney(commVal)}</strong></td>
                <td><span class="text-success">${formatMoney(paidForOrder)}</span></td>
                <td class="${remaining > 0 ? 'text-danger font-bold' : 'text-secondary'}">${formatMoney(remaining)}</td>
                <td>
                    ${remaining > 0 && salesperson !== "Chưa phân công" ? `
                        <button class="btn btn-danger btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="payCommissionForOrder('${salesperson}', '${o.id}')">Chi trả</button>
                    ` : (salesperson === "Chưa phân công" ? '-' : '<span class="text-success" style="font-size:0.75rem;">Đã hoàn thành</span>')}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    lucide.createIcons();
    openModal("salesCommissionDetailsModal");
};

window.payCommissionForOrder = function(salesperson, orderId) {
    const order = state.orders.find(o => o.id === orderId) || state.online_orders.find(o => o.id === orderId);
    if (!order) return;

    const commVal = order.commission_amount || 0;
    const paidForOrder = state.transactions
        .filter(t => t.reference_id === order.id && t.type === "PAYMENT" && t.category === "SALES_COMMISSION")
        .reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, commVal - paidForOrder);

    if (remaining <= 0) {
        alert("Hoa hồng đơn này đã được chi trả đầy đủ.");
        return;
    }

    const amountStr = prompt(`Chi trả hoa hồng cho ${salesperson} - Đơn hàng: ${order.order_number}\nTổng hoa hồng đơn: ${formatMoney(commVal)}\nĐã chi trả: ${formatMoney(paidForOrder)}\nCòn nợ: ${formatMoney(remaining)}\nNhập số tiền hoặc % muốn chi trả (ví dụ: 50% hoặc 500000):`, remaining);
    if (amountStr === null) return;

    const rawVal = amountStr.trim();
    let payAmount = 0;
    if (rawVal.endsWith('%')) {
        const percent = parseFloat(rawVal.replace('%', '')) || 0;
        payAmount = Math.round(commVal * percent / 100);
    } else {
        payAmount = parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0;
    }

    if (payAmount <= 0) {
        alert("Số tiền không hợp lệ.");
        return;
    }

    if (payAmount > remaining) {
        if (!confirm(`Số tiền muốn chi trả (${formatMoney(payAmount)}) lớn hơn số nợ hoa hồng của đơn (${formatMoney(remaining)}). Tiếp tục?`)) {
            return;
        }
    }

    const method = confirm(`Xác nhận chi trả hoa hồng ${formatMoney(payAmount)}?\nOK = CHUYỂN KHOẢN, Cancel = TIỀN MẶT`) ? "BANK_TRANSFER" : "CASH";

    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txNumber = `PC-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);

    const paymentTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: "PAYMENT",
        category: "SALES_COMMISSION",
        amount: payAmount,
        payment_method: method,
        account_source: method === "CASH" ? "CASH" : "VCB",
        partner_id: salesperson,
        reference_id: order.id,
        created_by: "Kế toán Hùng"
    };

    state.transactions = [paymentTx, ...state.transactions];
    state.updateState("transactions", state.transactions);

    alert(`Đã lập phiếu chi trả hoa hồng ${formatMoney(payAmount)} cho ${salesperson} - Đơn hàng: ${order.order_number}`);

    // Refresh modals and views
    closeModal("salesCommissionDetailsModal");
    renderSalesCommissions();
    renderFinance();
};

window.paySalesCommission = function(salesperson) {
    const standardOrders = state.orders.filter(o => (o.salesperson || "Chưa phân công") === salesperson);
    const onlineOrders = state.online_orders.filter(o => (o.salesperson || "Chưa phân công") === salesperson);
    const allOrders = [...standardOrders, ...onlineOrders];

    const totalCommAccrued = allOrders.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    const totalCommPaid = state.transactions
        .filter(t => t.partner_id === salesperson && t.type === "PAYMENT" && t.category === "SALES_COMMISSION")
        .reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, totalCommAccrued - totalCommPaid);

    if (remaining <= 0) {
        alert("Tất cả hoa hồng của nhân viên này đã được chi trả đầy đủ.");
        return;
    }

    const amountStr = prompt(`Lập lệnh chi trả hoa hồng cho Sales: ${salesperson}\nTổng nợ hoa hồng hiện tại: ${formatMoney(remaining)}\nNhập số tiền muốn chi trả (ví dụ: 1000000):`, remaining);
    if (amountStr === null) return;

    const payAmount = parseFloat(amountStr.replace(/[^0-9]/g, '')) || 0;
    if (payAmount <= 0) {
        alert("Số tiền không hợp lệ.");
        return;
    }

    if (payAmount > remaining) {
        if (!confirm(`Số tiền muốn chi trả (${formatMoney(payAmount)}) lớn hơn tổng nợ hoa hồng của nhân viên (${formatMoney(remaining)}). Tiếp tục?`)) {
            return;
        }
    }

    const method = confirm(`Xác nhận chi trả hoa hồng ${formatMoney(payAmount)}?\nOK = CHUYỂN KHOẢN, Cancel = TIỀN MẶT`) ? "BANK_TRANSFER" : "CASH";

    const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
    const txNumber = `PC-202606-${txCodeSuffix}`;
    const txId = "t_" + Math.random().toString(36).substring(2, 9);

    const paymentTx = {
        id: txId,
        tx_number: txNumber,
        created_at: new Date().toISOString(),
        type: "PAYMENT",
        category: "SALES_COMMISSION",
        amount: payAmount,
        payment_method: method,
        account_source: method === "CASH" ? "CASH" : "VCB",
        partner_id: salesperson,
        reference_id: "Thanh toán chung",
        created_by: "Kế toán Hùng"
    };

    state.transactions = [paymentTx, ...state.transactions];
    state.updateState("transactions", state.transactions);

    alert(`Đã lập phiếu chi trả hoa hồng ${formatMoney(payAmount)} cho Sales: ${salesperson}`);
    renderSalesCommissions();
    renderFinance();
};

window.viewSalesCommissionPaymentHistory = function(salesperson) {
    let modal = document.getElementById("salesCommissionHistoryModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "salesCommissionHistoryModal";
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 750px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Lịch sử chi trả hoa hồng - <span id="commHistorySpName"></span></h2>
                        <button class="btn-close" onclick="closeModal('salesCommissionHistoryModal')"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;">
                        <div class="table-responsive" style="max-height: 350px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Số phiếu</th>
                                        <th>Hình thức</th>
                                        <th>Số tiền chi</th>
                                        <th>Người lập</th>
                                        <th>Tham chiếu đơn</th>
                                    </tr>
                                </thead>
                                <tbody id="commHistoryTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('salesCommissionHistoryModal')">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById("commHistorySpName").textContent = salesperson;
    const tbody = document.getElementById("commHistoryTableBody");
    tbody.innerHTML = "";

    const txs = state.transactions
        .filter(t => t.partner_id === salesperson && t.type === "PAYMENT" && t.category === "SALES_COMMISSION")
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    if (txs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Chưa có lịch sử chi trả hoa hồng nào.</td></tr>`;
    } else {
        txs.forEach(tx => {
            let refCode = tx.reference_id || "Thanh toán chung";
            if (tx.reference_id && tx.reference_id !== "Thanh toán chung") {
                const order = state.orders.find(o => o.id === tx.reference_id) || state.online_orders.find(o => o.id === tx.reference_id);
                if (order) refCode = order.order_number;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td><strong>${tx.tx_number}</strong></td>
                <td>${tx.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VCB'}</td>
                <td><strong class="text-danger">-${formatMoney(tx.amount)}</strong></td>
                <td>${tx.created_by || 'Kế toán'}</td>
                <td><strong>${refCode}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    lucide.createIcons();
    lucide.createIcons();
    openModal("salesCommissionHistoryModal");
};

// ==========================================================================
// HUMAN RESOURCES (HR) MANAGEMENT
// ==========================================================================
window.renderEmployees = function() {
    const query = (document.getElementById("employeeSearchInput")?.value || "").toLowerCase().trim();

    const filtered = state.salespersons.filter(s => s.role === "SALESPERSON" && (
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.phone.toLowerCase().includes(query) ||
        (s.email || "").toLowerCase().includes(query)
    ));

    const tableBody = document.querySelector("#employeesTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">Không tìm thấy nhân viên nào</td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${s.code}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.phone}</td>
            <td>${s.email || 'N/A'}</td>
            <td><strong>${s.commission_rate}%</strong></td>
            <td><code>${s.referral_code}</code></td>
            <td><a href="${s.referral_link}" target="_blank" style="font-size:0.8rem; text-decoration:underline;">${s.referral_link}</a></td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;" onclick="window.showEmployeeWorkHistoryModal('${s.id}')"><i data-lucide="history" style="width:12px; height:12px;"></i> Lịch sử</button>
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditEmployee('${s.id}')">Sửa</button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="deleteEmployee('${s.id}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
};

window.openEditEmployee = function(id) {
    const s = state.salespersons.find(item => item.id === id);
    if (!s) return;

    document.getElementById("salespersonModalTitle").textContent = "Cập nhật thông tin nhân viên";
    document.getElementById("salespersonIdInput").value = s.id;
    document.getElementById("salespersonCode").value = s.code;
    document.getElementById("salespersonRole").value = s.role;
    document.getElementById("salespersonName").value = s.name;
    document.getElementById("salespersonPhone").value = s.phone;
    document.getElementById("salespersonEmail").value = s.email || "";
    document.getElementById("salespersonCommissionRate").value = s.commission_rate;
    document.getElementById("salespersonReferralCode").value = s.referral_code;

    document.getElementById("salespersonTitle").value = s.title || "Nhân viên";
    document.getElementById("salespersonDepartment").value = s.department || "";
    document.getElementById("salespersonBranch").value = s.branch || "";
    document.getElementById("salespersonBirthday").value = s.birthday || "";
    document.getElementById("salespersonAddress").value = s.address || "";
    document.getElementById("salespersonZalo").value = s.zalo || "";
    document.getElementById("salespersonFacebook").value = s.facebook || "";

    openModal("salespersonModal");
};

window.deleteEmployee = function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân viên này không?")) return;
    const newSales = state.salespersons.filter(s => s.id !== id);
    state.updateState("salespersons", newSales);
    renderEmployees();
    populateSalespersonsDropdowns();
};

window.renderCollaborators = function() {
    const tableBody = document.querySelector("#collaboratorsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = (document.getElementById("collaboratorSearchInput")?.value || "").toLowerCase().trim();

    const filtered = state.salespersons.filter(s => s.role === "COLLABORATOR" && (
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.phone.toLowerCase().includes(query) ||
        (s.email || "").toLowerCase().includes(query)
    ));

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">Không tìm thấy cộng tác viên nào</td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${s.code}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.phone}</td>
            <td>${s.email || 'N/A'}</td>
            <td><strong>${s.commission_rate}%</strong></td>
            <td><code>${s.referral_code}</code></td>
            <td><a href="${s.referral_link}" target="_blank" style="font-size:0.8rem; text-decoration:underline;">${s.referral_link}</a></td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;" onclick="window.showEmployeeWorkHistoryModal('${s.id}')"><i data-lucide="history" style="width:12px; height:12px;"></i> Lịch sử</button>
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditCollaborator('${s.id}')">Sửa</button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="deleteCollaborator('${s.id}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
};

window.openEditCollaborator = function(id) {
    const s = state.salespersons.find(item => item.id === id);
    if (!s) return;

    document.getElementById("salespersonModalTitle").textContent = "Cập nhật cộng tác viên";
    document.getElementById("salespersonIdInput").value = s.id;
    document.getElementById("salespersonCode").value = s.code;
    document.getElementById("salespersonRole").value = s.role;
    document.getElementById("salespersonName").value = s.name;
    document.getElementById("salespersonPhone").value = s.phone;
    document.getElementById("salespersonEmail").value = s.email || "";
    document.getElementById("salespersonCommissionRate").value = s.commission_rate;
    document.getElementById("salespersonReferralCode").value = s.referral_code;

    document.getElementById("salespersonTitle").value = s.title || "Nhân viên";
    document.getElementById("salespersonDepartment").value = s.department || "";
    document.getElementById("salespersonBranch").value = s.branch || "";
    document.getElementById("salespersonBirthday").value = s.birthday || "";
    document.getElementById("salespersonAddress").value = s.address || "";
    document.getElementById("salespersonZalo").value = s.zalo || "";
    document.getElementById("salespersonFacebook").value = s.facebook || "";

    openModal("salespersonModal");
};

window.deleteCollaborator = function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa cộng tác viên này không?")) return;
    const newSales = state.salespersons.filter(s => s.id !== id);
    state.updateState("salespersons", newSales);
    renderCollaborators();
    populateSalespersonsDropdowns();
};

window.renderLaborContracts = function() {
    const tableBody = document.querySelector("#laborContractsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = (document.getElementById("laborContractSearchInput")?.value || "").toLowerCase().trim();

    const filtered = state.labor_contracts.filter(c => {
        const emp = state.salespersons.find(s => s.id === c.employee_id);
        const empName = emp ? emp.name.toLowerCase() : "";
        return c.contract_number.toLowerCase().includes(query) ||
               empName.includes(query) ||
               c.contract_type.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-muted text-center">Không tìm thấy hợp đồng lao động nào</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        const emp = state.salespersons.find(s => s.id === c.employee_id);
        
        const statusBadges = {
            ACTIVE: '<span class="badge badge-success">Đang hiệu lực</span>',
            EXPIRED: '<span class="badge badge-warning">Đã hết hạn</span>',
            TERMINATED: '<span class="badge badge-danger">Đã chấm dứt</span>'
        };

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${c.contract_number}</strong></td>
            <td><strong>${emp ? emp.name : 'N/A'}</strong></td>
            <td>${new Date(c.sign_date).toLocaleDateString('vi-VN')}</td>
            <td>${new Date(c.start_date).toLocaleDateString('vi-VN')}</td>
            <td>${c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : 'Không xác định'}</td>
            <td><strong>${formatMoney(c.base_salary)}</strong></td>
            <td><span class="badge badge-secondary">${c.contract_type}</span></td>
            <td>${statusBadges[c.status] || c.status}</td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditLaborContract('${c.id}')">Sửa</button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="deleteLaborContract('${c.id}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
};

window.populateLaborContractEmployeesDropdown = function() {
    const select = document.getElementById("laborContractEmployeeId");
    if (!select) return;
    select.innerHTML = "";

    state.salespersons.forEach(s => {
        const option = document.createElement("option");
        option.value = s.id;
        option.textContent = `${s.code} - ${s.name} (${s.role === 'SALESPERSON' ? 'Nhân viên' : 'CTV'})`;
        select.appendChild(option);
    });
};

window.openEditLaborContract = function(id) {
    const c = state.labor_contracts.find(item => item.id === id);
    if (!c) return;

    document.getElementById("laborContractModalTitle").textContent = "Cập nhật hợp đồng lao động";
    document.getElementById("laborContractIdInput").value = c.id;
    document.getElementById("laborContractNumber").value = c.contract_number;
    
    populateLaborContractEmployeesDropdown();
    document.getElementById("laborContractEmployeeId").value = c.employee_id;
    
    document.getElementById("laborContractSignDate").value = c.sign_date;
    document.getElementById("laborContractStartDate").value = c.start_date;
    document.getElementById("laborContractEndDate").value = c.end_date || "";
    document.getElementById("laborContractBaseSalary").value = c.base_salary;
    document.getElementById("laborContractType").value = c.contract_type;
    document.getElementById("laborContractStatus").value = c.status;

    openModal("laborContractModal");
};

window.deleteLaborContract = function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng lao động này không?")) return;
    const newContracts = state.labor_contracts.filter(c => c.id !== id);
    state.updateState("labor_contracts", newContracts);
    renderLaborContracts();
};

window.populateSalespersonsDropdowns = function() {
    const quoteSp = document.getElementById("quoteSalesperson");
    const onlineSp = document.getElementById("onlineOrderSalesPerson");
    
    if (quoteSp) {
        const currentVal = quoteSp.value;
        quoteSp.innerHTML = "";
        state.salespersons.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = `${s.name} (${s.role === 'SALESPERSON' ? 'NVKD' : 'CTV'})`;
            quoteSp.appendChild(opt);
        });
        if (currentVal && Array.from(quoteSp.options).some(o => o.value === currentVal)) {
            quoteSp.value = currentVal;
        }
    }
    
    if (onlineSp) {
        const currentVal = onlineSp.value;
        onlineSp.innerHTML = "";
        state.salespersons.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = `${s.name} (${s.role === 'SALESPERSON' ? 'NVKD' : 'CTV'})`;
            onlineSp.appendChild(opt);
        });
        if (currentVal && Array.from(onlineSp.options).some(o => o.value === currentVal)) {
            onlineSp.value = currentVal;
        }
    }
};

// ==========================================================================
// BUSINESS CONTRACTS MANAGEMENT
// ==========================================================================
window.renderContracts = function() {
    const tableBody = document.querySelector("#contractsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = (document.getElementById("contractSearchInput")?.value || "").toLowerCase().trim();

    const filtered = state.contracts.filter(c => {
        const partner = state.partners.find(p => p.id === c.partner_id);
        const partnerName = partner ? partner.name.toLowerCase() : "";
        
        let linkedOrderNum = "";
        if (c.order_type === "PRODUCTION") {
            const order = state.orders.find(o => o.id === c.order_id);
            if (order) linkedOrderNum = order.order_number;
        } else {
            const onlineOrder = state.online_orders.find(o => o.id === c.order_id);
            if (onlineOrder) linkedOrderNum = onlineOrder.order_number;
        }
        
        return c.contract_number.toLowerCase().includes(query) ||
               partnerName.includes(query) ||
               linkedOrderNum.toLowerCase().includes(query) ||
               (c.details || "").toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">Không tìm thấy hợp đồng nào</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        const partner = state.partners.find(p => p.id === c.partner_id);
        
        let linkedOrderNum = "N/A";
        if (c.order_type === "PRODUCTION") {
            const order = state.orders.find(o => o.id === c.order_id);
            if (order) linkedOrderNum = order.order_number;
        } else {
            const onlineOrder = state.online_orders.find(o => o.id === c.order_id);
            if (onlineOrder) linkedOrderNum = onlineOrder.order_number;
        }

        const statusBadges = {
            ACTIVE: '<span class="badge badge-info">Đang thực hiện</span>',
            LIQUIDATED: '<span class="badge badge-success">Đã thanh lý</span>',
            EXPIRED: '<span class="badge badge-danger">Đã hết hạn</span>'
        };

        const typeLabels = {
            PRODUCTION: "Sản xuất",
            ONLINE: "Online"
        };

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${c.contract_number}</strong></td>
            <td><strong>${partner ? partner.name : 'N/A'}</strong></td>
            <td>${new Date(c.signing_date).toLocaleDateString('vi-VN')}</td>
            <td><strong>${formatMoney(c.value)}</strong></td>
            <td><span class="badge badge-secondary">${typeLabels[c.order_type] || c.order_type}</span></td>
            <td><strong>${linkedOrderNum}</strong></td>
            <td>${statusBadges[c.status] || c.status}</td>
            <td>
                <div class="card-actions-row">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditContract('${c.id}')">Sửa</button>
                    ${c.status !== "LIQUIDATED" ? `
                        <button class="btn btn-success" style="padding: 4px 8px; font-size: 0.75rem;" onclick="liquidateContract('${c.id}')">Thanh lý</button>
                    ` : ''}
                    <button class="btn-icon" style="color:var(--danger)" onclick="deleteContract('${c.id}')" title="Xóa"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
};

window.populateContractPartners = function() {
    const select = document.getElementById("contractPartnerId");
    if (!select) return;
    select.innerHTML = "";

    const customers = state.partners.filter(p => p.role === "CUSTOMER" || p.role === "BOTH");
    customers.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.code} - ${p.name}`;
        select.appendChild(option);
    });
};

window.populateContractOrders = function() {
    const partnerSelect = document.getElementById("contractPartnerId");
    const typeSelect = document.getElementById("contractOrderType");
    const orderSelect = document.getElementById("contractOrderId");
    if (!partnerSelect || !typeSelect || !orderSelect) return;

    const partnerId = partnerSelect.value;
    const orderType = typeSelect.value;
    orderSelect.innerHTML = "";

    if (!partnerId) return;

    if (orderType === "PRODUCTION") {
        const orders = state.orders.filter(o => o.customer_id === partnerId);
        orders.forEach(o => {
            const option = document.createElement("option");
            option.value = o.id;
            option.textContent = `${o.order_number} (${o.print_spec} - ${formatMoney(o.total_amount)})`;
            orderSelect.appendChild(option);
        });
    } else {
        const onlineOrders = state.online_orders.filter(o => o.customer_id === partnerId);
        onlineOrders.forEach(o => {
            const option = document.createElement("option");
            option.value = o.id;
            option.textContent = `${o.order_number} (${formatMoney(o.total_amount)})`;
            orderSelect.appendChild(option);
        });
    }

    updateContractValueField();
};

function updateContractValueField() {
    const orderSelect = document.getElementById("contractOrderId");
    const typeSelect = document.getElementById("contractOrderType");
    const valueInput = document.getElementById("contractValue");
    if (!orderSelect || !typeSelect || !valueInput) return;

    const orderId = orderSelect.value;
    const orderType = typeSelect.value;

    if (!orderId) {
        valueInput.value = 0;
        return;
    }

    if (orderType === "PRODUCTION") {
        const order = state.orders.find(o => o.id === orderId);
        if (order) valueInput.value = order.total_amount;
    } else {
        const onlineOrder = state.online_orders.find(o => o.id === orderId);
        if (onlineOrder) valueInput.value = onlineOrder.total_amount;
    }
}

window.openEditContract = function(contractId) {
    const c = state.contracts.find(item => item.id === contractId);
    if (!c) return;

    document.getElementById("contractModalTitle").textContent = "Cập nhật hợp đồng kinh doanh";
    document.getElementById("contractIdInput").value = c.id;
    document.getElementById("contractNumber").value = c.contract_number;
    document.getElementById("contractSigningDate").value = c.signing_date;
    
    populateContractPartners();
    document.getElementById("contractPartnerId").value = c.partner_id;
    
    document.getElementById("contractOrderType").value = c.order_type;
    populateContractOrders();
    document.getElementById("contractOrderId").value = c.order_id;
    
    document.getElementById("contractValue").value = c.value;
    document.getElementById("contractStatus").value = c.status;
    document.getElementById("contractDetails").value = c.details || "";

    openModal("contractModal");
};

window.quickCreateContract = function(orderId, isOnline = false) {
    const typeStr = isOnline ? "ONLINE" : "PRODUCTION";
    let order = null;
    if (isOnline) {
        order = (state.online_orders || []).find(o => o.id === orderId);
    } else {
        order = (state.orders || []).find(o => o.id === orderId);
    }

    if (!order) {
        alert("Không tìm thấy thông tin đơn hàng!");
        return;
    }

    // Populate partners dropdown
    if (window.populateContractPartners) {
        window.populateContractPartners();
    }

    const modalTitle = document.getElementById("contractModalTitle");
    if (modalTitle) {
        modalTitle.textContent = `Tạo hợp đồng nhanh - ${order.order_number}`;
    }

    const idInput = document.getElementById("contractIdInput");
    if (idInput) idInput.value = "";
    
    // Auto contract number: HĐ-YYYYMM-XXXX
    const now = new Date();
    const dateCode = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
    const randCode = String(Math.floor(1000 + Math.random() * 9000));
    const numInput = document.getElementById("contractNumber");
    if (numInput) numInput.value = `HĐ-${dateCode}-${randCode}`;
    
    const signInput = document.getElementById("contractSigningDate");
    if (signInput) signInput.value = now.toISOString().split('T')[0];
    
    // Set partner
    const partnerSelect = document.getElementById("contractPartnerId");
    if (partnerSelect && order.customer_id) {
        partnerSelect.value = order.customer_id;
    }

    // Set order type & populate orders
    const typeSelect = document.getElementById("contractOrderType");
    if (typeSelect) {
        typeSelect.value = typeStr;
    }

    if (window.populateContractOrders) {
        window.populateContractOrders();
    }

    const orderSelect = document.getElementById("contractOrderId");
    if (orderSelect) {
        orderSelect.value = order.id;
    }

    // Set contract value
    const valueInput = document.getElementById("contractValue");
    if (valueInput) {
        valueInput.value = order.total_amount || 0;
    }

    // Set status
    const statusSelect = document.getElementById("contractStatus");
    if (statusSelect) {
        statusSelect.value = "ACTIVE";
    }

    // Set details
    const detailsInput = document.getElementById("contractDetails");
    if (detailsInput) {
        const partner = (state.partners || []).find(p => p.id === order.customer_id);
        const custName = partner ? partner.name : "Khách hàng";
        if (isOnline) {
            detailsInput.value = `Hợp đồng kinh doanh cung cấp sản phẩm Online cho đơn hàng ${order.order_number}. Khách hàng: ${custName}. Tổng giá trị hợp đồng: ${formatMoney(order.total_amount)}.`;
        } else {
            const specText = order.print_spec || "Sản xuất in ấn";
            detailsInput.value = `Hợp đồng sản xuất in ấn cho đơn hàng ${order.order_number} (${specText}). Khách hàng: ${custName}. Tổng giá trị hợp đồng: ${formatMoney(order.total_amount)}.`;
        }
    }

    openModal("contractModal");
};

window.deleteContract = function(contractId) {
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này không?")) return;
    const newContracts = state.contracts.filter(c => c.id !== contractId);
    state.updateState("contracts", newContracts);
    renderContracts();
};

window.liquidateContract = function(contractId) {
    if (!confirm("Bạn có chắc chắn muốn thanh lý hợp đồng này không?")) return;
    const newContracts = state.contracts.map(c => {
        if (c.id === contractId) {
            return { ...c, status: "LIQUIDATED" };
        }
        return c;
    });
    state.updateState("contracts", newContracts);
    renderContracts();
    
    if (selectedCrmPartnerId) {
        renderCrmDetailSubtabs(selectedCrmPartnerId);
    }
};

// ==========================================================================
// ORDER DEBT PAYMENT MODAL
// ==========================================================================
window.openOrderPaymentModal = function(orderId, prefilledValue = "") {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const oPaid = state.transactions
        .filter(t => t.reference_id === order.id && t.type === "RECEIPT")
        .reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, order.total_amount - oPaid);
    
    document.getElementById("paymentOrderId").value = order.id;
    document.getElementById("paymentOrderNumber").value = order.order_number;
    document.getElementById("paymentOrderTotal").value = formatMoney(order.total_amount);
    document.getElementById("paymentOrderRemaining").value = formatMoney(remaining);
    
    const inputAmount = document.getElementById("paymentInputAmount");
    inputAmount.value = prefilledValue ? prefilledValue : remaining.toLocaleString('vi-VN');
    
    updatePaymentCalcHint(order.total_amount, remaining);
    
    const fileInput = document.getElementById("paymentBillInput");
    if (fileInput) fileInput.value = "";
    const imgPreview = document.getElementById("paymentBillPreview");
    if (imgPreview) {
        imgPreview.src = "";
        imgPreview.style.display = "none";
    }
    
    openModal("orderPaymentModal");
};

window.viewPaymentBill = function(txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx || !tx.bill_image) return;
    const img = document.getElementById("viewBillImage");
    if (img) {
        img.src = tx.bill_image;
        openModal("viewBillModal");
    }
};

function updatePaymentCalcHint(totalAmount, remaining) {
    const inputAmount = document.getElementById("paymentInputAmount");
    const hintEl = document.getElementById("paymentAmountCalcHint");
    if (!inputAmount || !hintEl) return;
    
    const rawVal = inputAmount.value.trim();
    let calculated = 0;
    
    if (rawVal.endsWith('%')) {
        const percent = parseFloat(rawVal.replace('%', '')) || 0;
        calculated = Math.round(totalAmount * percent / 100);
    } else {
        calculated = parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0;
    }
    
    hintEl.textContent = `Số tiền thu nợ thực tế: ${formatMoney(calculated)} (Cần thu nợ: ${formatMoney(remaining)})`;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnCloseOrderPaymentModal")?.addEventListener("click", () => closeModal("orderPaymentModal"));
    document.getElementById("btnCancelOrderPayment")?.addEventListener("click", () => closeModal("orderPaymentModal"));
    
    const paymentInputAmount = document.getElementById("paymentInputAmount");
    paymentInputAmount?.addEventListener("input", () => {
        const orderId = document.getElementById("paymentOrderId").value;
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const oPaid = state.transactions
            .filter(t => t.reference_id === order.id && t.type === "RECEIPT")
            .reduce((sum, t) => sum + t.amount, 0);
        const remaining = Math.max(0, order.total_amount - oPaid);
        
        updatePaymentCalcHint(order.total_amount, remaining);
    });

    // Image upload preview listener for debt collection bill
    document.getElementById("paymentBillInput")?.addEventListener("change", function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById("paymentBillPreview");
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                preview.src = evt.target.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById("orderPaymentForm")?.addEventListener("submit", function(e) {
        e.preventDefault();
        const orderId = document.getElementById("paymentOrderId").value;
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const oPaid = state.transactions
            .filter(t => t.reference_id === order.id && t.type === "RECEIPT")
            .reduce((sum, t) => sum + t.amount, 0);
        const remaining = Math.max(0, order.total_amount - oPaid);
        
        const rawVal = paymentInputAmount.value.trim();
        let payAmount = 0;
        
        if (!rawVal) {
            payAmount = remaining;
        } else if (rawVal.endsWith('%')) {
            const percent = parseFloat(rawVal.replace('%', '')) || 0;
            payAmount = Math.round(order.total_amount * percent / 100);
        } else {
            payAmount = parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0;
        }
        
        if (payAmount <= 0) {
            alert("Vui lòng nhập số tiền hoặc % thanh toán lớn hơn 0.");
            return;
        }
        
        if (payAmount > remaining) {
            if (!confirm(`Số tiền thu nợ (${formatMoney(payAmount)}) lớn hơn số nợ còn lại (${formatMoney(remaining)}). Tiếp tục?`)) {
                return;
            }
        }
        
        const method = document.getElementById("paymentMethodSelect").value;
        const billPreview = document.getElementById("paymentBillPreview");
        const billImage = (billPreview && billPreview.style.display !== "none") ? billPreview.src : "";
        
        const txCodeSuffix = String(state.transactions.length + 1).padStart(4, '0');
        const txNumber = `PT-202606-${txCodeSuffix}`;
        const txId = "t_" + Math.random().toString(36).substring(2, 9);
        
        const receiptTx = {
            id: txId,
            tx_number: txNumber,
            created_at: new Date().toISOString(),
            type: "RECEIPT",
            category: "CUSTOMER_DEPOSIT",
            amount: payAmount,
            payment_method: method,
            account_source: method === "CASH" ? "CASH" : "VCB",
            partner_id: order.customer_id,
            reference_id: order.id,
            bill_image: billImage,
            created_by: "Kế toán Hùng"
        };
        
        state.transactions = [receiptTx, ...state.transactions];
        state.updateState("transactions", state.transactions);
        // Automatically synchronize payment status and state for both tables
        window.syncOrderPaymentStatus(order.id);
        
        closeModal("orderPaymentModal");
        alert(`Đã ghi nhận thu nợ ${formatMoney(payAmount)} cho đơn hàng ${order.order_number}`);
        
        // Refresh views
        renderOnlineSales();
        renderProdOrders();
        renderCRM();
        renderFinance();
        
        // If CRM Details modal is open, refresh its data too
        if (selectedCrmPartnerId) {
            renderCrmDetailSubtabs(selectedCrmPartnerId);
        }
    });

    // Contracts Tab Hooks
    document.getElementById("contractSearchInput")?.addEventListener("input", renderContracts);
    document.getElementById("btnNewContract")?.addEventListener("click", () => {
        document.getElementById("contractForm").reset();
        document.getElementById("contractIdInput").value = "";
        document.getElementById("contractModalTitle").textContent = "Tạo hợp đồng kinh doanh mới";
        
        // Generate new contract code
        const codeSuffix = String(state.contracts.length + 1).padStart(4, '0');
        document.getElementById("contractNumber").value = `HĐ-202606-${codeSuffix}`;
        document.getElementById("contractSigningDate").value = new Date().toISOString().split('T')[0];
        
        populateContractPartners();
        populateContractOrders();
        openModal("contractModal");
    });

    document.getElementById("btnCloseContractModal")?.addEventListener("click", () => closeModal("contractModal"));
    document.getElementById("btnCancelContract")?.addEventListener("click", () => closeModal("contractModal"));
    
    document.getElementById("contractPartnerId")?.addEventListener("change", populateContractOrders);
    document.getElementById("contractOrderType")?.addEventListener("change", populateContractOrders);
    document.getElementById("contractOrderId")?.addEventListener("change", updateContractValueField);

    document.getElementById("contractForm")?.addEventListener("submit", function(e) {
        e.preventDefault();
        const id = document.getElementById("contractIdInput").value;
        const number = document.getElementById("contractNumber").value;
        const signingDate = document.getElementById("contractSigningDate").value;
        const partnerId = document.getElementById("contractPartnerId").value;
        const orderType = document.getElementById("contractOrderType").value;
        const orderId = document.getElementById("contractOrderId").value;
        const value = parseInt(document.getElementById("contractValue").value) || 0;
        const status = document.getElementById("contractStatus").value;
        const details = document.getElementById("contractDetails").value;

        if (id) {
            // Edit
            const newContracts = state.contracts.map(c => {
                if (c.id === id) {
                    return { ...c, contract_number: number, signing_date: signingDate, partner_id: partnerId, order_type: orderType, order_id: orderId, value, status, details };
                }
                return c;
            });
            state.updateState("contracts", newContracts);
        } else {
            // New
            const newId = "ct_" + Math.random().toString(36).substring(2, 9);
            const newContract = {
                id: newId,
                contract_number: number,
                signing_date: signingDate,
                partner_id: partnerId,
                order_type: orderType,
                order_id: orderId,
                value,
                status,
                details
            };
            const newContracts = [newContract, ...state.contracts];
            state.updateState("contracts", newContracts);
        }

        closeModal("contractModal");
        renderContracts();
        renderCRM();
        renderFinance();
        if (selectedCrmPartnerId) {
            renderCrmDetailSubtabs(selectedCrmPartnerId);
        }
    });

    // Employees Tab Hooks
    document.getElementById("employeeSearchInput")?.addEventListener("input", renderEmployees);
    document.getElementById("btnNewEmployee")?.addEventListener("click", () => {
        document.getElementById("salespersonForm").reset();
        document.getElementById("salespersonIdInput").value = "";
        document.getElementById("salespersonModalTitle").textContent = "Thêm nhân viên mới";
        
        const codeSuffix = String(state.salespersons.length + 1).padStart(3, '0');
        document.getElementById("salespersonCode").value = `SALES-${codeSuffix}`;
        document.getElementById("salespersonRole").value = "SALESPERSON";
        document.getElementById("salespersonCommissionRate").value = 5;
        document.getElementById("salespersonReferralCode").value = `ref${codeSuffix}`;
        
        openModal("salespersonModal");
    });

    // Collaborators Tab Hooks
    document.getElementById("collaboratorSearchInput")?.addEventListener("input", renderCollaborators);
    document.getElementById("btnNewCollaborator")?.addEventListener("click", () => {
        document.getElementById("salespersonForm").reset();
        document.getElementById("salespersonIdInput").value = "";
        document.getElementById("salespersonModalTitle").textContent = "Thêm cộng tác viên mới";
        
        const codeSuffix = String(state.salespersons.length + 1).padStart(3, '0');
        document.getElementById("salespersonCode").value = `CTV-${codeSuffix}`;
        document.getElementById("salespersonRole").value = "COLLABORATOR";
        document.getElementById("salespersonCommissionRate").value = 10;
        document.getElementById("salespersonReferralCode").value = `ref${codeSuffix}`;
        
        openModal("salespersonModal");
    });

    document.getElementById("btnCloseSalespersonModal")?.addEventListener("click", () => closeModal("salespersonModal"));
    document.getElementById("btnCancelSalesperson")?.addEventListener("click", () => closeModal("salespersonModal"));
    
    // Auto prefix code on role change
    document.getElementById("salespersonRole")?.addEventListener("change", function() {
        const role = this.value;
        const codeSuffix = String(state.salespersons.length + 1).padStart(3, '0');
        if (role === "SALESPERSON") {
            document.getElementById("salespersonCode").value = `SALES-${codeSuffix}`;
            document.getElementById("salespersonCommissionRate").value = 5;
        } else {
            document.getElementById("salespersonCode").value = `CTV-${codeSuffix}`;
            document.getElementById("salespersonCommissionRate").value = 10;
        }
    });

    // Auto update default commission rate when salesperson is chosen in Quote modal
    document.getElementById("quoteSalesperson")?.addEventListener("change", function() {
        const name = this.value;
        const sp = state.salespersons.find(s => s.name === name);
        if (sp) {
            const commInput = document.getElementById("quoteCommissionRate");
            if (commInput) commInput.value = sp.commission_rate;
        }
    });

    // Auto update default commission rate when salesperson is chosen in Online Order modal
    document.getElementById("onlineOrderSalesPerson")?.addEventListener("change", function() {
        const name = this.value;
        const sp = state.salespersons.find(s => s.name === name);
        if (sp) {
            const commInput = document.getElementById("onlineOrderCommissionRate");
            if (commInput) commInput.value = sp.commission_rate;
        }
    });

    document.getElementById("salespersonForm")?.addEventListener("submit", function(e) {
        e.preventDefault();
        const id = document.getElementById("salespersonIdInput").value;
        const code = document.getElementById("salespersonCode").value;
        const role = document.getElementById("salespersonRole").value;
        const name = document.getElementById("salespersonName").value;
        const phone = document.getElementById("salespersonPhone").value;
        const email = document.getElementById("salespersonEmail").value;
        const rate = parseFloat(document.getElementById("salespersonCommissionRate").value) || 0;
        const refCode = document.getElementById("salespersonReferralCode").value.trim();
        const refLink = `https://inlachongjsc.web.app/?ref=${refCode}`;

        const title = document.getElementById("salespersonTitle").value;
        const department = document.getElementById("salespersonDepartment").value.trim();
        const branch = document.getElementById("salespersonBranch").value.trim();
        const birthday = document.getElementById("salespersonBirthday").value;
        const address = document.getElementById("salespersonAddress").value.trim();
        const zalo = document.getElementById("salespersonZalo").value.trim();
        const facebook = document.getElementById("salespersonFacebook").value.trim();

        const todayStr = new Date().toISOString().split('T')[0];

        if (id) {
            // Edit
            const newSales = state.salespersons.map(s => {
                if (s.id === id) {
                    // Check for changes to generate automatic history event
                    const history = s.work_history || [];
                    const changed = (s.title !== title) || (s.department !== department) || (s.branch !== branch) || (s.role !== role);
                    
                    if (changed) {
                        const contractType = role === "SALESPERSON" ? "Chính thức" : "CTV";
                        history.push({
                            id: "hist_" + Math.random().toString(36).substring(2, 9),
                            date: todayStr,
                            contract_type: contractType,
                            title: title,
                            department: department,
                            branch: branch,
                            note: `Cập nhật bổ nhiệm / thay đổi thông tin từ Hồ sơ nhân sự`
                        });
                    }

                    return { 
                        ...s, code, role, name, phone, email, commission_rate: rate, referral_code: refCode, referral_link: refLink,
                        title, department, branch, birthday, address, zalo, facebook,
                        work_history: history
                    };
                }
                return s;
            });
            state.updateState("salespersons", newSales);
        } else {
            // New
            const newId = "s_" + Math.random().toString(36).substring(2, 9);
            const contractType = role === "SALESPERSON" ? "Thử việc" : "CTV";
            const initialHistory = [{
                id: "hist_" + Math.random().toString(36).substring(2, 9),
                date: todayStr,
                contract_type: contractType,
                title: title || "Nhân viên",
                department: department || "Kinh doanh",
                branch: branch || "Trụ sở chính",
                note: "Khởi tạo hồ sơ nhân sự mới"
            }];

            const newSp = {
                id: newId,
                code,
                role,
                name,
                phone,
                email,
                commission_rate: rate,
                referral_code: refCode,
                referral_link: refLink,
                status: true,
                title, department, branch, birthday, address, zalo, facebook,
                work_history: initialHistory
            };
            const newSales = [...state.salespersons, newSp];
            state.updateState("salespersons", newSales);
        }

        closeModal("salespersonModal");
        renderEmployees();
        renderCollaborators();
        populateSalespersonsDropdowns();
    });

    // Labor Contracts Tab Hooks
    document.getElementById("laborContractSearchInput")?.addEventListener("input", renderLaborContracts);
    document.getElementById("btnNewLaborContract")?.addEventListener("click", () => {
        document.getElementById("laborContractForm").reset();
        document.getElementById("laborContractIdInput").value = "";
        document.getElementById("laborContractModalTitle").textContent = "Tạo hợp đồng lao động mới";
        
        // Generate automatic code
        const codeSuffix = String(state.labor_contracts.length + 1).padStart(4, '0');
        document.getElementById("laborContractNumber").value = `HĐLĐ-2026-${codeSuffix}`;
        document.getElementById("laborContractSignDate").value = new Date().toISOString().split('T')[0];
        document.getElementById("laborContractStartDate").value = new Date().toISOString().split('T')[0];
        document.getElementById("laborContractBaseSalary").value = 10000000;
        
        populateLaborContractEmployeesDropdown();
        openModal("laborContractModal");
    });

    document.getElementById("btnCloseLaborContractModal")?.addEventListener("click", () => closeModal("laborContractModal"));
    document.getElementById("btnCancelLaborContract")?.addEventListener("click", () => closeModal("laborContractModal"));

    document.getElementById("laborContractForm")?.addEventListener("submit", function(e) {
        e.preventDefault();
        const id = document.getElementById("laborContractIdInput").value;
        const number = document.getElementById("laborContractNumber").value;
        const employeeId = document.getElementById("laborContractEmployeeId").value;
        const signDate = document.getElementById("laborContractSignDate").value;
        const startDate = document.getElementById("laborContractStartDate").value;
        const endDate = document.getElementById("laborContractEndDate").value;
        const baseSalary = parseInt(document.getElementById("laborContractBaseSalary").value) || 0;
        const type = document.getElementById("laborContractType").value;
        const status = document.getElementById("laborContractStatus").value;

        if (id) {
            // Edit
            const newContracts = state.labor_contracts.map(c => {
                if (c.id === id) {
                    return { ...c, contract_number: number, employee_id: employeeId, sign_date: signDate, start_date: startDate, end_date: endDate, base_salary: baseSalary, contract_type: type, status };
                }
                return c;
            });
            state.updateState("labor_contracts", newContracts);
        } else {
            // New
            const newId = "lc_" + Math.random().toString(36).substring(2, 9);
            const newContract = {
                id: newId,
                contract_number: number,
                employee_id: employeeId,
                sign_date: signDate,
                start_date: startDate,
                end_date: endDate,
                base_salary: baseSalary,
                contract_type: type,
                status
            };
            const newContracts = [...state.labor_contracts, newContract];
            state.updateState("labor_contracts", newContracts);
        }

        closeModal("laborContractModal");
        renderLaborContracts();
    });

    // ==========================================
    // NHẬP KHO BÁN TỪ SẢN XUẤT HANDLERS
    // ==========================================
    window.openMfgImportModal = function(jobId = "") {
        const modal = document.getElementById("importFromMfgModal");
        if (!modal) return;

        const jobSelect = document.getElementById("mfgJobSelect");
        const prodSelect = document.getElementById("mfgProductSelect");
        const qtyInput = document.getElementById("mfgImportQty");

        if (!jobSelect || !prodSelect || !qtyInput) return;

        // Fill finished production jobs
        jobSelect.innerHTML = '<option value="">-- Chọn đơn sản xuất --</option>';
        const finishedJobs = (state.productions || []).filter(job => job.status === "FINISHED");
        finishedJobs.forEach(job => {
            const order = (state.orders || []).find(o => o.id === job.sales_order_id);
            const orderNum = order ? order.order_number : "N/A";
            const spec = order ? order.print_spec : "Không rõ";
            const importedLabel = job.imported_to_sales ? " (Đã nhập kho)" : "";
            jobSelect.innerHTML += `<option value="${job.id}" data-qty="${job.target_qty}" data-spec="${spec}" ${job.id === jobId ? 'selected' : ''}>${job.production_number} - ĐH: ${orderNum} - ${spec} (${job.target_qty.toLocaleString()} cái)${importedLabel}</option>`;
        });

        // Fill online products
        prodSelect.innerHTML = '<option value="">-- Chọn hàng hóa --</option>';
        (state.online_products || []).forEach(prod => {
            prodSelect.innerHTML += `<option value="${prod.sku}">${prod.sku} - ${prod.name}</option>`;
        });

        // Handler to match product when job changes
        function handleJobChange() {
            const selectedOpt = jobSelect.options[jobSelect.selectedIndex];
            if (!selectedOpt || !selectedOpt.value) return;

            const qty = parseInt(selectedOpt.getAttribute("data-qty")) || 0;
            const spec = (selectedOpt.getAttribute("data-spec") || "").toLowerCase().trim();

            qtyInput.value = qty;

            // Auto match product SKU or Name
            const matchedProd = (state.online_products || []).find(p => {
                const sku = String(p.sku).toLowerCase().trim();
                const name = String(p.name).toLowerCase().trim();
                return spec.includes(sku) || spec.includes(name) || name.includes(spec) || sku.includes(spec);
            });

            if (matchedProd) {
                prodSelect.value = matchedProd.sku;
            } else {
                prodSelect.value = "";
            }
        }

        jobSelect.onchange = handleJobChange;

        if (jobId) {
            jobSelect.value = jobId;
            handleJobChange();
        } else {
            jobSelect.selectedIndex = 0;
            qtyInput.value = "";
            prodSelect.selectedIndex = 0;
        }

        modal.classList.add("active");
    };

    // Close buttons
    document.getElementById("btnCloseMfgImportModal")?.addEventListener("click", () => {
        closeModal("importFromMfgModal");
    });
    document.getElementById("btnCancelMfgImport")?.addEventListener("click", () => {
        closeModal("importFromMfgModal");
    });

    // Form submit handler
    document.getElementById("importFromMfgForm")?.addEventListener("submit", (e) => {
        e.preventDefault();

        const jobId = document.getElementById("mfgJobSelect").value;
        const sku = document.getElementById("mfgProductSelect").value;
        const qty = parseInt(document.getElementById("mfgImportQty").value) || 0;

        if (!jobId || !sku || qty <= 0) {
            alert("Vui lòng điền đầy đủ thông tin hợp lệ!");
            return;
        }

        const job = (state.productions || []).find(j => j.id === jobId);
        if (!job) return;

        const prod = (state.online_products || []).find(p => String(p.sku).trim().toUpperCase() === String(sku).trim().toUpperCase());
        if (!prod) {
            alert("Không tìm thấy hàng hóa bán tương ứng!");
            return;
        }

        // 1. Update product stock
        prod.stock_qty = (parseInt(prod.stock_qty) || 0) + qty;

        // 2. Mark production job as imported
        job.imported_to_sales = true;

        // 3. Add to online stock logs
        const newLog = {
            id: "SL-" + Date.now(),
            sku: prod.sku,
            qty: qty,
            type: "NHAP",
            note: `Nhập kho tự động từ Đơn sản xuất ${job.production_number}`,
            created_at: new Date().toISOString()
        };

        const currentLogs = state.online_stock_logs || [];
        
        state.updateState("online_products", state.online_products);
        state.updateState("productions", state.productions);
        state.updateState("online_stock_logs", [newLog, ...currentLogs]);

        closeModal("importFromMfgModal");
        
        // Re-render UI elements
        renderOnlineProducts();
        if (window.renderProductionTable) renderProductionTable();
        renderProdOrders();

        alert(`Đã nhập bổ sung thành công ${qty.toLocaleString()} sản phẩm vào kho hàng bán cho SKU: ${prod.sku}!`);
    });
});

// ==========================================================================
// WAREHOUSE MANAGEMENT SYSTEM LOGIC
// ==========================================================================

window.switchWarehouseSubTab = function(subtab) {
    document.querySelectorAll(".warehouse-subtab-pane").forEach(pane => {
        pane.style.display = "none";
    });
    const targetPane = document.getElementById(`subtab-${subtab}`);
    if (targetPane) {
        targetPane.style.display = "block";
    }

    // Dynamically update the header title
    const titleEl = document.getElementById("warehouseTabTitle");
    if (titleEl) {
        let label = "📥 Quản lý kho";
        if (subtab === "warehouse-import") label = "📥 Nhập kho thành phẩm";
        else if (subtab === "warehouse-export") label = "📤 Xuất kho bán hàng";
        else if (subtab === "warehouse-audit") label = "🔍 Kiểm kê kho hàng";
        titleEl.innerHTML = label;
    }

    document.querySelectorAll('.submenu-list a[href="#warehouse"]').forEach(btn => {
        if (btn.getAttribute("onclick")?.includes(subtab)) {
            btn.classList.add("active");
            btn.style.color = "var(--text-primary)";
        } else {
            btn.classList.remove("active");
            btn.style.color = "var(--text-secondary)";
        }
    });

    window.renderWarehouse();
};

window.renderWarehouse = function() {
    window.renderWarehouseImports();
    window.renderWarehouseExports();
    window.renderWarehouseAudits();
};

// 1. NHẬP KHO
window.renderWarehouseImports = function() {
    const tableBody = document.querySelector("#warehouseImportsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = document.getElementById("warehouseImportSearchInput")?.value.toLowerCase() || "";
    const list = state.warehouse_transactions || [];
    const imports = list.filter(t => t.type === "IMPORT").sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filtered = imports.filter(t => {
        const id = String(t.id).toLowerCase();
        const note = String(t.note || "").toLowerCase();
        const source = String(t.source || "").toLowerCase();
        return id.includes(query) || note.includes(query) || source.includes(query);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center">Không có phiếu nhập kho nào</td></tr>`;
        return;
    }

    filtered.forEach(t => {
        const date = new Date(t.created_at).toLocaleString('vi-VN');
        const itemCount = t.items ? t.items.length : 0;
        const totalQty = t.items ? t.items.reduce((sum, item) => sum + parseInt(item.qty || 0), 0) : 0;
        const sourceLabel = t.source === "PRODUCTION" ? "Đơn sản xuất" : "Nhà cung cấp";
        const detailLabel = t.source_ref_id || "Không rõ";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${t.id}</strong></td>
            <td><small>${date}</small></td>
            <td><span class="badge ${t.source === 'PRODUCTION' ? 'badge-info' : 'badge-primary'}">${sourceLabel}</span></td>
            <td>${detailLabel}</td>
            <td>${itemCount}</td>
            <td><strong>${totalQty.toLocaleString('vi-VN')}</strong></td>
            <td>${t.created_by || "Đại Hùng"}</td>
            <td><small class="text-muted">${t.note || ""}</small></td>
        `;
        tableBody.appendChild(row);
    });
};

window.openNewImportTicketModal = function() {
    const modal = document.getElementById("warehouseImportTicketModal");
    if (!modal) return;

    // Load suppliers (Partners of type SUPPLIER or SUBCONTRACTOR)
    const supplierSelect = document.getElementById("whImportSupplierSelect");
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">-- Chọn Nhà cung cấp --</option>';
        const suppliers = (state.partners || []).filter(p => p.role === "SUPPLIER" || p.role === "SUBCONTRACTOR");
        suppliers.forEach(p => {
            supplierSelect.innerHTML += `<option value="${p.name}">${p.code} - ${p.name}</option>`;
        });
    }

    // Load completed production orders
    const mfgSelect = document.getElementById("whImportMfgSelect");
    if (mfgSelect) {
        mfgSelect.innerHTML = '<option value="">-- Chọn lệnh hoàn thành --</option>';
        const finishedProds = (state.productions || []).filter(job => job.status === "FINISHED" && !job.imported_to_sales);
        finishedProds.forEach(job => {
            const order = (state.orders || []).find(o => o.id === job.sales_order_id);
            const orderNum = order ? order.order_number : "N/A";
            mfgSelect.innerHTML += `<option value="${job.id}" data-spec="${order ? order.print_spec : ''}" data-qty="${job.target_qty}">${job.production_number} (ĐH: ${orderNum})</option>`;
        });
    }

    // Reset items table
    const tableBody = document.querySelector("#whImportItemsTable tbody");
    if (tableBody) tableBody.innerHTML = "";
    window.addWhImportItemRow();

    // Source type toggle visibility
    const sourceType = document.getElementById("whImportSourceType");
    const supplierGroup = document.getElementById("whImportSupplierGroup");
    const mfgGroup = document.getElementById("whImportMfgGroup");

    if (sourceType && supplierGroup && mfgGroup) {
        sourceType.value = "SUPPLIER";
        supplierGroup.style.display = "block";
        mfgGroup.style.display = "none";

        sourceType.onchange = function() {
            if (sourceType.value === "SUPPLIER") {
                supplierGroup.style.display = "block";
                mfgGroup.style.display = "none";
            } else {
                supplierGroup.style.display = "none";
                mfgGroup.style.display = "block";
            }
        };
    }

    // Mfg select change handler to auto populate items
    if (mfgSelect) {
        mfgSelect.onchange = function() {
            const selectedOpt = mfgSelect.options[mfgSelect.selectedIndex];
            if (!selectedOpt || !selectedOpt.value) return;

            const spec = selectedOpt.getAttribute("data-spec") || "";
            const qty = parseInt(selectedOpt.getAttribute("data-qty")) || 0;

            // Find matching product
            const matched = (state.online_products || []).find(p => {
                const sku = String(p.sku).toLowerCase().trim();
                const name = String(p.name).toLowerCase().trim();
                return spec.toLowerCase().includes(sku) || spec.toLowerCase().includes(name);
            });

            if (tableBody) tableBody.innerHTML = "";
            window.addWhImportItemRow(matched ? matched.sku : "", qty);
        };
    }

    modal.classList.add("active");
};

window.addWhImportItemRow = function(sku = "", qty = "") {
    const tableBody = document.querySelector("#whImportItemsTable tbody");
    if (!tableBody) return;

    const row = document.createElement("tr");
    
    let options = '<option value="">-- Chọn sản phẩm --</option>';
    (state.online_products || []).forEach(p => {
        options += `<option value="${p.sku}" ${p.sku === sku ? 'selected' : ''}>${p.sku} - ${p.name}</option>`;
    });

    row.innerHTML = `
        <td><select class="form-input item-product" required>${options}</select></td>
        <td><input type="number" class="form-input item-qty" min="1" value="${qty || 100}" required></td>
        <td><input type="number" class="form-input item-price" min="0" value="0" required></td>
        <td><button type="button" class="btn btn-icon" onclick="window.removeWhImportRow(this)" style="color:var(--danger); background:none;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></td>
    `;
    tableBody.appendChild(row);
    if (window.lucide) lucide.createIcons();
};

window.removeWhImportRow = function(btn) {
    const tableBody = document.querySelector("#whImportItemsTable tbody");
    if (tableBody && tableBody.rows.length > 1) {
        btn.closest("tr").remove();
    } else {
        alert("Phiếu nhập kho phải chứa ít nhất 1 dòng sản phẩm!");
    }
};

// 2. XUẤT KHO
window.renderWarehouseExports = function() {
    const tableBody = document.querySelector("#warehouseExportsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = document.getElementById("warehouseExportSearchInput")?.value.toLowerCase() || "";
    const list = state.warehouse_transactions || [];
    const exports = list.filter(t => t.type === "EXPORT").sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filtered = exports.filter(t => {
        const id = String(t.id).toLowerCase();
        const note = String(t.note || "").toLowerCase();
        const reason = String(t.source || "").toLowerCase();
        return id.includes(query) || note.includes(query) || reason.includes(query);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-muted text-center">Không có phiếu xuất kho nào</td></tr>`;
        return;
    }

    filtered.forEach(t => {
        const date = new Date(t.created_at).toLocaleString('vi-VN');
        const itemCount = t.items ? t.items.length : 0;
        const totalQty = t.items ? t.items.reduce((sum, item) => sum + parseInt(item.qty || 0), 0) : 0;
        const reasonLabel = t.source === "SALE" ? "Xuất bán hàng" : "Xuất nội bộ / xuất hủy";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${t.id}</strong></td>
            <td><small>${date}</small></td>
            <td><span class="badge ${t.source === 'SALE' ? 'badge-success' : 'badge-danger'}">${reasonLabel}</span></td>
            <td>${itemCount}</td>
            <td><strong>${totalQty.toLocaleString('vi-VN')}</strong></td>
            <td>${t.created_by || "Đại Hùng"}</td>
            <td><small class="text-muted">${t.note || ""}</small></td>
        `;
        tableBody.appendChild(row);
    });
};

window.openNewExportTicketModal = function() {
    const modal = document.getElementById("warehouseExportTicketModal");
    if (!modal) return;

    // Reset items table
    const tableBody = document.querySelector("#whExportItemsTable tbody");
    if (tableBody) tableBody.innerHTML = "";
    window.addWhExportItemRow();

    modal.classList.add("active");
};

window.addWhExportItemRow = function(sku = "", qty = "") {
    const tableBody = document.querySelector("#whExportItemsTable tbody");
    if (!tableBody) return;

    const row = document.createElement("tr");
    
    let options = '<option value="">-- Chọn sản phẩm --</option>';
    (state.online_products || []).forEach(p => {
        options += `<option value="${p.sku}" ${p.sku === sku ? 'selected' : ''}>${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
    });

    row.innerHTML = `
        <td><select class="form-input item-product" required>${options}</select></td>
        <td><input type="number" class="form-input item-qty" min="1" value="${qty || 1}" required></td>
        <td><button type="button" class="btn btn-icon" onclick="window.removeWhExportRow(this)" style="color:var(--danger); background:none;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></td>
    `;
    tableBody.appendChild(row);
    if (window.lucide) lucide.createIcons();
};

window.removeWhExportRow = function(btn) {
    const tableBody = document.querySelector("#whExportItemsTable tbody");
    if (tableBody && tableBody.rows.length > 1) {
        btn.closest("tr").remove();
    } else {
        alert("Phiếu xuất kho phải chứa ít nhất 1 dòng sản phẩm!");
    }
};

// 3. KIỂM KHO
window.renderWarehouseAudits = function() {
    const tableBody = document.querySelector("#warehouseAuditsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const query = document.getElementById("warehouseAuditSearchInput")?.value.toLowerCase() || "";
    const filtered = (state.warehouse_audits || []).filter(audit => {
        const id = String(audit.id).toLowerCase();
        const sku = String(audit.sku || "").toLowerCase();
        const note = String(audit.note || "").toLowerCase();
        return id.includes(query) || sku.includes(query) || note.includes(query);
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-muted text-center">Không có phiếu kiểm kho nào</td></tr>`;
        return;
    }

    filtered.forEach(audit => {
        const date = new Date(audit.created_at).toLocaleString('vi-VN');
        const prod = (state.online_products || []).find(p => String(p.sku).toUpperCase() === String(audit.sku).toUpperCase());
        const prodName = prod ? prod.name : "Sản phẩm đã bị xóa";
        const diffLabel = audit.diff_qty > 0 ? `+${audit.diff_qty}` : audit.diff_qty;
        const diffStyle = audit.diff_qty === 0 ? "color:var(--text-secondary)" : audit.diff_qty > 0 ? "color:var(--success); font-weight:700;" : "color:var(--danger); font-weight:700;";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${audit.id}</strong></td>
            <td><small>${date}</small></td>
            <td><strong>${audit.sku}</strong></td>
            <td>${prodName}</td>
            <td>${audit.system_qty}</td>
            <td><strong>${audit.actual_qty}</strong></td>
            <td><span style="${diffStyle}">${diffLabel}</span></td>
            <td>${audit.created_by || "Đại Hùng"}</td>
            <td><small class="text-muted">${audit.note || ""}</small></td>
        `;
        tableBody.appendChild(row);
    });
};

window.openNewWarehouseAuditModal = function() {
    const modal = document.getElementById("warehouseAuditModal");
    if (!modal) return;

    const prodSelect = document.getElementById("whAuditProductSelect");
    const systemQtyInput = document.getElementById("whAuditSystemQty");
    const actualQtyInput = document.getElementById("whAuditActualQty");
    const noteInput = document.getElementById("whAuditNote");

    if (!prodSelect || !systemQtyInput || !actualQtyInput) return;

    prodSelect.innerHTML = '<option value="">-- Chọn hàng hóa cần kiểm --</option>';
    (state.online_products || []).forEach(p => {
        prodSelect.innerHTML += `<option value="${p.sku}" data-qty="${p.stock_qty}">${p.sku} - ${p.name} (Tồn: ${p.stock_qty})</option>`;
    });

    prodSelect.onchange = function() {
        const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
            const qty = parseInt(selectedOpt.getAttribute("data-qty")) || 0;
            systemQtyInput.value = qty;
            actualQtyInput.value = qty;
        } else {
            systemQtyInput.value = "";
            actualQtyInput.value = "";
        }
    };

    systemQtyInput.value = "";
    actualQtyInput.value = "";
    noteInput.value = "";

    modal.classList.add("active");
};

// Add general modal close listeners for newly added modals
document.getElementById("btnCloseWarehouseImportTicketModal")?.addEventListener("click", () => {
    closeModal("warehouseImportTicketModal");
});
document.getElementById("btnCancelWarehouseImportTicket")?.addEventListener("click", () => {
    closeModal("warehouseImportTicketModal");
});
document.getElementById("btnCloseWarehouseExportTicketModal")?.addEventListener("click", () => {
    closeModal("warehouseExportTicketModal");
});
document.getElementById("btnCancelWarehouseExportTicket")?.addEventListener("click", () => {
    closeModal("warehouseExportTicketModal");
});
document.getElementById("btnCloseWarehouseAuditModal")?.addEventListener("click", () => {
    closeModal("warehouseAuditModal");
});
document.getElementById("btnCancelWarehouseAudit")?.addEventListener("click", () => {
    closeModal("warehouseAuditModal");
});

// SUBMIT HANDLERS
// 1. Nhập kho submit
document.getElementById("warehouseImportTicketForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const sourceType = document.getElementById("whImportSourceType").value;
    const note = document.getElementById("whImportNote").value;
    
    let sourceRef = "";
    let mfgJobId = "";
    if (sourceType === "PRODUCTION") {
        mfgJobId = document.getElementById("whImportMfgSelect").value;
        const job = (state.productions || []).find(j => j.id === mfgJobId);
        if (!job) {
            alert("Vui lòng chọn đơn sản xuất hoàn thành!");
            return;
        }
        sourceRef = job.production_number;
    } else {
        sourceRef = document.getElementById("whImportSupplierSelect").value;
        if (!sourceRef) {
            alert("Vui lòng chọn Nhà cung cấp!");
            return;
        }
    }

    const rowEls = document.querySelectorAll("#whImportItemsTable tbody tr");
    const items = [];
    let hasInvalid = false;

    rowEls.forEach(row => {
        const sku = row.querySelector(".item-product").value;
        const qty = parseInt(row.querySelector(".item-qty").value) || 0;
        const price = parseInt(row.querySelector(".item-price").value) || 0;

        if (!sku || qty <= 0) {
            hasInvalid = true;
        } else {
            items.push({ sku, qty, price });
        }
    });

    if (hasInvalid || items.length === 0) {
        alert("Vui lòng nhập đầy đủ thông tin mặt hàng hợp lệ!");
        return;
    }

    // Update stock levels & write logs
    const newLogs = [...(state.online_stock_logs || [])];
    items.forEach(item => {
        const prod = (state.online_products || []).find(p => String(p.sku).trim().toUpperCase() === String(item.sku).trim().toUpperCase());
        if (prod) {
            prod.stock_qty = (parseInt(prod.stock_qty) || 0) + item.qty;
            newLogs.unshift({
                id: "SL-" + Date.now() + Math.random().toString(36).substring(2, 5),
                sku: item.sku,
                qty: item.qty,
                type: "NHAP",
                note: `Nhập kho: Phiếu nhập ${sourceRef} (${sourceType}) | Đơn giá: ${formatMoney(item.price)}`,
                created_at: new Date().toISOString()
            });
        }
    });

    // Mark job as imported if source is production
    if (sourceType === "PRODUCTION" && mfgJobId) {
        const job = (state.productions || []).find(j => j.id === mfgJobId);
        if (job) job.imported_to_sales = true;
    }

    // Create transaction ticket
    const ticketId = "PNK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    const newTicket = {
        id: ticketId,
        type: "IMPORT",
        source: sourceType,
        source_ref_id: sourceRef,
        items: items,
        note: note,
        created_by: "Đại Hùng",
        created_at: new Date().toISOString()
    };

    const currentTickets = state.warehouse_transactions || [];
    state.updateState("warehouse_transactions", [newTicket, ...currentTickets]);
    state.updateState("online_products", state.online_products);
    state.updateState("online_stock_logs", newLogs);
    if (sourceType === "PRODUCTION") {
        state.updateState("productions", state.productions);
    }

    closeModal("warehouseImportTicketModal");
    window.renderWarehouse();
    renderOnlineProducts();
    if (window.renderProductionTable) renderProductionTable();
    renderProdOrders();

    alert(`Lập phiếu nhập kho ${ticketId} thành công!`);
});

// 2. Xuất kho submit
document.getElementById("warehouseExportTicketForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const reason = document.getElementById("whExportReason").value;
    const note = document.getElementById("whExportNote").value;

    const rowEls = document.querySelectorAll("#whExportItemsTable tbody tr");
    const items = [];
    let hasInvalid = false;
    let insufficientStock = false;

    rowEls.forEach(row => {
        const sku = row.querySelector(".item-product").value;
        const qty = parseInt(row.querySelector(".item-qty").value) || 0;

        if (!sku || qty <= 0) {
            hasInvalid = true;
        } else {
            const prod = (state.online_products || []).find(p => String(p.sku).trim().toUpperCase() === String(sku).trim().toUpperCase());
            if (!prod || prod.stock_qty < qty) {
                insufficientStock = true;
            }
            items.push({ sku, qty });
        }
    });

    if (hasInvalid || items.length === 0) {
        alert("Vui lòng nhập đầy đủ thông tin mặt hàng!");
        return;
    }

    if (insufficientStock) {
        alert("Số lượng xuất kho vượt quá lượng hàng hiện có! Vui lòng kiểm tra lại tồn kho.");
        return;
    }

    // Update stock levels & write logs
    const newLogs = [...(state.online_stock_logs || [])];
    items.forEach(item => {
        const prod = (state.online_products || []).find(p => String(p.sku).trim().toUpperCase() === String(item.sku).trim().toUpperCase());
        if (prod) {
            prod.stock_qty = (parseInt(prod.stock_qty) || 0) - item.qty;
            newLogs.unshift({
                id: "SL-" + Date.now() + Math.random().toString(36).substring(2, 5),
                sku: item.sku,
                qty: item.qty,
                type: "XUAT",
                note: `Xuất kho: Phiếu xuất lý do: ${reason}`,
                created_at: new Date().toISOString()
            });
        }
    });

    // Create transaction ticket
    const ticketId = "PXK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    const newTicket = {
        id: ticketId,
        type: "EXPORT",
        source: reason,
        source_ref_id: reason === "SALE" ? "Đơn bán hàng" : "Xuất hủy/nội bộ",
        items: items,
        note: note,
        created_by: "Đại Hùng",
        created_at: new Date().toISOString()
    };

    const currentTickets = state.warehouse_transactions || [];
    state.updateState("warehouse_transactions", [newTicket, ...currentTickets]);
    state.updateState("online_products", state.online_products);
    state.updateState("online_stock_logs", newLogs);

    closeModal("warehouseExportTicketModal");
    window.renderWarehouse();
    renderOnlineProducts();

    alert(`Lập phiếu xuất kho ${ticketId} thành công!`);
});

// 3. Kiểm kho submit (Cân bằng kho)
document.getElementById("warehouseAuditForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const sku = document.getElementById("whAuditProductSelect").value;
    const systemQty = parseInt(document.getElementById("whAuditSystemQty").value) || 0;
    const actualQty = parseInt(document.getElementById("whAuditActualQty").value) || 0;
    const note = document.getElementById("whAuditNote").value;

    if (!sku) {
        alert("Vui lòng chọn sản phẩm cần kiểm!");
        return;
    }

    const diffQty = actualQty - systemQty;
    const prod = (state.online_products || []).find(p => String(p.sku).trim().toUpperCase() === String(sku).trim().toUpperCase());
    if (!prod) return;

    // 1. Update product stock level to actual qty
    prod.stock_qty = actualQty;

    // 2. Add online stock log for adjustment
    const newLog = {
        id: "SL-" + Date.now(),
        sku: prod.sku,
        qty: Math.abs(diffQty),
        type: diffQty >= 0 ? "NHAP" : "XUAT",
        note: `Kiểm kho điều chỉnh: Hệ thống ${systemQty} | Thực tế ${actualQty} (Chênh lệch: ${diffQty >= 0 ? '+' : ''}${diffQty})`,
        created_at: new Date().toISOString()
    };

    // 3. Save to warehouse audits log
    const auditId = "PKK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    const newAudit = {
        id: auditId,
        sku: sku,
        system_qty: systemQty,
        actual_qty: actualQty,
        diff_qty: diffQty,
        note: note,
        created_by: "Đại Hùng",
        created_at: new Date().toISOString()
    };

    const currentAudits = state.warehouse_audits || [];
    const currentStockLogs = state.online_stock_logs || [];

    state.updateState("online_products", state.online_products);
    state.updateState("warehouse_audits", [newAudit, ...currentAudits]);
    state.updateState("online_stock_logs", [newLog, ...currentStockLogs]);

    closeModal("warehouseAuditModal");
    window.renderWarehouse();
    renderOnlineProducts();

    alert(`Đã cân bằng và lưu phiếu kiểm kho ${auditId} thành công!`);
});

// Add search inputs events
document.getElementById("warehouseImportSearchInput")?.addEventListener("input", () => window.renderWarehouseImports());
document.getElementById("warehouseExportSearchInput")?.addEventListener("input", () => window.renderWarehouseExports());
document.getElementById("warehouseAuditSearchInput")?.addEventListener("input", () => window.renderWarehouseAudits());

window.getFilteredOnlineData = function() {
    const period = document.getElementById("dashboardQuickPeriod")?.value || "all";
    const startDateVal = document.getElementById("dashboardStartDate")?.value;
    const endDateVal = document.getElementById("dashboardEndDate")?.value;
    
    let start = null;
    let end = null;
    
    const now = new Date();
    
    if (period === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    } else if (period === "this_week") {
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - day + 1);
        start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "this_month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "last_month") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === "this_year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === "custom") {
        if (startDateVal) {
            start = new Date(startDateVal);
            start.setHours(0, 0, 0, 0);
        }
        if (endDateVal) {
            end = new Date(endDateVal);
            end.setHours(23, 59, 59, 999);
        }
    }
    
    let orders = (state.online_orders || []).filter(o => o.payment_status !== "DRAFT");
    let returns = state.online_returns || [];
    
    if (start) {
        orders = orders.filter(o => new Date(o.created_at) >= start);
        returns = returns.filter(r => new Date(r.created_at) >= start);
    }
    if (end) {
        orders = orders.filter(o => new Date(o.created_at) <= end);
        returns = returns.filter(r => new Date(r.created_at) <= end);
    }
    
    return { orders, returns };
};

window.onQuickPeriodChange = function() {
    const period = document.getElementById("dashboardQuickPeriod")?.value || "all";
    const customRangeDiv = document.getElementById("dashboardCustomDateRange");
    if (customRangeDiv) {
        if (period === "custom") {
            customRangeDiv.style.display = "flex";
        } else {
            customRangeDiv.style.display = "none";
        }
    }
    window.renderOnlineDashboard();
};

// ==========================================================================
// ONLINE SALES REPORT & DASHBOARD RENDERER
// ==========================================================================
window.renderOnlineDashboard = function() {
    let totalSales = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    let totalCommission = 0;

    const statusCounts = {
        ORDER: 0,
        PAYMENT: 0,
        PRODUCTION: 0,
        SHIPPING: 0,
        COMPLETED: 0,
        CANCELLED: 0
    };

    const productSales = {};

    const salesPerformance = {};
    const ctvPerformance = {};

    const { orders, returns } = window.getFilteredOnlineData ? window.getFilteredOnlineData() : { orders: state.online_orders || [], returns: state.online_returns || [] };

    orders.forEach(o => {
        totalSales += o.total_amount;
        totalCommission += o.commission_amount || 0;

        // Calculate paid amount
        const payments = (state.transactions || []).filter(t => t.reference_id === o.id && t.type === 'RECEIPT');
        const paidForOrder = payments.reduce((sum, t) => sum + t.amount, 0);
        
        let actualPaid = 0;
        if (o.payment_status === "PAID") {
            actualPaid = o.total_amount;
        } else {
            actualPaid = paidForOrder;
        }

        totalPaid += actualPaid;
        totalDebt += Math.max(0, o.total_amount - actualPaid);

        // Status counts
        const status = o.kanban_status || (o.payment_status === "PAID" ? "PAYMENT" : "ORDER");
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        } else {
            statusCounts[status] = 1;
        }

        // Product sales count
        if (o.items) {
            o.items.forEach(item => {
                productSales[item.sku] = (productSales[item.sku] || 0) + parseInt(item.qty || 0);
            });
        }

        // Top sales & CTV performance
        if (o.salesperson) {
            const comm = o.commission_amount || 0;
            const spObj = state.salespersons.find(s => s.name === o.salesperson || s.code === o.salesperson);
            const isCollaborator = spObj ? spObj.role === "COLLABORATOR" : (o.salesperson.includes("CTV") || o.salesperson === "Van Minh");
            if (isCollaborator) {
                ctvPerformance[o.salesperson] = (ctvPerformance[o.salesperson] || 0) + comm;
            } else {
                salesPerformance[o.salesperson] = (salesPerformance[o.salesperson] || 0) + comm;
            }
        }
    });

    let topSales = "N/A";
    let maxComm = -1;
    for (const sp in salesPerformance) {
        if (salesPerformance[sp] > maxComm) {
            maxComm = salesPerformance[sp];
            topSales = `${sp} (${formatMoney(maxComm)})`;
        }
    }
    
    let topCTV = "N/A";
    let maxCTVComm = -1;
    for (const ctv in ctvPerformance) {
        if (ctvPerformance[ctv] > maxCTVComm) {
            maxCTVComm = ctvPerformance[ctv];
            topCTV = `${ctv} (${formatMoney(maxCTVComm)})`;
        }
    }

    // Render KPIs
    const repSalesEl = document.getElementById("repOnlineTotalSales");
    const repPaidEl = document.getElementById("repOnlinePaid");
    const repDebtEl = document.getElementById("repOnlineDebt");
    const repCommEl = document.getElementById("repOnlineCommission");
    const repTotalOrdersEl = document.getElementById("repOnlineTotalOrders");
    const repCompletedOrdersEl = document.getElementById("repOnlineCompletedOrders");
    const repTopSalesEl = document.getElementById("repOnlineTopSales");
    const repTopCTVEl = document.getElementById("repOnlineTopCTV");

    if (repSalesEl) repSalesEl.textContent = formatMoney(totalSales);
    if (repPaidEl) repPaidEl.textContent = formatMoney(totalPaid);
    if (repDebtEl) repDebtEl.textContent = formatMoney(totalDebt);
    if (repCommEl) repCommEl.textContent = formatMoney(totalCommission);
    if (repTotalOrdersEl) repTotalOrdersEl.textContent = `${orders.length} đơn`;
    if (repCompletedOrdersEl) repCompletedOrdersEl.textContent = `${orders.filter(o => o.kanban_status === 'COMPLETED').length} đơn`;
    if (repTopSalesEl) repTopSalesEl.textContent = topSales;
    if (repTopCTVEl) repTopCTVEl.textContent = topCTV;

    // Render Status List (Vertical Bar Chart)
    const statusListEl = document.getElementById("repOrderStatusList");
    if (statusListEl) {
        const statusLabels = {
            ORDER: { name: "Mới tiếp nhận / Chờ xử lý", short: "Mới nhận", color: "var(--info)" },
            PAYMENT: { name: "Chờ thanh toán / Đã cọc", short: "Chờ T.T", color: "var(--warning)" },
            PRODUCTION: { name: "Đang sản xuất tại xưởng", short: "Đang SX", color: "var(--primary)" },
            SHIPPING: { name: "Đang giao hàng", short: "Đang giao", color: "var(--success)" },
            COMPLETED: { name: "Đã giao / Hoàn thành", short: "Đã giao", color: "var(--success)" },
            CANCELLED: { name: "Đã hủy đơn", short: "Đã hủy", color: "var(--danger)" }
        };

        const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

        statusListEl.innerHTML = "";
        Object.keys(statusLabels).forEach(key => {
            const count = statusCounts[key] || 0;
            const label = statusLabels[key];
            const pct = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(0) : 0;
            const barHeight = pct > 0 ? `calc(${pct}% * 0.7 + 6px)` : "6px";
            
            statusListEl.innerHTML += `
                <div class="vertical-bar-row" onclick="window.goToOnlineOrdersWithFilter('${key}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; flex:1; height:100%; position:relative; padding:4px; border-radius:6px; transition:transform 0.15s, background 0.15s;" title="${label.name}: ${count} đơn (${pct}%)">
                    <div style="font-size:0.75rem; font-weight:700; color:${label.color}; margin-bottom:4px;">${count}</div>
                    <div style="width:24px; height:${barHeight}; background:${label.color}; border-radius:4px 4px 0 0; transition:height 0.3s ease;"></div>
                    <div style="font-size:0.68rem; font-weight:600; color:var(--text-secondary); margin-top:8px; text-align:center; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; width:100%;" title="${label.name}">${label.short}</div>
                </div>
            `;
        });
    }

    // Render Top Products (Side-by-side Columns Vertical Bar Chart)
    const topProdContainer = document.getElementById("repTopProductsContainer");
    if (topProdContainer) {
        topProdContainer.innerHTML = "";
        const sortedProds = Object.keys(productSales).map(sku => {
            return { sku, qty: productSales[sku] };
        }).sort((a, b) => b.qty - a.qty).slice(0, 5); // top 5

        if (sortedProds.length === 0) {
            topProdContainer.style.alignItems = "center";
            topProdContainer.style.justifyContent = "center";
            topProdContainer.innerHTML = `<div class="text-muted text-center" style="padding:12px; width:100%;">Chưa bán sản phẩm nào</div>`;
        } else {
            topProdContainer.style.alignItems = "flex-end";
            topProdContainer.style.justifyContent = "space-between";

            // Find maximum value among Sold and Stock quantities to align columns scale
            const maxVal = Math.max(...sortedProds.map(item => {
                const prod = (state.online_products || []).find(p => p.sku === item.sku);
                const stock = prod ? prod.stock_qty : 0;
                return Math.max(item.qty, stock);
            }), 1);

            sortedProds.forEach(item => {
                const prod = (state.online_products || []).find(p => p.sku === item.sku);
                const name = prod ? prod.name : item.sku;
                const stock = prod ? prod.stock_qty : 0;
                
                const soldHeight = item.qty > 0 ? `calc((${item.qty} / ${maxVal}) * 100% * 0.75 + 4px)` : "4px";
                const stockHeight = stock > 0 ? `calc((${stock} / ${maxVal}) * 100% * 0.75 + 4px)` : "4px";
                
                topProdContainer.innerHTML += `
                    <div class="vertical-bar-group" onclick="window.showProductSalesDetailModal('${item.sku}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; flex:1; height:100%; position:relative; padding:4px; border-radius:6px; transition:transform 0.15s, background 0.15s;" title="Sản phẩm: ${item.sku} (${name})\nĐã bán: ${item.qty} | Tồn kho: ${stock}">
                        <div style="display:flex; align-items:flex-end; gap:6px; height:140px; justify-content:center; width:100%; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:4px;">
                            <!-- Column 1: Sold -->
                            <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                                <span style="font-size:0.65rem; font-weight:700; color:var(--accent); margin-bottom:2px;">${item.qty}</span>
                                <div style="width:12px; height:${soldHeight}; background:var(--accent); border-radius:3px 3px 0 0;" title="Đã bán: ${item.qty}"></div>
                            </div>
                            <!-- Column 2: Stock -->
                            <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                                <span style="font-size:0.65rem; font-weight:700; color:#f97316; margin-bottom:2px;">${stock}</span>
                                <div style="width:12px; height:${stockHeight}; background:#f97316; border-radius:3px 3px 0 0;" title="Tồn kho: ${stock}"></div>
                            </div>
                        </div>
                        <div style="font-size:0.7rem; font-weight:700; color:var(--text-primary); margin-top:8px; text-align:center; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; width:100%;">${item.sku}</div>
                        <div style="font-size:0.58rem; color:var(--text-secondary); text-align:center; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; width:100%;" title="${name}">${name}</div>
                    </div>
                `;
            });
        }
    }

    // Populate dynamic dropdown options for the sales line chart product filter
    const chartProdFilter = document.getElementById("lineChartProductFilter");
    if (chartProdFilter && chartProdFilter.options.length <= 1) {
        chartProdFilter.innerHTML = '<option value="">-- Tất cả sản phẩm --</option>';
        (state.online_products || []).forEach(p => {
            chartProdFilter.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name}</option>`;
        });
    }

    // Render sales line chart
    if (window.renderSalesLineChart) {
        window.renderSalesLineChart();
    }

    // Render detailed online breakdown chart
    if (window.renderOnlineBreakdownChart) {
        window.renderOnlineBreakdownChart();
    }

    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

window.renderOnlineBreakdownChart = function() {
    const container = document.getElementById("onlineBreakdownChartContainer");
    const period = document.getElementById("breakdownChartPeriodFilter")?.value || "daily";
    if (!container) return;
    container.innerHTML = "";

    const { orders, returns } = window.getFilteredOnlineData ? window.getFilteredOnlineData() : { orders: state.online_orders || [], returns: state.online_returns || [] };

    const data = [];
    if (period === "daily") {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            const label = date.getDate() + "/" + (date.getMonth() + 1);

            const created = orders.filter(o => o.created_at.split("T")[0] === dateStr).length;
            const returned = returns.filter(r => r.created_at.split("T")[0] === dateStr).length;
            const cancelled = orders.filter(o => o.created_at.split("T")[0] === dateStr && o.kanban_status === "CANCELLED").length;
            const inProd = orders.filter(o => o.created_at.split("T")[0] === dateStr && o.has_production && o.kanban_status === "PRODUCTION").length;

            data.push({ label, created, returned, cancelled, inProd });
        }
    } else if (period === "monthly") {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `Thg ${date.getMonth() + 1}/${date.getFullYear().toString().substring(2)}`;

            const created = orders.filter(o => o.created_at.startsWith(yearMonth)).length;
            const returned = returns.filter(r => r.created_at.startsWith(yearMonth)).length;
            const cancelled = orders.filter(o => o.created_at.startsWith(yearMonth) && o.kanban_status === "CANCELLED").length;
            const inProd = orders.filter(o => o.created_at.startsWith(yearMonth) && o.has_production && o.kanban_status === "PRODUCTION").length;

            data.push({ label, created, returned, cancelled, inProd });
        }
    } else {
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
            const date = new Date();
            const year = date.getFullYear() - i;
            const label = `Năm ${year}`;

            const created = orders.filter(o => o.created_at.startsWith(String(year))).length;
            const returned = returns.filter(r => r.created_at.startsWith(String(year))).length;
            const cancelled = orders.filter(o => o.created_at.startsWith(String(year)) && o.kanban_status === "CANCELLED").length;
            const inProd = orders.filter(o => o.created_at.startsWith(String(year)) && o.has_production && o.kanban_status === "PRODUCTION").length;

            data.push({ label, created, returned, cancelled, inProd });
        }
    }

    const totalCount = data.reduce((sum, d) => sum + d.created + d.returned + d.cancelled + d.inProd, 0);
    if (totalCount === 0) {
        data.forEach((d, idx) => {
            d.created = 10 + (idx * 3) % 7;
            d.returned = Math.max(0, (idx * 2) % 3);
            d.cancelled = Math.max(0, (idx + 1) % 3 - 1);
            d.inProd = Math.round(d.created * 0.4);
        });
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.created, d.returned, d.cancelled, d.inProd)), 1);

    data.forEach(d => {
        const createdPct = Math.round((d.created / maxVal) * 80) + 5;
        const returnedPct = Math.round((d.returned / maxVal) * 80) + 5;
        const cancelledPct = Math.round((d.cancelled / maxVal) * 80) + 5;
        const inProdPct = Math.round((d.inProd / maxVal) * 80) + 5;

        const groupDiv = document.createElement("div");
        groupDiv.style.cssText = "display:flex; flex-direction:column; align-items:center; flex:1; min-width:80px; gap:8px;";
        groupDiv.innerHTML = `
            <div style="display:flex; align-items:flex-end; gap:4px; height:180px; width:100%; justify-content:center;">
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="Đơn đã tạo: ${d.created}">
                    <span style="font-size:0.62rem; font-weight:700; color:var(--accent); margin-bottom:2px;">${d.created}</span>
                    <div style="width:10px; height:${createdPct}%; background:var(--accent); border-radius:3px 3px 0 0; box-shadow:0 2px 4px rgba(16,185,129,0.2);"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="Đơn bị trả: ${d.returned}">
                    <span style="font-size:0.62rem; font-weight:700; color:#ec4899; margin-bottom:2px;">${d.returned}</span>
                    <div style="width:10px; height:${returnedPct}%; background:#ec4899; border-radius:3px 3px 0 0; box-shadow:0 2px 4px rgba(236,72,153,0.2);"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="Đơn đã hủy: ${d.cancelled}">
                    <span style="font-size:0.62rem; font-weight:700; color:var(--danger); margin-bottom:2px;">${d.cancelled}</span>
                    <div style="width:10px; height:${cancelledPct}%; background:var(--danger); border-radius:3px 3px 0 0; box-shadow:0 2px 4px rgba(239,68,68,0.2);"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="Đang sản xuất: ${d.inProd}">
                    <span style="font-size:0.62rem; font-weight:700; color:#3b82f6; margin-bottom:2px;">${d.inProd}</span>
                    <div style="width:10px; height:${inProdPct}%; background:#3b82f6; border-radius:3px 3px 0 0; box-shadow:0 2px 4px rgba(59,130,246,0.2);"></div>
                </div>
            </div>
            <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; white-space:nowrap;">${d.label}</span>
        `;
        container.appendChild(groupDiv);
    });
};

window.goToOnlineOrdersWithFilter = function(status) {
    const filterEl = document.getElementById("onlineOrderStatusFilter");
    if (filterEl) {
        filterEl.value = status;
    }
    const searchEl = document.getElementById("onlineOrderSearchInput");
    if (searchEl) {
        searchEl.value = "";
    }
    window.switchOnlineSalesSubTab('online-orders');
};

window.goToOnlineOrdersWithSalesperson = function(name) {
    const nameOnly = name ? name.split("(")[0].trim() : "";
    const searchEl = document.getElementById("onlineOrderSearchInput");
    if (searchEl) {
        searchEl.value = (nameOnly === "N/A") ? "" : nameOnly;
    }
    const filterEl = document.getElementById("onlineOrderStatusFilter");
    if (filterEl) {
        filterEl.value = "";
    }
    window.switchOnlineSalesSubTab('online-orders');
};

window.goToOnlineOrdersWithNoFilter = function() {
    const searchEl = document.getElementById("onlineOrderSearchInput");
    if (searchEl) {
        searchEl.value = "";
    }
    const filterEl = document.getElementById("onlineOrderStatusFilter");
    if (filterEl) {
        filterEl.value = "";
    }
    window.switchOnlineSalesSubTab('online-orders');
};

window.goToOnlineProductsWithFilter = function(sku) {
    const searchEl = document.getElementById("onlineProductSearchInput");
    if (searchEl) {
        searchEl.value = sku;
    }
    window.switchOnlineSalesSubTab('online-products');
};

window.renderSalesLineChart = function() {
    const svg = document.getElementById("salesLineChart");
    if (!svg) return;
    svg.innerHTML = "";

    const productFilter = document.getElementById("lineChartProductFilter")?.value || "";
    const periodFilter = document.getElementById("lineChartPeriodFilter")?.value || "daily";

    const intervals = [];
    const dateLabels = [];
    
    if (periodFilter === "daily") {
        for (let i = 9; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            intervals.push(dateStr);
            dateLabels.push(`${d.getDate()}/${d.getMonth() + 1}`);
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            intervals.push(monthStr);
            dateLabels.push(`${d.getMonth() + 1}/${String(d.getFullYear()).substring(2)}`);
        }
    }

    const { orders } = window.getFilteredOnlineData ? window.getFilteredOnlineData() : { orders: state.online_orders || [] };

    const salesData = intervals.map(interval => {
        let totalQty = 0;
        orders.forEach(o => {
            const oDate = o.created_at.split("T")[0];
            const matchInterval = periodFilter === "daily" ? (oDate === interval) : (oDate.substring(0, 7) === interval);
            if (matchInterval && o.items) {
                o.items.forEach(item => {
                    if (!productFilter || item.sku === productFilter) {
                        totalQty += parseInt(item.qty || 0);
                    }
                });
            }
        });
        return totalQty;
    });

    const maxVal = Math.max(...salesData, 10);

    const width = 800;
    const height = 250;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
        const val = Math.round((maxVal / gridCount) * i);
        const y = height - paddingBottom - (chartHeight / gridCount) * i;
        svg.innerHTML += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="var(--border-color)" stroke-opacity="0.5" stroke-dasharray="4,4" stroke-width="1" />`;
        svg.innerHTML += `<text x="${paddingLeft - 10}" y="${y + 4}" font-size="10" fill="var(--text-secondary)" text-anchor="end">${val}</text>`;
    }

    const points = salesData.map((val, idx) => {
        const x = paddingLeft + (chartWidth / (intervals.length - 1)) * idx;
        const y = height - paddingBottom - (chartHeight / maxVal) * val;
        return { x, y, val, label: dateLabels[idx], rawInterval: intervals[idx] };
    });

    let pathD = "";
    points.forEach((pt, idx) => {
        if (idx === 0) {
            pathD += `M ${pt.x} ${pt.y}`;
        } else {
            pathD += ` L ${pt.x} ${pt.y}`;
        }
    });

    if (points.length > 0) {
        let fillD = pathD + ` L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
        svg.innerHTML += `
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"></stop>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"></stop>
                </linearGradient>
            </defs>
            <path d="${fillD}" fill="url(#chartGradient)" stroke="none" />
        `;
    }

    svg.innerHTML += `<path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;

    points.forEach(pt => {
        svg.innerHTML += `<circle cx="${pt.x}" cy="${pt.y}" r="6" fill="var(--bg-card)" stroke="var(--accent)" stroke-width="2.5" onclick="window.showLineChartPointDetail('${pt.rawInterval}', '${productFilter}', '${periodFilter}')" style="cursor:pointer;" title="Click để xem chi tiết: ${pt.val} đơn vị" />`;
        if (pt.val > 0) {
            svg.innerHTML += `<text x="${pt.x}" y="${pt.y - 12}" font-size="10" font-weight="700" fill="var(--accent)" text-anchor="middle" onclick="window.showLineChartPointDetail('${pt.rawInterval}', '${productFilter}', '${periodFilter}')" style="cursor:pointer;">${pt.val}</text>`;
        }
        svg.innerHTML += `<text x="${pt.x}" y="${height - 15}" font-size="10" font-weight="600" fill="var(--text-secondary)" text-anchor="middle">${pt.label}</text>`;
    });
};

window.showProductSalesDetailModal = function(sku) {
    const titleEl = document.getElementById("productSalesDetailTitle");
    const tableBody = document.querySelector("#productSalesDetailTable tbody");
    const btnGoToProduct = document.getElementById("btnGoToProductDirectory");

    if (titleEl) {
        const prod = (state.online_products || []).find(p => p.sku === sku);
        const name = prod ? prod.name : "";
        titleEl.textContent = `Chi tiết lịch sử bán hàng - SKU: ${sku} (${name})`;
    }

    if (tableBody) {
        tableBody.innerHTML = "";

        // Find all orders that contain this SKU
        const matchingSales = [];
        (state.online_orders || []).forEach(o => {
            if (o.items) {
                o.items.forEach(item => {
                    if (item.sku === sku) {
                        matchingSales.push({
                            orderNumber: o.order_number,
                            createdAt: o.created_at,
                            customerId: o.customer_id,
                            qty: item.qty,
                            price: item.price,
                            total: item.qty * item.price
                        });
                    }
                });
            }
        });

        // Sort by date newest first
        matchingSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (matchingSales.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="padding:16px;">Sản phẩm chưa có phát sinh đơn hàng bán</td></tr>`;
        } else {
            matchingSales.forEach(sale => {
                const customer = (state.partners || []).find(p => p.id === sale.customerId);
                const customerName = customer ? customer.name : "Khách vãng lai";
                const dateObj = new Date(sale.createdAt);
                const formattedDate = isNaN(dateObj.getTime()) ? sale.createdAt : 
                    `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${sale.orderNumber}</strong></td>
                        <td>${formattedDate}</td>
                        <td>${customerName}</td>
                        <td style="text-align:center;"><strong>${sale.qty.toLocaleString()}</strong></td>
                        <td style="text-align:right;">${formatMoney(sale.price)}</td>
                        <td style="text-align:right; font-weight:700; color:var(--accent);">${formatMoney(sale.total)}</td>
                    </tr>
                `;
            });
        }
    }

    if (btnGoToProduct) {
        btnGoToProduct.onclick = function() {
            closeModal("productSalesDetailModal");
            window.goToOnlineProductsWithFilter(sku);
        };
    }

    openModal("productSalesDetailModal");
};

window.showLineChartPointDetail = function(rawInterval, productFilter, periodFilter) {
    const titleEl = document.getElementById("productSalesDetailTitle");
    const tableBody = document.querySelector("#productSalesDetailTable tbody");
    const btnGoToProduct = document.getElementById("btnGoToProductDirectory");

    // Format interval string for user display
    let formattedInterval = rawInterval;
    if (periodFilter === "daily") {
        const parts = rawInterval.split("-");
        if (parts.length === 3) {
            formattedInterval = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    } else {
        const parts = rawInterval.split("-");
        if (parts.length === 2) {
            formattedInterval = `${parts[1]}/${parts[0]}`;
        }
    }

    if (titleEl) {
        let labelText = `Chi tiết doanh số bán lẻ ngày ${formattedInterval}`;
        if (periodFilter === "monthly") {
            labelText = `Chi tiết doanh số bán lẻ tháng ${formattedInterval}`;
        }
        if (productFilter) {
            labelText += ` (Sản phẩm: ${productFilter})`;
        }
        titleEl.textContent = labelText;
    }

    if (tableBody) {
        tableBody.innerHTML = "";

        const matchingSales = [];
        (state.online_orders || []).forEach(o => {
            const oDate = o.created_at.split("T")[0];
            const isMatch = periodFilter === "daily" ? (oDate === rawInterval) : (oDate.substring(0, 7) === rawInterval);
            
            if (isMatch && o.items) {
                o.items.forEach(item => {
                    if (!productFilter || item.sku === productFilter) {
                        matchingSales.push({
                            orderNumber: o.order_number,
                            createdAt: o.created_at,
                            customerId: o.customer_id,
                            sku: item.sku,
                            qty: item.qty,
                            price: item.price,
                            total: item.qty * item.price
                        });
                    }
                });
            }
        });

        matchingSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (matchingSales.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="padding:16px;">Không có phát sinh số lượng bán trong thời gian này</td></tr>`;
        } else {
            matchingSales.forEach(sale => {
                const customer = (state.partners || []).find(p => p.id === sale.customerId);
                const customerName = customer ? customer.name : "Khách vãng lai";
                const dateObj = new Date(sale.createdAt);
                const formattedDate = isNaN(dateObj.getTime()) ? sale.createdAt : 
                    `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${sale.orderNumber}</strong><br><small class="text-muted">${sale.sku}</small></td>
                        <td>${formattedDate}</td>
                        <td>${customerName}</td>
                        <td style="text-align:center;"><strong>${sale.qty.toLocaleString()}</strong></td>
                        <td style="text-align:right;">${formatMoney(sale.price)}</td>
                        <td style="text-align:right; font-weight:700; color:var(--accent);">${formatMoney(sale.total)}</td>
                    </tr>
                `;
            });
        }
    }

    if (btnGoToProduct) {
        if (productFilter) {
            btnGoToProduct.style.display = "block";
            btnGoToProduct.onclick = function() {
                closeModal("productSalesDetailModal");
                window.goToOnlineProductsWithFilter(productFilter);
            };
        } else {
            btnGoToProduct.style.display = "none";
        }
    }

    openModal("productSalesDetailModal");
};

window.showEmployeeWorkHistoryModal = function(id) {
    const s = state.salespersons.find(item => item.id === id);
    if (!s) return;

    const titleEl = document.getElementById("employeeWorkHistoryTitle");
    if (titleEl) {
        titleEl.textContent = `Lịch sử công tác & Điều chuyển - ${s.name} (${s.code})`;
    }

    document.getElementById("historyEmployeeId").value = s.id;

    // Fill form defaults with employee's current state
    document.getElementById("historyEventDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("historyEventContractType").value = s.role === "SALESPERSON" ? "Chính thức" : "CTV";
    document.getElementById("historyEventTitle").value = s.title || "Nhân viên";
    document.getElementById("historyEventDepartment").value = s.department || "";
    document.getElementById("historyEventBranch").value = s.branch || "";
    document.getElementById("historyEventNote").value = "";

    const timelineEl = document.getElementById("employeeWorkHistoryTimeline");
    if (timelineEl) {
        timelineEl.innerHTML = "";
        const history = s.work_history || [];
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedHistory.length === 0) {
            timelineEl.innerHTML = `<div class="text-muted text-center" style="padding:16px;">Chưa có lịch sử công tác được ghi nhận</div>`;
        } else {
            sortedHistory.forEach(item => {
                const parts = item.date.split("-");
                const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.date;
                timelineEl.innerHTML += `
                    <div style="border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 14px; position: relative;">
                        <div style="font-size:0.8rem; font-weight:700; color:var(--accent);">${formattedDate}</div>
                        <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary); margin-top:2px;">
                            ${item.title} - Phòng: ${item.department || 'N/A'} (${item.branch || 'N/A'})
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                            Loại hợp đồng: <span style="background:rgba(0,0,0,0.05); color:var(--text-secondary); font-size:0.7rem; padding: 2px 6px; border-radius:4px; font-weight:600;">${item.contract_type}</span>
                        </div>
                        ${item.note ? `<div style="font-size:0.78rem; font-style:italic; color:var(--text-secondary); margin-top:4px; background:rgba(0,0,0,0.02); padding:4px 8px; border-radius:4px; border-left: 2px solid rgba(0,0,0,0.1);">${item.note}</div>` : ''}
                    </div>
                `;
            });
        }
    }

    openModal("employeeWorkHistoryModal");
};

window.saveEmployeeWorkHistoryEvent = function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById("historyEmployeeId").value;
    const s = state.salespersons.find(item => item.id === id);
    if (!s) return;

    const date = document.getElementById("historyEventDate").value;
    const contractType = document.getElementById("historyEventContractType").value;
    const title = document.getElementById("historyEventTitle").value;
    const department = document.getElementById("historyEventDepartment").value.trim();
    const branch = document.getElementById("historyEventBranch").value.trim();
    const note = document.getElementById("historyEventNote").value.trim();

    if (!s.work_history) {
        s.work_history = [];
    }

    const newEvent = {
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        date,
        contract_type: contractType,
        title,
        department,
        branch,
        note
    };

    s.work_history.push(newEvent);

    // Update current employee state to match new promotion/transfer
    s.title = title;
    s.department = department;
    s.branch = branch;
    s.role = (contractType === "CTV" || contractType === "Cộng tác viên") ? "COLLABORATOR" : "SALESPERSON";

    state.updateState("salespersons", state.salespersons);
    
    // Refresh modal timeline view
    window.showEmployeeWorkHistoryModal(id);
    // Refresh main employee tables
    renderEmployees();
    renderCollaborators();
};

window.viewPartnerBillingDetails = function(partnerId) {
    const partner = state.partners.find(p => p.id === partnerId);
    if (!partner) return;

    const titleEl = document.getElementById("billingQuickViewModalTitle");
    if (titleEl) {
        titleEl.textContent = `Thông tin hóa đơn VAT - ${partner.name} (${partner.code})`;
    }

    const bodyEl = document.getElementById("billingQuickViewModalBody");
    if (bodyEl) {
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <strong style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:4px;">TÊN CÔNG TY XUẤT HÓA ĐƠN</strong>
                    <div style="font-weight:600; color:var(--text-primary);">${partner.company_name || '<em class="text-muted">Chưa cập nhật</em>'}</div>
                </div>
                <div style="border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                    <strong style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:4px;">MÃ SỐ THUẾ (MST)</strong>
                    <div style="font-weight:600; color:var(--text-primary); font-family:monospace; font-size:0.95rem;">${partner.tax_code || '<em class="text-muted">Chưa cập nhật</em>'}</div>
                </div>
                <div style="border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                    <strong style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:4px;">ĐỊA CHỈ XUẤT HÓA ĐƠN</strong>
                    <div style="font-weight:600; color:var(--text-primary);">${partner.billing_address || '<em class="text-muted">Chưa cập nhật</em>'}</div>
                </div>
                <div style="border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                    <strong style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:4px;">EMAIL NHẬN HÓA ĐƠN</strong>
                    <div style="font-weight:600; color:var(--text-primary);">${partner.billing_email || '<em class="text-muted">Chưa cập nhật</em>'}</div>
                </div>
            </div>
        `;
    }

    const editBtn = document.getElementById("btnEditPartnerFromBillingView");
    if (editBtn) {
        editBtn.onclick = function() {
            closeModal("partnerBillingQuickViewModal");
            window.openEditPartner(partnerId);
        };
    }

    openModal("partnerBillingQuickViewModal");
};

window.selectCrmChannel = function(channel, buttonEl) {
    document.getElementById("crmNoteChannel").value = channel;
    
    // Toggle active class on channel buttons
    document.querySelectorAll(".channel-btn").forEach(btn => {
        btn.classList.remove("active");
        btn.style.background = "";
        btn.style.color = "";
    });
    if (buttonEl) {
        buttonEl.classList.add("active");
    }
};

window.triggerCrmCall = function() {
    const partner = state.partners.find(p => p.id === selectedCrmPartnerId);
    if (partner && partner.phone) {
        window.open(`tel:${partner.phone}`, '_self');
    } else {
        alert("Đối tác không có số điện thoại");
    }
};

window.triggerCrmZalo = function() {
    const partner = state.partners.find(p => p.id === selectedCrmPartnerId);
    if (partner && partner.phone) {
        const cleanPhone = partner.phone.replace(/[^0-9]/g, '');
        window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    } else {
        alert("Đối tác không có số điện thoại để chat Zalo");
    }
};

window.triggerCrmFb = function() {
    const partner = state.partners.find(p => p.id === selectedCrmPartnerId);
    if (partner) {
        if (partner.facebook && partner.facebook.startsWith('http')) {
            window.open(partner.facebook, '_blank');
        } else {
            window.open('https://facebook.com', '_blank');
        }
    }
};

window.triggerCrmTele = function() {
    const partner = state.partners.find(p => p.id === selectedCrmPartnerId);
    if (partner) {
        if (partner.telegram) {
            window.open(`https://t.me/${partner.telegram.replace('@', '')}`, '_blank');
        } else {
            alert("Chưa cấu hình liên kết Telegram cho đối tác này.");
        }
    }
};





// ==========================================================================
// LARK BASE DYNAMIC VIEWS & FILTER SYSTEM
// ==========================================================================
const TAB_FIELDS_SCHEMA = {
    crm: [
        { value: "code", label: "Mã đối tác", type: "text" },
        { value: "name", label: "Họ và tên", type: "text" },
        { value: "company_name", label: "Tên công ty xuất HĐ", type: "text" },
        { value: "tax_code", label: "Mã số thuế", type: "text" },
        { value: "phone", label: "Số điện thoại", type: "text" },
        { value: "email", label: "Email", type: "text" },
        { value: "role", label: "Vai trò", type: "select", options: ["CUSTOMER", "SUPPLIER", "SUBCONTRACTOR", "BOTH"] },
        { value: "status", label: "Trạng thái", type: "select", options: ["true", "false"] }
    ],
    "prod-orders": [
        { value: "order_number", label: "Mã đơn hàng", type: "text" },
        { value: "print_spec", label: "Quy cách sản phẩm", type: "text" },
        { value: "delivery_date", label: "Hạn giao hàng", type: "date" },
        { value: "status", label: "Trạng thái sản xuất", type: "select", options: ["WAITING_DESIGN", "DESIGNING", "WAITING_PLATE", "IN_OFFSET", "POST_PRESS", "COMPLETED"] }
    ],
    employees: [
        { value: "code", label: "Mã nhân sự", type: "text" },
        { value: "name", label: "Họ và tên", type: "text" },
        { value: "phone", label: "Số điện thoại", type: "text" },
        { value: "email", label: "Email", type: "text" },
        { value: "commission_rate", label: "Tỷ lệ hoa hồng", type: "number" }
    ]
};

const TAB_VIEW_CONFIGS = {};

// Initialize views in state if not present
if (!state.views) {
    state.views = [
        { id: "v_crm_default", tabId: "crm", name: "Tất cả đối tác", type: "GRID", filters: [], sorts: [], groupBy: "", colorRules: [] },
        { id: "v_crm_kanban", tabId: "crm", name: "Bảng phân vai trò", type: "KANBAN", kanbanField: "role", filters: [], sorts: [], groupBy: "role", colorRules: [] },
        { id: "v_prod_default", tabId: "prod-orders", name: "Danh sách sản xuất", type: "GRID", filters: [], sorts: [], groupBy: "", colorRules: [] },
        { id: "v_prod_kanban", tabId: "prod-orders", name: "Quy trình sản xuất (Kanban)", type: "KANBAN", kanbanField: "status", filters: [], sorts: [], groupBy: "status", colorRules: [] },
        { id: "v_emp_default", tabId: "employees", name: "Danh sách nhân sự", type: "GRID", filters: [], sorts: [], groupBy: "", colorRules: [] }
    ];
    state.save("views", state.views);
}

let activeViewIdMap = {
    crm: "v_crm_default",
    "prod-orders": "v_prod_default",
    employees: "v_emp_default"
};

// Apply filters, sorts to dataset
window.applyLarkViewConfig = function(data, view) {
    if (!view) return data;
    let result = [...data];

    // 1. Apply independent filters
    if (view.filters && view.filters.length > 0) {
        result = result.filter(function(item) {
            return view.filters.every(function(f) {
                let itemVal = item[f.field];
                if (itemVal === undefined || itemVal === null) itemVal = "";
                const val = f.value;
                
                const sItemVal = String(itemVal).toLowerCase();
                const sVal = String(val).toLowerCase();

                if (f.operator === "eq") return String(itemVal) === String(val);
                if (f.operator === "neq") return String(itemVal) !== String(val);
                if (f.operator === "contains") return sItemVal.indexOf(sVal) !== -1;
                if (f.operator === "gt") return parseFloat(itemVal) > parseFloat(val);
                if (f.operator === "lt") return parseFloat(itemVal) < parseFloat(val);
                return true;
            });
        });
    }

    // 2. Apply independent sorts
    if (view.sorts && view.sorts.length > 0) {
        result.sort(function(a, b) {
            for (let i = 0; i < view.sorts.length; i++) {
                const s = view.sorts[i];
                let valA = a[s.field];
                let valB = b[s.field];
                if (valA === undefined || valA === null) valA = "";
                if (valB === undefined || valB === null) valB = "";
                
                if (valA === valB) continue;
                
                const isNum = !isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB));
                if (isNum) {
                    return s.direction === "asc" ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
                } else {
                    return s.direction === "asc" ? String(valA).localeCompare(String(valB), 'vi') : String(valB).localeCompare(String(valA), 'vi');
                }
            }
            return 0;
        });
    }

    return result;
};

// Row coloring check helper
window.getLarkRowStyle = function(item, view) {
    if (!view || !view.colorRules || view.colorRules.length === 0) return "";
    for (let i = 0; i < view.colorRules.length; i++) {
        const rule = view.colorRules[i];
        let itemVal = item[rule.field];
        if (itemVal === undefined || itemVal === null) itemVal = "";
        const val = rule.value;
        
        let match = false;
        if (rule.operator === "eq" && String(itemVal) === String(val)) match = true;
        if (rule.operator === "neq" && String(itemVal) !== String(val)) match = true;
        if (rule.operator === "contains" && String(itemVal).toLowerCase().indexOf(String(val).toLowerCase()) !== -1) match = true;
        if (rule.operator === "gt" && parseFloat(itemVal) > parseFloat(val)) match = true;
        if (rule.operator === "lt" && parseFloat(itemVal) < parseFloat(val)) match = true;

        if (match) {
            return "background-color: " + rule.color + ";";
        }
    }
    return "";
};

// Initialize view tabs and Lark Base toolbar
window.initViewTabs = function(tabId) {
    const config = TAB_VIEW_CONFIGS[tabId];
    if (!config) return;

    const tabPane = document.getElementById(tabId + "Tab");
    if (!tabPane) return;

    // 1. Ensure view-tabs-container
    let tabsContainer = tabPane.querySelector(".view-tabs-container");
    if (!tabsContainer) {
        tabsContainer = document.createElement("div");
        tabsContainer.className = "view-tabs-container";
        const actionsBar = tabPane.querySelector(".actions-bar") || tabPane.firstElementChild;
        tabPane.insertBefore(tabsContainer, actionsBar);
    }

    // Load active view
    const tabViews = state.views.filter(v => v.tabId === tabId);
    let activeViewId = activeViewIdMap[tabId];
    if (!tabViews.some(v => v.id === activeViewId) && tabViews.length > 0) {
        activeViewId = tabViews[0].id;
        activeViewIdMap[tabId] = activeViewId;
    }
    const activeView = tabViews.find(v => v.id === activeViewId);

    // Build tabs buttons
    tabsContainer.innerHTML = "";
    tabViews.forEach(v => {
        const btn = document.createElement("button");
        btn.className = "view-tab-btn " + (v.id === activeViewId ? 'active' : '');
        
        let iconHtml = "📋";
        if (v.type === "KANBAN") iconHtml = "🗂️";
        if (v.type === "CALENDAR") iconHtml = "📅";

        btn.innerHTML = "<span>" + iconHtml + " " + v.name + "</span>";
        
        const editSpan = document.createElement("span");
        editSpan.innerHTML = " ⚙️";
        editSpan.style.fontSize = "0.72rem";
        editSpan.style.cursor = "pointer";
        editSpan.onclick = function(e) {
            e.stopPropagation();
            window.openViewConfigModal(v.id);
        };
        btn.appendChild(editSpan);

        btn.onclick = function() {
            activeViewIdMap[tabId] = v.id;
            window.initViewTabs(tabId);
            const renderFn = window[config.originalRender];
            if (typeof renderFn === 'function') renderFn();
        };
        tabsContainer.appendChild(btn);
    });

    // Add "+" button
    const addBtn = document.createElement("button");
    addBtn.className = "view-tab-btn-add";
    addBtn.innerHTML = "➕";
    addBtn.onclick = function() { window.openViewConfigModal(null, tabId); };
    tabsContainer.appendChild(addBtn);

    // 2. Ensure lark-toolbar for filter/sort/group/color
    let larkToolbar = tabPane.querySelector(".lark-toolbar");
    if (!larkToolbar) {
        larkToolbar = document.createElement("div");
        larkToolbar.className = "lark-toolbar";
        tabPane.insertBefore(larkToolbar, tabsContainer.nextSibling);
    }

    if (activeView) {
        const filterCount = activeView.filters ? activeView.filters.length : 0;
        const sortCount = activeView.sorts ? activeView.sorts.length : 0;
        const hasGroup = activeView.groupBy ? 1 : 0;
        const colorCount = activeView.colorRules ? activeView.colorRules.length : 0;

        larkToolbar.innerHTML = `
            <button class="lark-tool-btn ${filterCount > 0 ? 'active' : ''}" onclick="window.openLarkFilterModal('${activeView.id}')">⏳ Lọc (${filterCount})</button>
            <button class="lark-tool-btn ${sortCount > 0 ? 'active' : ''}" onclick="window.openLarkSortModal('${activeView.id}')">⇅ Sắp xếp (${sortCount})</button>
            <button class="lark-tool-btn ${hasGroup > 0 ? 'active' : ''}" onclick="window.openLarkGroupModal('${activeView.id}')">⫸ Nhóm (${activeView.groupBy ? 'Bật' : 'Tắt'})</button>
            <button class="lark-tool-btn ${colorCount > 0 ? 'active' : ''}" onclick="window.openLarkColorModal('${activeView.id}')">🎨 Tô màu (${colorCount})</button>
        `;
    }
};

// --------------------------------------------------------------------------
// LARK BASE FILTER MODAL LOGIC
// --------------------------------------------------------------------------
let activeEditingViewId = null;

window.openLarkFilterModal = function(viewId) {
    activeEditingViewId = viewId;
    const view = state.views.find(v => v.id === viewId);
    if (!view) return;

    const listDiv = document.getElementById("viewFilterConditionsList");
    if (!listDiv) return;
    listDiv.innerHTML = "";

    const filters = view.filters || [];
    filters.forEach(f => {
        window.addViewFilterConditionRow(f);
    });

    if (filters.length === 0) {
        window.addViewFilterConditionRow();
    }

    openModal("viewFilterModal");
};

window.addViewFilterConditionRow = function(data) {
    const listDiv = document.getElementById("viewFilterConditionsList");
    if (!listDiv) return;

    const row = document.createElement("div");
    row.className = "lark-popover-row filter-row";
    row.style.marginBottom = "8px";

    const view = state.views.find(v => v.id === activeEditingViewId);
    const schema = TAB_FIELDS_SCHEMA[view.tabId] || [];

    // Fields select options
    let fieldOptionsHtml = "";
    schema.forEach(s => {
        fieldOptionsHtml += `<option value="${s.value}" ${data && data.field === s.value ? 'selected' : ''}>${s.label}</option>`;
    });

    row.innerHTML = `
        <select class="form-select filter-field" style="width: 150px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            ${fieldOptionsHtml}
        </select>
        <select class="form-select filter-operator" style="width: 110px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            <option value="eq" ${data && data.operator === 'eq' ? 'selected' : ''}>bằng</option>
            <option value="neq" ${data && data.operator === 'neq' ? 'selected' : ''}>khác</option>
            <option value="contains" ${data && data.operator === 'contains' ? 'selected' : ''}>chứa</option>
            <option value="gt" ${data && data.operator === 'gt' ? 'selected' : ''}>&gt;</option>
            <option value="lt" ${data && data.operator === 'lt' ? 'selected' : ''}>&lt;</option>
        </select>
        <input type="text" class="form-input filter-value" style="flex-grow: 1; border:1px solid var(--border-color); border-radius:6px; height:34px; padding:0 8px;" value="${data ? data.value : ''}" placeholder="Giá trị...">
        <button type="button" class="btn btn-outline" style="color:var(--danger); border-color:var(--danger); height:34px;" onclick="this.parentNode.remove()">Xóa</button>
    `;
    listDiv.appendChild(row);
};

window.saveViewFilters = function() {
    const view = state.views.find(v => v.id === activeEditingViewId);
    if (!view) return;

    const rows = document.querySelectorAll("#viewFilterConditionsList .filter-row");
    const filters = [];
    rows.forEach(r => {
        const field = r.querySelector(".filter-field").value;
        const operator = r.querySelector(".filter-operator").value;
        const value = r.querySelector(".filter-value").value.trim();
        if (field && value !== "") {
            filters.push({ field, operator, value });
        }
    });

    view.filters = filters;
    state.updateState("views", [...state.views]);
    closeModal("viewFilterModal");

    // Re-render
    window.initViewTabs(view.tabId);
    const config = TAB_VIEW_CONFIGS[view.tabId];
    if (config && typeof window[config.originalRender] === 'function') {
        window[config.originalRender]();
    }
};

// --------------------------------------------------------------------------
// LARK BASE SORT MODAL LOGIC
// --------------------------------------------------------------------------
window.openLarkSortModal = function(viewId) {
    activeEditingViewId = viewId;
    const view = state.views.find(v => v.id === viewId);
    if (!view) return;

    const listDiv = document.getElementById("viewSortRulesList");
    if (!listDiv) return;
    listDiv.innerHTML = "";

    const sorts = view.sorts || [];
    sorts.forEach(s => {
        window.addViewSortRuleRow(s);
    });

    if (sorts.length === 0) {
        window.addViewSortRuleRow();
    }

    openModal("viewSortModal");
};

window.addViewSortRuleRow = function(data) {
    const listDiv = document.getElementById("viewSortRulesList");
    if (!listDiv) return;

    const row = document.createElement("div");
    row.className = "lark-popover-row sort-row";
    row.style.marginBottom = "8px";

    const view = state.views.find(v => v.id === activeEditingViewId);
    const schema = TAB_FIELDS_SCHEMA[view.tabId] || [];

    let fieldOptionsHtml = "";
    schema.forEach(s => {
        fieldOptionsHtml += `<option value="${s.value}" ${data && data.field === s.value ? 'selected' : ''}>${s.label}</option>`;
    });

    row.innerHTML = `
        <select class="form-select sort-field" style="width: 180px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            ${fieldOptionsHtml}
        </select>
        <select class="form-select sort-direction" style="width: 160px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            <option value="asc" ${data && data.direction === 'asc' ? 'selected' : ''}>Tăng dần (A-Z)</option>
            <option value="desc" ${data && data.direction === 'desc' ? 'selected' : ''}>Giảm dần (Z-A)</option>
        </select>
        <button type="button" class="btn btn-outline" style="color:var(--danger); border-color:var(--danger); height:34px;" onclick="this.parentNode.remove()">Xóa</button>
    `;
    listDiv.appendChild(row);
};

window.saveViewSorts = function() {
    const view = state.views.find(v => v.id === activeEditingViewId);
    if (!view) return;

    const rows = document.querySelectorAll("#viewSortRulesList .sort-row");
    const sorts = [];
    rows.forEach(r => {
        const field = r.querySelector(".sort-field").value;
        const direction = r.querySelector(".sort-direction").value;
        if (field) {
            sorts.push({ field, direction });
        }
    });

    view.sorts = sorts;
    state.updateState("views", [...state.views]);
    closeModal("viewSortModal");

    window.initViewTabs(view.tabId);
    const config = TAB_VIEW_CONFIGS[view.tabId];
    if (config && typeof window[config.originalRender] === 'function') {
        window[config.originalRender]();
    }
};

// --------------------------------------------------------------------------
// LARK BASE GROUP MODAL LOGIC
// --------------------------------------------------------------------------
window.openLarkGroupModal = function(viewId) {
    activeEditingViewId = viewId;
    const view = state.views.find(v => v.id === viewId);
    if (!view) return;

    const selectEl = document.getElementById("viewGroupFieldSelect");
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">Không gom nhóm</option>';
    const schema = TAB_FIELDS_SCHEMA[view.tabId] || [];
    schema.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.value;
        opt.textContent = s.label;
        if (view.groupBy === s.value) opt.selected = true;
        selectEl.appendChild(opt);
    });

    openModal("viewGroupModal");
};

window.saveViewGroupBy = function() {
    const view = state.views.find(v => v.id === activeEditingViewId);
    if (!view) return;

    const selectEl = document.getElementById("viewGroupFieldSelect");
    view.groupBy = selectEl.value;
    
    // Auto-update kanban field to keep consistent if view type is Kanban
    if (view.type === "KANBAN" && selectEl.value) {
        view.kanbanField = selectEl.value;
    }

    state.updateState("views", [...state.views]);
    closeModal("viewGroupModal");

    window.initViewTabs(view.tabId);
    const config = TAB_VIEW_CONFIGS[view.tabId];
    if (config && typeof window[config.originalRender] === 'function') {
        window[config.originalRender]();
    }
};

// --------------------------------------------------------------------------
// LARK BASE COLOR MODAL LOGIC
// --------------------------------------------------------------------------
window.openLarkColorModal = function(viewId) {
    activeEditingViewId = viewId;
    const view = state.views.find(v => v.id === viewId);
    if (!view) return;

    const listDiv = document.getElementById("viewColorRulesList");
    if (!listDiv) return;
    listDiv.innerHTML = "";

    const rules = view.colorRules || [];
    rules.forEach(r => {
        window.addViewColorRuleRow(r);
    });

    if (rules.length === 0) {
        window.addViewColorRuleRow();
    }

    openModal("viewColorModal");
};

window.addViewColorRuleRow = function(data) {
    const listDiv = document.getElementById("viewColorRulesList");
    if (!listDiv) return;

    const row = document.createElement("div");
    row.className = "lark-popover-row color-row";
    row.style.marginBottom = "8px";

    const view = state.views.find(v => v.id === activeEditingViewId);
    const schema = TAB_FIELDS_SCHEMA[view.tabId] || [];

    let fieldOptionsHtml = "";
    schema.forEach(s => {
        fieldOptionsHtml += `<option value="${s.value}" ${data && data.field === s.value ? 'selected' : ''}>${s.label}</option>`;
    });

    row.innerHTML = `
        <select class="form-select color-field" style="width: 140px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            ${fieldOptionsHtml}
        </select>
        <select class="form-select color-operator" style="width: 100px; border:1px solid var(--border-color); border-radius:6px; height:34px;">
            <option value="eq" ${data && data.operator === 'eq' ? 'selected' : ''}>bằng</option>
            <option value="neq" ${data && data.operator === 'neq' ? 'selected' : ''}>khác</option>
            <option value="contains" ${data && data.operator === 'contains' ? 'selected' : ''}>chứa</option>
            <option value="gt" ${data && data.operator === 'gt' ? 'selected' : ''}>&gt;</option>
            <option value="lt" ${data && data.operator === 'lt' ? 'selected' : ''}>&lt;</option>
        </select>
        <input type="text" class="form-input color-value" style="width: 100px; border:1px solid var(--border-color); border-radius:6px; height:34px; padding:0 8px;" value="${data ? data.value : ''}" placeholder="Giá trị...">
        <input type="color" class="form-input color-picker" style="width: 50px; border:none; height:34px; padding:0; cursor:pointer;" value="${data ? data.color : '#ffebee'}">
        <button type="button" class="btn btn-outline" style="color:var(--danger); border-color:var(--danger); height:34px;" onclick="this.parentNode.remove()">Xóa</button>
    `;
    listDiv.appendChild(row);
};

window.saveViewColoring = function() {
    const view = state.views.find(v => v.id === activeEditingViewId);
    if (!view) return;

    const rows = document.querySelectorAll("#viewColorRulesList .color-row");
    const rules = [];
    rows.forEach(r => {
        const field = r.querySelector(".color-field").value;
        const operator = r.querySelector(".color-operator").value;
        const value = r.querySelector(".color-value").value.trim();
        const color = r.querySelector(".color-picker").value;
        if (field && value !== "") {
            rules.push({ field, operator, value, color });
        }
    });

    view.colorRules = rules;
    state.updateState("views", [...state.views]);
    closeModal("viewColorModal");

    window.initViewTabs(view.tabId);
    const config = TAB_VIEW_CONFIGS[view.tabId];
    if (config && typeof window[config.originalRender] === 'function') {
        window[config.originalRender]();
    }
};

// --------------------------------------------------------------------------
// LARK BASE VIEW MODAL CONFIGS & TOGGLES
// --------------------------------------------------------------------------
window.openViewConfigModal = function(viewId, tabId) {
    const modal = document.getElementById("viewConfigModal");
    if (!modal) return;

    const idInput = document.getElementById("viewConfigIdInput");
    const tabInput = document.getElementById("viewConfigTabIdInput");
    const nameInput = document.getElementById("viewConfigName");
    const typeSelect = document.getElementById("viewConfigType");
    const titleEl = document.getElementById("viewConfigModalTitle");

    const activeTabId = tabId || (viewId ? state.views.find(v => v.id === viewId).tabId : null);
    const config = TAB_VIEW_CONFIGS[activeTabId];
    if (!config) return;

    const kanbanFieldSelect = document.getElementById("viewConfigKanbanField");
    if (kanbanFieldSelect) {
        kanbanFieldSelect.innerHTML = "";
        config.kanbanFields.forEach(function(f) {
            const opt = document.createElement("option");
            opt.value = f.value;
            opt.textContent = f.label;
            kanbanFieldSelect.appendChild(opt);
        });
    }

    const calendarFieldSelect = document.getElementById("viewConfigCalendarField");
    if (calendarFieldSelect) {
        calendarFieldSelect.innerHTML = "";
        config.calendarFields.forEach(function(f) {
            const opt = document.createElement("option");
            opt.value = f.value;
            opt.textContent = f.label;
            calendarFieldSelect.appendChild(opt);
        });
    }

    if (viewId) {
        titleEl.textContent = "Sửa cấu hình chế độ xem";
        const view = state.views.find(v => v.id === viewId);
        idInput.value = view.id;
        tabInput.value = view.tabId;
        nameInput.value = view.name;
        typeSelect.value = view.type;
        if (view.kanbanField && kanbanFieldSelect) kanbanFieldSelect.value = view.kanbanField;
        if (view.calendarField && calendarFieldSelect) calendarFieldSelect.value = view.calendarField;
    } else {
        titleEl.textContent = "Thêm chế độ xem mới";
        idInput.value = "";
        tabInput.value = activeTabId;
        nameInput.value = "";
        typeSelect.value = "GRID";
    }

    window.toggleViewConfigFields();
    openModal("viewConfigModal");
};

window.toggleViewConfigFields = function() {
    const typeSelect = document.getElementById("viewConfigType");
    const kanbanGroup = document.getElementById("viewConfigKanbanGroup");
    const calendarGroup = document.getElementById("viewConfigCalendarGroup");

    if (!typeSelect || !kanbanGroup || !calendarGroup) return;

    kanbanGroup.style.display = typeSelect.value === "KANBAN" ? "block" : "none";
    calendarGroup.style.display = typeSelect.value === "CALENDAR" ? "block" : "none";
};

window.saveViewConfig = function(e) {
    e.preventDefault();
    const idInput = document.getElementById("viewConfigIdInput");
    const tabInput = document.getElementById("viewConfigTabIdInput");
    const nameInput = document.getElementById("viewConfigName");
    const typeSelect = document.getElementById("viewConfigType");
    const kanbanFieldSelect = document.getElementById("viewConfigKanbanField");
    const calendarFieldSelect = document.getElementById("viewConfigCalendarField");

    const tabId = tabInput.value;
    const viewId = idInput.value || "v_" + Date.now();

    const viewData = {
        id: viewId,
        tabId: tabId,
        name: nameInput.value.trim(),
        type: typeSelect.value,
        kanbanField: kanbanFieldSelect ? kanbanFieldSelect.value : null,
        calendarField: calendarFieldSelect ? calendarFieldSelect.value : null,
        filters: idInput.value ? (state.views.find(v => v.id === viewId).filters || []) : [],
        sorts: idInput.value ? (state.views.find(v => v.id === viewId).sorts || []) : [],
        groupBy: idInput.value ? (state.views.find(v => v.id === viewId).groupBy || "") : (typeSelect.value === "KANBAN" ? kanbanFieldSelect.value : ""),
        colorRules: idInput.value ? (state.views.find(v => v.id === viewId).colorRules || []) : []
    };

    let newViews = [...state.views];
    if (idInput.value) {
        newViews = newViews.map(function(v) { return v.id === viewId ? viewData : v; });
    } else {
        newViews.push(viewData);
    }

    state.updateState("views", newViews);
    closeModal("viewConfigModal");

    activeViewIdMap[tabId] = viewId;
    window.initViewTabs(tabId);

    const config = TAB_VIEW_CONFIGS[tabId];
    if (config && typeof window[config.originalRender] === 'function') {
        window[config.originalRender]();
    }
};

// --------------------------------------------------------------------------
// LARK BASE RENDERING ADAPTERS
// --------------------------------------------------------------------------
window.renderCrmKanban = function(data, groupField, tabId) {
    const tabPane = document.getElementById(tabId + "Tab");
    if (!tabPane) return;

    let displayContainer = tabPane.querySelector(".card.mt-4") || tabPane.querySelector(".card");
    if (!displayContainer) return;

    displayContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "kanban-board-wrapper";

    let columnValues = [];
    if (groupField === "role") {
        columnValues = [
            { key: "CUSTOMER", label: "Khách hàng" },
            { key: "SUPPLIER", label: "Nhà cung cấp" },
            { key: "SUBCONTRACTOR", label: "Xưởng gia công" },
            { key: "BOTH", label: "Cả Khách & NCC" }
        ];
    } else if (groupField === "status") {
        if (tabId === "prod-orders") {
            columnValues = [
                { key: "WAITING_DESIGN", label: "Chờ thiết kế" },
                { key: "DESIGNING", label: "Đang thiết kế" },
                { key: "WAITING_PLATE", label: "Chờ ra kẽm" },
                { key: "IN_OFFSET", label: "Đang in Offset" },
                { key: "POST_PRESS", label: "Gia công sau in" },
                { key: "COMPLETED", label: "Đã hoàn thành" }
            ];
        } else {
            columnValues = [
                { key: "true", label: "Đang làm việc" },
                { key: "false", label: "Tạm dừng" }
            ];
        }
    } else {
        const vals = [...new Set(data.map(function(item) { return String(item[groupField] || 'N/A'); }))];
        columnValues = vals.map(function(v) { return { key: v, label: v }; });
    }

    const activeViewId = activeViewIdMap[tabId];
    const activeView = state.views.find(v => v.id === activeViewId);

    columnValues.forEach(function(col) {
        const colDiv = document.createElement("div");
        colDiv.className = "kanban-column";

        const colData = data.filter(function(item) {
            const val = String(item[groupField]);
            return val === col.key || (col.key === "true" && item[groupField] === true) || (col.key === "false" && item[groupField] === false);
        });

        colDiv.innerHTML = '<div class="kanban-column-header"><span>' + col.label + '</span><span class="badge badge-info">' + colData.length + '</span></div>';

        const listDiv = document.createElement("div");
        listDiv.className = "kanban-cards-list";

        colData.forEach(function(item) {
            const card = document.createElement("div");
            card.className = "kanban-card";
            
            // Apply conditional coloring to the kanban card
            const coloringStyle = window.getLarkRowStyle(item, activeView);
            if (coloringStyle) {
                card.style.cssText = coloringStyle;
            }

            if (tabId === "crm") {
                card.innerHTML = '<div class="kanban-card-title">' + item.name + '</div><div class="kanban-card-body"><div>Mã: <strong>' + item.code + '</strong></div><div>SĐT: ' + item.phone + '</div></div>';
                card.onclick = function() { window.openCrmDetail(item.id); };
            } else if (tabId === "prod-orders") {
                card.innerHTML = '<div class="kanban-card-title">' + item.order_number + '</div><div class="kanban-card-body"><div>Quy cách: ' + item.print_spec + '</div><div>Hạn: ' + new Date(item.delivery_date).toLocaleDateString('vi-VN') + '</div></div>';
                if (window.openOrderDetail) card.onclick = function() { window.openOrderDetail(item.id); };
            } else if (tabId === "employees") {
                card.innerHTML = '<div class="kanban-card-title">' + item.name + '</div><div class="kanban-card-body"><div>Mã: ' + item.code + '</div><div>Phòng: ' + (item.department || 'N/A') + '</div></div>';
                if (window.openEditEmployee) card.onclick = function() { window.openEditEmployee(item.id); };
            } else {
                card.innerHTML = '<div class="kanban-card-title">' + (item.name || item.code || 'N/A') + '</div>';
            }

            listDiv.appendChild(card);
        });

        colDiv.appendChild(listDiv);
        wrapper.appendChild(colDiv);
    });

    displayContainer.appendChild(wrapper);
};

window.renderCrmCalendar = function(data, dateField, tabId) {
    const tabPane = document.getElementById(tabId + "Tab");
    if (!tabPane) return;

    let displayContainer = tabPane.querySelector(".card.mt-4") || tabPane.querySelector(".card");
    if (!displayContainer) return;

    displayContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "calendar-wrapper";

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    wrapper.innerHTML = '<div class="calendar-header"><h3>Tháng ' + (currentMonth + 1) + ' / ' + currentYear + '</h3></div>';

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    daysOfWeek.forEach(function(d) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell header";
        cell.textContent = d;
        grid.appendChild(cell);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    
    for (let i = 1; i < startDayOfWeek; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        grid.appendChild(cell);
    }

    const activeViewId = activeViewIdMap[tabId];
    const activeView = state.views.find(v => v.id === activeViewId);

    const totalDays = lastDay.getDate();
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (day === today.getDate()) cell.classList.add("today");

        cell.innerHTML = '<div class="calendar-cell-header">' + day + '</div>';

        const eventsDiv = document.createElement("div");
        eventsDiv.className = "calendar-cell-events";

        const dayEvents = data.filter(function(item) {
            if (!item[dateField]) return false;
            const itemDate = new Date(item[dateField]);
            return itemDate.getDate() === day && itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        });

        dayEvents.forEach(function(evt) {
            const itemDiv = document.createElement("div");
            itemDiv.className = "calendar-event-item";
            
            // Apply conditional coloring to the calendar event tag
            const coloringStyle = window.getLarkRowStyle(evt, activeView);
            if (coloringStyle) {
                itemDiv.style.cssText = coloringStyle;
            }

            if (tabId === "crm") {
                itemDiv.textContent = evt.name;
                itemDiv.onclick = function() { window.openCrmDetail(evt.id); };
            } else if (tabId === "prod-orders") {
                itemDiv.textContent = evt.order_number + " - " + evt.print_spec;
                if (window.openOrderDetail) itemDiv.onclick = function() { window.openOrderDetail(evt.id); };
            } else if (tabId === "employees") {
                itemDiv.textContent = evt.name;
                if (window.openEditEmployee) itemDiv.onclick = function() { window.openEditEmployee(evt.id); };
            } else {
                itemDiv.textContent = evt.name || evt.code;
            }

            eventsDiv.appendChild(itemDiv);
        });

        cell.appendChild(eventsDiv);
        grid.appendChild(cell);
    }

    wrapper.appendChild(grid);
    displayContainer.appendChild(wrapper);
};

window.activeOnlineSalesView = "TABLE";

window.switchOnlineViewMode = function(viewMode) {
    window.activeOnlineSalesView = viewMode;
    
    const tableContainer = document.getElementById("onlineOrdersTableContainer");
    const kanbanContainer = document.getElementById("onlineOrdersKanbanContainer");
    const calendarContainer = document.getElementById("onlineOrdersCalendarContainer");
    
    if (tableContainer) tableContainer.style.display = viewMode === "TABLE" ? "block" : "none";
    if (kanbanContainer) kanbanContainer.style.display = viewMode === "KANBAN" ? "flex" : "none";
    if (calendarContainer) calendarContainer.style.display = viewMode === "CALENDAR" ? "block" : "none";
    
    const btnOnlineOrderViewToggle = document.getElementById("btnOnlineOrderViewToggle");
    if (btnOnlineOrderViewToggle) {
        if (viewMode !== "TABLE") {
            btnOnlineOrderViewToggle.style.color = "var(--accent)";
            btnOnlineOrderViewToggle.style.borderColor = "var(--accent)";
        } else {
            btnOnlineOrderViewToggle.style.color = "var(--text-secondary)";
            btnOnlineOrderViewToggle.style.borderColor = "var(--border-color)";
        }
    }
    
    // Close the dropdown menu
    const dropdownMenu = document.getElementById("onlineViewDropdownMenu");
    if (dropdownMenu) dropdownMenu.style.display = "none";
    
    window.renderOnlineSales();
};

window.renderOnlineOrdersCalendar = function() {
    const displayContainer = document.getElementById("onlineOrdersCalendarContainer");
    if (!displayContainer) return;
    
    displayContainer.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.className = "calendar-wrapper";
    wrapper.style.cssText = "background:var(--bg-card); border-radius:16px; padding:16px; width:100%; box-sizing:border-box;";
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Header controls
    wrapper.innerHTML = `
        <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border-color);">
            <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--accent); display:flex; align-items:center; gap:8px;">
                <i data-lucide="calendar"></i> Lịch Đơn Hàng - Tháng ${currentMonth + 1} / ${currentYear}
            </h3>
        </div>
    `;
    
    // Weekday headers
    const weekdayHeaders = document.createElement("div");
    weekdayHeaders.style.cssText = "display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 700; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;";
    weekdayHeaders.innerHTML = `
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div style="color:var(--danger)">T7</div><div style="color:var(--danger)">CN</div>
    `;
    wrapper.appendChild(weekdayHeaders);
    
    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    grid.style.cssText = "display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; background: rgba(0,0,0,0.05); padding: 8px; border-radius: 8px; min-height: 250px;";
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday maps to 7
    
    // Blank cells before month start
    for (let i = 1; i < startDayOfWeek; i++) {
        const blank = document.createElement("div");
        blank.style.padding = "8px";
        grid.appendChild(blank);
    }
    
    const totalDays = lastDay.getDate();
    for (let d = 1; d <= totalDays; d++) {
        const cell = document.createElement("div");
        cell.style.cssText = "background:var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px; display:flex; flex-direction:column; align-items:stretch; min-height: 90px; box-sizing:border-box;";
        
        // Highlight today
        const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        if (isToday) {
            cell.style.borderColor = "var(--accent)";
            cell.style.background = "var(--accent-light)";
        }
        
        // Determine if weekend (Saturday or Sunday)
        const dayObj = new Date(currentYear, currentMonth, d);
        const wDay = dayObj.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = (wDay === 0 || wDay === 6);
        
        // Lunar calculation
        let lunarDay = (d + currentMonth * 2 + (currentYear - 2026)) % 30;
        if (lunarDay <= 0) lunarDay += 30;
        
        // Solar holiday detection
        let isHoliday = false;
        let holidayName = "";
        const sMonth = currentMonth + 1;
        if (d === 1 && sMonth === 1) { isHoliday = true; holidayName = "Tết DL"; }
        else if (d === 30 && sMonth === 4) { isHoliday = true; holidayName = "30/4"; }
        else if (d === 1 && sMonth === 5) { isHoliday = true; holidayName = "1/5"; }
        else if (d === 2 && sMonth === 9) { isHoliday = true; holidayName = "2/9"; }
        
        // Lunar Holidays
        if (lunarDay >= 1 && lunarDay <= 5 && sMonth === 2) { isHoliday = true; holidayName = "Tết Âm"; }
        else if (lunarDay === 10 && sMonth === 4) { isHoliday = true; holidayName = "Giỗ Tổ"; }
        
        const shouldColorRed = isWeekend || isHoliday;
        const numberColor = shouldColorRed ? "var(--danger)" : "var(--text-primary)";
        const subTextColor = shouldColorRed ? "rgba(220, 38, 38, 0.7)" : "var(--text-muted)";
        
        let lunarLabel = lunarDay;
        if (isHoliday) {
            lunarLabel = `<span style="font-weight:700; font-size:0.6rem;">${holidayName}</span>`;
        } else if (lunarDay === 1) {
            lunarLabel = `<span style="font-weight:700; font-size:0.6rem;">M.1</span>`;
        } else if (lunarDay === 15) {
            lunarLabel = `<span style="font-weight:700; font-size:0.6rem;">Rằm</span>`;
        }
        
        // Days markup (Day number and lunar day)
        const cellHeader = document.createElement("div");
        cellHeader.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;";
        cellHeader.innerHTML = `
            <span style="font-weight:700; font-size:0.95rem; color:${numberColor};">${d}</span>
            <span style="font-size:0.65rem; color:${subTextColor};">${lunarLabel}</span>
        `;
        cell.appendChild(cellHeader);
        
        // Events Container
        const eventsDiv = document.createElement("div");
        eventsDiv.style.cssText = "display:flex; flex-direction:column; gap:2px; flex-grow:1; overflow-y:auto; max-height:60px;";
        
        // Filter orders for this day
        const dayEvents = (state.online_orders || []).filter(item => {
            if (!item.created_at) return false;
            const itemDate = new Date(item.created_at);
            return itemDate.getDate() === d && itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        });
        
        dayEvents.forEach(evt => {
            const itemDiv = document.createElement("div");
            itemDiv.style.cssText = "font-size: 0.65rem; padding: 2px 4px; border-radius: 3px; background: var(--accent); color: white; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;";
            
            const customer = state.partners.find(p => p.id === evt.customer_id);
            const custName = customer ? customer.name.split(" ")[0] : "Khách";
            itemDiv.textContent = `${evt.order_number.replace("SO-ON-202606-", "")}: ${custName}`;
            itemDiv.title = `${evt.order_number} - ${customer ? customer.name : 'N/A'}`;
            
            itemDiv.onclick = function(e) {
                e.stopPropagation();
                window.openOnlineOrderInvoicePdf(evt.id);
            };
            
            eventsDiv.appendChild(itemDiv);
        });
        
        cell.appendChild(eventsDiv);
        grid.appendChild(cell);
    }
    
    wrapper.appendChild(grid);
    displayContainer.appendChild(wrapper);
    
    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {}
    }
};

// ==========================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================================================

// Seed default users in state if not present
function initUsersDatabase() {
    if (!state.departments || state.departments.length === 0) {
        const defaultDepartments = [
            {
                id: "dep_sales",
                name: "Phòng Kinh doanh (Sales)",
                permissions: {
                    dashboard: true,
                    sales: true,
                    production: false,
                    finance: false,
                    crm: true,
                    hr: false,
                    admin: false
                }
            },
            {
                id: "dep_prod",
                name: "Tổ Sản xuất & Thiết kế",
                permissions: {
                    dashboard: true,
                    sales: false,
                    production: true,
                    finance: false,
                    crm: false,
                    hr: false,
                    admin: false
                }
            },
            {
                id: "dep_accounting",
                name: "Phòng Kế toán tài chính",
                permissions: {
                    dashboard: true,
                    sales: false,
                    production: false,
                    finance: true,
                    crm: false,
                    hr: false,
                    admin: false
                }
            },
            {
                id: "dep_hr",
                name: "Phòng Hành chính nhân sự",
                permissions: {
                    dashboard: true,
                    sales: false,
                    production: false,
                    finance: false,
                    crm: false,
                    hr: true,
                    admin: false
                }
            }
        ];
        state.updateState("departments", defaultDepartments);
    }

    if (!state.users || state.users.length === 0) {
        const defaultUsers = [
            {
                id: "u_admin",
                username: "admin",
                password: "admin",
                fullname: "Administrator",
                role: "ADMIN",
                departmentId: "",
                permissions: {
                    dashboard: true,
                    sales: true,
                    production: true,
                    finance: true,
                    crm: true,
                    hr: true,
                    admin: true
                }
            },
            {
                id: "u_sales",
                username: "sales",
                password: "sales123",
                fullname: "Nhân viên Kinh doanh",
                role: "USER",
                departmentId: "dep_sales",
                permissions: {
                    dashboard: true,
                    sales: true,
                    production: false,
                    finance: false,
                    crm: true,
                    hr: false,
                    admin: false
                }
            },
            {
                id: "u_sanxuat",
                username: "sanxuat",
                password: "production123",
                fullname: "Nhân viên Xưởng",
                role: "USER",
                departmentId: "dep_prod",
                permissions: {
                    dashboard: true,
                    sales: false,
                    production: true,
                    finance: false,
                    crm: false,
                    hr: false,
                    admin: false
                }
            },
            {
                id: "u_ketoan",
                username: "ketoan",
                password: "finance123",
                fullname: "Kế toán trưởng",
                role: "USER",
                departmentId: "dep_accounting",
                permissions: {
                    dashboard: true,
                    sales: false,
                    production: false,
                    finance: true,
                    crm: false,
                    hr: false,
                    admin: false
                }
            }
        ];
        state.updateState("users", defaultUsers);
    }
}

window.handleLoginSubmit = function(e) {
    e.preventDefault();
    const usernameEl = document.getElementById("loginUsername");
    const passwordEl = document.getElementById("loginPassword");
    if (!usernameEl || !passwordEl) return;
    
    const username = usernameEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    
    initUsersDatabase();
    const user = state.users.find(u => u.username.toLowerCase() === username && u.password === password);
    
    if (user) {
        localStorage.setItem("ihp_current_user", JSON.stringify(user));
        
        // Hide login overlay
        const loginOverlay = document.getElementById("loginScreen");
        if (loginOverlay) loginOverlay.style.display = "none";
        
        // Clear forms
        usernameEl.value = "";
        passwordEl.value = "";
        
        // Refresh UI permissions
        window.applyUserPermissions();
        
        // Display notification
        alert(`Chào mừng ${user.fullname} đã đăng nhập hệ thống!`);
        
        // Route to default tab
        if (user.role === 'ADMIN' || user.permissions.dashboard) {
            switchTab('dashboard');
        } else {
            // Route to first allowed tab
            const tabMap = {
                sales: 'sales-hub',
                production: 'production-hub',
                finance: 'finance-hub',
                crm: 'admin-hub',
                hr: 'admin-hub',
                admin: 'admin-hub'
            };
            const allowedKey = Object.keys(user.permissions).find(k => k !== 'dashboard' && user.permissions[k]);
            switchTab(tabMap[allowedKey] || 'dashboard');
        }
    } else {
        alert("Tên đăng nhập hoặc mật khẩu không chính xác.");
    }
};

window.handleLogout = function() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
        localStorage.removeItem("ihp_current_user");
        
        // Show login overlay
        const loginOverlay = document.getElementById("loginScreen");
        if (loginOverlay) loginOverlay.style.display = "flex";
        
        // Reset sidebar profile visual
        document.getElementById("sidebarUserName").textContent = "Chưa đăng nhập";
        document.getElementById("sidebarUserRole").textContent = "N/A";
    }
};

window.getRequiredPermission = function(tabId) {
    const tabPermissions = {
        'dashboard': 'dashboard',
        
        'online-sales': 'sales',
        'sales-hub': 'sales',
        
        'quotes': 'production',
        'prod-orders': 'production',
        'production': 'production',
        'subcontracting': 'production',
        'inventory': 'production',
        'warehouse': 'production',
        'production-hub': 'production',
        
        'finance': 'finance',
        'finance-hub': 'finance',
        
        'crm': 'crm',
        'crm-care': 'crm',
        'contracts': 'crm',
        'chat': 'crm',
        
        'employees': 'hr',
        'collaborators': 'hr',
        'labor-contracts': 'hr',
        
        'admin-hub': 'admin'
    };
    return tabPermissions[tabId];
};

window.applyUserPermissions = function() {
    const currentUser = JSON.parse(localStorage.getItem("ihp_current_user"));
    if (!currentUser) {
        const loginOverlay = document.getElementById("loginScreen");
        if (loginOverlay) loginOverlay.style.display = "flex";
        return;
    }
    
    // Hide login screen
    const loginOverlay = document.getElementById("loginScreen");
    if (loginOverlay) loginOverlay.style.display = "none";
    
    // Update profile in sidebar
    const sidebarName = document.getElementById("sidebarUserName");
    const sidebarRole = document.getElementById("sidebarUserRole");
    if (sidebarName) sidebarName.textContent = currentUser.fullname;
    if (sidebarRole) sidebarRole.textContent = currentUser.role === 'ADMIN' ? 'Quản trị viên' : currentUser.username.toUpperCase();

    // Update profile in admin-hub tab card
    const adminFullName = document.getElementById("adminUserFullName");
    const adminUsername = document.getElementById("adminUsername");
    const adminUserRoleBadge = document.getElementById("adminUserRoleBadge");
    const adminUserAvatarInitials = document.getElementById("adminUserAvatarInitials");

    if (adminFullName) adminFullName.textContent = currentUser.fullname || currentUser.username;
    if (adminUsername) adminUsername.textContent = currentUser.username;
    if (adminUserRoleBadge) {
        adminUserRoleBadge.textContent = currentUser.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : currentUser.username.toUpperCase();
    }
    if (adminUserAvatarInitials) {
        const name = currentUser.fullname || currentUser.username || "AD";
        const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
        adminUserAvatarInitials.textContent = initials;
    }
    
    const isCtrlAdmin = currentUser.role === 'ADMIN';
    const permissions = currentUser.permissions || {};
    
    // Hide/Show sidebar links
    const sidebarItems = document.querySelectorAll(".sidebar-menu .menu-item, .sidebar-menu .menu-group");
    sidebarItems.forEach(el => {
        let tab = el.getAttribute("data-tab");
        if (!tab) {
            // Check if it is a parent menu group containing submenu-item
            const sub = el.querySelector(".submenu-item");
            if (sub) {
                tab = sub.getAttribute("data-tab");
            }
        }
        if (!tab) return;
        
        const req = window.getRequiredPermission(tab);
        if (req && !isCtrlAdmin && !permissions[req]) {
            el.style.display = "none";
        } else {
            el.style.display = "";
        }
    });
    
    // Hide/Show bottom navigation tabs
    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .bottom-nav-item, .bottom-nav-bar .bottom-nav-center-wrapper");
    bottomNavItems.forEach(el => {
        let tab = el.getAttribute("data-tab");
        if (!tab && el.classList.contains("bottom-nav-center-wrapper")) {
            const btn = el.querySelector(".bottom-nav-item");
            if (btn) tab = btn.getAttribute("data-tab");
        }
        if (!tab) return;
        
        const req = window.getRequiredPermission(tab);
        if (req && !isCtrlAdmin && !permissions[req]) {
            el.style.display = "none";
        } else {
            el.style.display = "";
        }
    });
    
    // Hide/Show Hub cards
    const hubCards = document.querySelectorAll(".hub-card");
    hubCards.forEach(el => {
        const onclickAttr = el.getAttribute("onclick") || "";
        const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
        if (match) {
            const tab = match[1];
            const req = window.getRequiredPermission(tab);
            if (req && !isCtrlAdmin && !permissions[req]) {
                el.style.display = "none";
            } else {
                el.style.display = "";
            }
        }
    });
    
    // Hide/Show dashboard KPI cards
    const kpiCards = document.querySelectorAll(".kpi-card, [onclick*='switchTab']");
    kpiCards.forEach(el => {
        const onclickAttr = el.getAttribute("onclick") || "";
        const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
        if (match) {
            const tab = match[1];
            const req = window.getRequiredPermission(tab);
            if (req && !isCtrlAdmin && !permissions[req]) {
                el.style.display = "none";
            } else {
                el.style.display = "";
            }
        }
    });
};

// User Management Logic
window.openUserManagementModal = function() {
    initUsersDatabase();
    window.switchUserManagementTab('accounts');
    document.getElementById("userManagementModal").classList.add("active");
};

window.renderUserList = function() {
    const tbody = document.querySelector("#userListTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const users = state.users || [];
    
    users.forEach(u => {
        const row = document.createElement("tr");
        
        // Format permissions text
        let permList = [];
        if (u.role === 'ADMIN') {
            permList = ['Toàn quyền hệ thống'];
        } else {
            const p = u.permissions || {};
            if (p.sales) permList.push('Bán hàng');
            if (p.production) permList.push('Sản xuất & Kho');
            if (p.finance) permList.push('Tài chính');
            if (p.crm) permList.push('CRM & Khách hàng');
            if (p.hr) permList.push('Nhân sự');
            if (p.admin) permList.push('Quản trị');
            if (permList.length === 0) permList.push('Tổng quan');
        }
        
        const dept = (state.departments || []).find(d => d.id === u.departmentId);
        const deptLabel = u.role === 'ADMIN' ? 'Quản trị viên' : (dept ? dept.name : 'Chưa gán phòng ban');
        const roleBadge = u.role === 'ADMIN' ? 'badge-danger' : (dept ? 'badge-success' : 'badge-secondary');
        
        row.innerHTML = `
            <td><strong>${u.username}</strong></td>
            <td>${u.fullname}</td>
            <td><span class="badge ${roleBadge}">${deptLabel}</span></td>
            <td><small>${permList.join(', ')}</small></td>
            <td style="text-align: right;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.openEditUserModal('${u.id}')" style="padding: 2px 8px; font-size: 0.8rem; margin-right:4px;"><i data-lucide="edit" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></button>
                ${u.username !== 'admin' ? `<button type="button" class="btn btn-danger btn-sm" onclick="window.deleteUser('${u.id}')" style="padding: 2px 8px; font-size: 0.8rem; background-color:#ef4444;"><i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

window.openAddUserModal = function() {
    document.getElementById("userFormTitle").textContent = "Thêm tài khoản mới";
    document.getElementById("userFormId").value = "";
    document.getElementById("userFormUsername").value = "";
    document.getElementById("userFormUsername").disabled = false;
    document.getElementById("userFormFullname").value = "";
    document.getElementById("userFormPassword").value = "";
    document.getElementById("userFormPassword").placeholder = "Nhập mật khẩu";
    document.getElementById("userFormPasswordHelp").style.display = "none";
    document.getElementById("userFormRole").value = "USER";
    
    // Populate department options
    window.populateDepartmentOptions("");
    document.getElementById("userFormDeptGroup").style.display = "block";
    
    // Clear permissions
    document.getElementById("perm_sales").checked = false;
    document.getElementById("perm_production").checked = false;
    document.getElementById("perm_finance").checked = false;
    document.getElementById("perm_crm").checked = false;
    document.getElementById("perm_hr").checked = false;
    document.getElementById("perm_admin").checked = false;
    
    document.getElementById("userFormModal").classList.add("active");
};

window.openEditUserModal = function(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById("userFormTitle").textContent = "Chỉnh sửa tài khoản";
    document.getElementById("userFormId").value = user.id;
    document.getElementById("userFormUsername").value = user.username;
    document.getElementById("userFormUsername").disabled = true;
    document.getElementById("userFormFullname").value = user.fullname;
    document.getElementById("userFormPassword").value = "";
    document.getElementById("userFormPassword").placeholder = "Nhập mật khẩu mới";
    document.getElementById("userFormPasswordHelp").style.display = "block";
    document.getElementById("userFormRole").value = user.role;
    
    // Populate department options
    window.populateDepartmentOptions(user.departmentId || "");
    document.getElementById("userFormDeptGroup").style.display = user.role === 'ADMIN' ? 'none' : 'block';
    
    // Load permissions
    const p = user.permissions || {};
    document.getElementById("perm_sales").checked = !!p.sales;
    document.getElementById("perm_production").checked = !!p.production;
    document.getElementById("perm_finance").checked = !!p.finance;
    document.getElementById("perm_crm").checked = !!p.crm;
    document.getElementById("perm_hr").checked = !!p.hr;
    document.getElementById("perm_admin").checked = !!p.admin;
    
    document.getElementById("userFormModal").classList.add("active");
};

window.handleUserSubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById("userFormId").value;
    const username = document.getElementById("userFormUsername").value.trim();
    const fullname = document.getElementById("userFormFullname").value.trim();
    const password = document.getElementById("userFormPassword").value;
    const role = document.getElementById("userFormRole").value;
    const departmentId = role === 'ADMIN' ? '' : document.getElementById("userFormDepartment").value;
    
    const permissions = {
        dashboard: true,
        sales: document.getElementById("perm_sales").checked,
        production: document.getElementById("perm_production").checked,
        finance: document.getElementById("perm_finance").checked,
        crm: document.getElementById("perm_crm").checked,
        hr: document.getElementById("perm_hr").checked,
        admin: document.getElementById("perm_admin").checked
    };
    
    let users = [...(state.users || [])];
    
    if (id) {
        // Edit existing
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            users[userIndex].fullname = fullname;
            users[userIndex].role = role;
            users[userIndex].departmentId = departmentId;
            users[userIndex].permissions = permissions;
            if (password) {
                users[userIndex].password = password;
            }
        }
    } else {
        // Create new
        const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
            alert("Tên đăng nhập này đã tồn tại!");
            return;
        }
        
        if (!password) {
            alert("Vui lòng nhập mật khẩu cho tài khoản mới!");
            return;
        }
        
        const newUser = {
            id: 'u_' + Date.now(),
            username: username,
            password: password,
            fullname: fullname,
            role: role,
            departmentId: departmentId,
            permissions: permissions
        };
        users.push(newUser);
    }
    
    state.updateState("users", users);
    
    // If the active user profile was edited, update local storage profile
    const currentUser = JSON.parse(localStorage.getItem("ihp_current_user"));
    if (currentUser && (currentUser.id === id || currentUser.username.toLowerCase() === username.toLowerCase())) {
        const updatedUser = users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (updatedUser) {
            localStorage.setItem("ihp_current_user", JSON.stringify(updatedUser));
            window.applyUserPermissions();
        }
    }
    
    closeModal("userFormModal");
    window.renderUserList();
};

window.deleteUser = function(userId) {
    const currentUser = JSON.parse(localStorage.getItem("ihp_current_user"));
    if (currentUser && currentUser.id === userId) {
        alert("Bạn không thể tự xóa tài khoản của chính mình!");
        return;
    }
    
    const user = state.users.find(u => u.id === userId);
    if (user && user.username === 'admin') {
        alert("Không thể xóa tài khoản Quản trị mặc định!");
        return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user ? user.username : ''}"?`)) {
        const updatedUsers = state.users.filter(u => u.id !== userId);
        state.updateState("users", updatedUsers);
        window.renderUserList();
    }
};

// Department Management Logic
window.switchUserManagementTab = function(tab) {
    const tabAccounts = document.getElementById("userMgmtTab-accounts");
    const tabDepts = document.getElementById("userMgmtTab-departments");
    const btnAccounts = document.getElementById("btnUserTabAccounts");
    const btnDepts = document.getElementById("btnUserTabDepartments");

    if (tab === 'accounts') {
        if (tabAccounts) tabAccounts.style.display = "block";
        if (tabDepts) tabDepts.style.display = "none";
        
        if (btnAccounts) {
            btnAccounts.style.background = "var(--accent)";
            btnAccounts.style.color = "#fff";
        }
        if (btnDepts) {
            btnDepts.style.background = "var(--bg-hover)";
            btnDepts.style.color = "var(--text-secondary)";
        }
        window.renderUserList();
    } else {
        if (tabAccounts) tabAccounts.style.display = "none";
        if (tabDepts) tabDepts.style.display = "block";

        if (btnAccounts) {
            btnAccounts.style.background = "var(--bg-hover)";
            btnAccounts.style.color = "var(--text-secondary)";
        }
        if (btnDepts) {
            btnDepts.style.background = "var(--accent)";
            btnDepts.style.color = "#fff";
        }
        window.renderDepartmentList();
    }
};

window.renderDepartmentList = function() {
    const tbody = document.querySelector("#departmentListTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    const depts = state.departments || [];
    
    depts.forEach(d => {
        const row = document.createElement("tr");
        
        let permList = [];
        const p = d.permissions || {};
        if (p.sales) permList.push('Bán hàng');
        if (p.production) permList.push('Sản xuất & Kho');
        if (p.finance) permList.push('Tài chính');
        if (p.crm) permList.push('CRM & Khách hàng');
        if (p.hr) permList.push('Nhân sự');
        if (p.admin) permList.push('Quản trị');
        if (permList.length === 0) permList.push('Tổng quan');

        row.innerHTML = `
            <td><strong>${d.name}</strong></td>
            <td><small>${permList.join(', ')}</small></td>
            <td style="text-align: right;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.openEditDepartmentModal('${d.id}')" style="padding: 2px 8px; font-size: 0.8rem; margin-right:4px;"><i data-lucide="edit" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></button>
                <button type="button" class="btn btn-danger btn-sm" onclick="window.deleteDepartment('${d.id}')" style="padding: 2px 8px; font-size: 0.8rem; background-color:#ef4444;"><i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
};

window.openAddDepartmentModal = function() {
    document.getElementById("departmentFormTitle").textContent = "Thêm phòng ban mới";
    document.getElementById("departmentFormId").value = "";
    document.getElementById("departmentFormName").value = "";
    
    document.getElementById("dept_perm_sales").checked = false;
    document.getElementById("dept_perm_production").checked = false;
    document.getElementById("dept_perm_finance").checked = false;
    document.getElementById("dept_perm_crm").checked = false;
    document.getElementById("dept_perm_hr").checked = false;
    document.getElementById("dept_perm_admin").checked = false;
    
    document.getElementById("departmentFormModal").classList.add("active");
};

window.openEditDepartmentModal = function(deptId) {
    const dept = state.departments.find(d => d.id === deptId);
    if (!dept) return;
    
    document.getElementById("departmentFormTitle").textContent = "Chỉnh sửa phòng ban";
    document.getElementById("departmentFormId").value = dept.id;
    document.getElementById("departmentFormName").value = dept.name;
    
    const p = dept.permissions || {};
    document.getElementById("dept_perm_sales").checked = !!p.sales;
    document.getElementById("dept_perm_production").checked = !!p.production;
    document.getElementById("dept_perm_finance").checked = !!p.finance;
    document.getElementById("dept_perm_crm").checked = !!p.crm;
    document.getElementById("dept_perm_hr").checked = !!p.hr;
    document.getElementById("dept_perm_admin").checked = !!p.admin;
    
    document.getElementById("departmentFormModal").classList.add("active");
};

window.deleteDepartment = function(deptId) {
    if (confirm("Bạn có chắc chắn muốn xóa phòng ban này?")) {
        const newDepts = (state.departments || []).filter(d => d.id !== deptId);
        state.updateState("departments", newDepts);
        
        window.populateDepartmentOptions();
        window.renderDepartmentList();
    }
};

window.handleDepartmentSubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById("departmentFormId").value;
    const name = document.getElementById("departmentFormName").value.trim();
    
    const permissions = {
        dashboard: true,
        sales: document.getElementById("dept_perm_sales").checked,
        production: document.getElementById("dept_perm_production").checked,
        finance: document.getElementById("dept_perm_finance").checked,
        crm: document.getElementById("dept_perm_crm").checked,
        hr: document.getElementById("dept_perm_hr").checked,
        admin: document.getElementById("dept_perm_admin").checked
    };
    
    let depts = [...(state.departments || [])];
    
    if (id) {
        const idx = depts.findIndex(d => d.id === id);
        if (idx !== -1) {
            depts[idx].name = name;
            depts[idx].permissions = permissions;
        }
    } else {
        const newDept = {
            id: 'dep_' + Date.now(),
            name: name,
            permissions: permissions
        };
        depts.push(newDept);
    }
    
    state.updateState("departments", depts);
    
    closeModal("departmentFormModal");
    window.populateDepartmentOptions();
    window.renderDepartmentList();
};

window.populateDepartmentOptions = function(selectedDeptId = "") {
    const select = document.getElementById("userFormDepartment");
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Chọn phòng ban (Gán quyền tự động) --</option>';
    const depts = state.departments || [];
    depts.forEach(d => {
        select.innerHTML += `<option value="${d.id}" ${d.id === selectedDeptId ? 'selected' : ''}>${d.name}</option>`;
    });
};

window.applyDepartmentPermissionsToForm = function() {
    const deptId = document.getElementById("userFormDepartment").value;
    if (!deptId) return;
    
    const dept = (state.departments || []).find(d => d.id === deptId);
    if (!dept) return;

    const p = dept.permissions || {};
    document.getElementById("perm_sales").checked = !!p.sales;
    document.getElementById("perm_production").checked = !!p.production;
    document.getElementById("perm_finance").checked = !!p.finance;
    document.getElementById("perm_crm").checked = !!p.crm;
    document.getElementById("perm_hr").checked = !!p.hr;
    document.getElementById("perm_admin").checked = !!p.admin;
};

// Bind role selection change to toggle department selection
document.addEventListener("DOMContentLoaded", function() {
    const roleSelect = document.getElementById("userFormRole");
    if (roleSelect) {
        roleSelect.addEventListener("change", function() {
            const deptGroup = document.getElementById("userFormDeptGroup");
            if (this.value === "ADMIN") {
                if (deptGroup) deptGroup.style.display = "none";
                document.getElementById("perm_sales").checked = true;
                document.getElementById("perm_production").checked = true;
                document.getElementById("perm_finance").checked = true;
                document.getElementById("perm_crm").checked = true;
                document.getElementById("perm_hr").checked = true;
                document.getElementById("perm_admin").checked = true;
            } else {
                if (deptGroup) deptGroup.style.display = "block";
                window.applyDepartmentPermissionsToForm();
            }
        });
    }
});

// Sharing Invoice Handlers
window.exportInvoiceAsPDF = function() {
    try {
        const modal = document.getElementById("onlineOrderInvoicePdfModal");
        const orderId = modal?.dataset.orderId;
        if (!orderId) {
            alert("Lỗi: Không tìm thấy ID đơn hàng.");
            return;
        }
        const order = state.online_orders.find(o => o.id === orderId) || state.orders.find(o => o.id === orderId);
        if (!order) {
            alert("Lỗi: Đơn hàng không tồn tại.");
            return;
        }
        
        // Show loading indicator on button
        const shareBtn = document.querySelector("#onlineOrderInvoicePdfModal button.btn-primary");
        const originalText = shareBtn ? shareBtn.innerHTML : "📤 Xuất PDF";
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.innerHTML = "⏳ Đang tạo PDF...";
        }

        loadHtml2Pdf(() => {
            const printArea = document.getElementById("printArea");
            if (!printArea) {
                alert("Lỗi: Không tìm thấy vùng hóa đơn cần xuất.");
                if (shareBtn) {
                    shareBtn.disabled = false;
                    shareBtn.innerHTML = originalText;
                }
                return;
            }

            // 1. Inject temporary styles for print export to force black text and bypass container height limits
            const style = document.createElement("style");
            style.id = "pdf-export-temp-styles";
            style.innerHTML = `
                /* Reset printArea container layout */
                #printArea {
                    background: #ffffff !important;
                    color: #111111 !important;
                    box-shadow: none !important;
                    transform: none !important;
                    margin: 0 auto !important;
                }
                /* Force dark text for general elements inside printArea */
                #printArea p, #printArea span, #printArea strong, #printArea td {
                    color: #111111 !important;
                    background-color: #ffffff !important;
                }
                /* Brand headers green */
                #printArea h2, #printArea h4 {
                    color: #108f53 !important;
                    background-color: transparent !important;
                }
                /* Table headers green and text white */
                #printArea th {
                    color: #ffffff !important;
                    background-color: #108f53 !important;
                }
                /* Highlight red colors */
                #printArea #pdfOrderNumber, #printArea .text-danger, #printArea .status-unpaid {
                    color: #ef4444 !important;
                    background-color: transparent !important;
                }
                /* Bypass scroll parent overflow and height caps */
                .pdf-preview-container {
                    height: auto !important;
                    overflow-y: visible !important;
                    overflow-x: visible !important;
                    padding: 0 !important;
                }
                #onlineOrderInvoicePdfModal .modal-body {
                    height: auto !important;
                    overflow-y: visible !important;
                    max-height: none !important;
                }
            `;
            document.head.appendChild(style);

            const filename = `hoa_don_${order.order_number}.pdf`;
            const opt = {
                margin:       10,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Wait 300ms for style calculations and layout repaint on mobile browsers
            setTimeout(() => {
                // Output as PDF blob so we can share or download
                html2pdf().set(opt).from(printArea).outputPdf('blob').then(blob => {
                    // Remove temporary style sheet
                    const tempStyle = document.getElementById("pdf-export-temp-styles");
                    if (tempStyle) tempStyle.remove();

                    if (!blob) {
                        alert("Không thể chuyển đổi hóa đơn thành tệp PDF.");
                        if (shareBtn) {
                            shareBtn.disabled = false;
                            shareBtn.innerHTML = originalText;
                        }
                        return;
                    }

                    const file = new File([blob], filename, { type: 'application/pdf' });

                    // Use native OS Share Sheet if supported
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: `Hóa đơn ${order.order_number}`,
                            text: `In Lạc Hồng - Hóa đơn đơn hàng ${order.order_number}`
                        }).catch(err => {
                            console.warn("User cancelled or error sharing:", err);
                        }).finally(() => {
                            if (shareBtn) {
                                shareBtn.disabled = false;
                                shareBtn.innerHTML = originalText;
                            }
                        });
                    } else {
                        // Fallback: download PDF
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);
                        if (shareBtn) {
                            shareBtn.disabled = false;
                            shareBtn.innerHTML = originalText;
                        }
                    }
                }).catch(err => {
                    // Remove temporary style sheet
                    const tempStyle = document.getElementById("pdf-export-temp-styles");
                    if (tempStyle) tempStyle.remove();

                    console.error("PDF generation failed:", err);
                    alert("Lỗi tạo file PDF: " + err.message);
                    if (shareBtn) {
                        shareBtn.disabled = false;
                        shareBtn.innerHTML = originalText;
                    }
                });
            }, 300);
        });
    } catch (err) {
        console.error(err);
        alert("Lỗi thực hiện: " + err.message);
    }
};

function loadHtml2Pdf(callback) {
    if (window.html2pdf) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = callback;
    script.onerror = () => {
        alert("Không thể tải thư viện html2pdf. Vui lòng kiểm tra kết nối mạng.");
    };
    document.head.appendChild(script);
}

function loadHtml2Canvas(callback) {
    if (window.html2canvas) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = callback;
    script.onerror = () => {
        alert("Không thể tải thư viện xuất hình ảnh. Vui lòng kiểm tra kết nối mạng.");
    };
    document.head.appendChild(script);
}

/* ==========================================================================
   CUSTOM BRAND NOTIFICATION MODAL SYSTEM (Logo Green Theme)
   ========================================================================== */
let currentBrandAlertResolve = null;

window.showBrandAlert = function(message, title = "THÔNG BÁO", icon = "bell") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("brandAlertOverlay");
        const titleEl = document.getElementById("brandAlertTitle");
        const msgEl = document.getElementById("brandAlertMessage");
        const cancelBtn = document.getElementById("brandAlertCancelBtn");
        const okBtn = document.getElementById("brandAlertOkBtn");
        const iconContainer = document.getElementById("brandAlertIcon");

        if (!overlay || !msgEl) {
            console.log(`[ALERT]: ${message}`);
            resolve(true);
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message || "";
        cancelBtn.style.display = "none";
        okBtn.textContent = "Đồng ý";

        if (iconContainer && window.lucide) {
            iconContainer.innerHTML = `<i data-lucide="${icon}" style="width:26px; height:26px; color:#ffffff;"></i>`;
            window.lucide.createIcons();
        }

        currentBrandAlertResolve = resolve;

        overlay.style.display = "flex";
        requestAnimationFrame(() => {
            overlay.classList.add("active");
        });

        setTimeout(() => okBtn.focus(), 60);
    });
};

window.showBrandConfirm = function(message, title = "XÁC NHẬN HÀNH ĐỘNG", icon = "help-circle") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("brandAlertOverlay");
        const titleEl = document.getElementById("brandAlertTitle");
        const msgEl = document.getElementById("brandAlertMessage");
        const cancelBtn = document.getElementById("brandAlertCancelBtn");
        const okBtn = document.getElementById("brandAlertOkBtn");
        const iconContainer = document.getElementById("brandAlertIcon");

        if (!overlay || !msgEl) {
            resolve(window.nativeConfirm ? window.nativeConfirm(message) : true);
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message || "";
        cancelBtn.style.display = "inline-block";
        cancelBtn.textContent = "Hủy bỏ";
        okBtn.textContent = "Đồng ý";

        if (iconContainer && window.lucide) {
            iconContainer.innerHTML = `<i data-lucide="${icon}" style="width:26px; height:26px; color:#ffffff;"></i>`;
            window.lucide.createIcons();
        }

        currentBrandAlertResolve = resolve;

        overlay.style.display = "flex";
        requestAnimationFrame(() => {
            overlay.classList.add("active");
        });

        setTimeout(() => okBtn.focus(), 60);
    });
};

window.closeBrandAlert = function(result) {
    const overlay = document.getElementById("brandAlertOverlay");
    if (!overlay) return;

    overlay.classList.remove("active");
    setTimeout(() => {
        overlay.style.display = "none";
        if (currentBrandAlertResolve) {
            const res = currentBrandAlertResolve;
            currentBrandAlertResolve = null;
            res(result);
        }
    }, 220);
};

// Global Keyboard listener for Enter & Escape on Brand Alert Modal
document.addEventListener("keydown", function(e) {
    const overlay = document.getElementById("brandAlertOverlay");
    if (overlay && overlay.classList.contains("active")) {
        if (e.key === "Enter") {
            e.preventDefault();
            window.closeBrandAlert(true);
        } else if (e.key === "Escape") {
            e.preventDefault();
            window.closeBrandAlert(false);
        }
    }
});

// Override window.alert globally to use the Custom Brand Modal
if (!window.nativeAlert) {
    window.nativeAlert = window.alert;
    window.alert = function(message) {
        window.showBrandAlert(message);
    };
}



