# `docs/audit/` — chỉ mục

**Cập nhật:** 2026-09-24

26 tài liệu ở đây được viết qua 9 vòng audit + chuỗi verify post-MVP. **Không phải cái nào cũng mô tả hiện tại.** Trang này nói cái nào đọc được, cái nào chỉ là bằng chứng lịch sử.

> **Trạng thái dự án tóm tắt ở [`/README.md`](../../README.md)** — đọc đó trước. Trang này là bản đồ 28 tài liệu kiểm định.
>
> **Luật một dòng:** muốn biết **chi tiết trạng thái kiểm định** → đọc nhóm A. Muốn biết **một ID nghĩa là gì** (`F-12`, `NG-1`, `WP-3`) → tra nhóm C. Đừng đọc nhóm D để lấy trạng thái.

---

## A. Trạng thái hiện tại — đọc nhóm này

| Tài liệu | Trả lời câu hỏi |
|---|---|
| [MVP-CLOSE-REPORT.md](./MVP-CLOSE-REPORT.md) | MVP đóng ở mức nào, được phép ship tới đâu |
| [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md) | **Sổ cái sống** — các món nợ `F-*` / `D-*` / `WP-*` còn mở, ai sở hữu |
| [FINDINGS-LEDGER.md](./FINDINGS-LEDGER.md) | **Sổ cái sống** — 29 finding `R-*` của giai đoạn post-MVP, trạng thái từng cái |
| [DECISIONS-2026-09-24.md](./DECISIONS-2026-09-24.md) | Quyết định owner **D1 / D2 / D4** + mức A4 Operational |
| [DECISIONS-FULL-LOCK-2026-09-24.md](./DECISIONS-FULL-LOCK-2026-09-24.md) | Quyết định owner **D3 / D5 / D6 / D7** — hoàn tất lock D1…D7 |
| [A1-CEILING-ANALYSIS.md](./A1-CEILING-ANALYSIS.md) | Vì sao ngưỡng iOS ceiling là 60 FPS chứ không phải 120 |

**Ngoài thư mục này, hai nguồn cũng là hiện tại:**
`.planning/post-mvp/` (roadmap + gate đã lock) · `docs/phase8-certification.md` (bằng chứng thiết bị)

---

## B. Xác minh gần đây — bằng chứng cho nhóm A

Vẫn đúng tại thời điểm viết; đọc khi cần biết *đã kiểm bằng cách nào*.

| Tài liệu | Ngày | Nội dung |
|---|---|---|
| [TEST-RUN-VERIFICATION-2026-09-24.md](./TEST-RUN-VERIFICATION-2026-09-24.md) | 09-24 | Xác minh độc lập `267/267`; giới hạn harness |
| [BUG-PLAY-BLANK-PLAYFIELD.md](./BUG-PLAY-BLANK-PLAYFIELD.md) | 09-24 | Chẩn đoán playfield trắng (`R-24`…`R-28`) — **đã FIXED** |
| [PHASE-VERIFY-A1-PREP.md](./PHASE-VERIFY-A1-PREP.md) | 09-24 | Cert arm / audio unblock / Sentry EAS (`R-20`, `R-21`) |
| [PHASE-VERIFY-A2-A4.md](./PHASE-VERIFY-A2-A4.md) | 09-24 | Soak vật lý, E1a, ops (`R-15`…`R-19`) |
| [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md) | 09-24 | Review roadmap post-MVP (`R-01`…`R-08`) |
| [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md) | 09-24 | Hệ quả quyết định iOS-first (`R-09`…`R-11`) |
| [FINAL-ACCEPTANCE-REPORT.md](./FINAL-ACCEPTANCE-REPORT.md) | 09-22 | Acceptance trước MVP close — **số test đã cũ**, xem §1 trong chính file |

---

## C. Từ điển ID — đừng xóa, còn được trích dẫn

Các tài liệu này **định nghĩa** những mã mà nhóm A vẫn dùng hằng ngày.

| Tài liệu | Định nghĩa | Ai còn trỏ tới |
|---|---|---|
| [CODE-REVIEW.md](./CODE-REVIEW.md) | **`F-01` … `F-63`** | 11 tài liệu |
| [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md) | **`WP-1` … `WP-8`**, task `T1.1`… | 11 tài liệu |
| [REQUIREMENTS-MATRIX.md](./REQUIREMENTS-MATRIX.md) | 27 requirement v1, từng cái một | 5 tài liệu |
| [RE-AUDIT-02.md](./RE-AUDIT-02.md) … [RE-AUDIT-08.md](./RE-AUDIT-08.md) | **`NF-*` `NG-*` `NH-*` `NJ-*` `NK-*` `NL-*`** | `DEFERRED-ITEMS`, `CURRENT-STATE` |

`DEFERRED-ITEMS.md` hiện vẫn nhắc `F-43`, `F-45`, `F-23`, `NF-18f`, `NJ-3` — xóa nhóm C là làm mất nghĩa của chính những dòng đang sống.

---

## D. Ảnh chụp lịch sử — **không đọc để lấy trạng thái**

Đúng tại ngày viết, **sai ở hiện tại**. Giữ lại vì là bằng chứng cho quá trình.

| Tài liệu | Ngày | Vì sao không còn đúng |
|---|---|---|
| [EXECUTIVE-SUMMARY.md](./EXECUTIVE-SUMMARY.md) | 09-21 | Ảnh chụp audit #01 — đã có banner sẵn trong file |
| [RELEASE-READINESS.md](./RELEASE-READINESS.md) | 09-21 | Liệt các Critical đã đóng; posture dual-store đã bị **D2=B** thay bằng iOS-first |
| [PHASE-REVIEW.md](./PHASE-REVIEW.md) | 09-21 | Review 8 phase v1; post-MVP dùng `.planning/post-mvp/ROADMAP-NEXT.md` |
| [PERFORMANCE-REVIEW.md](./PERFORMANCE-REVIEW.md) | 09-21 | Ngưỡng Android-centric; đã bị `docs/measurement-methodology.md` (iOS ceiling/floor) thay |
| RE-AUDIT-02 … 08 | 09-22 | Chuỗi remediation — xem nhóm C, dùng để **tra ID**, không để lấy trạng thái |

---

## E. Quy ước

- Finding `R-*` (post-MVP) → [FINDINGS-LEDGER.md](./FINDINGS-LEDGER.md)
- Finding `F-*` / `NF-*`…`NL-*` (v1) → [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md) cho món còn mở; nhóm C cho định nghĩa
- Quyết định owner `D1`…`D7` → hai file `DECISIONS-*`
- Gate `G0`…`G3`, `G1.x`, `G2.x` → `.planning/post-mvp/RELEASE-GATES.md`
- Requirement `N-*` (post-MVP) → `.planning/post-mvp/REQUIREMENTS-NEXT.md`
- Requirement v1 (`PHYS-*`, `PLT-*`…) → `.planning/REQUIREMENTS.md`

**Khi thêm tài liệu mới vào đây:** ghi nó vào nhóm A hoặc B ở trên, và nêu rõ nó thay thế cái nào (nếu có).
