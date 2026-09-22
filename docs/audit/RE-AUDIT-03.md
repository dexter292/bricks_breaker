# RE-AUDIT #03 — sau đợt remediation thứ hai

**Ngày:** 2026-09-22
**Lịch sử:** audit #01 ([CODE-REVIEW.md](./CODE-REVIEW.md), 63 finding) → remediation #1 → [RE-AUDIT-02.md](./RE-AUDIT-02.md) (33 fixed / 22 partial / 7 not fixed / 1 regression + **18 finding mới NF-1…NF-18**) → remediation #2 → tài liệu này.
**Đối tượng:** commit HEAD `215873e` **+ 77 mục working tree chưa commit**
**Tính chất:** read-only. Không file nào trong repository bị sửa.

---

## 0. Đính chính một verdict sai của chính tôi

**NF-2 (soft-lock near-vertical) mà tôi tuyên bố "FIXED" ở vòng #02 là SAI.** Lock không bị loại bỏ — nó **dịch từ θ = 0° sang θ = 8°** và rơi ra ngoài tầm của phép đo tôi dùng.

Metric tôi dùng vòng #02 là `|vx|/speed < 0.02`. Sàn ngang mới đặt tại `sin(8°) = 0.139173` — **gấp 7 lần ngưỡng đó**. Con số "100% → 0,9%" tôi báo là đúng *cho metric đó* và hoàn toàn vô nghĩa *cho câu hỏi thật*. Đo lại với metric đúng (`|vx|/speed == sin(8°)` chính xác):

```
level-03 seed=1     off=0  TIMEOUT  left=24  atFloor=85,5%  streak=202,4s  score đóng băng 162s  tier=3
level-03 seed=0xace off=0  TIMEOUT  left= 9  atFloor=90,4%  streak=260,4s  score đóng băng 183s  tier=3
level-03 seed=99    off=0  TIMEOUT  left= 2  atFloor=80,3%  streak= 79,9s  score đóng băng 100s  tier=3
level-01 seed=7     off=0  TIMEOUT  left= 2  atFloor=95,2%  streak=354,4s  score đóng băng 356s  tier=3
level-02 seed=1     off=0  TIMEOUT  left= 8  atFloor=96,2%  streak=422,9s  score đóng băng 422s  tier=3
level-03 seed=0xace off=18 WON              atFloor= 1,2%  streak=  1,2s  score đóng băng  23s  tier=0
```

Chi tiết cơ chế và số đo ở **NG-1**. Bài học cho chính đợt kiểm định: **một phép đo chỉ chứng minh được điều nó đo**. Khi một fix đưa vào một hằng số mới, metric xác minh phải được đặt lại theo hằng số đó, không giữ ngưỡng cũ.

Cũng cần nói rõ điều ngược lại: gameplay **có** cải thiện thật và lớn. Với paddle lệch tâm (off=18) thì level-03 WON, `atFloor` 1,2%, tier 0. level-01 off=0 từ TIMEOUT sang **WON trong 119s**. Lock chỉ đóng lại khi người chơi giữ paddle đúng tâm bóng — nhưng đó chính là hành vi tự nhiên nhất.

---

## 1. Gate tự động (audit tự chạy, 2026-09-22)

| Lệnh | Vòng #02 | Vòng #03 | |
|---|---|---|---|
| `npx tsc --noEmit` | 0 lỗi | **0 lỗi** | ✅ giữ được |
| Unit test suite | **245 pass / 1 fail** (53 file) | **249 pass / 0 fail** (54 file) | ✅ **suite XANH** |
| `npx eslint .` | 0 error / 5 warning | **1 error / 5 warning** | ❌ **regression** → NG-10 |
| ESLint `boundaries/*` | 0 vi phạm | 0 vi phạm | ✅ |
| `assert-skia-version` | PASS | PASS | |
| `assert-privacy-manifest` | PASS + 2 WARN | PASS + 2 WARN | |

Lỗi lint duy nhất:
```
app/_components/PlayingHost.tsx
  ERROR 249:5 [react-hooks/set-state-in-effect]
             Calling setState synchronously within an effect can trigger cascading renders
```
Đây là `setFxReady(false)` được thêm vào thân effect ở `:249` — chính là fix cho NF-6. Lưu ý minh bạch: lần chạy lint **đầu** phiên này của tôi cho 0 error; lần chạy sau khi kiểm tra NF-6 cho 1 error. Không có commit nào giữa hai lần, nên file đã được sửa trong working tree giữa phiên. **Trạng thái hiện tại: lint đỏ.**

> **Runner test:** vẫn dùng phương pháp của hai vòng trước (`npx vitest run` không chạy được trên Linux vì `node_modules` build cho macOS). 54 file test chạy bằng Node 22 `--experimental-strip-types` + shim `vitest`/`@fast-check/vitest` trong thư mục scratch **ngoài repository**. Kết quả **249/249**. Không phải output vitest chính thức — cần `npm test` trên macOS.

---

## 2. Verdict cho 18 finding NF của vòng #02

| Verdict | Số lượng | ID |
|---|---|---|
| **FIXED** | **4** | NF-1, NF-4, NF-5, NF-7 |
| **PARTIALLY FIXED** | **1** | NF-6 |
| **NOT FIXED** | **13** | NF-2, NF-3, NF-8, NF-9, NF-10, NF-11, NF-12, NF-13, NF-14, NF-15, NF-16, NF-17, NF-18 |

### Đã sửa đúng

| ID | Bằng chứng |
|---|---|
| **NF-1** (Critical) | `src/runtime/substepCap.ts:12` nay có `'worklet';`. **Xác minh bằng Babel config của chính dự án: `__workletHash` count = 1** (trước là 0). Quét lại toàn bộ `src/`+`app/`: không còn hàm nào bị capture vào worklet closure mà thiếu directive. Đây là fix một dòng và nó đúng. |
| **NF-4** | Ba assert khe hở sai trong `tests/physics.level03-serve.test.ts` được **thay** bằng assert bounds playfield (`:60-68`) — đúng phương án đã đề xuất, và **level-03 không bị sửa**. Suite 249/0. Con số tài liệu cũng đã đính chính: `08-VALIDATION.md:63` nay ghi "249/249 ✅ *(Prior 179/179 note was Wave-0 snapshot)*", `PROJECT.md:20` ghi "~249 green as of 2026-09-22". |
| **NF-5** | `app.config.js:21` nay `icon: './assets/images/icon.png'` (PNG 1024×1024 của dự án). `assets/expo.icon/` vẫn được track nhưng không còn được tham chiếu, và `originality-attestation.md:13` khai báo trung thực ("safe to delete before store submit"). |
| **NF-7** | `src/vfx/trails.ts:44-49` seed toàn bộ `TRAIL_MAX` sample bằng `(x,y)` thật; `useGameLoop.ts:389` truyền `ballX/ballY/ballActive`; `recordSprites.ts:397-399` skip slot có `ballActive === 0`. **Và có test hành vi thật**: `tests/vfx.trails.test.ts:51-107` assert đúng giá trị sample — chính loại test mà NF-11 đòi. |

### NF-6 — sửa một nửa, và nửa đó gây ra NG-10

Đã đúng: `setFxReady(false)` được thêm (`PlayingHost.tsx:249`), và `useGameLoop` nay được gọi ở `:231` **trước** effect bake ở `:248` nên cleanup unregister frame callback chạy trước. Còn hở: `PlayingHost.tsx:294-298` vẫn dispose **đồng bộ** trong khi `setActive(false)` và `glowAtlasSv.value = null` đều đi qua `scheduleOnUI` (**bất đồng bộ**) → cửa sổ use-after-dispose rộng một frame vẫn còn, cộng một đường rò rỉ mới. Chi tiết: **NG-11**.

---

## 3. Finding mới vòng #03 — 17 mục

### NG-1 — **HIGH** — Soft-lock NF-2 **dịch chỗ, không bị loại bỏ**: nay có một attractor chính xác tại θ = 8°

**Nhãn:** Confirmed defect, có số đo · **File:** `src/core/physics/resolve.ts:194-223` · `src/core/rules/stall.ts:119-146, 200-202` · `src/core/constants.ts:142-144`

Sàn ngang mới (`MIN_HORIZONTAL_RATIO = sin(8°)`) **về mặt số học là đúng và tương thích hoàn toàn** với sàn dọc: tập hợp cho phép là vành 8° ≤ θ ≤ 62°, mỗi enforcer chỉ bắn khi ra ngoài biên của chính nó và đầu ra thỏa biên còn lại với dư địa (θ=62° cho `|vx|/|v| = 0,883 ≥ sin8°`; θ=8° cho `|vy|/|v| = 0,990 ≥ cos62°`). Quét 288.000 input (8 tốc độ từ 1e-6 đến 1e6 × 36.000 heading): **0 vi phạm sàn, 0 điểm không-bất-động, 0 NaN/Inf, sai số tốc độ tương đối tệ nhất 4,7e-16**. 50 vòng lặp xen kẽ từ 7.200 heading khởi đầu: **0 limit cycle**. Không có input nào dao động hay mất `|v|`.

Nhưng **hệ quả game** thì không ổn, vì hai cơ chế cộng lại:

**Cơ chế 1 — paddle có một dải chết phẳng 9,2px ở giữa.** `resolvePaddleEnglishInto` tính `angle = t·62°` rồi *sau đó* snap qua sàn ngang (`:223`). Mọi `|t| < 8/62 = 0,129` do đó map về **chính xác** 8°. Với `paddleHalfW = 36` đó là `|ballX − paddleCx| < 4,645px`. Đo trực tiếp (`resolvePaddleEnglish(180+off, 180, 36, 0, 420)`):
```
offset=  0    → vx=58,453  góc-từ-dọc=8,0000°
offset=  0.5  → vx=58,453  góc=8,0000°
offset=  2    → vx=58,453  góc=8,0000°
offset=  4    → vx=58,453  góc=8,0000°
offset=  4.6  → vx=58,453  góc=8,0000°   ← giống hệt offset 0
offset=  4.7  → vx=59,138  góc=8,0944°   ← gradient mới bắt đầu
offset= 36    → vx=370,838 góc=62,0000°
```
**9,29px phẳng trên một paddle 72px (12,9%), không có gradient điều khiển nào.** Lỗi cũ áp đặt chính xác 0° mỗi lần bật giữa paddle; code mới áp đặt chính xác 8°. Cả hai đều là quỹ đạo chu kỳ 2.

**Cơ chế 2 — "escalation" tier 3 là no-op tại attractor.** `applyTier3AngleNudge` thử ±8° rồi giữ candidate có `|vy|/|v|` **lớn hơn**, tức **dốc hơn / dọc hơn** (`stall.ts:119-146`) — sai hướng để phá một quỹ đạo gần dọc. Sàn ngang ở `:200` sau đó kéo `|vx|` về lại đúng `sin8°·|v|`. Đo 5 lần bắn tier 3 liên tiếp từ velocity đã locked:
```
trước     : vx= 58,4401 vy=-415,8229 góc=8,0000° spd=419,91
sau lần 1 : vx= 58,4401 vy=-415,8229 góc=8,0000° spd=419,91
sau lần 2 : vx=-58,4401 vy=-415,8229 góc=8,0000° spd=419,91
sau lần 3 : vx= 58,4401 vy=-415,8229 góc=8,0000° spd=419,91
sau lần 4 : vx=-58,4401 vy=-415,8229 góc=8,0000° spd=419,91
sau lần 5 : vx= 58,4401 vy=-415,8229 góc=8,0000° spd=419,91
```
**Độ lớn là điểm bất động; chỉ dấu của `vx` đảo.** Đảo dấu là một phép đối xứng gương của quỹ đạo, nên nó vẫn tuần hoàn — và vì lặp mỗi 2 giây, độ trôi ngang tích lũy triệt tiêu.

**Hệ quả đo được** (bảng ở §0): 80–96% số step nằm đúng tại sàn, score đóng băng 100–422 giây, `stallIdleTicks` lên tới 422s, tier kẹt ở 3, không ván nào hoàn thành. Histogram heading trên 120s chơi: **83% mọi step nằm trong bin 5–10°**, tất cả ở đúng 8,0°. Đó không phải một phân bố "tránh quỹ đạo suy biến" — nó *chính là* một quỹ đạo suy biến.

**Impact:** giống hệt NF-2 — score đóng băng vô hạn, HUD hiện `Stall! · 3` mãi, không mất mạng nên không có đường thoát ngoài Retry/Menu, đạt tới bằng việc giữ paddle dưới bóng. PHYS-04 được thỏa **về câu chữ** (θ ≥ 8° luôn đúng) và bị phủ định **về bản chất**. PHYS-07 "visible, deterministic **escalation**" không đạt: can thiệp được chứng minh là hằng.

**Test của dự án cũng có đúng điểm mù đó:** `tests/physics.near-vertical.test.ts:56` đặt `floor = MIN_HORIZONTAL_RATIO * 0.5 = 0,0696` — bằng **một nửa** giá trị mà bóng đang bị lock tại. Test không thể fail khi lỗi đang hiện diện đầy đủ. Nó cũng chỉ chạy 500 step = 4,17s, dưới `STALL_IDLE_TICKS = 960` (8s), nên **không bao giờ tới được tier nào** dù tiêu đề có ghi F-27.

**Fix:** (a) làm map paddle **đơn điệu** lên vành cho phép thay vì snap: `angle = sign(t)·(8° + |t|·54°)` — giữ nguyên toàn bộ gradient điều khiển và không bao giờ phát ra dải phẳng; (b) làm tier 3 **thật sự** escalate — chọn candidate đi **xa** khỏi sàn đang bị ghim, hoặc tăng biên độ nudge mỗi lần lặp (8°, 16°, 24°…, vẫn deterministic); (c) thêm property test đã bắt được cả hai: sau ≥1440 tick idle ở tier 3, assert heading **đổi hơn 1e-6** qua hai can thiệp liên tiếp.

### NG-2 — **MEDIUM-HIGH** — Một cú chạm góc vật lý gây tới 3 HP damage
**File:** `src/core/step.ts:741-747` (axis flip không tách rời) + `:770, :781` (`brickDamagedThisStep` là guard per-**step**, không per-**contact**) + `:800` (`remaining = 0`)

Hệ quả trực tiếp của **NF-9** vẫn mở. Vì axis-only flip có thể để `v·n < 0`, bóng chạm lại đúng brick đó ở step sau — và guard damage reset mỗi step. Repro deterministic (một brick x 150-190, y 200-216; bóng từ (137,35; 160) với v = (100; 407,92)):
```
step  x        y        vx      vy      contact
  9  145,683  193,994  100,00  407,92
 10  144,971  196,914 -100,00  407,92  BRICK  ← góc: flip đảo vx, không đảo hướng đi xuống
 11  144,886  196,862 -100,00  407,92  BRICK  ← flip là no-op; bóng đi 0,05px trong step đáng 3,5px
 12  145,600  193,948  100,00 -407,92  BRICK  ← tới đây vy mới đảo
```
Damage từ một cú chạm góc duy nhất, cùng quỹ đạo: `hp=1 → 1 BREAK`; `hp=2 → 1 HIT + 1 BREAK`; **`hp=3 → 2 HIT + 1 BREAK` — brick hp=3 chết vì MỘT cú chạm.** Quét 5.300 quỹ đạo tiếp cận góc: **47 (0,9%)** gây damage qua ≥2 step riêng biệt, khớp với tỉ lệ toàn cục 104/9.395 = 1,1% cú chạm brick không tách rời (đo bằng instrumentation trên 1,35 triệu lời gọi `stepRun`).
**Impact:** brick hp≥2 bị hạ giá trị khi bị cạ góc, không tái lập được từ góc nhìn người chơi; đây cũng là lời giải thích cho độ tản mát lớn của thời gian clear. Không test nào cover.
**Fix:** làm brick resolve thành phản xạ thật quanh `n` khi `v·n < 0` (dùng lại `reflectVelocityInto`, `resolve.ts:16-69`, đã có nudge chống re-approach). Việc đó đóng luôn NF-9 và NG-2, và cho phép **xóa** `:818-848` cùng `:231-357`.

### NG-3 — **MEDIUM** — `escapeOverlappingBricks` thêm một scan O(brickCount) vô điều kiện vào mọi step
**File:** `src/core/step.ts:812-814` (gọi vô điều kiện), `:136-184` (quét toàn bộ brick sống)
Instrument trên 1.354.662 lời gọi `stepRun`: hàm được gọi **1.405.445 lần** và tìm thấy overlap ở **948 lần (0,067%)**. 99,93% còn lại trả phí một lượt `circleOverlapsAabb` qua mọi brick sống để không làm gì. Level-03 worst case: `8 ball × ~103 brick × 5 substep = 4.120` phép test AABB vô ích mỗi frame, **cộng thêm** `20.600` lời gọi `sweepCircleAabbInto` mà CCD đã phải làm vì **NF-10** để broadphase không dùng. Hai nhánh con được chứng minh là lạnh: `foundClear === 0` và eject tốc-độ-0 bắn **0 lần**; cluster eject (~100 dòng) bắn **2 lần**.
**Fix:** gate escape theo "có chạm brick trong step này" (cờ đã có trong `brickDamagedThisStep`) — loại 99,93% lời gọi mà không đổi hành vi.

### NG-4 — **LOW** — Cluster-eject ghi velocity bỏ qua cả hai sàn góc
`src/core/step.ts:336-357`. Nhánh reflect `:338-352` bảo toàn tốc độ nhưng không áp sàn nào. Nhánh `else` `:354-357` ghi `ballVx = bestNx·360, ballVy = bestNy·360`; với default `bestNx=0, bestNy=1` đó là `(0, 360)` — `|vx|/|v| = 0`, vi phạm trực tiếp `MIN_HORIZONTAL_RATIO`, và hướng thẳng xuống. Bắn 2 lần / 1,35 triệu step; nhánh tốc-độ-0 bắn 0 lần. Severity thấp nhưng đây là khoảng trống enforcement duy nhất **nằm bên trong** vòng physics.

### NG-5 — **LOW** — Ba khối chết trong `resolvePaddleEnglishInto`
`src/core/physics/resolve.ts:203-219`. Với `angle = t·62°` và `|t| ≤ 1`, `|ovy|/speed = cos(|angle|) ≥ cos62°` với mọi input. Do đó: re-clamp `:204-210` không tới được, flip `if (ovy > 0)` `:213-215` không tới được, và lời gọi `enforceMinVerticalRatioInto` `:217` là no-op bảo đảm. Vô hại, nhưng ~18 dòng đọc như một lưới an toàn mà không phải — và nó che mất việc phép biến đổi **duy nhất còn sống** sau khi tính góc là snap ngang ở `:223`, tức cơ chế của NG-1.

### NG-10 — **HIGH** — `npm run lint` nay ĐỎ, do chính fix NF-6
`app/_components/PlayingHost.tsx:249` — `setFxReady(false)` trong thân effect kích rule `react-hooks/set-state-in-effect` ở mức **error**. Đã đo: **1 error + 5 warning** (vòng #02 là 0 error). `npm run lint` = `eslint .` nên gate lint fail. `08-VALIDATION.md:65` "Automated suite green" lại sai, lần này vì lint chứ không vì test.
**Fix:** đưa việc reset ra khỏi thân effect (dẫn xuất `fxReady` từ key/ref, hoặc gate render path theo identity của `loadResult`) thay vì `setState` trong thân.

### NG-11 — **MEDIUM-HIGH** — Race dispose của NF-6 chưa đóng; đường soak có thể rò rỉ atlas vừa bake
`app/_components/PlayingHost.tsx:294-298` (cleanup) và `:272-276` (đổi level). Sự thật thư viện đã đọc: `shareableGuestUnpacker.native.ts:126-128` `getSync` → đọc **blocking** giá trị UI-authoritative; `:129-139` `setAsync` → **xếp hàng**; guest setter của `mutables.ts` → `scheduleOnUI`; `FrameCallbackRegistryJS.manageStateFrameCallback` → `scheduleOnUI`. Hai hệ quả:
1. **Use-after-free:** `setActive(false)` và `glowAtlasSv.value = null` bị xếp hàng; `disposeGlowAtlas(atlas)` chạy **ngay** trên JS. UI runtime có thể đang trong `recordFrame` với `glowAtlas.value` đã bind → `recordSprites.ts:287 canvas.drawImageRect` trên một `SkImage` đã dispose.
2. **Rò rỉ:** cleanup đọc `const atlas = glowAtlasSv.value` bằng `getSync` trên bản UI. Với mount→unmount nhanh — **đúng kịch bản soak 100 chu kỳ Title↔Playing** (`GameHost.tsx:76-99`) — `setAsync` của lần bake có thể chưa drain, nên giá trị đọc được là atlas **cũ** và **4 `SkImage` của atlas mới không bao giờ được dispose** → tối đa 400 texture rò rỉ qua đợt soak.
**Fix:** null SV trước, rồi dispose **bên trong** `scheduleOnUI`/`runOnUISync`; hoặc hoist atlas thành singleton module-level key theo `brickW×brickH`.

### NG-12 — **MEDIUM** — Tier `low` nay trả đúng phí glow blit mà nó tồn tại để bỏ
`src/runtime/resolveQualityTier.ts:22` — `low: { particleCap: 48, trailMax: 2, glowScale: 0.35 }` (trước là `0`); gate ở `recordSprites.ts:271-276` là `vfx.glowScale > 0`. Level-03 tier low: **340 → 443 draw op/frame (+30,3%)** — thêm 103 `drawImageRect` trên đúng phần cứng yếu nhất. Không có phép đo thiết bị nào để biện minh (mọi ô `phase8-certification.md` vẫn `PENDING_DEVICE`). Kết hợp `?? 'mid'` ở `:64`, một thiết bị lạ nay mặc định `mid` *và* thiết bị thật sự rơi vào `low` thì nặng hơn 30% so với trước.
**Fix:** giữ `glowScale: 0` cho `low`, hoặc soft-degrade bằng cách vẽ glow cho một tập con brick, kèm ghi nhận lý do.

### NG-13 — **MEDIUM** — Build profiling nay trả phí percentile cho một overlay vẫn không thể vẽ
`eas.json:13,19` đặt `EXPO_PUBLIC_PERF_OVERLAY=1` cho profile `profiling` → `devflags.ts:10` → `PlayingHost.tsx:243 drawOverlayFlag` → `useGameLoop.ts:283 overlayEnabled` → `metrics.ts:122-124` chạy `percentileMs(m,95)` và `percentileMs(m,99)`, hai insertion sort trên cửa sổ 60 sample, **mỗi frame**. Trong khi đó `hudFont` **vẫn chưa bao giờ được truyền** — grep `hudFont` trong `app/_components/PlayingHost.tsx`: **zero match**; default `null` (`useGameLoop.ts:237`) → `recordSprites.ts:450` `if (drawOverlayFlag && hudFont)` không bao giờ bắn. **Build dùng để đo PLT-03 mang theo overhead đo và không xuất ra số nào** — nó làm méo chính con số nó phải thu.
**Fix:** wire `useFont(require('assets/fonts/SpaceMono-Regular.ttf'), 11)` vào `useGameLoop({hudFont})` — đúng fix một dòng mà vòng #02 đã nêu — hoặc gate `computePercentiles` theo `drawOverlayFlag && hudFont != null`.

### NG-14 — **MEDIUM** — Viết lại keep-awake có thể để lại wake lock không chủ
`app/_components/PlayingHost.tsx:107-116` thay `useKeepAwake()` bằng `activateKeepAwakeAsync()` / `deactivateKeepAwake()` thủ công trên **tag mặc định dùng chung** (`ExpoKeepAwakeTag`). Activate là fire-and-forget; nếu phase chuyển sang `paused` trước khi nó resolve thì `deactivateKeepAwake()` của cleanup chạy **trước**, và activate resolve sau sẽ giành lại lock mà không còn ai release → **màn hình không bao giờ ngủ trong phần còn lại của session**. Nhánh early-return `:109-110` cũng không có cleanup, nên một chuyển tiếp `playing → paused` phát hai `deactivateKeepAwake` cho một activate.
**Fix:** quay lại `useKeepAwake(tag)` (nó tự quản thứ tự và dùng tag riêng theo component), hoặc tuần tự hóa bằng một promise chain / generation counter.

### NG-15 — **LOW-MEDIUM** — NF-8 bị khuếch đại: `previous` SharedValue nội bộ của reaction cũng bị dirty mỗi frame
`useAnimatedReaction` kết thúc bằng `previous.value = input`. Vì `PlayingHost.tsx:391` trả về một array mới, `valueSetter.ts:73` cũng không short-circuit được cho `previous` → thêm một lần ghi `_value` + `setDirty(true)` mỗi frame. Thiết kế 5 scalar cũ short-circuit được **cả** input SV **và** `previous`. Reaction `camScale` ở `:324-337` trả về scalar và không bị ảnh hưởng — đó là bằng chứng rằng pattern đúng đã có sẵn và không được dùng.

### NG-16 — **MEDIUM** — Một test mới nay **ghim** lỗi NF-8 tại chỗ
`tests/runtime.chrome-reaction.test.ts:19` — `expect(src).toContain('chromeOut.value = {')`, cộng `:36-37` `expect(reactionBlocks.length).toBe(2)`. Áp dụng đúng fix đã đề xuất cho NF-8 (mirror ổn định + scalar `chromeSeq`) sẽ làm test này **fail**. Suite đã được nối dây sao cho việc sửa một lỗi hiệu năng đã biết làm vỡ CI. Đây là failure mode NF-11 leo thang: test grep source không chỉ *không bắt* được bug — nó có thể *bảo vệ* bug.
**Fix:** xóa file này, thay bằng test hành vi (cần `react-test-renderer`, tức F-43): drive một `chromeOut` giả qua harness hình dạng `useAnimatedReaction` thật và assert callback JS bắn đúng một lần mỗi lần HUD đổi và **zero** lần khi không đổi.

### NG-17 — **LOW** — `src/input` nhân bản DTO ChromeMirror thay vì import
`src/input/usePaddleGesture.ts:34-40` khai lại inline hình dạng object 5 field; bốn gesture worklet đọc `chrome.value.phase` (`:76`, `:85`, `:94`, `:120`). LC-05 cho phép `input → runtime` nên `import type { ChromeMirror }` là khả dụng. Hai bản DTO bảo trì tay có thể lệch nhau mà không có lỗi compile — và gesture gating nay dereference một object mà render loop cấp lại 60 lần/giây.

### NG-18 — **LOW** — Code chết kèm comment sai trong audio service
`src/services/audio/expoAudioService.ts:210-211`: comment `// Record one play per distinct sfx (dedupe); hits kept for test assertions via plays length` rồi `void hits;`. `hits` bị bỏ; `plays` có đúng một entry mỗi sfx phân biệt bất kể `hits`. Comment mô tả hành vi mà code không có.

### NG-19 — **LOW** — Dedupe của F-34 đổi hành vi audio mà không cập nhật spec
`expoAudioService.ts:151-160`: tám `BRICK_BREAK` trong một frame nay cho **một** `play()` ở gain ×1,25 thay vì tám voice round-robin. `VOICE_LIMITS` (tới 3) nay chỉ được dùng *xuyên* frame. Không gì trong `07-UI-SPEC.md` hay `07-VERIFICATION.md` ghi đây là hợp đồng FX-03 mong muốn; test được viết lại để khớp code mới chứ không khớp một yêu cầu đã phát biểu.

### NG-20 — **LOW** — Xóa `camera.ts` làm trùng lặp hằng của F-63 **tệ hơn**
`src/render/camera.ts` (nơi giữ `LOGICAL_W/H` và `makeCamera` an-toàn-worklet duy nhất) đã bị xóa. Kích thước logic nay được khai ở `recordSprites.ts:12-13`, re-export ở `:458`, **và** hardcode dạng literal thô ở `:72`, `:75`, `:228-230`, `:250` — cộng lần thứ tư ở `PlayingHost.tsx:45-46`. `SIM` cũng khai lại ở `PlayingHost.tsx:66-71`, và `BALL_RADIUS_LOCAL = 6` ở `recordSprites.ts:16`. `tests/constants.parity.test.ts` không cover cái nào (NF-12).

### NG-21 — **LOW** — Fix NF-7 không được ràng buộc cơ học: tham số seed là optional
`src/runtime/worldRequests.ts:45` `clearCosmeticVfx(vfx, world?)` và `src/vfx/trails.ts:51-56` `clearTrailsFromIndex(vfx, fromIndex, ballX?, ballY?, ballActive?)`. Bỏ qua chúng là tái lập seed `(0,0)` ở `trails.ts:60-61`, **không có lỗi type**. `tests/runtime.reset-request.test.ts:102` đã gọi `clearCosmeticVfx(vfx)` theo cách đó và không assert gì về sample. Nên làm tham số bắt buộc (như `clearTrailBall(vfx, i, x, y)` đã làm đúng).

---

## 4. Các finding vòng #01 còn mở

| ID | Verdict | Bằng chứng |
|---|---|---|
| **NF-3 / commit** | **NOT FIXED** | `git log -1` vẫn `215873e`; **77 mục uncommitted**; `git ls-files --error-unmatch app.config.js` → *not known to git*; `app.json` vẫn deleted chỉ trong working tree. **Mọi fix đã kiểm chứng trong báo cáo này — gồm `MIN_HORIZONTAL_RATIO`, `'worklet'` của substepCap, toàn bộ diff `src/core` — chỉ tồn tại trong một working tree.** Checkout sạch vẫn không build được. |
| **F-55** | **NOT FIXED (bản live)** | Audit đã **fetch** `https://dexter292.github.io/bricks_breaker/store/privacy-policy.html`: phần Contact vẫn nguyên văn *"…via the project's public repository issues (when published) or the developer contact listed on the store listing when one exists."* Bản local `privacy-policy.md:36` **đã có** URL issues thật. Thêm nữa `HOSTING.md:15` vẫn quy định `curl -fsSI` (chỉ header) — đúng lỗi "status code thay cho nội dung" mà vòng #02 đã nêu. |
| **F-27** | **PARTIALLY FIXED** | `constants.ts:147` + `stall.ts:251-260` nay có repeat mỗi 240 tick. **Đo được là no-op** (NG-1): level-02 idle đạt **52.997 tick (441s)** với tier 3 re-bắn ~213 lần và heading không đổi. |
| **F-29** | **NOT FIXED** | `hudFont` vẫn không được truyền → overlay không thể vẽ. Nay còn gây hại (NG-13). |
| **F-43** | **NOT FIXED** | `package.json:33-44` vẫn không có `@testing-library/*`, `react-test-renderer`, `jest-expo`. **Vẫn không có test nào mount component, render hook, hay băng qua biên JS↔UI runtime.** Mọi finding NG của vòng này trừ NG-12/NG-20 đều sống ở đúng biên đó. |
| **Guard worklet-closure** | **KHÔNG TỒN TẠI** | `ls scripts/` chỉ có 2 script cũ; grep `__workletHash|closure` trong `tests/`, `scripts/`, `eslint.config.js` → **zero**. Khuyến nghị vòng #02 (~40 dòng) không được triển khai. Audit tự dựng lại guard đó và xác nhận: **không có defect NF-1-class mới** — nhưng đó là nhờ may mắn và cẩn thận, không nhờ cấu trúc. |
| F-03, F-05, F-07, F-20, F-21, F-45, F-49, F-52, F-54, F-59, NF-8, NF-9…NF-18 | **NOT FIXED** | Phần lớn byte-identical với vòng #02. `F-03` xấu hơn: `nyquist_compliant: false` nay ở **03/04/05/06/08**-VALIDATION.md (vòng #02 là 05/06/08). |
| F-24, F-26, F-36, F-39, F-40, F-42, F-57, F-63 | **PARTIALLY FIXED** | F-36 tiến bộ thật: `useGameLoop.ts:45` nay import `clampFrameDt`/`resetAccumulator` từ `freeze.ts` và bản trùng lặp local đã bị xóa. F-26 còn **hai instance store độc lập** (`GameHost.tsx:28`, `PlayingHost.tsx:118`). |

---

## 5. LVL-04: thời lượng đi xa hơn khỏi mục tiêu

Bot hoàn hảo (bám bóng + offset luân phiên), cùng seed, cùng bot, qua ba vòng đo:

| Kịch bản | Vòng #01 (core `682056a`) | Vòng #02 | Vòng #03 |
|---|---|---|---|
| level-03 off=18 p37 | 497s | 321s | **310s** |
| level-03 off=18 p53 | 309s | 381s | **461s** |
| level-03 off=26 | 309s | 289s | **336s** |
| level-03 off=10 | 288s | 316s | **460s** |
| **trung bình** | **351s** | **327s** | **392s** |
| level-03 off=0 (bám tâm) | TIMEOUT 38/93 | TIMEOUT 15/93 | TIMEOUT **84/93** |
| level-01 off=0 | TIMEOUT 27/32 | TIMEOUT 5/32 | **WON 119s** |

off=0 cải thiện rõ rệt (84/93 thay vì 15/93; level-01 thắng hẳn). Nhưng thời gian clear trung bình **tăng ~20%** (327 → 392s), và mọi run đều `maxStallTier 3`. Mục tiêu "~2–3 phút" của LVL-04 nay ứng với **6,5 phút cho một bot siêu phàm**. Quyết định "nới mục tiêu thời lượng" vẫn chỉ nằm trong `REMEDIATION-PLAN.md:151` và `DEFERRED-ITEMS.md:12`, **chưa lan sang** `REQUIREMENTS.md:25` (vẫn "~2–3 minute", vẫn `[x]`), `ROADMAP.md` SC-1, `08-VERIFICATION.md:37`, hay `PROJECT.md:32`.

---

## 6. Hiệu năng

Diff `src/render/recordSprites.ts` so với `215873e` là **một dòng comment** — đường vẽ tier high byte-identical với vòng #02. Thay đổi phí per-frame duy nhất của đợt này là retune tier (`resolveQualityTier.ts:22-24`):

| Tier | Vòng #02 | Vòng #03 | Δ |
|---|---|---|---|
| `high` (192/5/1.0) | 611 draw op | **611** | 0 |
| `mid` (128/**4**/1.0) — **đích certification** | 547 | **539** | −8 (−1,5%) |
| `low` (48/2/**0.35**) | 340 | **443** | **+103 (+30,3%)** → NG-12 |

Allocation UI-runtime ở trạng thái ổn định: **2 object/frame** (chrome pack `useGameLoop.ts:436` + tuple reaction `PlayingHost.tsx:391`) — không đổi so với vòng #02 vì NF-8 không được sửa; cộng 1-8 allocation/frame mới trên **JS thread** từ `new Map()` của dedupe audio (`expoAudioService.ts:151`).

**Certification vẫn UNPROVEN.** Mọi ô `docs/phase8-certification.md:103-106` và `:151-152` vẫn `PENDING_DEVICE`. Và nay có thêm một lý do cấu trúc khiến chưa nên đo: NG-13 (build profiling tự làm méo số đo của mình, và không xuất ra readout nào) cùng NG-11 (đường soak là đúng kịch bản tệ nhất cho rò rỉ atlas).

---

## 7. Store compliance

Cải thiện thật: **NF-5 đóng** (icon iOS nay là art của dự án). Còn lại **hai** lý do độc lập chặn submit (giảm từ ba):

1. **Bản policy live không có kênh liên hệ** — đã fetch và kiểm tra theo nội dung.
2. **`app.config.js` không tồn tại trong commit nào** — nên privacy manifest và gate `expo-dev-client` đều không có trong lịch sử git.

Cả hai gộp về **NF-3: commit và push, rồi verify bản live bằng nội dung** (`curl -fsS $URL | grep -F '/issues'`), không bằng status code.

Ghi nhận tích cực: những chỗ giấy tờ còn thiếu thì **nói rõ là thiếu** — `originality-attestation.md:13` khai `assets/expo.icon` còn tồn tại và "safe to delete before store submit"; `assets/sfx/README.md:18-19` khai provenance là placeholder. Đó là hành vi đúng.

---

## 8. Sáu việc ưu tiên

1. **NG-1** — sửa map paddle thành đơn điệu (`angle = sign(t)·(8° + |t|·54°)`) và làm tier 3 thật sự escalate. Đây là soft-lock duy nhất đo được, đạt tới bằng hành vi người chơi bình thường, và nó phủ định PHYS-04 + PHYS-07 đang được đánh Complete. Kèm test: heading phải **đổi** qua hai can thiệp tier-3 liên tiếp; và sửa `physics.near-vertical.test.ts:56` để ngưỡng nằm **tại** sàn, không bằng nửa sàn.
2. **NG-10** — đưa `setFxReady(false)` ra khỏi thân effect. Gate lint đang đỏ.
3. **NF-3** — commit + push. Mọi fix của hai vòng remediation đang nằm ngoài git.
4. **NG-2 + NF-9** — làm brick resolve thành phản xạ thật; việc đó xóa được cả hai khối bù (~120 dòng rủi ro nhất) thay vì tiếp tục debug chúng.
5. **NG-11 + NG-13** — thứ tự dispose glow atlas, và truyền `hudFont`. Hai điều kiện tiên quyết còn lại của đợt đo hardware.
6. **F-43 + guard worklet-closure** — hai kiểm soát cơ học duy nhất sẽ chặn được lớp lỗi đang tái diễn. Sau ba vòng, cả hai vẫn chưa tồn tại.

---

## 9. Nhận định về ba vòng remediation

**Điều làm tốt và nên ghi nhận.** NF-1 — lỗi Critical của vòng #02 — được sửa bằng đúng một dòng, đúng chỗ, và tôi xác minh được bằng Babel. NF-4 được sửa bằng **phương án đúng** (xóa assert sai, không bẻ level để vừa test). NF-7 được sửa kèm một test hành vi thật, là test tốt nhất được thêm qua cả ba vòng. NF-5 đóng. Con số tài liệu được đính chính chủ động (`08-VALIDATION.md:63` tự gắn nhãn con số cũ là "Wave-0 snapshot"). Sàn ngang mới, xét riêng về số học, là **đúng và được chứng minh tương thích** với sàn dọc — 288.000 input, 0 vi phạm, sai số 4,7e-16. Và qua ba vòng, **không một số liệu nào bị bịa ra**.

**Điều cần chỉnh, và nó có một khuôn mẫu rõ ràng.** Những fix về *thứ tự* và *hình dạng* thì hạ cánh đúng; những fix phụ thuộc vào việc biên JS↔UI là **bất đồng bộ** (`scheduleOnUI`, `setAsync`, `manageStateFrameCallback`) thì liên tục được viết như thể nó đồng bộ — NF-6 → NG-11 là lần thứ hai. Và những fix *về mặt số học đúng* vẫn có thể *về mặt game sai* nếu không đo lại đúng đại lượng: NG-1 là một sàn được chứng minh đúng nhưng biến thành attractor, và nó đã qua được cả test của dự án lẫn phép đo vòng #02 của tôi.

Hai kiểm soát cơ học sẽ chặn phần lớn chuyện này — **test băng qua biên runtime (F-43)** và **guard worklet-closure** — vẫn chưa tồn tại sau ba vòng. Trong khi đó, bảy test mới thuộc loại grep source, và một trong số đó (`runtime.chrome-reaction.test.ts:19`) nay **ghim** một lỗi hiệu năng đã biết: sửa NF-8 sẽ làm CI đỏ. Đó là điểm nên đảo chiều trước tiên, vì nó biến suite từ chỗ không bắt được bug thành chỗ bảo vệ bug.
