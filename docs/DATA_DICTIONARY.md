# MarketLens Data Dictionary

> Contract đầu vào: fixed template V1
> Contract kết quả: analysis `3.0`
> Đơn vị quan sát đầu vào: một dòng sản phẩm trong một đơn hàng.

## 1. File đầu vào

CSV phải dùng UTF-8/UTF-8-SIG, dấu phẩy và một dòng header. XLSX chỉ đọc sheet
đầu tiên, không hỗ trợ merged cells. Tên cột không phân biệt hoa thường và
khoảng trắng ngoài cùng, nhưng tập cột sau phải đúng tuyệt đối: không thiếu,
không thừa, không trùng.

| Cột | Kiểu sau validation | Bắt buộc | Ý nghĩa và rule |
|---|---|---:|---|
| `order_id` | string | Có | Mã đơn. Nhiều dòng có thể cùng mã nếu một đơn có nhiều sản phẩm. |
| `order_date` | date | Có | Ngày đơn theo đúng `YYYY-MM-DD`; không chứa giờ. |
| `customer_id` | string | Có | Mã khách hàng ổn định trong phạm vi các file được phân tích. |
| `customer_name` | string | Có | Tên hiển thị; một `customer_id` chỉ được ánh xạ tới một tên. |
| `product_id` | string | Có | Mã sản phẩm ổn định. |
| `product_name` | string | Có | Tên sản phẩm; một `product_id` chỉ được ánh xạ tới một tên. |
| `category` | string | Có | Danh mục; một `product_id` chỉ thuộc một category trong analysis. |
| `quantity` | integer | Có | Số lượng trên dòng, phải lớn hơn 0. |
| `unit_price` | number | Có | Đơn giá trước giảm giá, không âm, đơn vị VND. |
| `discount` | number | Có | Số tiền giảm trực tiếp của dòng, không âm, đơn vị VND. |
| `order_status` | enum | Có | Chỉ nhận `completed`, `cancelled`, `returned`; backend chuẩn hóa chữ thường. |

Các trường string không được rỗng. Giá trị số phải hữu hạn. Doanh thu ròng
của dòng không được âm.

```text
line_revenue = quantity × unit_price - discount
```

## 2. Khóa và tính nhất quán

- Cùng `order_id` phải có cùng `order_date`, `customer_id` và `order_status`.
- Cùng `product_id` phải có cùng `product_name` và `category`.
- Cùng `customer_id` phải có cùng `customer_name`.
- Một basket là tập `product_id` distinct của một `order_id`.
- Số order luôn là `nunique(order_id)`, không phải số dòng.

Với upload gộp, các rule trên áp dụng cho toàn bộ tập file. Một order xuất hiện
ở nhiều file và giống hoàn toàn sẽ chỉ giữ bản ở file đầu tiên. Nếu cùng mã
nhưng nội dung khác, request bị từ chối atomically bằng
`CONFLICTING_DATA_ACROSS_FILES`; hệ thống không tự đoán bản đúng.

## 3. Phạm vi và giới hạn

| Giới hạn mặc định | Giá trị |
|---|---:|
| Định dạng | `.csv`, `.xlsx` |
| Tổng dung lượng/request | 10 MB |
| Tổng dòng/request | 50.000 |
| Số file trong combined mode | 2–10 |
| Khoảng ngày inclusive | 1.826 ngày |
| Số lỗi row trả về tối đa | 20 |
| Unique products tối đa cho basket association | 50 |

File phải có ít nhất một đơn `completed`. Khoảng ngày được kiểm tra trước khi
tạo chuỗi ngày đầy đủ để tránh input nhỏ nhưng làm nở dữ liệu bất thường.

## 4. Quy tắc sử dụng order status

| Nhóm kết quả | `completed` | `cancelled` | `returned` |
|---|---:|---:|---:|
| Revenue/KPI/sản phẩm/khách hàng | Có | Không | Không |
| Forecast | Có | Không | Không |
| RFM/ABC/association/cohort | Có | Không | Không |
| Order health và status rate | Có | Có | Có |

Vì vậy “total orders” trên Dashboard là completed orders, còn
`orders.total_orders_all_statuses` dùng cả ba trạng thái. Hai số trả lời hai
câu hỏi khác nhau và không được cộng lẫn.

## 5. Trường dẫn xuất quan trọng

Các trường sau chỉ tồn tại trong pipeline tính toán, không phải cột người dùng
phải cung cấp:

| Trường | Công thức/nguồn | Mục đích |
|---|---|---|
| `line_revenue` | `quantity × unit_price - discount` | Net revenue theo dòng. |
| daily revenue | Tổng `line_revenue` completed theo ngày; ngày trống điền 0 | Growth và forecast. |
| gross revenue | Tổng `quantity × unit_price` completed | Đo discount. |
| customer recency | `snapshot_date - last_order_date` | RFM; snapshot là max date + 1 ngày. |
| customer frequency | Distinct completed `order_id` | RFM/repeat behavior. |
| customer monetary | Tổng completed `line_revenue` | RFM/value. |
| acquisition month | Tháng completed order đầu tiên | Cohort retention. |

## 6. Nhóm output contract 3.0

| JSON path | Nội dung |
|---|---|
| `period`, `summary`, `orders` | Kỳ phân tích, KPI và sức khỏe đơn hàng. |
| `revenue_by_date`, `sales` | Time series, category/product/weekday, concentration và discount. |
| `sales.product_intelligence.abc` | Phân lớp sản phẩm A/B/C theo doanh thu tích lũy. |
| `sales.product_intelligence.associations` | Support, confidence, lift và mẫu số liên quan. |
| `customers` | Segment cơ bản, repeat/potential/top customers. |
| `customers.rfm` | R/F/M features, score và segment giải thích được. |
| `customers.cohort_analysis` | Acquisition cohort, retention, revenue và order count. |
| `forecast` | Candidate leaderboard, backtest, forecast 7 ngày và uncertainty. |
| `report`, `reports` | Report 2.0 fallback/current và hai bản ngôn ngữ. |
| `upload`, `warnings` | Lineage file, số dòng hiệu lực, dedup và cảnh báo. |

Pydantic và TypeScript đều coi contract là strict. Record cũ thiếu field V3
không được vá bằng mock/optional branch; development data phải re-upload.

## 7. Vì sao database chỉ có một bảng nghiệp vụ

MVP cố ý không lưu raw rows, orders, customers hoặc products. Supabase Auth
quản lý tài khoản trong schema `auth`; schema `public` chỉ có
`public.analyses`. Mỗi record lưu:

- ownership (`user_id`);
- metadata file/kỳ/status;
- aggregate contract V3 trong `result_json`;
- timestamps và lỗi xử lý nếu có.

Thiết kế một bảng không có nghĩa hệ thống chỉ có một loại dữ liệu. Nó là
“analysis snapshot store”: toàn bộ domain result đã được tổ chức thành các
nhánh JSON strict. Cách này giảm lưu PII, không biến MarketLens thành data
warehouse ngoài scope và phù hợp yêu cầu xóa analysis theo người dùng. Đổi lại,
MVP không thể tính lại tùy ý theo date filter nếu không upload lại raw data.

RLS bảo vệ direct access; backend dùng secret key vẫn bắt buộc filter theo
`user_id` lấy từ access token đã verify.

## 8. Privacy boundary

- Raw file/DataFrame chỉ tồn tại trong request memory và không được log.
- Không lưu access token, secret hoặc raw order.
- Customer ID/name chỉ xuất hiện trong aggregate cần cho UI của chính chủ.
- AI Report không nhận filename, email, order/customer identity hoặc raw row.
- AI chỉ nhận evidence catalog tổng hợp; KPI và forecast không do LLM tính.
