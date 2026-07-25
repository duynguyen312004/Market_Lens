# MarketLens E2 — Customer and Product Intelligence

> Contract: capability bắt buộc của analysis contract V2 sau clean cut
> Trạng thái: phương pháp triển khai chính thức
> Dữ liệu sử dụng: chỉ các dòng `order_status = completed`

## 1. Mục tiêu

E2 bổ sung feature engineering và phân tích giải thích được mà không lưu raw
order, không huấn luyện model và không gửi customer identity cho AI:

- RFM customer intelligence.
- ABC/Pareto product classification.
- Product pairs theo transaction basket.
- Discount analysis theo product và category.

## 2. RFM

### Features

Mỗi khách hàng được tính:

- `recency_days`: số ngày từ lần mua gần nhất đến ngày snapshot.
- `frequency`: số `order_id` distinct.
- `monetary`: tổng `line_revenue`.

Ngày snapshot bằng `max(order_date) + 1 ngày`, vì dataset upload không có
khái niệm ngày chạy thực tế ổn định.

### Scoring

- Thang điểm 1-5.
- Dùng empirical percentile rank với `method = average`.
- Giá trị bằng nhau nhận cùng điểm.
- Recency đảo chiều: số ngày thấp hơn nhận điểm cao hơn.
- Frequency và monetary: giá trị cao hơn nhận điểm cao hơn.
- Danh sách kết quả cùng điểm được sắp bằng `customer_id` để tái lập.

RFM chỉ được coi là đủ điều kiện khi có ít nhất 5 khách hàng. Dataset nhỏ hơn
trả `available = false`; hệ thống không gán nhãn thiếu cơ sở.

### Segments

Thứ tự rule:

1. `new`: frequency bằng 1 và recency score từ 4.
2. `champion`: R, F, M đều từ 4.
3. `at_risk`: R không quá 2 và F hoặc M từ 3.
4. `loyal`: R và F đều từ 3.
5. `regular`: các trường hợp còn lại.

Các nhóm loại trừ nhau và bao phủ toàn bộ khách hàng khi RFM available.

## 3. ABC/Pareto

Sản phẩm được sắp theo:

1. Revenue giảm dần.
2. `product_id` tăng dần khi revenue bằng nhau.

Class của một sản phẩm được xác định bằng tỷ trọng tích lũy trước khi thêm sản
phẩm đó:

- A: cumulative trước sản phẩm `< 80%`.
- B: cumulative trước sản phẩm `< 95%`.
- C: phần còn lại.

Cách này đảm bảo sản phẩm đầu tiên luôn thuộc A ngay cả khi riêng sản phẩm đó
đã vượt 80% doanh thu. Response lưu thống kê đầy đủ theo class và tối đa 5 sản
phẩm đại diện mỗi class.

## 4. Product pairs

- Basket là tập `product_id` distinct trong một completed order.
- Một cặp chỉ được tính một lần trong mỗi order.
- Thứ tự cặp canonical theo `product_id`.
- `pair_order_count`: số order chứa cả hai sản phẩm.
- `support_percent = pair_order_count / total_completed_orders × 100`.
- Sắp theo count giảm dần, support giảm dần, rồi product IDs tăng dần.
- Chỉ trả top 10 pairs.

Để tránh tổ hợp bùng nổ, order có hơn 50 sản phẩm distinct không được đưa vào
pair counting và được báo trong `skipped_oversized_order_count`.

## 5. Discount analysis

Trên completed rows:

- `gross_revenue = Σ(quantity × unit_price)`.
- `discount_amount = Σ(discount)`.
- `net_revenue = Σ(line_revenue)`.
- `discount_rate_percent = discount_amount / gross_revenue × 100`.
- Discounted order là order có tổng discount lớn hơn 0.

Product/category breakdown dùng cùng công thức và sắp theo discount amount
giảm dần, sau đó theo ID/tên tăng dần. Nếu không có discount, capability vẫn
trả kết quả hợp lệ với `available = false` và reason rõ ràng.

## 6. Privacy và persistence

- Chỉ lưu kết quả E2 bên trong `analyses.result_json`.
- Không thêm bảng order/customer/product.
- UI có thể hiển thị tối đa 10 customer records cho chính chủ dữ liệu.
- AI Report không nhận `top_customers`, `at_risk_customers`, customer ID hoặc
  customer name.
- Analysis E1 được reset trong môi trường dev; backend/frontend không giữ
  compatibility branch cho record thiếu E2.

## 7. Quality gates

- Test demo oracle.
- Test ties RFM và minimum sample.
- Test ABC boundary/tie-break.
- Test product pair dedup trong cùng order và oversized basket.
- Test no-discount.
- Backend API schema, frontend test/lint/build và secret scan đều pass.
