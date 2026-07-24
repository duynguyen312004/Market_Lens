# MarketLens Plan Pack

> Project đã được bootstrap tại thư mục cha. Từ thời điểm này, `AGENTS.md`,
> `docs/`, `backend/`, `frontend/`, `sample_data/` và `supabase/` ở project root
> là bản dùng để phát triển. Thư mục này được giữ làm plan pack tham chiếu.

Copy these files into the root of your existing `Market_lens` project:

```text
AGENTS.md
README_FIRST.md
docs/MARKETLENS_MASTER_PLAN.md
supabase/schema.sql
sample_data/*
```

Rename/copy env templates:

```text
backend.env.example  -> backend/.env.example
frontend.env.example -> frontend/.env.example
```

Start by reading:

1. `AGENTS.md`
2. `docs/PLAN_REVIEW_AND_QUOTE.md`
3. `docs/MARKETLENS_MASTER_PLAN.md`
4. `sample_data/EXPECTED_DEMO_METRICS.md`
5. `supabase/schema.sql`

The master plan assumes `.venv` and `fastapi[standard]` already exist in the repository root.
