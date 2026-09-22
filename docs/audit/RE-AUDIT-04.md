# RE-AUDIT #04 — sau đợt remediation thứ ba

**Ngày:** 2026-09-22
**Chuỗi:** audit #01 ([CODE-REVIEW.md](./CODE-REVIEW.md), 63 finding) → [#02](./RE-AUDIT-02.md) (+18 NF) → [#03](./RE-AUDIT-03.md) (+17 NG) → tài liệu này (+7 NH)
**Đối tượng:** HEAD `215873e` **+ 78 mục working tree chưa commit**
**Tính chất:** read-only. Không file nào trong repository bị sửa.

---

## 1. Gate tự động

| | #02 | #03 | **#04** |
|---|---|---|---|
| `tsc --noEmit` | 0 lỗi | 0 lỗi | **0 lỗi** ✅ |
| Unit test | 245/1 fail | 249/0 | **250 pass / 0 fail** (54 file) ✅ |
| `eslint .` | 0 error / 5 warn | **1 error** / 5 warn | **0 error / 6 warn** ✅ |
| `assert-skia` / `assert-privacy-manifest` | PASS | PASS | **PASS** (2 WARN prebuild drift) |

Warning mới: `tests/physics.paddle.test.ts:9` import `MIN_HORIZONTAL_RATIO` nhưng không dùng.

---

## 2. Đây là đợt remediation tốt nhất trong ba đợt

**NG-1 — soft-lock θ=8° — ĐÃ ĐÓNG.** Tôi xác minh ba cách độc lập:

*Cơ chế 1 — map paddle nay đơn điệu*, đúng công thức đã đề xuất (`resolve.ts:208`: `angle = sign·(8° + |t|·54°)`). Dải chết 9,2px đã biến mất:
```
offset=0     → 8,0000°        offset=1    →  9,5000°
offset=0.01  → 8,0150°        offset=4    → 14,0000°
offset=0.5   → 8,7500°        offset=36   → 62,0000°
```
*Cơ chế 2 — tier-3 nay thật sự đổi heading*: `8° → 16° → 14° → 16° → 14°` (vòng #03: chỉ đảo dấu, độ lớn là điểm bất động).

*Đo end-to-end, metric không phụ thuộc giá trị sàn* (tôi cố ý đổi metric để không bị lừa lần nữa — đo độ tập trung heading + thời gian đóng băng điểm, thay vì một góc cụ thể):

| Kịch bản | Vòng #03 | **Vòng #04** |
|---|---|---|
| level-03 off=0, seed 1 | TIMEOUT, 85,5% ở 1 góc, freeze 162s | **WON**, left=0, 47 bin góc, freeze 37s, tier 0 |
| level-03 off=0, seed 0xace | TIMEOUT, 90,4%, freeze 183s | **WON**, left=0, 39 bin, freeze 30s, tier 0 |
| level-03 off=0, seed 99 | TIMEOUT, 80,3%, freeze 100s | **WON**, left=0, 45 bin, freeze 22s, tier 0 |
| level-01 off=0 | TIMEOUT, 95,2%, freeze 356s | **WON**, tier 0 |

**Đã sửa đúng trong đợt này (6/17 NG + 2 mục cũ):**

| ID | Bằng chứng |
|---|---|
| **NG-1** | `src/core/physics/resolve.ts:208`; `src/core/rules/stall.ts:96-101` (nudge tăng dần, cap 30°) |
| **NF-9** (mở từ vòng #02) | `src/core/step.ts:738-752` nay dùng `reflectVelocityInto` + cả hai sàn — **phản xạ thật**, không còn axis-only flip. `sweep.ts:236-240` bảo đảm `v·n < 0` ở mọi contact được báo, nên nhánh `approach < 0` luôn đúng |
| **NG-5** | `resolve.ts:190-214` — xóa cả ba khối chết (re-clamp, flip `ovy>0`, lời gọi no-op) |
| **NG-10** | lint về 0 error |
| **NG-12** | `resolveQualityTier.ts:22` `low.glowScale` về **0** → tier low từ 443 về **340 draw op** (−23,2%) |
| **NG-13** | `PlayingHost.tsx:94-96` `useFont(…SpaceMono…, 11)` → `:245`; **và** phí percentile được gate ở `useGameLoop.ts:417` (`overlayEnabled && hudFontSv.value != null`). **Cả hai nửa.** Overlay nay vẽ được → điều kiện tiên quyết của đợt đo hardware đã đóng |
| **NG-14** | `PlayingHost.tsx:73-77` quay lại `useKeepAwake('NeonBrickPlaying')` với tag riêng theo component — đúng đáp án, không phải workaround |
| **F-36** | `useGameLoop.ts:45` import `clampFrameDt`/`resetAccumulator` từ `freeze.ts`; bản trùng lặp local đã xóa |

Hai sàn góc, kiểm chứng lại trên map mới: quét **1.600.008 mẫu** (8 tốc độ × 200.001 giá trị `t`) — `|angle| ∈ [8°, 62°]` đúng theo cấu trúc, 0 NaN/Inf, sai số `|v|` tệ nhất **3,16e-16**, 62° đạt đúng tại `|t| = 1`. Phép hợp thành (vertical → horizontal) trên **720.000 mẫu**: 0 vi phạm sàn, idempotent, bit-identical khi lặp. **Chứng minh đứng vững.**

---

## 3. Verdict 17 finding NG của vòng #03

| Verdict | Số | ID |
|---|---|---|
| **FIXED** | **6** | NG-1, NG-5, NG-10, NG-12, NG-13, NG-14 |
| **PARTIALLY FIXED** | **1** | NG-11 |
| **NOT FIXED** | **10** | NG-2, NG-3, NG-4, NG-15, NG-16, NG-17, NG-18, NG-19, NG-20, NG-21 |

Bốn mục còn mở qua cả bốn vòng, xếp theo mức độ đáng lo:

1. **NG-16** — `tests/runtime.chrome-reaction.test.ts:19` vẫn assert `expect(src).toContain('chromeOut.value = {')`. **Sửa NG-15/NF-8 vẫn sẽ làm CI đỏ.** Đây là ưu tiên #6 của vòng #03 và là vấn đề cấu trúc tệ nhất còn lại của suite: một test bảo vệ một lỗi.
2. **NG-15 / NF-8** — chrome pack vẫn cấp object mới mỗi frame (`useGameLoop.ts:436-442`) + tuple mới mỗi frame (`PlayingHost.tsx:408-411`) → `valueSetter.ts:73` không short-circuit được cho cả input SV lẫn `previous` nội bộ của reaction. 2 allocation UI-runtime/frame, không đổi qua ba vòng.
3. **NG-19** — `07-UI-SPEC.md:205` và `07-VERIFICATION.md:28` vẫn ghi "rapid hits **overlapping**" ✓ VERIFIED, trong khi `expoAudioService.ts:151-161` phát **một** voice mỗi sfx mỗi batch. Test được viết lại theo code; spec thì không.
4. **NG-17, NG-18, NG-20, NG-21, NF-11, NF-15, NF-16, NF-17, NF-18** — byte-identical. `NF-18` cả sáu mục con.

---

## 4. Finding mới — 7 mục (NH-1 … NH-7)

### NH-1 — **HIGH** — "Nuclear unstick" đảo ngược những phản xạ **đúng**; đây là thứ giữ NG-2 sống
**File:** `src/core/step.ts:846-876` (điều kiện `:852`, đảo velocity `:854-855`), tương tác với `:801` `remaining = 0; break;`

NF-9 đã sửa đúng: brick resolve nay là phản xạ thật. Nhưng nhánh brick **kết thúc CCD và bỏ phần thời gian còn lại**. Khi TOI gần 0, tổng dịch chuyển của step gần 0 — và `if (spd > 1 && disp < 0.01)` ở `:852` đọc đó là "bị pin" rồi **đảo ngược velocity**, hướng bóng trở lại vào đúng viên brick nó vừa bật ra hợp lệ.

**Tôi tự tái hiện** (một brick x150-190 y200-216, bóng từ (137,35; 160) với v = (100; 407,92), paddle đưa ra ngoài field):
```
hp ban đầu= 1 → BRICK_HIT=0  BRICK_BREAK=1  hp còn=0
hp ban đầu= 2 → BRICK_HIT=1  BRICK_BREAK=1  hp còn=0   ← brick hp=2 CHẾT vì MỘT cú chạm
hp ban đầu= 3 → BRICK_HIT=2  BRICK_BREAK=0  hp còn=1
hp ban đầu= 9 → BRICK_HIT=2  BRICK_BREAK=0  hp còn=7
```
**Một cú chạm góc vật lý = 2 damage.** Nguyên nhân được chứng minh bằng ablation (quét 5.300 quỹ đạo góc lên brick hp=9): unstick **BẬT** → 85/2140 quỹ đạo multi-damage (4,0%); unstick **TẮT** → 1/2140 (0,05%). Và trên 275.005 lời gọi `stepWorld` của bot chơi thật: unstick bắn **22 lần**, **22/22 đều là step vừa resolve một brick contact** — chưa một lần nào bắn vào một pin thật. Tức **1,3% mọi cú chạm brick bị đảo ngược phản xạ**.

**Impact:** brick hp≥2 bị hạ giá trị khi bị cạ góc, không tái lập được từ góc nhìn người chơi, và là nguồn tản mát của thời gian clear. Lưu ý: ablation cũng cho thấy **không thể xóa thẳng** khối này — với unstick tắt, trường hợp glue còn lại cho tới 9 damage.
**Fix:** đừng **đảo** velocity. Hoặc skip unstick ở bất kỳ step nào vừa resolve brick contact với `v·n > 0` sau resolve, hoặc đi 3px theo heading **sau-resolve** thay vì `−v`.

### NH-2 — **HIGH** — `level-02` **chứng minh được là không thể thắng**, và run không có trạng thái kết thúc
**File:** `assets/levels/level-02.json`; `src/core/rules/win.ts`; `src/core/levels/validate.ts` (không có kiểm tra reachability); `src/runtime/loadLevel.ts:23`

Hình học đã compile — hàng `y = 100` là **7 brick UNBREAKABLE** liền nhau:
```
14-58  62-106  110-154  158-202  206-250  254-298  302-346
```
Kênh mép còn lại là `[0,14]` và `[346,360]` = 14px; bóng r=6 nên tâm phải nằm trong cửa sổ **2,000px** suốt 30px đường đi dọc cần để vượt hàng. **Sàn ngang 8° buộc bóng trôi ngang ít nhất `30·tan8° = 4,216px`** trên đoạn đó. Vượt hàng là **bất khả thi về toán học**.

Tôi đo 400s bot chơi: **`minBallY = 122,59`**, **0 step** có `ballY < 100`, **8 breakable** không bao giờ tới được, phase vẫn PLAYING.

Vòng #03 quy timeout của level-02 cho NG-1. **Chẩn đoán đó sai** — heading nay trải trên 42 bin khác nhau (topBinPct 20,8%), attractor đã hết; timeout là **thuần hình học** và nó sống nguyên qua fix NG-1.

**Giảm nhẹ:** level-02 chỉ tới được qua dev switch (`PlayingHost.tsx:493-498`) và đã được đổi tên thành `"compile/regression fixture — steel gate; not showpiece"` — tức là một quyết định đã ghi nhận (F-02). **Không giảm nhẹ:** nó vẫn được bundle vào release qua `require` module-scope (`loadLevel.ts:23`), vẫn nằm trong union `LevelId` (`:14`), `validateLevel` không có kiểm tra winnability, và PHYS-07 "escalation" không có đường thoát cho một board không thể thắng — anti-stall chạy tier 3 suốt **397s** mà không giúp được gì, vì không góc nào giúp được.
**Fix:** hoặc bỏ `level-02` khỏi `LEVEL_MODULES`/`LevelId` và giữ nó thuần làm compile fixture, hoặc thêm assertion reachability vào level validation cộng một điều kiện kết thúc cho board không còn brick nào tới được.

### NH-3 — **MEDIUM** — Gate của NG-3 **di chuyển** scan O(brickCount) chứ không loại bỏ
**File:** `src/core/step.ts:813` (gate, đúng) và `:815-842` (nhánh `else` tái lập scan)

`escapeOverlappingBricks` nay được gate đúng theo `brickTouchedThisStep` (**1.662 lời gọi**, đúng một lần mỗi brick contact). Nhưng nhánh `else` chạy một vòng quét toàn-brick-sống tương đương về chức năng: **287.033 lần thực thi, 12.451.832 phép test `circleOverlapsAabb`, 0 hit** trên 275.005 step. Chi phí worst-case mỗi frame (5 × 8 × 103 = **4.120**) **giống hệt** vòng #03.
**Fix:** xóa `:815-842`. Trong 275.005 step chơi thật nó chưa một lần tìm ra embed mà đường đã-gate chưa xử lý.

### NH-4 — **LOW-MEDIUM** — Fix NG-11 tạo ra một đường rò rỉ atlas **chắc chắn xảy ra** khi đổi level rồi teardown
**File:** `app/_components/PlayingHost.tsx:286-288` (hẹn `disposeGlowAtlas(prev)` sau **32ms**) vs `:307-309` (`clearTimeout(disposeTimer)`)

Cửa sổ use-after-free được đóng bằng cách null SV trước rồi **hoãn** dispose 32ms — một guard theo thời gian, không phải một bảo đảm về thứ tự. Tệ hơn: cleanup **hủy** lệnh dispose đang chờ của atlas level trước. Nếu effect bị teardown (Menu, unmount, đổi level lần nữa) trong vòng 32ms sau khi bake xong, `prev` — 4 `SkImage` — **không bao giờ được dispose** và không còn biến nào trỏ tới. `prev` khác null ở **mọi** lần chạy lại sau lần đầu, tức mọi lần đổi level.
**Fix:** ở cleanup hãy **flush** thay vì hủy (`clearTimeout` rồi `disposeGlowAtlas(prev)` ngay). Tốt hơn: hoist atlas thành singleton module-level key theo `brickW×brickH` — đúng điều NG-11 đã khuyến nghị.

### NH-5 — **LOW** — Fix NG-10 mở một cửa sổ macrotask cho level mới chạy với fx đã bị teardown
**File:** `app/_components/PlayingHost.tsx:255-261` (`setFxReady(false)` + `setActive(false)` bị đẩy vào `setTimeout(…, 0)`) vs `:324-341` (gate effect)

React chạy cleanup rồi setup theo thứ tự khai báo: cleanup của bake-effect (null `glowAtlasSv` `:313`, `playBatchRef = null` `:311`, `audio.release()` `:318`) → setup của bake-effect (chỉ *hẹn* `armTimer`) → setup của gate-effect `:333-340`, nơi `fxReady` vẫn `true` nên chạy `compiledSv.value = …; retry(); setActive(true)`. Loop do đó mô phỏng level mới trong một macrotask **không có glow atlas và audio đã released**, trước khi `armTimer` kịp pause lại. DEV-only và thoáng qua, nhưng đúng cùng lớp lỗi mà `setFxReady(false)` được thêm để sửa — nay mở lại vì hoãn nó.
**Fix:** dẫn xuất `fxReady` từ identity của `loadResult` (ref giữ level id mà fx đã bake cho) để nó đúng tại thời điểm render, thay vì reset state từ timer.

### NH-6 — **LOW** — Docstring paddle vẫn ghi công thức mà code không còn dùng; và invariant mới không có property test
`src/core/physics/resolve.ts:159` — JSDoc vẫn ghi `angleFromUp = t * PADDLE_ANGLE_CLAMP_RAD` trong khi thân hàm `:208` tính `sign(t)·(8° + |t|·54°)`. Cùng công thức cũ ở `02-03-PLAN.md:72` và `02-RESEARCH.md:252`. Quan trọng hơn: `tests/physics.tunneling.prop.test.ts:355-387` (PROP-CLAMP) chỉ assert **biên trên** `|angle| ≤ 62°` và tỉ lệ dọc — **không có biên dưới**, nên chính invariant mà toàn bộ fix NG-1/NF-2 dựa lên **không có property coverage**; và `tests/physics.paddle.test.ts:9` import `MIN_HORIZONTAL_RATIO` rồi không dùng.
**Fix:** cập nhật docstring; thêm `expect(|angle|).toBeGreaterThanOrEqual(MIN_HORIZ_RAD − eps)` vào PROP-CLAMP; dùng hằng đã import.

### NH-7 — **LOW** — Một hợp đồng F-23 bị xóa cùng test của nó, không được ghi nhận là đã thay thế
`tests/rules.stall.test.ts` — diff so với `215873e` xóa case `'tier 3 prefers steeper rotation even when parity sign would flatten (F-23)'` và assertion `expect(ratioAfter).toBeGreaterThanOrEqual(ratioBefore − 1e-6)`. Tier-3 mới (`stall.ts:119-153`) **cố ý** xoay theo hướng parity và có thể làm nông hơn. Đó là thay đổi hành vi **đúng** cho NG-1 — nhưng F-23 nay là một sự đảo chiều không được ghi nhận, cùng khuôn mẫu với NG-19.
**Fix:** ghi nhận F-23 → NG-1 supersession trong `REMEDIATION-PLAN.md` / ghi chú PHYS-07.

---

## 5. Hai điều không đổi qua bốn vòng

### 5.1 Chưa commit gì — vòng thứ tư bị nêu

`git log -1` vẫn `215873e`. **78 mục uncommitted.** `git ls-files --error-unmatch app.config.js` vẫn fail.

**Mọi fix được xác minh trong bốn báo cáo này** — map paddle đơn điệu, tier-3 escalate, `'worklet'` của substepCap, `MIN_HORIZONTAL_RATIO`, `glowScale: 0`, wiring `hudFont`, `useKeepAwake` — **tồn tại trong đúng một working tree**. Một checkout sạch của `main` vẫn không build được (không có `app.config.js`, `app.json` đã bị xóa khỏi working tree). Và bản privacy policy live vẫn là bản cũ, thiếu kênh liên hệ (F-55).

Đây là việc rẻ nhất và có đòn bẩy lớn nhất trong toàn bộ danh sách.

### 5.2 Hai kiểm soát cơ học vẫn chưa tồn tại

- **F-43** — `package.json:33-45` vẫn không có `@testing-library/*`, `react-test-renderer`, `jest-expo`. **Không test nào mount component, render hook, hay băng qua biên JS↔UI.** Trong 7 finding mới của vòng này, **NH-4 và NH-5 sống đúng trên biên đó** và không test nào trong repo chạm tới được.
- **Guard worklet-closure** — `ls scripts/` vẫn 2 file; grep `__workletHash|closure` trong `tests/`, `scripts/`, `eslint.config.js` → **zero**. Trong khi đó `eslint.config.js:119-125` vẫn tắt cả rule `no-restricted-syntax` cho `PlayingHost.tsx` — đúng file duy nhất dùng `runOnJS` — ngay sau khi `app/**` được thêm vào scope của rule đó ở `:84`. Enforcement thực tế: **không**.

---

## 6. Khuôn mẫu cần đảo chiều

Bốn vòng cho thấy một quy luật rõ ràng: **mọi fix cần *xóa* một cơ chế bù đều được triển khai thành *thêm một gate phía trước* nó.**

| Finding | Fix đúng | Fix đã làm | Kết quả |
|---|---|---|---|
| NG-3 | xóa scan | gate scan, thêm scan tương đương vào nhánh `else` | **NH-3** — chi phí y nguyên |
| NG-2 | resolve thành phản xạ **rồi xóa** unstick | resolve đã sửa đúng, unstick **giữ lại** | **NH-1** — unstick nay đảo ngược chính những phản xạ đúng |
| NG-11 | bảo đảm thứ tự dispose | `setTimeout` 32ms + cleanup hủy dispose | **NH-4** — rò rỉ chắc chắn khi đổi level |
| NG-10 | đưa setState ra khỏi effect | hoãn setState vào `setTimeout(0)` | **NH-5** — một macrotask chạy với fx đã teardown |

Ba trong bảy finding mới là **lỗi trong chính các fix của đợt này**. Đó cùng hình dạng với NF-6 → NG-11 mà vòng #03 đã nêu.

Về chất lượng test, đợt này có **hai bổ sung thật sự tốt** — `rules.stall.test.ts` ("hai can thiệp tier-3 liên tiếp phải đổi heading > 1e-6") và `physics.near-vertical.test.ts` ("map paddle đơn điệu ngặt"); cả hai đều là test hành vi và cả hai đều **sẽ bắt được NG-1**. Đó chính là loại test vòng #03 đã đòi. Nhưng: `runtime.chrome-reaction.test.ts:19` vẫn ghim NF-8; `render.path-contracts.test.ts:28` vẫn `expect(src).toMatch(/F-14/)`; `constants.parity.test.ts` vẫn ≥5 tautology và vẫn không cover hai hằng mà chính đợt remediation này tạo ra (`MIN_HORIZONTAL_RATIO`, `STALL_TIER3_REPEAT_TICKS`); và `runtime.reset-request.test.ts:34-36` thêm một tautology mới (`const firstRef = world; … expect(world).toBe(firstRef)`). Thứ **sẽ bắt được NH-1 và NH-2** — một harness "thời gian clear / trạng thái kết thúc, theo level, theo seed" — vẫn không tồn tại; tôi phải tự dựng nó để tìm ra NH-2.

---

## 7. LVL-04

Bot hoàn hảo, cùng seed, qua bốn vòng:

| Kịch bản | #01 | #02 | #03 | **#04** |
|---|---|---|---|---|
| level-03 off=18 p37 | 497s | 321s | 310s | **370s** |
| level-03 off=18 p53 | 309s | 381s | 461s | **358s** |
| level-03 off=26 | 309s | 289s | 336s | **316s** |
| level-03 off=10 | 288s | 316s | 460s | **408s** |
| **trung bình** | 351s | 327s | 392s | **353s** |
| level-03 off=0 | TIMEOUT | TIMEOUT | TIMEOUT | **WON 315s** ✅ |
| level-01 off=0 | TIMEOUT | TIMEOUT | WON 119s | **WON 238s** ✅ |

**Mọi kịch bản nay đều hoàn thành** — đó là tiến bộ thật và là hệ quả trực tiếp của fix NG-1. Nhưng mục tiêu "~2–3 phút" của LVL-04 vẫn ứng với **≈5,9 phút cho một bot siêu phàm**. Quyết định "nới mục tiêu" vẫn chỉ nằm trong `REMEDIATION-PLAN.md` và `DEFERRED-ITEMS.md`, chưa lan sang `REQUIREMENTS.md:25` (vẫn "~2–3 minute", vẫn `[x]`), `ROADMAP.md` SC-1, `08-VERIFICATION.md:37`, `PROJECT.md:32`.

---

## 8. Hiệu năng

| Tier | #03 | **#04** | Δ |
|---|---|---|---|
| `high` 192/5/1.0 | 611 draw op | **611** | 0 (diff `recordSprites.ts` là một dòng comment) |
| `mid` 128/4/1.0 — **đích certification** | 539 | **539** | 0 |
| `low` 48/2/**0** | 443 | **340** | **−103 (−23,2%)** ✅ NG-12 |

Allocation UI-runtime ổn định: **2/frame**, không đổi (NG-15 chưa sửa). Physics mỗi frame worst case: **20.600** `sweepCircleAabbInto` (NF-10 — broadphase vẫn không được dùng) + **4.120** `circleOverlapsAabb` (nay từ `step.ts:820-838`, NH-3) + một scan 256 entry `cellToBrick` mỗi `BRICK_BREAK` cho một lattice không ai đọc.

**Certification vẫn UNPROVEN** — mọi ô `phase8-certification.md:103-106` và `:151-152` là `PENDING_DEVICE`. Nhưng **điều kiện tiên quyết cuối cùng đã đóng**: NG-13 xong nên overlay vẽ được và phí percentile được gate. Hai thứ nên sửa trước khi mang máy đi đo: **NH-4** (đường soak là worst case cho rò rỉ atlas) và **NH-1** (làm tản mát thời gian clear).

---

## 9. Sáu việc ưu tiên

1. **NF-3 — commit + push.** Vòng thứ tư. Mọi fix của cả ba đợt remediation đang nằm ngoài git; checkout sạch không build. Rẻ nhất, đòn bẩy lớn nhất.
2. **NH-1** — đừng đảo velocity trong unstick; skip nó khi step vừa resolve brick contact với `v·n > 0`. Một cú chạm góc đang gây 2 damage.
3. **NG-16** — xóa `tests/runtime.chrome-reaction.test.ts` và thay bằng test hành vi. Hiện tại sửa NG-15 sẽ làm CI đỏ; phải đảo chiều việc này trước khi sửa NG-15.
4. **NH-2** — bỏ `level-02` khỏi `LEVEL_MODULES`/`LevelId`, hoặc thêm kiểm tra reachability vào `validateLevel`. Một level không thể thắng đang được bundle vào release.
5. **NH-4 + NH-3** — flush lệnh dispose đang chờ thay vì hủy; xóa `step.ts:815-842` (0 hit trên 12,45 triệu phép test).
6. **F-43 + guard worklet-closure** — hai kiểm soát cơ học. Sau bốn vòng vẫn chưa tồn tại, và 2/7 finding mới của vòng này sống đúng trên biên mà chúng sẽ che.

---

## 10. Nhận định

Đây là đợt remediation **được thực hiện tốt nhất** trong ba đợt. NG-1 — lỗi nặng nhất của vòng #03 — được sửa đúng bằng chính công thức đã đề xuất, và tôi xác minh được bằng ba con đường độc lập. NF-9 (axis-only flip, mở từ vòng #02) đóng hẳn: brick resolve nay là phản xạ thật. NG-13 làm **cả hai nửa** của fix. NG-14 quay về đúng API thay vì dựng workaround. NG-5 xóa 18 dòng lưới-an-toàn-giả. Chứng minh về hai sàn góc đứng vững trên 2,3 triệu mẫu. Và qua bốn vòng, **không một số liệu nào bị bịa ra**.

Điều cần đảo chiều không phải kỹ năng mà là một tập quán: **khi báo cáo nói "xóa cơ chế bù X", thêm một gate trước X không đóng được finding** — nó chỉ chuyển nguyên nhân sang chỗ khác, và ba trong bảy finding mới của vòng này là bằng chứng. Cùng với đó, hai kiểm soát cơ học (test băng qua biên runtime, guard worklet-closure) là thứ duy nhất sẽ chặn lớp lỗi đang lặp lại; sau bốn vòng chúng vẫn chưa được dựng, trong khi một test vẫn đang **bảo vệ** một lỗi hiệu năng đã biết.
