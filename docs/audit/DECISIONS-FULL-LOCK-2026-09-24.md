# BẢN GHI QUYẾT ĐỊNH — VÒNG 2 (FULL LOCK)

**Owner:** Dexter · **Ngày:** 2026-09-24
**Code baseline:** HEAD **`f445e0c`** (9 file docs modified + `.planning/post-mvp/` untracked — **chưa commit**)
**Tính chất:** ghi nhận D3/D5/D6/D7 + đặc tả để dev áp dụng — **tôi không sửa file ngoài `docs/audit/`**
**Tiếp nối:** [DECISIONS-2026-09-24.md](./DECISIONS-2026-09-24.md) (D1/D2/D4, R-02, R-10)

---

## 0. Bốn quyết định cuối

| # | Quyết định | Lựa chọn | Hệ quả chính |
|---|---|---|---|
| **D3** | Aimed serve (PHYS-05) | **C — hoãn tới sau cohort A3** | B0 = **conditional**; phiếu playtest **phải** hỏi về cú phát bóng |
| **D5** | Monetization | **A — design-only, không SDK tới sau launch** | Privacy manifest rỗng được giữ nguyên qua lần submit đầu |
| **D6** | Level editor | **A — hoãn editor**, + solvability lint vào E1 | Editor ra Milestone G; lint thành `N-LVL-03` |
| **D7** | Thứ tự milestone | **Giữ A→G**, + tách **E1a/E1b** theo `R-13` | 3 level baseline gỡ khỏi cuối chuỗi |

**Sau vòng này: D1…D7 đều đã khóa.** Roadmap lock được, với hai mục vẫn mở có chủ rõ ràng (§5).

---

## 1. D3 = C — hoãn tới sau cohort A3

### Vì sao C, không phải A (khác khuyến nghị gốc của tài liệu)

`PRODUCT-DIRECTION.md:113` đề xuất **A**, viết trước khi thứ tự phase thay đổi. Nhưng sau khi áp DECISIONS vòng 1:

- **A3 — Playtest Cohort** (`ROADMAP-NEXT.md:79`) nằm trong **Milestone A**, có acceptance *"Cohort done"*
- **B0 — Aimed Serve** (`ROADMAP-NEXT.md:108`) nằm trong **Milestone B**, tức **sau** A3

Quyết D3 ngay bây giờ là **vứt đi bằng chứng miễn phí sẽ đến trước khi công việc bắt đầu**. Cohort ≥5 người chơi lần đầu sẽ cho biết người mới có nhận ra cú phát bóng là cố định hay không — thứ không ai trong đội đoán được, vì đội đã chơi hàng trăm lần.

### Điều kiện bắt buộc kèm theo

**C chỉ có giá trị nếu phiếu playtest thực sự hỏi.** Nếu không, C không phải "hoãn để lấy dữ liệu" mà chỉ là "hoãn".

`N-QA-02` (`REQUIREMENTS-NEXT.md`) hiện ghi phiếu gồm *"controls clarity, desire to replay, pain points"*. Phải thêm một mục cụ thể, không dẫn dắt:

> *"Khi bóng gắn vào paddle đầu mỗi lượt, bạn có muốn điều khiển hướng phóng không? (có / không / không để ý)"*

Mục **"không để ý"** là quan trọng nhất — nếu đa số chọn nó thì D3=B (Won't Do) là câu trả lời đúng, và đó là kết quả có bằng chứng chứ không phải cắt scope.

### Sửa

| File:line | Việc |
|---|---|
| `PRODUCT-DIRECTION.md:108-114` | `### D3 — Aimed launch — **OPEN**` → **`LOCKED = C (defer to post-A3 cohort)`**; ghi lý do sequencing |
| `REQUIREMENTS-NEXT.md:57` | `N-PHYS-01` Status `Proposed` → **`Deferred — pending A3 cohort (D3=C)`** |
| `ROADMAP-NEXT.md:108` | Tiêu đề `Phase B0 — Aimed Serve (only if D3=A)` → **`(conditional — gated on A3 cohort outcome, D3=C)`** |
| `ROADMAP-NEXT.md:118` | Hàng `If D3≠A` → **`Decision point after A3: implement (→ B0) / Won't-Do (→ close PHYS-05 debt) / defer to G`** |
| `REQUIREMENTS-NEXT.md` `N-QA-02` | Thêm câu hỏi serve-agency vào danh mục phiếu (nguyên văn ở trên) |
| `ROADMAP-NEXT.md:79-88` | A3 Deliverables += *"D3 recommendation from cohort data"*; Acceptance += *"serve-agency question answered by ≥5"* |
| `FEATURE-CANDIDATES.md:82` | `FC-F06` Suggested `B` → **`B0 conditional (D3=C)`** |
| `REQUIREMENTS-NEXT.md:136` | Traceability B: `N-PHYS-01 (if D3=A)` → `(if A3 cohort supports)` |

**Không được:** đánh `PHYS-05` là Complete hay Won't Do trước khi cohort chạy. Ledger hiện ghi *"tap-only; aimed deferred"* — giữ nguyên cho tới lúc đó.

---

## 2. D5 = A — design-only, không SDK

### Lý do cụ thể, ngoài "bảo vệ core loop"

`app.config.js:23-50` đang có cấu hình privacy **đơn giản nhất có thể**:

```
NSPrivacyTracking: false
NSPrivacyTrackingDomains: []
NSPrivacyCollectedDataTypes: []
```

Bốn `NSPrivacyAccessedAPITypes` còn lại đều là loại hạ tầng (UserDefaults, FileTimestamp, DiskSpace, SystemBootTime) — không có gì liên quan tới quảng cáo hay theo dõi. Đây là tư thế review **nhanh nhất, rủi ro từ chối thấp nhất** cho lần submit đầu tiên.

Một ads SDK sẽ phá vỡ đồng thời: privacy manifest, App Privacy nutrition label trên ASC, `docs/store/age-rating.md`, và `docs/store/play-data-safety.md` (đang PREPARED). Bốn tài liệu đã khóa, phải làm lại — đúng thời điểm mà một app mới, tên mới, chưa có review **không nên** thêm bất kỳ biến số review nào.

Seam đã sẵn: `ARCH-02` giữ ads/IAP/accounts là `onRunEnded` no-op. Khi cần thì bật, không cần tái kiến trúc.

### Sửa

| File:line | Việc |
|---|---|
| `PRODUCT-DIRECTION.md:118-119` | `### D5 — Monetization — **OPEN**` → **`LOCKED = A (design-only until post-launch)`** |
| `PRODUCT-DIRECTION.md:19-35` §2 | Thêm hàng Approved: *"No monetization SDK before first public approval (D5=A)"* |
| `REQUIREMENTS-NEXT.md:124` | `N-META-04` ghi rõ **`Deferred — design doc only; no SDK integration before first ASC approval (D5=A)`** |
| `FEATURE-CANDIDATES.md:128` | `FC-M01` Suggested → `G — design only; blocked pre-launch by D5=A` |
| `RELEASE-GATES.md` §3 | Thêm **G2.17**: *"Binary submit đầu tiên không chứa ads/IAP/analytics SDK; privacy manifest giữ `NSPrivacyCollectedDataTypes: []`"* |

---

## 3. D6 = A — hoãn editor, thêm solvability lint

### Phần editor: hoãn, không bàn thêm

Ngưỡng tài liệu tự đặt là *"defer until ≥15–20 hand levels prove format pain"* (`PRODUCT-DIRECTION.md:137` bản gốc). Ở **5** level thì chưa có pain nào. `FC-L09` giữ nguyên **Deferred G+**.

### Phần lint: đây mới là việc thật — `R-14`

**Bằng chứng:** `src/core/levels/validate.ts` là **thuần cấu trúc**. Grep `solvab|winnab|reachab` trên toàn `src/` + `tests/` → **rỗng**. Các check hiện có dừng ở: schemaVersion, id/name, grid bounds, brickTypes hp/unbreakable, cells độ dài hàng/cột.

Không có gì kiểm được **level có thắng được không**.

Đó chính xác là lý do `level-02.json` lọt qua toàn bộ pipeline và phải bị gỡ khỏi `LevelId` bằng tay — `src/runtime/loadLevel.ts:6` ghi: *"is NOT a playable LevelId — its steel gate is unwinnable with the 8° floor"*.

`ROADMAP-NEXT.md:194` đặt acceptance E1 là *"no unwinnable steel traps (level-02 lesson)"* — nhưng **không có công cụ nào kiểm được điều đó**. Hiện đang phụ thuộc hoàn toàn vào mắt người, trên đúng loại lỗi mà mắt người đã bỏ sót một lần.

**Đề xuất `N-LVL-03`:** một check tĩnh chạy trong `validate` hoặc như một assert script:

- Mọi brick **breakable** phải **tiếp cận được** — không bị bao kín bởi steel ở mọi hướng mà bóng có thể tới
- Cảnh báo (không chặn) khi tồn tại hành lang steel hẹp hơn `2 × (BALL_RADIUS + SEPARATION_EPS)`
- Chạy trên toàn bộ `assets/levels/*.json` trong CI, cạnh `assert-skia-version` / `assert-privacy-manifest`

`level-02.json` trở thành **fixture âm tính** — lint phải báo đỏ trên nó. Đó là self-check kiểu tôi đã yêu cầu cho worklet guard ở vòng audit #06: *exit 0 không phải bằng chứng; phải chứng minh công cụ có khả năng báo đỏ.*

### Sửa

| File:line | Việc |
|---|---|
| `PRODUCT-DIRECTION.md:120-121` | `### D6 — Level editor — **OPEN**` → **`LOCKED = A (defer editor; ship solvability lint)`** |
| `REQUIREMENTS-NEXT.md` §3 sau `:74` | Thêm **`N-LVL-03`** — solvability/reachability lint, Status **Approved**, ghi `level-02` là fixture âm tính |
| `REQUIREMENTS-NEXT.md:137` | Traceability C: `N-LVL-01…03` |
| `ROADMAP-NEXT.md:188-195` | E1 Scope += `N-LVL-03`; Acceptance đổi từ *"no unwinnable steel traps"* → **"lint xanh trên 5 level ship; đỏ trên `level-02`"** |
| `FEATURE-CANDIDATES.md:67` | `FC-L08` Suggested `B parallel` → **`E1 (D6=A) — lint only, không preview UI`** |
| `FEATURE-CANDIDATES.md:68` | `FC-L09` giữ **Deferred G+** |

---

## 4. D7 = giữ A→G + tách E1a/E1b (`R-13`)

### Xác nhận D7

Thứ tự **Hardening → Gameplay → Progression/Content → Polish → Store → Post-launch** giữ nguyên. Phần brand đã được tách đúng ở vòng 1: chọn **string** ở A3 (`ROADMAP-NEXT.md:85` — `N-BRAND-01`), **icon art** ở D2 Brand Surfaces, và A3 tự ghi *"unblocks D2 Brand Surfaces early"*. Không cần đổi gì thêm.

### `R-13` — 5 level đang nằm cuối chuỗi dài nhất

**Bằng chứng:** `ROADMAP-NEXT.md:193` — E1 Deps = *"B verbs for advanced boards; C unlock sequencing"*.

Nhưng `N-LVL-01` (5 level) là **G2.10 MUST** (`RELEASE-GATES.md:89`). Deliverable bắt buộc nhất cho G2 đang bị chặn sau **cả Milestone B lẫn C** — trong khi 3 level baseline **không cần gì từ B hay C**.

Verb đã ship đủ để author ngay: multi-HP 1–3, steel unbreakable, multi-ball, paddle expand, anti-stall tiers, damage cues. `level-03` đã chứng minh bố cục 3 hồi làm được hoàn toàn bằng những thứ đó.

### Đặc tả tách

| Phase | Nội dung | Deps | Chạy được từ |
|---|---|---|---|
| **E1a — Baseline Authorship** | 3 level mới **chỉ dùng verb đã ship**; `N-LVL-01` đạt 5; `N-LVL-03` lint xanh | **Không** (schema v1 đã đủ) | **Ngay — song song Milestone A** |
| **E1b — Verb Enrichment** | Sửa/bổ sung bố cục để dạy explosive brick + power-up mới | B1/B2 | Sau Milestone B |

Lợi ích: nếu B hoặc C trượt lịch, **G2.10 vẫn đạt** bằng E1a. Nội dung không còn là rủi ro lịch trình đơn điểm.

Rủi ro cần nêu: E1b có thể phải sửa lại level đã author ở E1a khi verb mới xuất hiện. Chấp nhận được — sửa bố cục JSON rẻ hơn nhiều so với để G2.10 treo ở cuối chuỗi.

### Sửa

| File:line | Việc |
|---|---|
| `PRODUCT-DIRECTION.md:122-123` | `### D7 — **OPEN**` → **`LOCKED = keep A→G (+ E1 split per R-13)`** |
| `ROADMAP-NEXT.md:188-195` | Tách E1 thành **E1a** / **E1b** theo bảng trên |
| `ROADMAP-NEXT.md:16` | Dòng posture += *"content baseline (E1a) chạy song song từ Milestone A"* |
| `ROADMAP-NEXT.md` §Parallelism | `Can parallel` += **`A1/A2/A3/A4 + E1a`** |
| `ROADMAP-NEXT.md:41` bảng Milestone | E ghi rõ: E1a song song với A; E1b sau B |
| `REQUIREMENTS-NEXT.md:73` | `N-LVL-01` Notes += *"3 level baseline khả thi bằng verb đã ship (E1a)"* |

---

## 5. Trạng thái sau full lock

### Finding

| ID | Trạng thái |
|---|---|
| `R-01`…`R-09`, `R-11` | **Đóng** — xác minh tại `f445e0c` |
| `R-04` | **Đóng** — 5 nhất quán ở cả 5 vị trí |
| `R-08` | **Đóng** — thêm: D-16 tự hạ xuống `OBSERVATION` (`phase8-certification.md:172`) |
| `R-10` | **MỞ** — không có máy mid-tier; floor `NOT RUN` |
| `R-12` | **MỞ** — `N-TIER-01` Proposed |
| `R-13` | **Đóng bởi D7** — tách E1a/E1b |
| `R-14` | **MỚI → đóng bởi D6** — `N-LVL-03` solvability lint |

### Còn mở sau full lock — có chủ rõ ràng

| Mục | Chủ | Chặn |
|---|---|---|
| **Tên hiển thị cụ thể** | Owner | `G2.15`; A3 deliverable |
| **`app.config.js:11` name + `ios.deploymentTarget`** | Dev | Chờ string; `deploymentTarget` làm cho "sàn" có định nghĩa |
| **`R-10` floor mid-tier** | Phần cứng | Claim hiệu năng mid-tier; `G2.13` chặn mọi phát biểu FPS tới lúc đó |
| **`R-12` / `N-TIER-01`** | Dev | Marketing trước G2; iPhone 4 GB vẫn nhận ngân sách Mid |
| **A1 ceiling re-run** | Dev | `G2.16`; bằng chứng D-16 cũ **không** tính |
| **D3 sau cohort** | A3 | `PHYS-05` giữ trạng thái deferred tới lúc đó |
| **Commit** | Dev | 9 file modified + `.planning/post-mvp/` untracked |

---

## 6. Điều không được đổi theo vòng này

| Không được | Vì sao |
|---|---|
| Đánh `PHYS-05` Complete **hoặc** Won't Do | D3=C nghĩa là **chờ dữ liệu**, không phải đã quyết |
| Bỏ câu hỏi serve-agency khỏi phiếu playtest | Không có nó thì D3=C mất toàn bộ lý do tồn tại |
| Coi `N-LVL-03` là "nice to have" | `level-02` là bằng chứng lỗi này đã xảy ra một lần và không công cụ nào bắt được |
| Author level E1a rồi bỏ qua lint | Lint phải báo **đỏ** trên `level-02` trước khi được tin — self-check, không phải exit 0 |
| Thêm bất kỳ SDK nào vào binary submit đầu | D5=A + đề xuất `G2.17` |

---

## 7. Ràng buộc đã giữ

- Không sửa production code; không sửa file ngoài `docs/audit/`.
- Mọi finding có file path + line number, kiểm tại `f445e0c`.
- Không tạo số liệu thiết bị; `R-10` và `R-12` giữ **mở**.
- D3/D5/D6/D7 là quyết định của owner; báo cáo ghi nhận, nêu hệ quả và điều kiện — không hợp thức hóa requirement nào thành PASS.

---

## 8. Applied by agent (2026-09-24)

Dev/agent đã áp đặc tả §1–§4 vào:

- `.planning/post-mvp/PRODUCT-DIRECTION.md` — D3=C, D5=A, D6=A, D7+E1 split; FULL LOCK
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-PHYS-01 Deferred; N-QA-02 serve Q; N-LVL-03 Approved; N-META-04 D5; gameplay Approved
- `.planning/post-mvp/ROADMAP-NEXT.md` — FULL LOCK; B0 conditional; E1a/E1b; A+E1a parallel
- `.planning/post-mvp/RELEASE-GATES.md` — G2.17 no ads SDK; PHYS-05 pending A3
- `.planning/post-mvp/FEATURE-CANDIDATES.md` — FC-F06/FC-L08/FC-M01
- `.planning/STATE.md` — full_lock_d1_through_d7

**Chưa làm:** chọn display name; code (`app.config.js`); chạy A1 ceiling; commit working tree; start GSD plans.
