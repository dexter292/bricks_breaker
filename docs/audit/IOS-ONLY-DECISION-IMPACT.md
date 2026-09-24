# TÁC ĐỘNG CỦA QUYẾT ĐỊNH iOS-ONLY

**Ngày:** 2026-09-24
**Quyết định owner:** **D2 = B** — *iOS-first; Android hoãn, không bỏ vĩnh viễn*
**Code baseline:** HEAD **`f445e0c`**, working tree clean
**Tính chất:** phân tích tác động + danh sách thay đổi — **tôi không sửa file nào ngoài `docs/audit/`** (theo phân quyền owner 2026-09-24)
**Tiếp nối finding:** `R-09`…`R-11` (nối tiếp `R-01`…`R-08` trong [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md))

---

## 0. Kết luận

> Quyết định **hợp lệ và đã được chuẩn bị sẵn đường** — `PRODUCT-DIRECTION.md:104-109` đã liệt D2=B là lựa chọn được lường trước, `RELEASE-GATES.md:68` G2.2 đã có đường thoát iOS-only. Đây **không** phải hạ scope để lách gate.
>
> Nhưng nó **mở khóa ít hơn cảm giác**: chỉ 3 hạng mục đóng lại, **12 hạng mục còn nguyên**.
>
> Và nó tạo ra **ba rủi ro mới** (`R-09`…`R-11`), trong đó `R-09` nghiêm trọng: **bỏ Android là bỏ mất cổng hiệu năng định lượng duy nhất của cả dự án.**

---

## 1. Quyết định này đóng được gì

| Hạng mục | Trước | Sau D2=B |
|---|---|---|
| **PLT-03** Android mid-range gfxinfo | `WAIVED` — nợ chặn claim hiệu năng | **Hoãn** (out-of-scope cho bản phát hành iOS; **vẫn không được tick Complete**) |
| **Android install smoke** (`N-PLT-01`) | `Never run` — chặn G1 Play track | **Hoãn** — không còn Play track |
| **Mua Pixel 6a** | Khuyến nghị đòn bẩy cao nhất | **Không cần nữa** |
| **`R-01`** mâu thuẫn feature-freeze §6 | Vòng lặp chết | **Tan — với điều kiện** định nghĩa pass-lock iOS (xem `R-09`) |

Milestone A từ "hardware-bound, không có cận trên" trở thành **có thể hoàn thành** bằng thiết bị đang có. Đây là lợi ích thật và không nhỏ.

---

## 2. Quyết định này **không** đóng được gì

Đây là phần dài hơn. 12 hạng mục dưới đây **không liên quan gì tới Android** và vẫn nguyên trạng:

| # | Hạng mục | Nguồn | Chặn |
|---|---|---|---|
| 1 | **Physical iOS soak** (100 cycle + 15 min + mem/frame) | `phase8-certification.md:162` — mới chỉ chạy trên **Simulator** | G2.3 |
| 2 | **D4 profiling IPA** | `phase8-certification.md:120` — PASS trên **development** build | Nợ kỹ thuật |
| 3 | **LVL-04 playtest cohort ≥5** | `DEFERRED-ITEMS.md`, `N-QA-02` | G2.11 |
| 4 | **Tên / trademark ASC** | `name-clearance.md` — trùng chính xác với Gosiha | **G3, và có thể cả G2** — xem `R-11` |
| 5 | **Console entry ASC** | `CONSOLE-ENTRY.md:3` — *"Console fields not yet submitted"* | G2.4 |
| 6 | **Crash reporting** (`R-02`) | `package.json` — không có SDK nào | G1.6 / G2.8 |
| 7 | **Đường hotfix OTA** (`R-02`) | không `expo-updates`; `eas.json` không có block `submit` | Vận hành sau launch |
| 8 | **Nhịp nâng SDK** (`R-02`) | Expo `~57.0.24` · RN `0.86.3` | Bảo trì |
| 9 | **F-43** PlayingHost/GameScreen tests (`R-03`) | `CURRENT-STATE.md:117` — vẫn mồ côi | Nợ chất lượng |
| 10 | **Số level D4** (`R-04`) | mâu thuẫn 4 cách | Lock roadmap |
| 11 | **`R-05`…`R-08`** | POST-MVP-ROADMAP-REVIEW | Biên tập |
| 12 | **FX-02 ngân sách VFX** | `MVP-CLOSE-REPORT.md:48` — *"Android frame-budget gate WAIVED"* | Trở thành **chưa được chứng minh trên bất kỳ tier nào** — xem `R-09` |

**Nói thẳng:** trong 15 hạng mục nợ, iOS-only đóng 3. Đây không phải con đường tắt ra cổng G2.

---

## 3. Ba rủi ro mới

### `R-09` — Bỏ Android là bỏ mất **cổng hiệu năng định lượng duy nhất** · **Cao**

**Bằng chứng:**

`docs/measurement-methodology.md:41-43` — bảng Devices:

| Role | Device | Notes |
|---|---|---|
| **Android FPS gate (D-01)** | Pixel 6a | *"Hard 60 FPS reference for Phase 1 / MVP"* |
| **iOS install/feel (D-02)** | Recent physical iPhone | *"Install, render, touch, stability — **not a hard FPS gate**"* |

Tài liệu đo lường của chính dự án nói rõ: **iOS chưa bao giờ là cổng FPS**. Pass-lock định lượng `p50 ≤ 16.7ms và (p95 ≤ 20ms hoặc jank ≤ 5%)` được định nghĩa quanh `adb dumpsys gfxinfo framestats` (`:22`) — một công cụ **chỉ có trên Android**.

Bỏ Android ⇒ **không còn tiêu chí số nào để trượt.** Bằng chứng iOS hiện có là `phase8-certification.md:105`: *"Display surface duration 8.33 ms (120 Hz), Hangs 0"* — tốt, nhưng đó là **quan sát Instruments**, không phải một lock có ngưỡng pass/fail đã định nghĩa trước, không có ≥2 run lấy run tệ hơn, không có percentile.

Hệ quả trực tiếp: **FX-02** (ngân sách VFX) từ *"Android gate waived"* trở thành *"không có gate nào"*. Ngân sách particle mid/high trong code chưa từng được kiểm chứng bằng số trên **bất kỳ** nền tảng nào.

**Phải làm trước khi lock:** định nghĩa **iOS pass-lock** trong `measurement-methodology.md` — tối thiểu:
- Công cụ: Instruments *Game Performance* / *Core Animation*, build `profiling`
- Chỉ số: frame duration p50 / p95 (không chỉ "Display ~x ms"), Hangs count
- Ngưỡng: khóa theo **refresh rate thiết bị** (60 Hz ⇒ p50 ≤ 16.7 ms; 120 Hz ProMotion ⇒ nêu rõ đang khóa ở 60 hay 120)
- Giữ nguyên luật: ≥2 run × ≥30 s, lấy run tệ hơn, simulator không tính (`:45`)

Không có bước này, `R-01` **không** tan — nó chỉ đổi từ "gate không thỏa được" thành "không còn gate".

---

### `R-10` — Bài toán "máy tầm trung" **không biến mất, nó chuyển chỗ** · **Cao**

Bỏ Android để tránh vấn đề mid-range, nhưng iOS cũng có mid-range.

**Bằng chứng:**

- Toàn bộ chứng cứ iOS đến từ **một** thiết bị: iPhone 16 Pro — **A18 Pro, 120 Hz ProMotion** (`phase8-certification.md:105`). Đây là phần cứng **mạnh nhất** trong dải.
- `app.config.js` **không khai báo** `deploymentTarget`, **không khai báo** `supportsTablet` — nghĩa là chưa có tier thiết bị iOS tối thiểu nào được chốt ở đâu.

Con số `8.33 ms` nghĩa là máy đang chạy **120 fps**. Nó nói rất ít về iPhone SE 3 (A15, 60 Hz), iPhone 11 (A13, 60 Hz), hay iPad ở chế độ tương thích. Requirement gốc PLT-03 nói *"named **mid-range** real device"* — tinh thần đó vẫn đúng sau khi đổi nền tảng.

**Đề xuất:** `N-PLT-02` viết lại thành **"named mid-tier iOS device"**, chốt một thiết bị cụ thể (đề xuất **iPhone SE 3** hoặc **iPhone 11** — 60 Hz, A13–A15, đại diện đáy dải còn được hỗ trợ), và khai báo `deploymentTarget` trong `app.config.js` để "iOS-only" có nghĩa xác định.

Nếu không, "iOS-only" trên thực tế nghĩa là **"iPhone Pro đời mới-only"** — và không ai viết điều đó ra.

---

### `R-11` — Va chạm tên ASC **leo lên đường găng**, mất đường lui · **Trung bình**

**Bằng chứng:** `docs/store/name-clearance.md` — trùng **chính xác** tiêu đề với [Neon brick breaker](https://apps.apple.com/us/app/neon-brick-breaker/id1477991378) của **Gosiha Pte. Ltd.** trên App Store. Trên Google Play chỉ là *"descriptive genre crowding, not exclusive marks"*.

Trước D2=B: nếu ASC từ chối tiêu đề, còn Play để ship trước rồi xử lý sau.
Sau D2=B: **ASC là cửa duy nhất.** Một lần từ chối vì tên = chặn toàn bộ phát hành, không có đường vòng.

Quyết định iOS-only làm rủi ro tên **nghiêm trọng hơn**, đúng nền tảng có va chạm nặng nhất.

**Đề xuất:** nâng **D1** (tên hiển thị) từ khuyến nghị *"C — soft-launch rồi đổi nếu bị từ chối"* lên **"B — đổi tên trước khi tạo listing"**. `RELEASE-GATES.md:33` hiện xếp tên ở G3 (paid UA) với ghi chú *"may also block G2"*; dưới iOS-only nên chuyển hẳn thành điều kiện **G2**.

---

## 4. Danh sách thay đổi — file + line

Tôi **không** thực hiện các sửa đổi này. Dưới đây là vị trí chính xác để owner/dev thực hiện.

### 4.1 Ledger requirement

| File:line | Hiện tại | Đổi thành |
|---|---|---|
| `.planning/REQUIREMENTS.md:50` | `- [ ] **PLT-03**: Stable 60 FPS … mid-range real device` | Giữ `[ ]`. Thêm hậu tố: *"— **deferred: iOS-first release (D2=B, 2026-09-24)**; Android gate ngoài phạm vi bản phát hành này"* |
| `.planning/REQUIREMENTS.md:125` | `**WAIVED (temporary MVP)** — no Pixel 6a; iOS D-16 companion only` | `**DEFERRED (iOS-first, D2=B 2026-09-24)** — Android ngoài phạm vi; thay bằng iOS mid-tier lock (N-PLT-02). Do not claim Complete` |
| `.planning/REQUIREMENTS.md:49` | `PLT-02 … safe-area handling on **iOS and Android**` | **Cần chú ý:** đang `[x]` Complete nhưng nửa Android chưa từng được kiểm chứng trên máy thật. Thêm ghi chú *"Android half unverified — no device"*, **không** bỏ chữ Android (D2=B giữ đường quay lại) |

### 4.2 Tài liệu đo lường — **bắt buộc, xem `R-09`**

| File | Việc |
|---|---|
| `docs/measurement-methodology.md:39-45` | Thêm hàng **"iOS FPS gate"** với thiết bị mid-tier được nêu tên; đổi ghi chú D-02 *"not a hard FPS gate"* → là gate, kèm công cụ + ngưỡng |
| `docs/measurement-methodology.md:22-23` | Bổ sung protocol Instruments tương đương `gfxinfo framestats` (p50/p95/Hangs), giữ luật ≥2 run / lấy run tệ hơn / simulator không tính |

### 4.3 Post-MVP

| File:line | Việc |
|---|---|
| `PRODUCT-DIRECTION.md:104-109` | Ghi **D2 = B (owner, 2026-09-24)** vào §6; cập nhật khuyến nghị đã chốt |
| `PRODUCT-DIRECTION.md:98-102` | **D1 → B** (đổi tên trước listing) theo `R-11` |
| `RELEASE-GATES.md:68` G2.2 | Nhánh *"public release is iOS-only with documented Android posture"* trở thành **nhánh đang dùng** — viết posture ra thành văn |
| `RELEASE-GATES.md:33` | Chuyển hàng trademark từ G3 → **điều kiện G2** |
| `RELEASE-GATES.md:113-117` §6 | Viết lại theo nền tảng phát hành (`R-01`) + trỏ tới iOS pass-lock mới |
| `RELEASE-GATES.md:45` G1.3 | *"If Android testers: Android smoke PASS"* — giữ nguyên, tự động vô hiệu khi không có tester Android |
| `ROADMAP-NEXT.md:53-67` A1 | Đổi thành **A1 — iOS Mid-Tier Certification**: chốt thiết bị, chạy protocol mới. Escape bằng tài liệu ở `:62` **bỏ đi** — giờ đã có phần cứng, không còn lý do (`R-07`) |
| `ROADMAP-NEXT.md:37` | Milestone A không còn *"hardware-bound"* — ước lượng 1–3 tuần giờ **có cơ sở** |
| `ROADMAP-NEXT.md:27` | Bỏ *"Must before public dual-store"* → *"Must before public iOS release"* |
| `REQUIREMENTS-NEXT.md:38-39` | `N-PLT-01` (Android smoke) → **Deferred**; `N-PLT-02` viết lại thành iOS mid-tier theo `R-10` |
| `REQUIREMENTS-NEXT.md:24` | Hàng PLT-03 ở §0: `Inherited open (waived)` → `Deferred (iOS-first)`; cột Gate `Public dual-store` → `Android release (tương lai)` |

### 4.4 Chứng nhận & store

| File:line | Việc |
|---|---|
| `docs/phase8-certification.md:103-106` | Các hàng Pixel: `WAIVED` → **`OUT OF SCOPE (iOS-first D2=B)`** — phân biệt "không có máy" với "không thuộc phạm vi" |
| `docs/phase8-certification.md:118` | D2 Android: cùng cách ghi |
| `docs/phase8-certification.md:120` | D4 verdict `PASS` → `PASS (dev-build; profiling IPA debt)` — **`R-08`, vẫn chưa sửa** |
| `docs/phase8-certification.md:162` | Soak `PASS (harness)` → `HARNESS-ONLY (sim; no mem/frame data)` — **`R-08`, vẫn chưa sửa** |
| `docs/phase8-certification.md` bảng Results | Thêm legend **`WAIVED ≠ PASS ≠ OUT OF SCOPE`** |
| `docs/store/play-data-safety.md` | **Giữ nguyên** (D2=B — Android hoãn, không bỏ). Thêm header *"Chuẩn bị sẵn; không dùng cho bản phát hành iOS-first"* |
| `docs/store/CONSOLE-ENTRY.md:3` | Tách checklist: phần ASC là **đang dùng**, phần Play là **hoãn** |
| `docs/audit/MVP-CLOSE-REPORT.md:15,18,21` | Cập nhật ship posture theo D2=B; sửa luôn `HEAD: 2aaa9cf` → `f445e0c` (`R-08`) |

### 4.5 Code — **không đổi**

D2=B giữ đường quay lại Android. **Không** gỡ:

- `app.config.js:53-61` khối `android` (package, adaptiveIcon, predictiveBackGestureEnabled)
- `app/_components/PlayingHost.tsx:2,502` `BackHandler` — no-op vô hại trên iOS, cần lại nếu quay về Android
- `assets/images/android-icon-*.png`
- `eas.json` `profiling.android.buildType` — không gây hại khi không dùng

Việc duy nhất **nên** thêm vào code: khai báo `deploymentTarget` (và cân nhắc `supportsTablet`) trong `app.config.js` để "iOS-only" có nghĩa xác định — xem `R-10`.

---

## 5. Điều **không** được phép đổi theo quyết định này

| Không được | Vì sao |
|---|---|
| Tick **PLT-03 = Complete** | iOS-only là **thay đổi phạm vi**, không phải bằng chứng. Requirement chưa từng được đo |
| Ghi Android là **WAIVED** ở tài liệu mới | Đúng trạng thái là **OUT OF SCOPE / DEFERRED**. "Waived" hàm ý đã cân nhắc và bỏ qua một gate đang áp dụng |
| Claim *"60 FPS trên máy tầm trung"* | Chưa đo trên bất kỳ máy tầm trung nào, Android **hay** iOS (`R-10`) |
| Xóa hàng PLT-03 khỏi ledger | D2=B là hoãn. Xóa sẽ làm mất dấu vết khi quay lại Android |
| Coi `R-02`…`R-08` đã đóng | Không hạng mục nào trong đó liên quan tới Android |

---

## 6. Việc cần làm — thứ tự

1. **`R-09`** — định nghĩa iOS pass-lock trong `measurement-methodology.md`. **Chặn mọi thứ khác**: không có nó thì A1 không có tiêu chí để đạt.
2. **`R-10`** — chốt thiết bị iOS mid-tier được nêu tên + `deploymentTarget`.
3. **`R-11`** — nâng D1 lên "đổi tên trước listing"; chuyển trademark thành điều kiện G2.
4. §4.1–4.4 — cập nhật ledger/gate/roadmap theo bảng trên.
5. **`R-02`, `R-03`, `R-04`** — vẫn là điều kiện lock roadmap (POST-MVP-ROADMAP-REVIEW §8).

---

## 7. Ràng buộc đã giữ

- Không sửa production code.
- Không sửa file nào ngoài `docs/audit/` (theo phân quyền owner).
- Mọi finding có file path + line number, kiểm tại `f445e0c`.
- Không tự hạ scope: quyết định D2=B là **của owner**; báo cáo này ghi nhận và nêu hệ quả, không hợp thức hóa bất kỳ requirement nào thành PASS.

---

## 8. Liên quan

- [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md) — `R-01`…`R-08`
- [TEST-RUN-VERIFICATION-2026-09-24.md](./TEST-RUN-VERIFICATION-2026-09-24.md)
- [MVP-CLOSE-REPORT.md](./MVP-CLOSE-REPORT.md) · [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md)
- `docs/measurement-methodology.md` · `docs/phase8-certification.md` · `docs/store/name-clearance.md`
