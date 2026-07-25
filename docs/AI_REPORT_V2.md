# MarketLens AI Report V2

> Trạng thái: `LOCKED`. Contract, provider adapter, UI, Gemini thật và
> protected persistence smoke đều đã đạt gate.

## 1. Mục tiêu

Report V2 biến báo cáo từ một đoạn tóm tắt chung thành tài liệu ra quyết định
có thể kiểm chứng:

- executive summary;
- KPI snapshot do backend quyết định;
- data-quality note;
- bốn section cố định: revenue, products, customers, forecast;
- risk signals;
- tối đa năm recommendation có priority, evidence, action và success metric;
- metadata source/language/generated time/provider/model;
- disclaimer thống nhất cho cả AI và rule-based fallback.

`report_version` là `2.0`. Report AI và fallback dùng cùng một response schema
và cùng một frontend renderer.

## 2. Evidence contract

Backend tạo evidence catalog từ analysis contract V3. Mỗi evidence gồm:

```json
{
  "metric_key": "forecast.evaluation.mae",
  "label": "MAE backtest",
  "value": 856855.5,
  "unit": "vnd",
  "context": null
}
```

AI provider chỉ nhận catalog aggregate và chỉ được trả `evidence_keys`.
Backend thực hiện ba bước trước khi chấp nhận:

1. Validate JSON bằng strict draft schema.
2. Xác nhận từng key tồn tại và evidence trong section đúng domain.
3. Hydrate label/value/unit/context từ catalog của backend rồi validate lại
   toàn bộ final `ReportContent`.

Vì vậy AI không được tự đưa một con số KPI vào cấu trúc report cuối. Key không
tồn tại, key dùng sai section, field thừa hoặc thiếu đều trả
`AI_INVALID_RESPONSE` và persist rule-based fallback.

## 3. Privacy boundary

Payload provider không có:

- raw rows;
- file name hoặc file content;
- order ID;
- customer ID/name;
- email hoặc user UUID.

Product name được phép vì là aggregate business context, không phải PII.
Gemini không nhận identifier người dùng. OpenAI chỉ nhận
`safety_identifier` hash một chiều theo contract provider.

## 4. Final report contract

- `report_version`: luôn `2.0`.
- `source`: `rule_based` hoặc `ai`.
- `language`: `en` hoặc `vi`.
- `generated_at`: UTC timestamp.
- `generator`: provider và model không nhạy cảm.
- `kpi_snapshot`: 4–6 evidence backend.
- `data_quality`: status, summary, signal và warning codes.
- `sections`: đúng thứ tự revenue → products → customers → forecast.
- `risk_signals`: tối đa 5, mỗi signal có 1–3 evidence.
- `recommendations`: 1–5, mỗi recommendation có 1–3 evidence, priority,
  action và success metric.

Không duy trì field V1 `summary`, `highlights`, `trend_analysis` hoặc
recommendation `description`. Development analyses đã được reset trước
clean-cut nên không có compatibility renderer.

## 5. Rule-based fallback

Fallback được tạo deterministic từ cùng evidence catalog. Các ngưỡng risk
hiện hành:

- revenue 7 ngày giảm trên 5%;
- top product chiếm ít nhất 40% revenue;
- repeat-customer rate dưới 25%;
- forecast evaluation có reliability `low`.

Association recommendation chỉ xuất hiện khi rule đã đạt support threshold.
Nội dung nói rõ lift không phải quan hệ nhân quả và forecast không phải cam
kết.

## 6. Definition of Done

- Pydantic và TypeScript require Report V2.
- Fallback en/vi cùng schema và không bịa field.
- Provider draft schema strict.
- Unknown/unrelated evidence reference bắt buộc fallback.
- Privacy tests quét key và customer identities.
- UI render KPI, quality, sections, risks, recommendations và evidence.
- AI/fallback persistence theo ngôn ngữ hoạt động sau refresh.
- Provider thật và protected Supabase API smoke đạt.
- Backend/frontend tests, lint, build, compile, dependency, secret và diff
  checks pass.

## 7. Bằng chứng khóa phase

- Gemini thật trả `source = "ai"`, `report_version = "2.0"` và toàn bộ
  recommendation có evidence/action/success metric sau hydration.
- Protected Supabase smoke đạt:
  upload → fallback V2 → generate AI tiếng Việt → persist → reload → delete.
- User/analysis tạm đã cleanup; `public.analyses` cuối cùng có `0` record.
- Gate local: `147` backend tests và `58` frontend tests pass; frontend lint,
  production build, `pip check`, compile, secret scan, dataset check và diff
  check đều pass.
