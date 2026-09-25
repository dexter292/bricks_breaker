# CODE REVIEW — 63 findings

**Ngày audit:** 2026-09-21 · commit `682056a`
**Quy ước:** ID là nhãn ổn định, **không** sắp theo mức độ. Mỗi finding ghi rõ *nhãn bằng chứng*:

- **Confirmed defect** — có bằng chứng trong code/tài liệu, đã đọc trực tiếp dòng được trích
- **Potential risk** — có cơ sở kỹ thuật nhưng chưa tái hiện được trong môi trường audit
- **Verification gap** — không đủ bằng chứng để kết luận theo hướng nào

Mọi file:line dưới đây đều được đọc thật. **Không có số dòng nào được suy đoán.**

| Mức độ | Số lượng | ID |
|---|---|---|
| Critical | 5 | F-01, F-04, F-05, F-06, F-07 |
| High | 14 | F-08 … F-21 |
| Medium | 29 | F-02, F-03, F-22 … F-48 |
| Low | 15 | F-49 … F-63 |

---

# CRITICAL

## F-01 — `retry()` và `setActive()` mutate một **bản clone** của World, không phải state đang chạy

**Severity:** Critical · **Confirmed defect** (ở mức code + source của thư viện; cần 1 dòng log trên thiết bị để xác nhận triệu chứng người dùng)
**File:** `src/runtime/useGameLoop.ts:416-427`, `:429-441`, `:517-618`

```ts
// useGameLoop.ts:429-441
const retry = useCallback(() => {
  const w = world.value;           // ← đọc từ RN runtime
  if (!w) return;
  resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
  const level = compiled.value;
  if (level != null) applyCompiledLevel(w, level);
  dockBall(w);
```
```ts
// useGameLoop.ts:416-424
const setActive = useCallback((active: boolean) => {
  frameCallback.setActive(active);
  if (!active) {
    const w = world.value;
    if (w) resetAccumulatorLocal(w);   // ← cùng vấn đề
  }
```

World được allocate **trên UI runtime** trong frame callback (`useGameLoop.ts:292-300`) rồi lưu bằng `world.value = w`. Chuỗi đọc từ RN runtime, đã xác minh từng bước trong `node_modules`:

1. `react-native-reanimated/lib/module/mutables.js:146-161` — guest getter: `latest = mutable.getSync()` (hoặc `runOnUISync(sv => sv.value, sv)` khi dirty).
2. `react-native-worklets/lib/module/memory/shareableGuestUnpacker.native.js:80-82` — `getSync = () => runOnRuntimeSyncFromId(hostId, get)`.
3. `react-native-worklets/lib/module/runtimes.native.js:260-265` — kết quả được bọc bằng `makeShareableCloneOnUIRecursive(result)`.
4. `react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.h:261-276` — `SerializableArrayBuffer` constructor:
   ```cpp
   data_(arrayBuffer.data(rt), arrayBuffer.data(rt) + arrayBuffer.size(rt)) {}
   ```
   → **copy byte vào `std::vector<uint8_t>`**, không share buffer.

Vậy `world.value` trên JS thread là một **deep clone** (21 typed array). Mọi mutation trong `retry()` mất hoàn toàn. Thêm nữa guest cache giá trị (`latest`) nên các lần retry sau còn làm việc trên snapshot ngày càng cũ.

**Impact:**
- **Retry không reset ván chơi.** Khi ván kết thúc, `applyWorldChrome` đã gọi `setActive(false)` (`PlayingHost.tsx:311/318`). `onRetry` (`:391-410`) clear React state, gọi `retry()` (no-op trên world thật) rồi `setActive(true)`. Frame kế tiếp đọc world thật với `simPhase = LOST/WON` → `simFrozen` (`useGameLoop.ts:337-338`) → không step; mirror `simPhaseOut.value = w.simPhase` (`:393`) bắn lại reaction → `setResult('lose')` + `setActive(false)`. **Result overlay hiện lại ngay lập tức.**
- Lưới an toàn "reset accumulator" mà chính file này ghi trong tài liệu (`:210-220`, `:496-497`) là no-op.
- `injectCertWorstCase` (`:517-618`) **chưa bao giờ inject được gì** → cảnh worst-case của Phase 8 certification chưa từng tồn tại. Hệ quả: nếu mang máy đi đo *ngay bây giờ*, số liệu thu được là của cảnh thường, không phải worst case.
- Mỗi lần đọc còn là một hop JS→UI **blocking** cộng hai lần copy ~8 KB.

**Bằng chứng ngược cần xử lý:** `06-VALIDATION.md:81` ghi "Instant Retry / Menu … ✅ checked" từ UAT người thật. Giả thuyết dung hòa: UAT chỉ thử Retry từ **Pause overlay** (khi `simPhase` còn `DOCKED`/`PLAYING`), nơi triệu chứng nhẹ hơn nhiều — brick/score không được reset nhưng ván vẫn chạy, rất dễ bỏ qua.

**Xác nhận 30 giây trên thiết bị:** trong frame callback thêm `if (w.__stamp === undefined) w.__stamp = 1;` rồi trong `retry()` log `world.value.tick` hai lần retry liên tiếp. `tick` không về 0 ⇒ xác nhận clone.

**Khắc phục:** không bao giờ mutate World từ RN runtime. Thêm `resetRequest: SharedValue<number>` (bộ đếm tăng dần) + `compiled` SV sẵn có; `retry()` chỉ làm `resetRequest.value += 1`; frame callback thực hiện `resetWorld` + `applyCompiledLevel` + `dockBall` + `accumulator = 0` **trên UI runtime** khi thấy giá trị mới. Tương tự cho accumulator reset và cho cert harness.

---

## F-04 — PLT-03 được tick Complete trong ledger khi không tồn tại phép đo nào

**Severity:** Critical · **Confirmed defect** (quy trình)
**File:** `.planning/REQUIREMENTS.md:50` (`- [x] **PLT-03**`), `:125` (`| PLT-03 | Phase 8 | Complete |`) vs `docs/phase8-certification.md:103-108`

```
| Pixel 6a | Mid | profiling | run1 | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE |
| Pixel 6a | Mid | profiling | run2 | PENDING_DEVICE | ...
| iPhone (physical) | … | Instruments | PENDING_DEVICE | … |
**Worse-run summary (Pixel Mid):** `PENDING_DEVICE`
```

Chính văn bản requirement là "Stable 60 FPS **is measured** on a named mid-range real device … RN perf monitor alone is not acceptance". Đồng thời `08-VALIDATION.md:6` vẫn ghi `nyquist_compliant: false` và `:102` "Approval: pending".

**Impact:** một hard gate trước phát hành đang được báo là đã đạt. Bất kỳ quyết định downstream nào dựa vào ledger (ví dụ mở external testing) sẽ dựa trên thông tin sai.
**Khắc phục:** revert về `Pending` cho tới khi có số liệu (WP-8), rồi thực thi WP-6.

---

## F-05 — Phase 8 chưa hoàn thành nhưng dự án được trình bày là "8 phase completed"

**Severity:** Critical · **Confirmed defect** (quy trình)
**File:** `.planning/ROADMAP.md:181` (`- [ ] 08-06-PLAN.md`), `:200` (`| 8. … | 3/7 | In Progress |`), `.planning/STATE.md:6` (`stopped_at: Completed 08-04-PLAN.md`), `:30` ("Status: Ready to execute")

Thiếu **`08-06-SUMMARY.md`** (plan duy nhất trong repo không có SUMMARY, dù `08-06-PLAN.md:172` yêu cầu tạo) và thiếu **`08-VERIFICATION.md`** (phase duy nhất không có VERIFICATION). Không có `08-REVIEW.md` dù `config.json:31` bật `code_review`.

**Impact:** Phase 8 **chưa bao giờ được verifier nào kiểm chứng**. SC2 (60 FPS hardware), SC4 (soak), phần playtest của SC1, và mitigation T-08-30 ("Confirm production build lacks Cert/Soak UI during visual QA", `08-06-PLAN.md:160`) đều chưa thực hiện.
**Khắc phục:** WP-6 + WP-8.

---

## F-06 — Bốn SUMMARY của Phase 8 khai `requirements-completed: [PLT-03]` cho công việc chỉ là harness/protocol

**Severity:** Critical · **Confirmed defect** (quy trình — đây là *cơ chế* sinh ra F-04)
**File:** `08-00-SUMMARY.md:53`, `08-02-SUMMARY.md:49`, `08-03-SUMMARY.md:45`, `08-04-SUMMARY.md:43`

Tệ nhất là `08-00-SUMMARY.md:53` — `requirements-completed: [LVL-04, PLT-03, PLT-04]` trên một plan Wave-0 mà toàn bộ output là `it.todo` stub và placeholder `STATUS:STUB` (`:50-51`). `08-03-SUMMARY.md:110` tự mâu thuẫn với frontmatter của chính nó: *"PLT-03 protocol ready; pass/fail evidence still OPEN until device runs"*.

Frontmatter này là thứ roll-up lên ledger requirements.
**Khắc phục:** WP-8 — xóa `PLT-03` khỏi `requirements-completed` của 4 file, giữ nguyên nội dung mô tả.

---

## F-07 — Soak test (SC4) chưa chạy, **và harness không tự ghi lại dữ liệu gì**

**Severity:** Critical · **Confirmed defect**
**File:** `app/_components/GameHost.tsx:38-88` (harness), `docs/phase8-certification.md:151-152` (Results)

Harness là code thật: `__DEV__ && SOAK_HARNESS`, `SOAK_CYCLE_COUNT` (100), `SOAK_CONTINUOUS_MS`, `setTimeout` rời rạc, log `[soak] complete`. Nhưng:

```
| Pixel 6a | … | 100 | 15 min | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE |
```

Và harness **chỉ cycle + log** — memory growth / frame-time drift phải thu tay bằng `adb dumpsys meminfo` / `gfxinfo` (`phase8-certification.md:137-138`). Nghĩa là **kể cả khi chạy, nó không sinh artifact nào**.

`ROADMAP.md:171` yêu cầu "A mount/unmount soak test shows no worklet or game-loop leaks and no frame-time drift". `phase8-certification.md:146` trung thực ghi "unit green alone does **not** claim soak pass".

**Vấn đề đi kèm:** soak 100 chu kỳ Title↔Playing sẽ **khuếch đại F-18** (glow atlas rò rỉ 4 surface + 4 image mỗi mount → ~400 + 400 object native chờ finalizer).
**Khắc phục:** WP-6 — instrument harness để tự ghi `meminfo`/`gfxinfo` đầu-cuối vào log, rồi chạy.

---

# HIGH

## F-08 — Event ring không được clear ở nhánh `DOCKED` / `WON` / `LOST`

**Severity:** High · **Confirmed defect** (đã tái hiện bằng harness headless)
**File:** `src/core/stepRun.ts:24-26`, `:28-42` vs `src/runtime/useGameLoop.ts:349-354`

```ts
// stepRun.ts:24-26 — nhánh terminal return trước clearEvents
if (phase === SimPhase.WON || phase === SimPhase.LOST) { return; }
// stepRun.ts:28-42 — nhánh DOCKED cũng return trước dòng 46
if (phase === SimPhase.DOCKED) { …; processDocked(…); world.tick += 1; return; }
// stepRun.ts:46 — chỉ nhánh PLAYING clear
clearEvents(world);
```

Hai consumer **cố ý không** clear ring (`src/vfx/consumeEvents.ts:3-4`, `src/vfx/audioBatch.ts:35-36`: "stepRun owns clear policy"), nhưng frame loop drain **vô điều kiện** sau mỗi `stepRun` (`useGameLoop.ts:351-352`). Nhánh `DOCKED` **không** bị freeze (`:337-341` chỉ freeze `WON`/`LOST`/paused/countdown).

Harness (unmodified core, mất mạng khi còn brick sống):
```
step5 phase=DOCKED lives=2 evCount=2 ring=[BALL_OUT,LIFE_LOST]
step6 phase=DOCKED lives=2 evCount=2 ring=[BALL_OUT,LIFE_LOST]
step7 phase=DOCKED lives=2 evCount=2 ring=[BALL_OUT,LIFE_LOST]
after launch phase=PLAYING ring=[BALL_OUT,LIFE_LOST]   ← step launch cũng không clear
next playing step ring=[]
```

**Impact:** sau **mỗi** lần mất mạng, trong toàn bộ thời gian người chơi chờ serve: `life_lost` (pool **1 voice**, `mapping.ts:48`) được `seekTo(0)+play()` lại mỗi substep (~120 lần/giây) → tiếng lặp giật; `punchShake(IMPULSE_LIFE_LOST)` dùng `max(amp, impulse)` (`shake.ts:14-15`) nên `shakeAmp` bị **ghim ở biên độ tối đa và không bao giờ decay**. Tương tự nhưng giới hạn 1 frame cho `WIN`/`LOSE`. State sim không bị sai (lives/phase không dẫn xuất từ event; scoring chỉ chạy sau `clearEvents`).
**Khắc phục:** gọi `clearEvents(world)` ở đầu `stepRun` cho **mọi** phase, hoặc để runtime clear sau khi drain (bền hơn với caller tương lai). Test: WP-2.

## F-09 — `StyleSheet.absoluteFillObject` không tồn tại trong RN 0.86 → 4 overlay mất scrim toàn màn hình

**Severity:** High · **Confirmed defect** (đây là nửa runtime của các lỗi `tsc`)
**File:** `src/runtime/overlays/CountdownOverlay.tsx:35`, `PauseOverlay.tsx:63`, `ResultOverlay.tsx:75`, `LevelErrorOverlay.tsx:49`

```ts
scrim: {
  ...StyleSheet.absoluteFillObject,       // ← undefined
  backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},
```

Đã grep xác nhận: `node_modules/react-native/Libraries/StyleSheet/` **zero match** cho `absoluteFillObject`; `StyleSheetExports.js:21-29` chỉ export `absoluteFill` (object đã `Object.freeze`, spread được).

Spread `undefined` là JS hợp lệ nên **không crash** — style âm thầm mất `position:'absolute'` và `top/left/right/bottom:0`. Scrim trở thành child in-flow bình thường của lớp chrome (`GameScreen.tsx:121`, style `:199-207`). Mọi child chrome khác đều absolute tường minh (`HudStrip.tsx:72`, `GameScreen.tsx:209,220`) nên overlay là **child in-flow đầu tiên** → render thành một dải ở đỉnh màn hình, cao bằng panel, lệch xuống theo `paddingTop: insets.top`.

**Impact:** panel Pause / Result / Countdown / LevelError ghim ở đỉnh thay vì giữa; chỉ dải đó bị dim; scrim `pointerEvents="auto"` không còn phủ playfield nên `GestureDetector` bên dưới vẫn hittable trên ~80% màn hình. Gate logic (`gestureGates.ts:13-18`, `usePaddleGesture.ts:50-53`) vẫn chặn serve/pan khi paused nên **không rò rỉ gameplay**, nhưng đây là một modal hỏng và ảnh hưởng trực tiếp RUN-02 ("clear win and lose presentations").
**Khắc phục:** `...StyleSheet.absoluteFill`, hoặc viết thẳng `position:'absolute', top:0, left:0, right:0, bottom:0`. 4 file, 4 dòng.

## F-10 — Frame callback bị unregister/re-register **mỗi lần React render**

**Severity:** High · **Confirmed defect**
**File:** `src/runtime/useGameLoop.ts:286` (closure inline) + `node_modules/react-native-reanimated/lib/module/hook/useFrameCallback.js:36-44`

```js
useEffect(() => {
  ref.current.callbackId = frameCallbackRegistry.registerFrameCallback(callback);
  …
  return () => { frameCallbackRegistry.unregisterFrameCallback(…) };
}, [callback, autostart]);
```

`callback` phải ổn định về identity. Nó không:
1. Plugin worklets sinh callback dưới dạng IIFE factory → function mới + `__closure` mới mỗi lần evaluate.
2. React Compiler **không memo được**: `useGameLoop.ts` bail out hoàn toàn (26 `CompileError: This value cannot be modified` khi chạy `babel-plugin-react-compiler` trực tiếp; `PlayingHost.tsx` và `usePaddleGesture.ts` thì `CompileSuccess`). `/* eslint-disable react-hooks/immutability */` ở `:284`/`:442` chỉ tắt **lint**, không ảnh hưởng Babel — và 4 vi phạm nằm **ngoài** vùng disable (`:478`, `:492`, `:529`, `:535`, `:569`).

**Impact:** `PlayingHost` re-render mỗi lần `setScore`/`setCombo`/`setLives`/`setStallTier`/`setSimPhaseNum`/`setUiPhase`/`setCountdownNumeral`. Trong multiball trên board dày, tần suất tiến tới ~1 lần/frame. Mỗi lần là một lượt serialize lại toàn bộ frame-callback graph **trên JS thread** — nguyên nhân kinh điển của "game giật khi điểm nhảy". Phụ: `FrameCallbackRegistryUI.js:79` set `startTime = null` khi re-register nên frame đầu sau mỗi lần báo `timeSincePreviousFrame: null`, và `useGameLoop.ts:326-329` thay bằng hardcode 16.67ms → **thời gian thực bị bỏ một lần mỗi render**.
**Khắc phục:** ổn định identity — `useCallback` với dep chỉ gồm SharedValue (đều là identity ổn định), hoặc hoist ra module-level worklet factory gọi một lần. Kết hợp quyết định tường minh về trạng thái compiler của `useGameLoop` (F-46).

## F-11 — CCD miss-path advance **hai lần** trong cùng một step

**Severity:** High · **Confirmed defect**
**File:** `src/core/step.ts:279-282` và `:378-386`

```ts
// :279-282  miss → advance rồi break, KHÔNG zero `remaining`
if (bestKind < 0 || bestT > 1) { advanceBall(world, bi, remaining); break; }
```
```ts
// :378-386  chỉ xét bộ đếm lượt
if (remaining > toiEps && world.ballActive[bi]) {
  const stillHasTime = remaining > toiEps;
  if (stillHasTime && ccd >= maxCcd) { advanceBall(world, bi, remaining); }
}
```

`ccd` tăng ở đầu mỗi lượt (`:93`). Nếu ball va chạm ở lượt 1-4 rồi **trượt** ở lượt 5 thì `ccd === maxCcd (5)` **và** `remaining` vẫn giữ giá trị trước khi advance → ball bị dịch thêm một lần nữa. Comment trong file ("miss path already advanced and broke with remaining unused conceptually") cho thấy hai đường thoát đã bị lẫn nhưng không được phân biệt.

**Impact:** tối đa một step chuyển động không kiểm tra va chạm (~6 đơn vị logic ở tốc độ tối đa) cho một ball vừa bật 4 lần trong 8.3ms — khả thi ở góc giữa paddle và tường, hoặc trong cụm brick dày. Hệ quả: bỏ qua geometry, ball có thể kết thúc nằm trong brick (được đường `inside` của sweep xử lý ở step sau), bounce lệch, và tệ nhất là `BALL_OUT` giả. Deterministic nên không phá replay hash — nhưng là vật lý sai.
**Khắc phục:** `remaining = 0` trước `break` ở miss path, hoặc dùng cờ `exitedOnMiss` tường minh.

## F-12 — Ball chồng collider không bao giờ được depenetrate; CCD cạn lượt rồi advance **xuyên qua** collider

**Severity:** High · **Confirmed defect** (đã tái hiện bằng harness)
**File:** `src/core/step.ts:307-315`, `:377-386`, `src/core/physics/sweep.ts:134`

```ts
// step.ts:314-315 — chỉ 1e-4 tách rời, bất kể độ xuyên
world.ballX[bi] = world.ballX[bi] + nx * sepEps;
world.ballY[bi] = world.ballY[bi] + ny * sepEps;
```

Khi tâm ball bắt đầu **bên trong** AABB mở rộng Minkowski, `sweep` trả `t = 0` (`sweep.ts:134`: `let t = inside ? 0 : tEnter;`) → `tAbs = 0` → `remaining` không giảm → cả 5 lượt CCD bắn ở cùng vị trí. `SEPARATION_EPS = 1e-4` (`constants.ts:62`) không thể giải quyết độ xuyên vài đơn vị. Sau đó rơi xuống `:384` và integrate **toàn bộ** step mà không test va chạm.

Harness (paddle `y=616..628`, tâm ball đặt dưới paddle, `vy=+360`, `stepWorld` không sửa):
```
y0=629 step0 pos=(180.000,625.9994) v=(0.0,-360.0) ev=PADDLE,PADDLE,PADDLE,PADDLE,PADDLE
y0=629 step1 pos=(180.000,622.9988) v=(0.0,-360.0) ev=PADDLE×5
y0=629 step3 pos=(180.000,616.9976) v=(0.0,-360.0) ev=PADDLE×5   ← đã lên trên đỉnh paddle
```

**Impact:** (a) một ball đã vượt qua paddle (tâm 628-634 — trạng thái xảy ra mỗi khi người chơi trượt paddle xuống dưới một ball gần như đã mất) được **cứu âm thầm** và bị kéo ngược **xuyên thân paddle** ở 360 u/s thay vì sinh `BALL_OUT`; (b) 5 `PADDLE_HIT`/step × tối đa 2 substep/frame đi vào audio batch mà `playBatch` không dedupe (`expoAudioService.ts:114-142`) → tiếng liên thanh; (c) cùng cơ chế bên trong brick breakable trừ 1 HP mỗi step từ bên trong (harness: `hp 5→4→3→2` khi tâm dao động tại `y=170/173` **trong** brick `y=150..190`), và bên trong brick unbreakable thì **không bao giờ tách ra**.
**Khắc phục:** thêm pass depenetration trước vòng CCD (đẩy tâm ra mặt gần nhất + `radius + eps` cho mọi collider đang chồng); advance sau khi cạn lượt phải là zero-length hoặc sweep-limited; dedupe event cùng-collider trong một step (giống ý tưởng `brickDamagedThisStep`, áp cho paddle/wall).

## F-13 — Particle nổ **không bao giờ** thừa hưởng màu brick (vi phạm D-08 / FX-02)

**Severity:** High · **Confirmed defect**
**File:** `src/core/step.ts:355-361` + `src/vfx/consumeEvents.ts:22-42`, `:82-84`

```ts
// step.ts:357-361 — HP bị zero TRƯỚC khi push event
let hp = world.brickHp[bIdx] - 1;
if (hp < 0) hp = 0;
world.brickHp[bIdx] = hp;
if (hp <= 0) {
  pushEvent(world, EventCode.BRICK_BREAK, bi, bIdx, hx, hy);
```

`consumeEventsForVfx` resolve màu từ HP **đã bằng 0** (`consumeEvents.ts:82-84` → `defaultResolveBrickRgb` `:22-42`): `hp = 0` không `>= 3`, không `=== 2`, nên rơi xuống `:41` → `{0.949, 0.8, 0.561}` = `#F2CC8F`, màu amber của HP1.

**Impact:** mọi brick bị phá — magenta `#C44569`, orange `#E07A5F`, hay amber — đều nổ ra **cùng một màu amber** (75% spark; ~25% còn lại là đốm trắng/cyan theo `particles.ts:75-85`). Trái trực tiếp với `07-CONTEXT.md:30` (D-08 "Particle colors: inherit brick color") và `07-UI-SPEC.md:179`. Chip không bị ảnh hưởng thấy được (HP sau khi trừ trùng đúng màu mới của brick).
**Khắc phục:** mang HP trước-khi-trừ vào một slot của event (`evA` còn rỗi cho brick) và resolve từ đó, hoặc snapshot RGB tại chỗ push.

## F-14 — Glow atlas bake ở `44×18`; level mặc định (level-03) dùng brick `32×14`

**Severity:** High · **Confirmed defect**
**File:** `src/render/textures/bakeGlowSprites.ts:15-19` vs `assets/levels/level-03.json` grid vs `app/_components/PlayingHost.tsx:83`

```ts
/** Reference brick cell from level-01 (logical px). */
const BRICK_W = 44;
const BRICK_H = 18;
const PAD_SOFT = 4;
```

Đã xác minh grid của level-03: `{cols:10, rows:16, originX:2, originY:48, brickW:32, brickH:14, gapX:4, gapY:2}`. Và `PlayingHost.tsx:83` → `useState<LevelId>('level-03')`.

Blit chỉ theo vị trí, không có destination rect (`recordSprites.ts:214`):
```ts
canvas.drawImage(img, bx - GLOW_PAD_SOFT, by - GLOW_PAD_SOFT, tools.paint);
```

**Impact:** sprite 52×26 đặt lên brick 32×14 → halo trùm quá **16px sang phải và 8px xuống dưới** (trần của UI-SPEC là 8px, `07-UI-SPEC.md:42`). Vì `bakeHalo` còn fill toàn bộ footprint 44×18 ở `edgeAlpha*0.35` (`bakeGlowSprites.ts:59-60`), mỗi brick có thêm **một khối màu đặc thò ra góc dưới-phải** mà fill phẳng không che. Trên level-03 hiệu ứng đọc thành "brick bị nhòe/lệch", không phải glow.
**Khắc phục:** truyền `brickW`/`brickH` thật vào `bakeGlowSprites`, key atlas theo `color×w×h`, hoặc blit bằng `drawImageRect` đúng kích thước `(bw+2*pad, bh+2*pad)`.

## F-15 — `setAntiAlias` không bao giờ được bật trong record path

**Severity:** High · **Confirmed defect** (đã grep xác nhận: **đúng một** occurrence trong toàn `src/`)
**File:** `src/render/recordSprites.ts:35-49` (paint tạo trần), vs `src/render/textures/bakeGlowSprites.ts:44` (chỗ duy nhất có AA)

```ts
tools = { recorder: Skia.PictureRecorder(), paint: Skia.Paint(), … }
```

Default của `SkPaint` là AA **off**.

**Impact:** mọi `drawCircle` và `drawLine` trong frame đều răng cưa: ball sống (`recordSprites.ts:352`), tối đa 40 trail ghost (`:327`), viền cyan (`:335`), tối đa 192 particle (`:254`), destroy flash (`:267`), và damage-cue stroke rộng **1.25px** (`:234`) — stroke sub-pixel không AA sẽ mất nét hoặc nhân đôi, ảnh hưởng trực tiếp LVL-02 ("non-color cue" phải đọc được). Chỉ có halo — thứ không cần AA — là mượt. Đây là khoảng cách thị giác lớn nhất so với mục tiêu "neon kiểu Shatter" và là **fix một dòng**.
**Khắc phục:** `tools.paint.setAntiAlias(true)` một lần trong `ensureRecorderTools` (`recordSprites.ts:39-45`). Chi phí không đáng kể với ~250 hình nhỏ; đo lại bằng gfxinfo.

## F-16 — Trail ring không bao giờ được clear → vệt ghost của ball cũ dính sang ball sống

**Severity:** High · **Confirmed defect**
**File:** `src/vfx/trails.ts:23-25` (writer duy nhất), `src/core/step.ts:18-38` (`compactBallPool`), `src/runtime/useGameLoop.ts:450-451`

Grep toàn `src/`: `trailX`/`trailY`/`trailHead` chỉ được ghi ở `trails.ts:21-25` và chỉ được đọc ở `recordSprites.ts:313-320`. **Không có đường reset nào.** Hai hệ quả:

1. **Slot compaction.** `step.ts:18-38` dồn ball sống về dense prefix, copy ball *i* xuống slot *write*. Trail ring index theo slot (`recordSprites.ts:312`, `useGameLoop.ts:124`) và **không được migrate**. Khi ball 0 chết trong rally 3 ball, ball sống từ slot 1 chuyển vào slot 0 và **thừa hưởng 5 ghost sample của ball đã chết**.
2. **Retry.** `useGameLoop.ts:450-451` reset flash nhưng comment rõ "*keep Vfx pools*" → sau Retry, ball docked ở slot 0 vẫn mang vị trí của ván trước.

**Impact:** ~5 frame render một vệt circle bán kính đầy trải từ vị trí ball cũ tới ball sống — chính artifact đọc-được mà FX-01 tồn tại để ngăn. `tests/vfx.trails.test.ts` chỉ test một slot nên không thấy.
**Khắc phục:** zero ring liên quan khi `retry()` và khi `activeBallCount` giảm; hoặc seed mọi sample của ring mới-được-chiếm bằng vị trí hiện tại của ball để trail co về một điểm.

## F-17 — ~452 `Skia.Color()` + 192 template string + ~103 array cue mỗi frame

**Severity:** High · **Confirmed defect**
**File:** `src/render/recordSprites.ts:160, 181, 221, 231, 252, 265, 278, 294, 325, 333, 345` (`Skia.Color`), `:72-115` + `:226` (cue), `:244-252` (particle), `src/runtime/useGameLoop.ts:345-348` (intent), `src/vfx/consumeEvents.ts:61-66` (closure rng)

`SkColor` là `Float32Array` và `Skia.Color(string)` là JSI host function: mỗi lần gọi chuyển JS string → `std::string`, chạy CSS color parser, rồi **dựng một `Float32Array(4)` mới bằng cách gọi constructor JS từ C++** (`node_modules/@shopify/react-native-skia/cpp/api/JsiSkColor.h:31-45,89-96`); `paint.setColor` đọc ngược qua JSI bằng `getProperty("buffer")` + `getArrayBuffer`.

Các chỗ tệ nhất:
- `:252` — `Skia.Color(\`rgb(${pr}, ${pg}, ${pb})\`)` **trong vòng particle** (`:244`, chạy tới `vfx.particleCap` = 128 Mid / 192 High): mỗi particle mỗi frame là một lần build string + một lần parse CSS. Trong khi `vfx.r/g/b/a` **đã** là float 0-1 — vòng `×255 → string → parse → ÷255` là lãng phí thuần.
- `:226` — `planBrickDamageCuesLocal(...)` **trong vòng brick** (`:190`); helper `:72-115` trả **array mới + 1-3 object literal mới** mỗi lần, kể cả đường "không có gì để vẽ" cũng cấp một `[]` mới (`:89`). Với level-03: ~103 array + tới ~216 object mỗi frame.
- `useGameLoop.ts:345-348` — một object `intent` mới **mỗi substep** (tới 5/frame).
- `consumeEvents.ts:61-66` — closure `rng` cấp mới **mỗi substep**.

Phép tính chi tiết trong [PERFORMANCE-REVIEW.md](./PERFORMANCE-REVIEW.md): ~**970 allocation/frame ≈ 58.000/giây** ở 60fps.

**Điểm tích cực để không phá:** `PictureRecorder`, một `SkPaint` duy nhất và ba `SkRect` **đã được reuse đúng** qua global UI-runtime (`recordSprites.ts:31-49`) và mutate bằng `setXYWH`; **không có `SkPath` nào được tạo**. Anti-pattern "Paint/Path per frame" không tồn tại — vấn đề là màu.
**Khắc phục:** pre-convert palette cố định thành `Float32Array` cache một lần; particle dùng `setColorComponents`/scratch 4-float lấy trực tiếp từ `vfx.r/g/b/a`; `planBrickDamageCuesLocal` viết vào `Float32Array(12)` scratch + trả count; hoist `intent` và closure `rng`.

## F-18 — Skia offscreen surface + SkImage của glow atlas không bao giờ `dispose()`; rò rỉ theo từng chu kỳ Title↔Playing

**Severity:** High · **Potential risk** (cơ chế confirmed; quy mô cần trace memory trên thiết bị)
**File:** `src/render/textures/bakeGlowSprites.ts:38-40`, `:62`, `:75-81`; `app/_components/PlayingHost.tsx:182`, `:198-203`

```ts
// bakeGlowSprites.ts:38-40, :62
Skia.Surface.MakeOffscreen(width, height)   // không bao giờ dispose()
…
surface.makeImageSnapshot()                 // SkImage không bao giờ dispose()
```
`bakeGlowSprites()` tạo **4 surface + 4 image** mỗi lần gọi. `PlayingHost.tsx:182` gọi nó **mỗi lần mount**; cleanup `:198-203` chỉ release audio và null `playBatchRef`:
```ts
return () => { cancelled = true; playBatchRef.current = null; audio.release(); };
```
Không clear `glowAtlasSv`, không dispose image.

**Impact:** DEV soak harness chạy 100 chu kỳ Title↔Playing (`GameHost.tsx:38-88`) → ~400 offscreen surface + 400 image để lại cho JSI finalizer. Đây là nguồn OOM khả dĩ nhất trên Android RAM thấp, và là thứ mà soak test (F-07) tồn tại để phát hiện.

**Phần teardown còn lại thì sạch** (đã kiểm tra từng cái): subscription `AppState` được remove (`useGameLoop.ts:508-510`), listener `AccessibilityInfo` được remove (`useVfxIntensity.ts:36-38`), timer countdown được clear (`PlayingHost.tsx:144-151`), timer soak được clear (`GameHost.tsx:82-87`), audio player được release (`expoAudioService.ts:148-162`), frame callback được unregister (`useFrameCallback.js:40-43`), `useKeepAwake` tự deactivate.
**Khắc phục:** `surface.dispose()` sau `makeImageSnapshot()`; trong cleanup của PlayingHost, iterate `glowAtlasSv.value` và `variant.soft.dispose()` rồi `glowAtlasSv.value = null`. Tốt hơn: hoist atlas thành singleton module-level bake một lần mỗi lần launch app (khi đó F-14 phải giải bằng `drawImageRect`).

## F-19 — Phase 7 SC-5 (một tiêu chí **đo lường**) được đánh `VERIFIED` dựa trên tài liệu *hướng dẫn cách đo*

**Severity:** High · **Confirmed defect** (quy trình)
**File:** `.planning/milestones/v1.0-phases/07-feedback-neon-vfx-audio/07-VERIFICATION.md:30`, `:32`, `:127`

SC-5 (`ROADMAP.md:151`): "Every effect added is **measured on the named Android reference device** and stays inside the Phase 1 frame budget". Grade: `✓ VERIFIED (procedure + debt)`, bằng chứng: "`docs/phase7-vfx-measurement.md` references methodology + gfxinfo … Results row still OPEN". Rồi `:32` cho điểm `5/5 must-haves verified`, và `:127` hạ debt xuống "**optional** MVP debt".

`ROADMAP.md:199` trung thực hơn: "Pixel 6a gfxinfo → Phase 8 debt".

**Impact:** đây là ví dụ rõ nhất của evidence-type substitution trong repo. Một tài liệu mô tả *cách* đo không phải một phép đo.
**Khắc phục:** WP-8 — hạ SC-5 về không-đạt tới khi có số liệu; WP-6 để lấy số liệu.

## F-20 — Waiver hardware Phase 1 chưa bao giờ được discharge; hai hạng mục con mồ côi

**Severity:** High · **Confirmed defect** (quy trình)
**File:** `01-VERIFICATION.md:5-20`, `:62-66`; `docs/device-gate-results.md:24`, `:36`, `:44-46`, `:87`; `01-04-SUMMARY.md:75`; `.planning/REQUIREMENTS.md:56`

3/8 must-have của Phase 1 được owner waive; `:62-66` liệt kê ba việc phải mở lại trước MVP. D1 (Android install) và D3 (gfxinfo 256 sprite) được track vào Phase 8. Nhưng:
- **D2** (SC-2 worklet mutation trên profiling/release, `device-gate-results.md:44-46`) **không xuất hiện trong plan, CONTEXT, hay bảng Results nào của Phase 8** — và schema Results của Phase 8 (p50/p95/jank) **không có ô nào biểu diễn được** "release-build worklet mutation".
- **D4** (iOS profiling SC-2 chưa re-run sau fix HUD font, `01-04-SUMMARY.md:75`, `device-gate-results.md:24`) ghi "open follow-up" **không owner, không phase** → biến mất hoàn toàn.

Chính `REQUIREMENTS.md:56` ghi: *"Hardware 60 FPS / Android install waived for Phase 1 close (simulator interim); re-cert before MVP (D-04/D-05)."*
**Khắc phục:** WP-8 — mở lại D2/D4 với plan sở hữu và một ô Results biểu diễn được chúng.

## F-21 — PHYS-05 "aimed release" **không tồn tại**: serve luôn chính xác thẳng đứng

**Severity:** High · **Confirmed defect** (đã tái hiện bằng harness)
**File:** `src/core/rules/serve.ts:53-61`, `:9-23`, `:36-42`; `src/input/usePaddleGesture.ts:107-122`; `src/core/types.ts:47-48`

```ts
// serve.ts:53-61
export function processDocked(world: World, intent: Intent, serveSpeed: number): void {
  'worklet';
  dockBall(world);                          // ← re-snap ballX = paddleX mỗi step docked
  const launch = intent.launch;
  if (Number.isFinite(launch) && launch !== 0) { applyServe(world, serveSpeed); … }
```
```ts
// serve.ts:17-18 (dockBall)      // serve.ts:36-42 (applyServe)
world.ballX[bi] = world.paddleX;  resolvePaddleEnglish(world.ballX[bi], world.paddleX, half, 0, -serveSpeed);
```

Vì `dockBall` force `ballX === paddleX`, tham số english `t = (ballX - paddleCx)/paddleHalfW` (`resolve.ts:91`) **luôn = 0**. Input launch duy nhất là boolean (`usePaddleGesture.ts:120`: `launchFlag.value = 1`); `Intent` không có trường góc.

Harness với pre-offset cố ý:
```
offset=0   → vx=0 vy=-360
offset=20  → vx=0 vy=-360
offset=-30 → vx=0 vy=-360
offset=35  → vx=0 vy=-360
```

**Nghiêm trọng hơn:** `tests/rules.serve.test.ts:36-45` có comment *"Offset ball from paddle center so english produces non-zero vx"* rồi chỉ assert `|vy| > |vx|` — test **tin rằng** nó đang kiểm chứng một serve lệch góc mà code không thể sinh ra. Đây là một test sai hợp đồng, không phải một test yếu.

**Impact:** mỗi mạng bắt đầu bằng một serve thẳng đứng giống hệt nhau; không có "nhiều lựa chọn quỹ đạo mở màn" (`.planning/research/FEATURES.md:54`); cú bật đầu tiên hoàn toàn bị quyết định bởi layout brick phía trên paddle. Kết hợp F-02 (level-02 gate kênh 2 đơn vị) thì không có cách ngắm vào kênh đó.
**Khắc phục:** nếu aiming là chủ ý — thêm `aimAngle` vào `Intent` (drag-to-aim khi docked) và đưa vào `applyServe`; nếu không — xóa lời gọi english chết, ghi rõ serve cố định, và **sửa test cho đúng hợp đồng thật**.

---

# MEDIUM

## F-02 — `level-02`: 8/16 breakable (50%) bị gate sau một hàng steel full-width, chỉ vào được qua kênh 14 đơn vị cho ball 12 đơn vị
**Severity:** Medium · **Confirmed defect** (đã đo bằng bot headless) · `assets/levels/level-02.json:6-13, 21-27`

Hàng (`originX=14, pitchX=48, brickW=44`; `originY=56, pitchY=22, brickH=18`): row0 `"X1.1.1X"` y 56-74, row1 `"X22222X"` y 78-96, row2 `"XXXXXXX"` y 100-118 ← **steel full-width**. Row 0-1 còn bị chặn steel ở col0 (x 14-58) và col6 (x 302-346). Lối vào duy nhất là kênh sát tường `x ∈ [0,14]`; với `BALL_RADIUS = 6`, tâm ball phải ở trong `x ∈ [6,8]` — **2 đơn vị dung sai** — suốt chiều cao các cột steel. Khe giữa brick là 4 đơn vị, không thể lọt ball đường kính 12.

Bot bám ball tuyệt đối, 12 seed offset, budget 300s mỗi seed: **10/12 run plateau đúng ở 8 brick bị gate suốt 5 phút**; seed8 WON ở 255s, seed10 WON ở 142s.

Production chỉ boot level-03 (`src/runtime/loadLevel.ts:30`) và switch là `__DEV__`-gated (`PlayingHost.tsx:556-557`) nên player exposure hiện tại = 0.
**Khắc phục:** nếu level-02 chỉ là fixture compile/regression → ghi rõ trong `name`/comment; nếu là level chơi được → mở hàng steel (khe ≥ 2·radius + margin) hoặc dịch cột steel khỏi tường.

## F-03 — Các gate quy trình đã bật trong config bị bỏ qua mà không có waiver
**Severity:** Medium · **Confirmed defect** · `.planning/config.json:17,31,34` vs cây `.planning/milestones/v1.0-phases/`

`plan_check: true` → PLAN-CHECK chỉ có ở **2/8** phase (02, 08). `code_review: true` → REVIEW chỉ có ở **2/8** (05, 07). `pattern_mapper: true` → thiếu `01-PATTERNS.md`. VERIFICATION thiếu ở Phase 8. `nyquist_compliant: false` ở `03-VALIDATION.md:5`, `04-VALIDATION.md:5`, `06-VALIDATION.md:5`, `08-VALIDATION.md:6`. `03-VALIDATION.md:82-90` và `04-VALIDATION.md:83-90`: **mọi checkbox sign-off trống**, "Approval: pending" — trong khi cả hai phase đều `Complete` ở `ROADMAP.md:195-196`.

## F-22 — `MIN_VERTICAL_RATIO` không được enforce ngoài paddle english; ball near-horizontal stall trọn 12 giây, tier 2 là no-op ở max speed
**Severity:** Medium · **Confirmed defect** (đã tái hiện) · `src/core/physics/resolve.ts:100-112`, `src/core/rules/stall.ts:186-215`, `:67-70`

`reflectVelocity` (`resolve.ts:11-56`) bảo toàn tốc độ và hướng chính xác, **không có sàn góc**. `MIN_VERTICAL_RATIO` (`constants.ts:44`) chỉ được áp trong `resolvePaddleEnglish` và `applyTier3AngleNudge`.

Harness (`v = (720, 0.5)`, một brick không tới được để phase giữ `PLAYING`):
```
tick 100  |vy|/spd=0.0007 spd=720.00 tier=0
tick 960  |vy|/spd=0.0007 spd=720.00 tier=1   ← tier 1 không làm gì
tick 1200 |vy|/spd=0.0007 spd=720.00 tier=2   ← tier 2 bị clamp, tốc độ không đổi
tick 1440 |vy|/spd=0.4695 spd=720.00 tier=3   ← chỉ tier 3 phục hồi
```
`applyTier2SpeedBoost` clamp về `maxSpeed = 720` (`stall.ts:68-70`) nên khi ball đã ở 720 thì can thiệp tier 2 **không đổi gì cả**; phục hồi phải chờ tier 3 ở `STALL_IDLE_TICKS + STALL_TIER3_EXTRA_TICKS = 1440` tick = **12 giây**.
**Khắc phục:** enforce sàn tỉ lệ dọc ngay sau `reflectVelocity` trong `step.ts:320-347`; cho tier 2 áp angle nudge khi clamp tốc độ khiến velocity không đổi.

## F-23 — Tier-3 angle nudge lấy dấu theo **parity của ball index**, nên thường xoay *về phía nằm ngang*
**Severity:** Medium · **Confirmed defect** · `src/core/rules/stall.ts:108-113`

```ts
const sign = i % 2 === 0 ? 1 : -1;
const theta = sign * nudgeRad;
let nvx = vx * c - vy * s;
let nvy = vx * s + vy * c;
```
`05-05-PLAN.md:81` yêu cầu "rotate … toward steeper (increase |vy| share)"; D-16 nói "controlled angle correction **away from near-horizontal**". Vì dấu chỉ phụ thuộc parity slot, khoảng nửa số heading bị làm **nông hơn**. Ví dụ ball 0 đi lên-phải `vx=300, vy=-400` (|vy|/speed = 0.80): sau `+8°` → `nvx ≈ 352.8, nvy ≈ -354.4` → |vy|/speed ≈ 0.709 — **nằm ngang hơn**. Sàn `MIN_VERTICAL_RATIO` (`stall.ts:132-146,159-165`) chỉ chặn trường hợp cực đoan (cos 62° ≈ 0.469). Test hiện có (`tests/rules.stall.test.ts:102-116`) chỉ assert finite + sàn nên pass cả hai chiều.
**Khắc phục:** lấy dấu từ heading để `|vy|` luôn tăng (ví dụ tính cả hai hướng rồi giữ hướng có `|vy|/speed` lớn hơn), có thể XOR với parity để giữ fan-out multi-ball mà vẫn deterministic.

## F-24 — 4 `runOnJS` từ `app/` nằm ngoài scope rule LC-07, và ma trận ESLint có 4 lỗ
**Severity:** Medium · **Confirmed defect** (đã probe từng rule bằng `eslint --stdin`) · `eslint.config.js:81`, `:66-90`, `:106-143`; `app/_components/PlayingHost.tsx:6`, `:335`, `:344`, `:353`, `:362`; `docs/layer-contract.md:25-27`

Rule nào **bắn thật** (đã verify): core→RN (`no-restricted-imports`), core→runtime / core→services / render→runtime / app→core / runtime→services (`boundaries/dependencies`), `Date.now` trong core, `runOnJS` trong `src/runtime`.

Bốn lỗ (đã verify **không** bắn):
1. **LC-07 không phủ `app/`** — `eslint.config.js:81` scope `files: ['src/runtime/**/*.{ts,tsx}', 'src/render/**/*.{ts,tsx}']`. `PlayingHost.tsx` import `runOnJS` (`:6`) và gọi ở `:335, :344, :353, :362` — **4 hop UI→JS từ tầng app**, vô hình với rule tồn tại để kiểm soát chính việc đó. `docs/layer-contract.md:25` ghi exception duy nhất được phép là `src/runtime/eventBridge.ts`.
2. `runOnRuntime` / `runOnUI` / dạng member-call **không bị hạn chế**: selector là `CallExpression[callee.name='runOnJS'|'scheduleOnRN']` nên `Reanimated.runOnJS(...)` lọt.
3. **LC-08** ("render không mutate world") **không có cơ chế enforce** — `eslint-plugin-boundaries` chỉ thấy import. (`layer-contract.md:26` đã ghi "Boundaries + review" nên là trung thực, nhưng không có gì cơ học chặn.)
4. **LC-11** ("không React state update mỗi frame") doc-only (`layer-contract.md:27`).

Thêm: `boundaries.configs.recommended.rules` (spread ở `:121`) set `no-unknown-files: 0`, `no-private: 0`, `no-unknown-dependencies: 0` → `src/devflags.ts` không khớp `boundaries/elements` pattern nào (`:109-118`) và **hoàn toàn không bị quản lý**; deep import vào `src/render/textures/**` được phép.
**Khắc phục:** mở scope `:81` thành `['src/runtime/**','src/render/**','app/**']` giữ override cho `eventBridge.ts`; thêm selector cho `runOnRuntime`/`runOnUI`/member form; **hoặc** chuyển chrome bridge ra `src/runtime` để exception trở nên tường minh.

## F-25 — Bốn `useAnimatedReaction` riêng biệt → tối đa 3-4 React render mỗi frame
**Severity:** Medium · **Potential risk** · `app/_components/PlayingHost.tsx:329-365`

Sim chạy hoàn toàn trên UI runtime, không `setState` nào trong loop — PHYS-06 được thỏa. Nhưng cầu về JS là **bốn** reaction độc lập: `:329-338` (phase|lives → `applyWorldChrome`), `:340-347` (score), `:349-356` (combo), `:358-365` (stallTier). `src/core/rules/scoring.ts:36-54` đổi `score`/`combo` trên `PADDLE_HIT`/`BRICK_HIT`/`BRICK_BREAK`, nên với multiball trên board dày một frame có thể đổi cả ba → **ba React render riêng biệt**, mỗi cái kéo theo F-10 (re-serialize frame callback).

Điểm tốt: `valueSetter` short-circuit ghi trùng giá trị nên 5 mirror/frame (`useGameLoop.ts:392-396`) không đánh thức reaction nếu không đổi; và `eventBridge.ts:25` chỉ bắn tối đa 1 `scheduleOnRN`/frame (đúng chuẩn).
**Khắc phục:** gộp 4 reaction thành 1 pack cả 5 mirror và gọi **một** `runOnJS`; throttle score/combo về ~10Hz (cosmetic) hoặc vẽ chúng trong Skia picture thay vì React.

## F-26 — Persistence: không flush khi background, blob lỗi âm thầm reset best về 0, hai instance store phân kỳ
**Severity:** Medium · **Confirmed defect** (ba vấn đề liên quan) · `app/_components/PlayingHost.tsx:289-292`, `:154-164`, `:87`; `src/services/storage/asyncStorageStore.ts:42-51`, `:74-85`; `parseBlob.ts:4-15`; `compareBest.ts:5`; `memoryStore.ts:3-13`; `app/_components/GameHost.tsx:30`

```ts
// PlayingHost.tsx:289-292
if (record) { previousBestRef.current = best; void store.setBest(best).catch(() => {}); }
```
1. **Fire-and-forget.** Không await, không re-write khi `AppState` → background (`appStatePause.ts:17-22` chỉ pause), không handler Android Back (F-30). Force-quit/swipe-away ngay sau khi lập kỷ lục có thể mất. (Điểm tốt: tần suất ghi rất thấp — chỉ khi có kỷ lục mới, cuối ván; không I/O per-frame.)
2. **Blob lỗi phá kỷ lục.** `parseBlob.ts:4-15` trả `0` cho **mọi** blob malformed → `previousBestRef.current = 0` → ván tiếp theo với điểm bất kỳ được coi là kỷ lục (`compareBest.ts:5` `runScore > previousBest`) và **ghi đè** best thật. Một byte lỗi là mất vĩnh viễn, không phải chỉ không đọc được.
3. **Hai store độc lập.** `GameHost.tsx:30` tạo store mới mỗi lần vào Title; `PlayingHost.tsx:87` tạo store riêng. Khi native module thiếu, `asyncStorageStore.ts:42-51` fallback `createMemoryPersonalBestStore()` — closure mới với `bestScore = 0` mỗi lần (`memoryStore.ts:3-13`) → best không lan từ Playing sang Title và bị reset mỗi lần vào Title.
**Khắc phục:** một instance store duy nhất ở module scope/context; await ghi trước khi cho navigate, hoặc re-write khi `AppState → background`; phân biệt "absent" vs "corrupt" (key sidecar, hoặc từ chối hạ best khi parse fail).

## F-27 — Anti-stall không có escalation nào sau tier 3
**Severity:** Medium · **Potential risk** · `src/core/rules/stall.ts:210-215`

Can thiệp bắn một lần khi vào tier (`prevTier` gate) — khớp plan (`05-05-PLAN.md:80`). Hệ quả: một orbit thực sự tuần hoàn sống sót qua một cú ×1.08 và một cú nudge 8° sẽ **tồn tại vô hạn** ở tier 3 mà không có can thiệp nào nữa, trong khi SC-5 hứa escalation "until it breaks out". Thực tế paddle người chơi sẽ phá quỹ đạo nên đây là risk, không phải defect. Ghi chú thêm: `stallIdleTicks`/`stallTier` **cố ý** sống qua life reset (D-18, run-level; `lives.ts:27-50` reset pickup/effect/combo nhưng không reset stall) nên một serve mới có thể bắt đầu ngay ở tier 3 với ngân sách escalation đã dùng hết.

## F-28 — `punchShake` nhân `intensity` hai lần → một cú nổ mới có thể **giảm** shake đang chạy
**Severity:** Medium · **Confirmed defect** · `src/vfx/shake.ts:14-15`

```ts
const capped = Math.min(2.5, Math.max(vfx.shakeAmp, impulse));
vfx.shakeAmp = capped * intensity;
```
`vfx.shakeAmp` **đã** được nhân `intensity`, nên phép merge so một giá trị đã scale với impulse chưa scale rồi scale lại. Ở reduced-motion (0.2): `LIFE_LOST` → `amp = 2.0 × 0.2 = 0.4`; `BRICK_BREAK` tiếp theo → `min(2.5, max(0.4, 1.2)) × 0.2 = 0.24` — **thấp hơn 0.4 đang chạy**. Test chỉ dùng `intensity = 1.0` cho merge (`tests/vfx.shake.test.ts:8-16,40-48`) nên xanh.
**Khắc phục:** `vfx.shakeAmp = Math.min(2.5, Math.max(vfx.shakeAmp, impulse * intensity));`

## F-29 — Metrics tính percentile mỗi frame cho một overlay **không thể vẽ**; `PERF_OVERLAY` và `CLIFF_RAMP` không có consumer
**Severity:** Medium · **Confirmed defect** · `src/runtime/useGameLoop.ts:366-373`, `:241-242`; `src/runtime/metrics.ts:82-97`, `:116-121`; `src/devflags.ts:3`, `:10-11`; `eas.json:10`, `:19`; `app/_components/PlayingHost.tsx:227-243`

`pushSample` chạy mỗi frame active và gọi `percentileMs(m, 95)` **và** `percentileMs(m, 99)` — mỗi cái copy 60 float + insertion sort (`metrics.ts:82-95`) ≈ 1.800 phép so sánh/frame, mãi mãi, trên UI runtime.

Không ai đọc: `drawOverlayFlag` default `false` (`:241`), `hudFont` default `null` (`:242`), và `PlayingHost.tsx:227-243` không truyền cái nào → `overlayEnabled` luôn false, `recordSprites.ts:362` không bao giờ gọi `drawOverlay`. `PlayingHost` chỉ destructure `picture, surfaceSize, setActive, retry, injectCertWorstCase` (`:227`) — `metrics` và `spriteTarget` được return (`useGameLoop.ts:627-628`) rồi bỏ.

Trong khi đó `devflags.ts:10-11` export `PERF_OVERLAY`/`CLIFF_RAMP`, `eas.json:10,19` set `EXPO_PUBLIC_PERF_OVERLAY=1` cho profile `development` và `profiling`, và comment `devflags.ts:3` ("Do NOT gate PERF_OVERLAY on `__DEV__` — that hides the overlay in profiling/release builds") **mô tả một hành vi không tồn tại**.

**Impact:** một khoản thuế CPU per-frame vô hình trong production, **và** profiling build không thể hiện overlay FPS mà nó được cấu hình để hiện — làm suy yếu mọi con số sẽ thu trong `docs/phase8-certification.md`, và làm bất khả thi "in-app overlay cross-check" mà `docs/phase7-vfx-measurement.md:11` mô tả.
**Khắc phục:** wire `PERF_OVERLAY` → `drawOverlayFlag`/`hudFont` trong `PlayingHost`, **hoặc** gate `pushSample` theo `overlayEnabled` và chỉ tính percentile khi overlay vẽ. Việc này là **điều kiện tiên quyết** cho WP-6.

## F-30 — Android hardware Back không được xử lý ở đâu cả
**Severity:** Medium · **Confirmed missing** · grep `BackHandler|hardwareBackPress|useNavigation|beforeRemove` trên `src/` + `app/` → **zero match**; `app.json:48` (`"predictiveBackGestureEnabled": false`)

Với một route duy nhất (`app/index.tsx`) và `Stack` ở `_layout.tsx:22-27`, Back trên root screen rơi về default Android: **app thoát giữa ván**, không pause, không `setActive(false)`, không flush personal best (F-26).
**Khắc phục:** subscription `BackHandler` trong `PlayingHost`: `uiPhase === 'playing'` → `onPause()`; `uiPhase === 'paused'` hoặc `result != null` → `onMenu()`; ở Title → cho thoát. Return `true` để consume ở hai case đầu.

## F-31 — Shake là một cú trượt một hướng cố định, không phải rung; và decay theo frame chứ không theo `dt`
**Severity:** Medium · **Confirmed defect** · `src/render/recordSprites.ts:174-176`; `src/vfx/shake.ts:19-36`; `src/vfx/stepVfx.ts:10-14`

```ts
// recordSprites.ts:174-176
// shakeOffset(amp, 0.85, 0.53) — fixed unit-ish direction (no World writes)
canvas.translate(amp * 0.85, amp * 0.53);
```
Hướng là **hằng số compile-time**, không đổi dấu, không jitter, không lấy từ `rngCosmetic`. Cộng với decay đơn điệu ×0.85, playfield **trượt xuống-phải ≤2.5px rồi ease về** — một cú lurch, không bao giờ dao động. Nó cũng luôn để lộ letterbox đen ở cạnh trên/trái (field navy được vẽ *sau* translate, `:180-183`) → nháy bất đối xứng. `shakeOffset()` (`shake.ts:29-36`) tồn tại cho việc này nhưng **chết** trong render path (chỉ `tests/vfx.shake.test.ts:36` gọi). `07-UI-SPEC.md:189` yêu cầu "subtle, short, smooth decay".

Thêm: `stepVfx(vfx, dt, intensity)` forward `dt` cho `stepParticles` nhưng `stepShake` **bỏ qua** `dt` (`stepVfx.ts:10-14`; `shake.ts:19-25` không có tham số `dt`). Hằng `0.85` được đặc tả "per frame @60 Hz" (`07-UI-SPEC.md:192`) nên trên máy 120Hz shake tắt nhanh gấp đôi, khi tụt 30fps thì lâu gấp đôi — desync với particle và flash (đều dt-correct, `useGameLoop.ts:378-379`).
**Khắc phục:** lấy `(nx, ny)` từ `rngCosmetic` hoặc một hạng `sin(tick)` luân phiên rồi đưa qua `shakeOffset`; chuyển decay sang dạng dt-based.

## F-32 — `rngCosmetic` được mix vào `hashWorld` → VFX và setting reduce-motion làm đổi replay hash
**Severity:** Medium · **Confirmed defect** · `src/vfx/consumeEvents.ts:61-66`; `src/core/rng/mulberry32.ts:19`; `src/core/hash.ts:105-106`

```ts
// consumeEvents.ts:61-66
const rng = opts?.rng ?? (() => { 'worklet'; return nextFloat(world.rngCosmetic, 0); });
```
`nextFloat` **mutate** state array (`mulberry32.ts:19`), và `world.rngCosmetic[0]` được mix vào world hash (`hash.ts:106`). Vì số lần advance RNG bằng số particle spawn, và số particle = `round(base × intensity)` (`particles.ts:51`), **hash phụ thuộc vào setting reduce-motion của người chơi**. Chạy có VFX vs `vfx = null` cho hash khác nhau cho cùng input.

`hashWorld` là primitive định danh replay (`tests/physics.golden-replay.test.ts:64`, `tests/rules.stall.test.ts:182-258`), nhưng golden-replay suite **không bao giờ gọi** `consumeEventsForVfx` nên CI không thấy. `07-VERIFICATION.md:28` khẳng định "deleting the VFX layer leaves gameplay identical" — đúng về **gameplay** (đã verify: không có write nào từ `src/vfx`/`src/render` vào World ngoài chính `rngCosmetic`; `tests/runtime.event-drain.test.ts:127` assert `rngGameplay[0]` không đổi) nhưng **sai về replay identity**.
**Khắc phục:** loại `rngCosmetic` khỏi `hashWorld`, hoặc chuyển stream cosmetic ra khỏi `World` vào `VfxState`. Test: `hashWorld(worldWithVfxDrain) === hashWorld(worldWithout)`.

## F-33 — `ensurePools()` nằm trong khối `try` của preload → khi preload fail, 13 player được dựng **trong gameplay**
**Severity:** Medium · **Confirmed defect** · `src/services/audio/expoAudioService.ts:99-111`, `:117`; `mapping.ts:43-51`

Gating thì đúng: `PlayingHost.tsx:168-197` await `audio.preload()` rồi mới `fxReady`; `setActive(true)` và Resume/Retry đều gate theo `fxReady` (`:254-262, 375, 392`). `setAudioModeAsync({ playsInSilentMode: true })` được set (`:100-102`).

Defect: `ensurePools()` nằm *trong* cùng `try`, **sau** các `await` (`:100-108`). Nếu `setAudioModeAsync` reject hoặc **một** `preloadSource` reject → `catch` (`:109-111`) → pool không bao giờ được dựng → dựng lười trong lần `playBatch` đầu (`:117`), tạo **13 player đồng bộ trên JS thread** ngay giữa gameplay (3+3+2+2+1+1+1 theo `VOICE_LIMITS`) → hitch ở cú đánh paddle đầu tiên. Compound: loop preload await **tuần tự** (`:104-106`) nên reject đầu tiên bỏ luôn các source còn lại.
**Khắc phục:** đưa `ensurePools()` ra ngoài `try` (hoặc `try` riêng); dùng `Promise.allSettled` cho các source.

## F-34 — Không dedupe `sfxId` trùng trong một batch → retrigger flam + nguy cơ clipping
**Severity:** Medium · **Confirmed defect** · `src/services/audio/expoAudioService.ts:118-142`; `mapping.ts:43-57`

8 ball phá brick cùng step → 8 code `BRICK_BREAK` vào một lần `playBatch` (tới 5 substep gộp vào batch của một frame). Loop `:118-142` **đồng bộ** qua cả 8, map lên 3 voice `brick_break` theo round-robin (`selectVoiceIndex = cursor % poolLen`) → index 0,1,2,0,1,2,0,1. Voice 0 nhận `seekTo(0)` + `play()` **ba lần trong cùng một JS tick**:
```ts
void Promise.resolve(player.seekTo(0)).then(() => { try { player.play(); } catch {} }).catch(() => {});
```
Chain promise (`:131-141`) được thêm để tránh race seek/play, **không** chống truncation: cả ba microtask callback đều chạy → player bị re-trigger hai lần nữa khi đang phát → stutter/flam thay vì 8 impact riêng biệt. `brick_break` dài 90ms nên phần lớn bị mask; `life_lost` (120ms), `win` (150ms), `lose` (180ms) chỉ có **1 voice** nên retrigger rất rõ — và F-08 khiến `life_lost` retrigger ~120 lần/giây. Về mức: ba bản sao cùng waveform ở volume 0.85 cộng mạch lên ~2.55 linear trước khi OS mixer clamp; waveform giống nhau nên cộng coherent → **clipping khả năng cao** ở một đợt multiball phá tường brick.
**Khắc phục:** dedupe `sfxId` trùng trong một batch (phát một lần, có thể nhích gain theo `min(n,3)` dB), hoặc bỏ retrigger nếu voice được chọn vừa start trong ~40ms.

## F-35 — `release()` là latch một chiều trên một service `useMemo(…, [])`
**Severity:** Medium · **Confirmed defect (latent)** · `src/services/audio/expoAudioService.ts:81`, `:98`, `:115`, `:148-162`; `app/_components/PlayingHost.tsx:90-99`, `:198-202`

Service sống trọn vòng mount. Cleanup của effect preload gọi `audio.release()`. Trong service, `released` là latch vĩnh viễn: `preload()` return ngay nếu released (`:98`), `playBatch()` cũng vậy (`:115`), `pools`/`cursors` bị clear không có đường dựng lại.

Vậy **bất kỳ** lần chạy lại effect đó — Fast Refresh, một dep đổi trong tương lai, hoặc bật React `StrictMode` (double-invoke effect: mount → cleanup → mount) — sẽ release service, và `preload()` của lần mount thứ hai early-return → game **im lặng vĩnh viễn, không lỗi**. `StrictMode` hiện không bật (grep `app/_layout.tsx`: zero match) nên là latent. Phần unmount release thì **đúng và idempotent** (tested, `tests/audio.release.test.ts:50-85`), và không tìm thấy player leak (cả 13 được release ở `:151-159`).
**Khắc phục:** cho `release()` reversible (reset `released` trong `preload()`), hoặc gắn service vào effect thay vì memo `[]`.

## F-36 — `src/runtime/freeze.ts` được test nhưng **production không dùng**
**Severity:** Medium · **Verification gap** · `src/runtime/freeze.ts:16-41`; importer duy nhất: `tests/runtime.freeze.test.ts:9`, `tests/runtime.accumulator-reset.test.ts:7`; bản sao trong production: `src/runtime/useGameLoop.ts:58-64`, `:66-69`, `:334-338`, `:344`

`freeze.ts` export `resetAccumulator`, `clampFrameDt`, `shouldFreezeForUiPhase`, `pendingSubsteps`. Loop thật dùng bản private trùng lặp (`clampFrameDtLocal`, `resetAccumulatorLocal`) và logic inline.

Nghĩa là `tests/runtime.accumulator-reset.test.ts:11-26` ("clamp then reset leaves 0 pending steps (no catch-up)") chứng minh một tính chất của hàm **không bao giờ được app gọi** — trong khi đường thật lại là đường bị F-01 phá.
**Khắc phục:** xóa `freeze.ts` và trỏ test vào helper thật (export `clampFrameDtLocal`/`resetAccumulatorLocal` từ `useGameLoop.ts`), hoặc đưa logic trở lại `freeze.ts` và import từ đó.

## F-37 — Constants của Phase 5 được export nhưng **inline literal** ở mọi nơi, không có drift guard (D-04 không đạt)
**Severity:** Medium · **Confirmed defect** · `src/core/constants.ts:65,73,76,79,82,94,97,103,124,127,130,133,136` vs `scoring.ts:28-29`, `pickups.ts:43-46,86-89`, `effects.ts:16-19,45`, `multiball.ts:19,31-35`, `stall.ts:50,51,86-91,186-188`, `allocate.ts:119`, `reset.ts:44`

`SCORE_HIT`, `SCORE_BREAK_BONUS`, `DROP_CHANCE`, `EXPAND_SCALE`, `EXPAND_DURATION_TICKS`, `STALL_IDLE_TICKS`, `STALL_TIER2/3_EXTRA_TICKS`, `STALL_SPEED_MULT`, `STALL_ANGLE_NUDGE_DEG`, `PICKUP_FALL_SPEED`, `PICKUP_WIDTH/HEIGHT`, `MULTIBALL_ANGLE_A/B_DEG`, `MAX_PICKUPS`, `DEFAULT_LIVES` chỉ được tham chiếu bởi **chính `constants.ts`** và barrel re-export (`src/core/index.ts:34-56`).

Lệnh cấm worklet close-over module const là lý do chính đáng để inline, và các module đều document hợp đồng trong header — **nhưng không gì enforce**. Quan trọng: **không test nào so literal inline với constant** — `tests/rules.scoring.test.ts` hardcode `10`/`50`/`30`/`120`; `tests/rules.effects.test.ts` hardcode `108`/`1200`/`1300`; `tests/rules.stall.test.ts` hardcode `960`/`1200`/`1440`/`1.08`. (Ngược lại `tests/rules.multiball.test.ts:6,47` **có** import `SERVE_SPEED`/`MIN_VERTICAL_RATIO` nên hai cái đó được guard.)

**Impact:** sửa `constants.ts` để retune scoring / drop rate / expand duration / stall threshold **không đổi gì ở runtime và không test nào fail**. D-04 ("configurable core constants") và D-09 ("configurable in the 15-25% band") không thực sự được thỏa.
**Khắc phục:** thêm parity test — repo đã chấp nhận test đọc source (xem `tests/rules.stall.test.ts:95-100`), nên có thể assert `readFileSync('src/core/rules/scoring.ts')` chứa `const scoreHit = ${SCORE_HIT}`; hoặc viết lại test theo constant đã import thay vì số hardcode.

## F-38 — `applyCompiledLevel` truncate im lặng, và `assignSpatialBrickCells` có thể bail để lại grid rỗng → **fail-open**
**Severity:** Medium · **Confirmed defect** (chỉ reachable với `maxBricks` khác default) · `src/core/levels/apply.ts:12-20`, `:33-46`; `src/core/levels/spatial.ts:24-32`; `src/core/levels/validate.ts:106-114`, `:203`

```ts
// apply.ts:12-16 — truncate, không tín hiệu
const n = compiled.brickCount < world.brickX.length ? compiled.brickCount : world.brickX.length;
```
```ts
// spatial.ts:24-32 — early return TRƯỚC khi set gridCols/gridRows/lattice*
if (cols <= 0 || rows <= 0 || cellCount > world.cellToBrick.length || !(pitchX > 0) || !(pitchY > 0)) { return; }
```
`validateLevel` cap theo `MAX_BRICKS = 256` **toàn cục** (`validate.ts:106,203`), không theo capacity của world đang được fill. Với `allocateWorld({ maxBricks: k })`, một level có `cols*rows > k` được accept, brick bị truncate về `k` (đã được assert bởi `tests/levels.apply.test.ts:76-87`), và `assignSpatialBrickCells` return sớm — trong khi `apply.ts:17-20` **đã** reset mọi `cellToBrick` về `-1`. Nếu world trước đó từng giữ một level (nên `gridCols/gridRows > 1` còn sống), thì `useSpatial` (`step.ts:234-237`) vẫn true trên một grid toàn `-1` và **không brick nào là candidate va chạm** → tunneling toàn bộ.

Đây là fail-**open** trong một đường mà hợp đồng tuyên bố là "fail-closed; never mutates World" (`validate.ts:2-3`). Không reachable từ `loadLevelById` + `allocateWorld()` default (256 ≥ mọi level đã validate).
**Khắc phục:** trả status từ `applyCompiledLevel` (hoặc assert) khi `compiled.brickCount > world.brickX.length`; ở đường early-return của `spatial`, fallback về mapping exhaustive (`apply.ts:47-57`) thay vì để grid stale.

## F-39 — `PrivacyInfo.xcprivacy` đã prebuild **lệch** khỏi `app.json`; script assert chỉ kiểm tra key tồn tại
**Severity:** Medium · **Confirmed defect** · `app.json:16-38` vs `ios/NeonBrickBreaker/PrivacyInfo.xcprivacy`; `scripts/assert-privacy-manifest.mjs:26-37`

`app.json` khai `NSPrivacyTracking: false`, `NSPrivacyTrackingDomains` rỗng, `NSPrivacyCollectedDataTypes` rỗng, và 4 required-reason API: UserDefaults `CA92.1`; FileTimestamp `C617.1/0A2A.1/3B52.1`; DiskSpace `E174.1/85F4.1`; SystemBootTime `35F9.1`.

File đã prebuild **thiếu hẳn** `NSPrivacyTrackingDomains`, **thiếu** block `NSPrivacyAccessedAPICategoryDiskSpace`, và chỉ liệt kê `C617.1` cho FileTimestamp. `ios/` bị gitignore (`.gitignore:42`) và untracked nên `app.json` là nguồn chân lý qua CNG — nhưng bản prebuild trên đĩa không phản ánh nó, **và không gate nào bắt được divergence trong binary thật sự ship**.
**Khắc phục:** mở rộng `assert-privacy-manifest.mjs` để so **nội dung** (không chỉ key tồn tại) và, nếu `ios/` tồn tại, so luôn artifact sinh ra; hoặc `expo prebuild --clean` trước khi build release.

## F-40 — Attestation originality bị chính cây file phản bác; 7 file SFX không có nguồn gốc
**Severity:** Medium · **Confirmed defect** · `docs/store/originality-attestation.md:5`, `:11-14`; `assets/images/`; `assets/sfx/`

`:13` khai `assets/images` là "Project art for this app", nhưng thư mục chứa asset template Expo: `expo-logo.png`, `tabIcons/{home,explore}@{1,2,3}x.png`. Grep: chúng **không được reference** ở `app/`, `src/`, hay `app.json` — tức là file template chết, nhưng attestation như đang viết là **sai** cho thư mục đó.

`:12` khai SFX là "Project-authored / **licensed for this app**" — một either/or chưa giải quyết, **không nêu tác giả, công cụ, license, hay ngày** cho bất kỳ file nào trong 7 `.wav`. Với một artifact store-compliance, đó không phải attribution. (Level thì đáng tin: 3 file JSON là row-string viết tay.)
**Khắc phục:** thêm dòng provenance thật cho từng SFX và cho nội dung `assets/images`, **hoặc** xóa asset template không dùng để attestation trở thành đúng.

## F-41 — Va chạm đồng thời hai brick chỉ trừ HP một viên; không test nào pin tie-break
**Severity:** Medium · **Confirmed defect** (deterministic, có thể là chủ ý) · `src/core/step.ts:261-267`, `:355-372`

`if (h.hit && h.t < bestT)` là so sánh **strict**, nên khi TOI bằng nhau thì candidate đầu tiên theo thứ tự visit của broadphase thắng, và reflection sau đó đẩy ball ra khỏi viên thứ hai.

Harness (hai brick 60×20 kề nhau, ball đi thẳng lên vào khe, `MAX_BALL_SPEED`):
```
seam hit hp=[2,3] v=(0.00,720.00) ev=B_HIT#0     ← brick 1 không bị gì
```
**Impact:** không sai về cơ học (deterministic, và `brickDamagedThisStep` đã cap 1 damage/brick/step) — nhưng là một luật **không được document và không được test**, một thay đổi broadphase tương lai có thể lật nó im lặng.
**Khắc phục:** thêm test assert tie-break đã chọn, hoặc resolve mọi collider cùng TOI nhỏ nhất.

## F-42 — Production build vẫn load plugin `expo-dev-client`
**Severity:** Medium · **Confirmed defect** · `app.json:56`; `ios/Pods/` (chứa `expo-dev-launcher`, `expo-dev-menu`); `eas.json:22-24`

`app.json:56` liệt kê plugin `expo-dev-client` **không điều kiện**. `eas.json:22-24` profile production không có gì phân biệt ngoài `autoIncrement`.

Phần **env hygiene thì đúng**: production không có block `env` nên `EXPO_PUBLIC_PERF_OVERLAY`/`CERT`/`SOAK`/`CLIFF_RAMP` đều unset; `devflags.ts:5-8` document đúng quy tắc; cert WC (`PlayingHost.tsx:465,514,547`), soak (`GameHost.tsx:39`), và dev level switch (`GameScreen.tsx:46`, `PlayingHost.tsx:546-583`) đều `__DEV__`-gated nên Metro strip trong release. Rủi ro còn lại là **chính dev launcher** trong build đi review. Và mitigation T-08-30 ("Confirm production build lacks Cert/Soak UI during visual QA", `08-06-PLAN.md:160`) được giao cho Plan 06 — **chưa chạy**.
**Khắc phục:** gate plugin `expo-dev-client` theo profile (config plugin có điều kiện hoặc app.config.js đọc env), rồi làm visual QA trên build production.

## F-43 — Không có component / integration / thread-boundary test nào
**Severity:** Medium · **Verification gap** · `package.json:33-44`

Không có `@testing-library/*`, không `react-test-renderer`, không `jest-expo`. Không gì cover `PlayingHost`, `GameScreen`, gesture composition trong ngữ cảnh, hay biên thread.

**Impact:** ba finding nặng nhất của audit này (**F-01**, **F-10**, **F-25**) sống đúng trong khoảng trống đó. Một assertion duy nhất kiểu "`retry()` có thực sự đổi `world.tick`?" đã đủ bắt cái Critical.
**Khắc phục:** WP-7.

## F-44 — `npx tsc --noEmit` FAIL với 6 lỗi; deferred 5 lần; `tsc` bị loại khỏi phase gate
**Severity:** Medium · **Confirmed defect** (audit đã chạy)

```
app/index.tsx(8,43): error TS2551: Property 'fill' does not exist on type '{ fills: { flex: number; }; }'.
app/index.tsx(9,39): error TS2551: Property 'fill' does not exist on type '{ fills: { flex: number; }; }'.
src/runtime/overlays/CountdownOverlay.tsx(35,19): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'.
src/runtime/overlays/LevelErrorOverlay.tsx(49,19): error TS2551: …
src/runtime/overlays/PauseOverlay.tsx(63,19): error TS2551: …
src/runtime/overlays/ResultOverlay.tsx(75,19): error TS2551: …
```
Phân loại tác động: **4 lỗi overlay là bug runtime thật** (F-09). **2 lỗi `app/index.tsx` chỉ ở mức type**: `GestureHandlerRootView` fallback `style ?? styles.container` với `container:{flex:1}` (`node_modules/react-native-gesture-handler/lib/commonjs/components/GestureHandlerRootView.js:25,30-34`) và `SafeAreaProvider` dùng `[styles.fill, style]` với `fill:{flex:1}` riêng (`node_modules/react-native-safe-area-context/lib/commonjs/SafeAreaContext.js:69,93-97`) → layout không bị ảnh hưởng; vẫn nên sửa typo.

**Vấn đề quy trình:** deferred 5 lần (`06-.../deferred-items.md:7`; `06-01-SUMMARY.md:105`, `06-02-SUMMARY.md:102`, `06-03-SUMMARY.md:113`, `06-04-SUMMARY.md:91`), không plan Phase 7/8 nào nhận, và gate của Phase 8 (`08-06-PLAN.md:94`: `npm test` + `assert-privacy-manifest.mjs`) **không chạy `tsc`** — dù Phase 1 **đã từng** gate nó (`01-VALIDATION.md:48`). Gate bị thoái hóa.
**Khắc phục:** sửa 6 lỗi; đưa `tsc --noEmit` trở lại phase gate (WP-8).

## F-45 — Không có ball speed ramp: tốc độ là hằng 360 u/s suốt cả ván
**Severity:** Medium · **Confirmed defect (gap thiết kế/tuning)** · `src/core/constants.ts:32`, `:68`; `src/core/rules/stall.ts:67-70`

Mọi write vào ball velocity trong `src/core` đều bảo toàn tốc độ hoặc là hằng cố định: `step.ts:305/327/344` (reflect/english — đều rescale về tốc độ vào, `resolve.ts:48-53`), `serve.ts:43` (`SERVE_SPEED = 360`), `multiball.ts:70` (`360`), `stall.ts:77/170` (×1.08 một lần, clamp 720). `MAX_BALL_SPEED = 720` **không bao giờ đạt được** trong lối chơi thường — ball chạy đúng một nửa tốc độ thiết kế từ serve tới win.

Harness xác nhận bảo toàn tốc độ qua reflection xếp lớp: `speed0=719.6034 min=719.6033 max=719.6034 maxDev=3.7e-5` (chỉ là lượng tử hóa Float32).

**Impact:** escalation độ khó của level-03 chỉ đến từ mật độ layout; không có tempo curve; thời gian clear tỉ lệ tuyến tính với HP còn lại (xem PHASE-REVIEW §6: bot hoàn hảo cần 156-317s). `.planning/research/ARCHITECTURE.md:632` **đã ghi rõ** hoãn "ball speed ramp" sang một phase 9 chưa bắt đầu — nên đây là gap đã biết, không phải regression. Nhưng nó là lý do kỹ thuật khiến mục tiêu "2-3 phút" của LVL-04 khó đạt.
**Khắc phục:** nếu mục tiêu 2-3 phút là binding, thêm speed ramp có giới hạn theo số brick phá / theo thời gian, hướng về `MAX_BALL_SPEED`, deterministic (dẫn xuất từ tick) — trong `core`, thay vì tiếp tục tune layout.

## F-46 — `npm run lint` FAIL: 6 error từ các rule `react-hooks` chạy trên React Compiler
**Severity:** Medium · **Confirmed defect** (audit đã chạy)

```
app/_components/PlayingHost.tsx:524:5  [react-hooks/set-state-in-effect]
src/runtime/useGameLoop.ts:478:13      [react-hooks/immutability]
src/runtime/useGameLoop.ts:492:5       [react-hooks/immutability]
src/runtime/useGameLoop.ts:529:7       [react-hooks/immutability]
src/runtime/useGameLoop.ts:535:7       [react-hooks/immutability]
src/runtime/useGameLoop.ts:569:7       [react-hooks/immutability]
```
+ 7 warning: `freeze.ts:14` `no-redeclare` (`UiPhase`), `expoAudioService.ts:49` unused eslint-disable, `services/platform/index.ts:11-14` ×4 `import/first`, `tests/storage.personal-best.test.ts:5` unused import.

`:478`/`:492` là effect tier-budget (`:478-494`) ghi `prevBudgetRef.current` và `vfxSv.value = null`; block `eslint-disable` hiện có chỉ phủ `:284-414` và `:442-456`. `:529/:535/:569` nằm trong `injectCertWorstCase`. `PlayingHost.tsx:524` gọi `runCertWorstCase()` đồng bộ trong effect (`:513-525`), hàm đó lại gọi `setLevelId`/`setTierOverride` (`:470`, `:474`) — DEV-only nhưng đúng là pattern cascading render; cùng dạng ở `:452-458`.

Các lỗi lint này là **triệu chứng của nguyên nhân F-10**: chính chúng khiến React Compiler bail out khỏi `useGameLoop`.

**Lưu ý môi trường:** `npx eslint .` **crash** trên môi trường audit (`Cannot find native binding` từ `unrs-resolver`, build cho macOS, xảy ra trong rule `import/namespace`). Kết quả trên là khi tắt nhóm rule `import/*`. Cần chạy lại trên macOS để có output chính thức.
**Khắc phục:** quyết định tường minh trạng thái compiler của `useGameLoop` (mở rộng disable + `'use no memo'` có document, **hoặc** restructure để compiler chấp nhận) — gắn với F-10.

## F-47 — `forEachBrickCandidate`: vòng dedup quét cả **về sau**, nên brick chiếm ≥2 cell trong window bị bỏ hẳn
**Severity:** Medium · **Confirmed defect (latent)** (đã tái hiện) · `src/core/physics/broadphase.ts:99-116`

```ts
let first = true;
for (let ry2 = r0; ry2 <= r1 && first; ry2++) {
  const rowBase2 = ry2 * cols;
  for (let cx2 = c0; cx2 <= c1; cx2++) {
    if (ry2 === ry && cx2 === cx) { break; }     // break CHỈ vòng trong
    const prev = cells[rowBase2 + cx2];
    if (prev === bi) { first = false; break; }
  }
}
if (first) { visit(bi); }
```
`break` tại cell hiện tại chỉ thoát vòng **trong**; vòng ngoài tiếp tục quét các row **sau** `ry`, nên một duplicate nằm phía sau theo thứ tự row-major cũng set `first = false`. Cả hai occurrence triệt tiêu nhau và brick **không bao giờ được visit**.

Harness (`gridCols=4, gridRows=4`, một brick map vào `(r0,c1)` và `(r1,c1)`):
```
vertical-duplicate visits = []      (kỳ vọng [0])
single-row window   visits = [0]
horizontal-duplicate visits = [0]
```
**Impact:** một collider bị bỏ hoàn toàn (ball xuyên qua brick đang được render) với bất kỳ mapping nào mà một brick chiếm hơn một cell row. Hiện **chưa reachable**: level compiled map đúng một brick/cell lattice (`levels/spatial.ts:42-47`), `loadTestGrid` set `gridRows = 1` (`reset.ts:120`), fixture tunneling map một cell/brick (`tests/physics.tunneling.prop.test.ts:71`). Nó sống ngay khi một level dùng brick rộng/cao hơn pitch, hoặc một grid dựng tay.
**Khắc phục:** dừng quét tại cell hiện tại (cờ `done` thoát cả hai vòng), hoặc thay bằng mảng visited-stamp per-step.

## F-48 — Brick unbreakable emit `BRICK_HIT` trùng, không dedupe per-step
**Severity:** Medium · **Confirmed defect** · `src/core/step.ts:349-355`

Guard `brickDamagedThisStep` chỉ nằm ở nhánh breakable (`:355`). Hai ball đập cùng một brick steel trong một step, hoặc một ball đập hai lần qua các lượt CCD, sinh event trùng.
**Impact:** không ảnh hưởng điểm (`scoring.ts:43-45` skip) và không ảnh hưởng stall timer (`stall.ts:40-42` skip). Thuần cosmetic: particle chip trùng (`consumeEvents.ts:76-80`) + audio `brick_chip` trùng (`mapping.ts:13-14`) + áp lực ring không cần thiết. Cộng với F-12 thì một ball kẹt trong brick steel emit 5 `BRICK_HIT`/step vô hạn.
**Khắc phục:** mark contact steel trong một mảng per-step song song, hoặc dùng `brickDamagedThisStep` như cờ "touched this step" và tách riêng quyết định HP.

---

# LOW

## F-49 — Nhánh `LOST` để pickup và effect expand còn sống (IN-03 đã biết)
**Low** · `src/core/rules/lives.ts:51-54` · Nhánh còn-mạng (`:27-44`) clear pickup SoA và mọi effect; nhánh `LOST` không. Vì loop freeze trên `LOST` (`useGameLoop.ts:337-338`) nên frame cuối được giữ → màn thua có thể hiện pickup lơ lửng và paddle rộng 108. `retry()` gọi `resetWorld` (`:436`) clear hết (`reset.ts:63-75`) nên không leak sang ván sau. Thuần cosmetic. Đã ghi nhận `05-REVIEW.md` IN-03, cố ý không fix (`05-REVIEW-FIX.md:17`).

## F-50 — `hashWorld` thiếu `lives` và `simPhase` (IN-01), và mix payload event cũ ngoài `evCount`
**Low** · `src/core/hash.ts:94-114`; `src/core/events/ring.ts:30-36` · Score, combo, pickup và cả hai field stall được mix; `lives` và `simPhase` thì không → so sánh dual-world golden-replay có thể bỏ sót một divergence chỉ biểu hiện ở số mạng hoặc phase kết thúc. Thêm nữa `clearEvents` reset **chỉ cursor** ("does not zero payload arrays") trong khi `hashWorld` mix **toàn bộ** buffer `evCode/evA/evB/evX/evY` → hai world có state sống giống nhau nhưng lịch sử event khác nhau cho hash khác nhau. Golden-replay test pass vì cả hai nhánh replay cùng lịch sử — đây là bẫy latent cho bất kỳ save/restore hay so sánh cross-run trong tương lai.
**Khắc phục:** mix `lives`/`simPhase`; hash chỉ `[start, start+evCount)` hoặc zero payload trong `clearEvents`.

## F-51 — Substep cap zero accumulator ngay cả khi vòng lặp thoát do đã drain
**Low** · `src/runtime/useGameLoop.ts:362-364` · `if (steps === maxSubsteps) { w.accumulator = 0; }` bắn cả khi loop thoát vì accumulator đã cạn mà `steps` tình cờ đạt 5 → mất tới `FIXED_DT` (8.3ms) thời gian thực. Quan trọng hơn: `MAX_SUBSTEPS = 5` ở `FIXED_DT = 1/120` chỉ phủ **41.7ms** sim mỗi frame, nên frame time duy trì trên ~42ms khiến sim chạy **chậm so với thời gian thực** thay vì drop frame — chính sách anti-spiral có chủ đích, nhưng không được ghi trong comment của constant (`runtime/constants.ts:10-11`).

## F-52 — `applyDropsFromBreaks` / `stepPickups` thiếu guard PLAYING mà các sibling đều có (IN-02 đã biết)
**Low** · `src/core/rules/pickups.ts:36-42`, `:79-84` · `scoring.ts:18-20`, `stall.ts:180-182`, `win.ts:21-23`, `lives.ts:15-17` đều early-return nếu `simPhase !== PLAYING`. Hai hàm pickup phụ thuộc hoàn toàn vào việc `stepRun.ts:44-50` chỉ gọi chúng ở nhánh PLAYING. Chưa reachable như một bug; là hazard latent cho caller trực tiếp trong tương lai — và `useGameLoop.ts:517-559` đã cho thấy runtime **có** gọi core trực tiếp.

## F-53 — Overflow của event ring drop **newest**; `evOverflow` không bao giờ được surface
**Low** · `src/core/events/ring.ts:16-19`; `src/core/constants.ts:53`; `src/core/hash.ts:118` · Capacity 128 (`EVENT_RING_CAPACITY`, `allocate.ts:25`), ring clear mỗi step PLAYING. Worst case/step: 8 ball × 5 lượt CCD = 40 event va chạm + ≤16 `POWERUP_CATCH` + `LIFE_LOST`/`WIN`/`LOSE` ≈ 58 < 128 → hiện **không thể overflow**. Nếu xảy ra, chính sách drop-newest loại bỏ các push **cuối** — và pipeline push `WIN` (`win.ts:26`), `LIFE_LOST`/`LOSE` (`lives.ts:24,53`) sau cùng. Phase/lives dẫn xuất từ state nên sống sót; **score thì không**, vì scoring hoàn toàn event-driven (`scoring.ts:31-54`), tương tự drop (`pickups.ts:48-72`) và mọi VFX/audio. `evOverflow` chỉ được đọc bởi `hashWorld` — không có log hay assert nào.
**Khắc phục:** giữ capacity, thêm assertion/metric dev-time cho `evOverflow`; ưu tiên drop-oldest cho code cosmetic nếu cap bị hạ.

## F-54 — App name clearance không có bằng chứng nào
**Low (nhưng blocking cho submit)** · `docs/store/name-clearance.md:13-18`, `:24-26` · Liệt kê 4 tìm kiếm **sẽ** thực hiện, không ngày, không từ khóa, không kết quả. Trademark opinion: "Not obtained". Listing uniqueness: "Deferred until listing creation".

## F-55 — Privacy policy không có kênh liên hệ hoạt động
**Low (nhưng blocking cho submit)** · `docs/store/privacy-policy.md:36`; `privacy-policy.html:80-81` · Liên hệ là repository issues "**when published**" hoặc developer contact trên store listing "**when one exists**". Cả hai store đều đòi một privacy contact tiếp cận được. (Nội dung policy còn lại thì **đúng và khớp hành vi thật** — audit đã fetch bản live và đối chiếu `package.json`.)

## F-56 — Allocation per-step trong `step.ts` vi phạm hợp đồng "no allocations in stepWorld"
**Low (Medium về perf, Low về đúng-sai)** · `src/core/step.ts:239-268`; `src/core/physics/sweep.ts:42,69,93,100,124,130,138,144,215,218`; `src/core/physics/resolve.ts:24,29,55,79,85,114` · `02-PATTERNS.md:173` đặt hợp đồng: "mutate in place; increment `tick`; **no allocations**; void return". Thực tế mỗi lượt CCD cấp: một closure `considerBrick` mới (`:239`, khai báo **trong** vòng `while`), một object `SweepHit` `{hit,t,nx,ny}` mỗi candidate (5 lần cho wall+paddle + 1 lần/brick; đường non-spatial `:272-276` quét **mọi** brick tới `MAX_BRICKS = 256`), một `{vx,vy}` mỗi collision resolve. Các module rule thì **hoàn toàn sạch** (scoring/pickups/effects/multiball/lives/stall/win đều là vòng scalar trên typed array) — vấn đề khu trú ở physics step.
**Khắc phục:** hoist `considerBrick` ra ngoài vòng (chuyển `best*` thành scratch record trên `World` hoặc dùng vòng trong tường minh); cho `sweepCircleAabb`/`resolve*` out-param hoặc scratch object module-level, như `recordSprites` đã làm với `tools.entityRect`.

## F-57 — Tài liệu không nhất quán: `HOSTING.md` tự mâu thuẫn, số học plan lệch, VERIFICATION Phase 5 cũ
**Low** ·
- `docs/store/HOSTING.md:5` "This repo currently has **no git remote**, so GitHub Pages cannot be enabled from the agent alone" vs `:58-60` "**LIVE_URL:** … GitHub Pages enabled: branch `main`, folder `/docs`, public repo"; `:62` điều kiện ("superseded **once** `curl -fsSI` returns 200") vs `:64-66` một "Owner waiver … **superseded**". `08-05-SUMMARY.md:34` ghi "D-27 live-URL gate remains OPEN debt" trong khi `:40/:48/:59` của **cùng file** claim verified 200. **Audit đã fetch trực tiếp: URL live thật, 200.** Vậy đây chỉ là rác tài liệu — nhưng `HOSTING.md:54` đặt quy tắc "Do not mark PLT-04 complete while `LIVE_URL` remains TBD or OWNER_WAIVED", nên nên dọn.
- Số học roll-up: `ROADMAP.md:173` "3/7 plans executed" và `:200` "3/7" trong khi `:175-180` hiển thị **sáu** `[x]`; `STATE.md:13-14` `total_plans: 48, completed_plans: 47`; `:29` "Plan: 6 of 7"; `:39` "Total plans completed: 41"; `:9-12` `completed_phases: 7 … percent: 98` vs `:33` "88% phases". **Bốn giá trị khác nhau** cho cùng một câu hỏi.
- `05-VERIFICATION.md` (`verified: 2026-09-20T10:20:32Z`) liệt kê WR-01/WR-02 là anti-pattern còn mở (`:105-106`), nhưng `05-REVIEW-FIX.md:3` (`10:31:00Z`) đã fix cả hai (`:30`, `:37`) với suite pass (`:41`). Verification không được chạy lại → báo cáo **dưới** trạng thái thật.
- `PROJECT.md:20` "110 green as of Phase 5" (thực tế 112 ở `05-REVIEW-FIX.md:41`; hiện tại 179).
- `07-VERIFICATION.md:27` mô tả glow atlas là "soft/**strong** pads" và `:53` nói "≤2 radius variants", nhưng `GlowVariant` chỉ có **một** field `soft` (`bakeGlowSprites.ts:24-26`, `:65-69`) — chính file đó ghi rõ "no unused strong bake" (`:4`). Claim trong VERIFICATION là cũ.
- **Ledger requirements vừa over-claim vừa under-claim.** Over-claim: PLT-03 `[x]` Complete không có số đo (F-04). Under-claim: PHYS-01 (`REQUIREMENTS.md:12,102`), PHYS-05 (`:16,106`), RUN-02 (`:30,114`), PLT-01 (`:48,123`) vẫn ở `Pending` dù `ROADMAP.md:195` ghi Phase 3 `6/6 Complete` và `03-VERIFICATION.md:94-97` đánh dấu cả bốn `✓ SATISFIED`; `PROJECT.md:30-35` còn liệt kê chúng dưới **Active**. `02-VERIFICATION.md:108` đã flag đúng lớp drift này ("Doc lag (non-blocking)") ở Phase 2 và nó chưa bao giờ được sửa hệ thống. **Hệ quả: không file roll-up nào dùng được làm nguồn trạng thái.**

## F-58 — Tier `high` không thực sự khác `mid` về trail length và glow
**Low** · `src/runtime/resolveQualityTier.ts:17-21` · `mid: {particleCap 128, trailMax 5, glowScale 1}`, `high: {192, 5, 1}` — `trailMax` và `glowScale` **giống nhau**. `ROADMAP.md:170` SC3 nói tier "cap particle count, trail length, and glow variants". Chỉ `low` (`{48, 2, 0}`) phân biệt cả ba.

## F-59 — `skia-version-decision.md` ghi status "Confirmed" trái với tiêu chí của chính nó
**Low** · `docs/skia-version-decision.md:6`, `:13`, `:20`, `:23` · `:6` `**Status** | **Confirmed**`; `:20` định nghĩa tiêu chí là "**both** platforms install and run the FPS harness on **physical devices**"; `:23` thừa nhận "Android physical confirm is still outstanding". Android chỉ được xác nhận bằng **EAS build success** (`:13`), không phải install trên máy thật.

## F-60 — "Oldest eviction" của particle thực ra là round-robin, và scan O(cap) cho mỗi particle spawn
**Low** · `src/vfx/particles.ts:31-42`, `:46-47`, `:111-120` · `findFreeOrEvict` chọn `particleOldest % cap` rồi advance cursor, nhưng `particleOldest` **không bao giờ** được cập nhật khi một slot được giải phóng do hết đời (`stepParticles`) hay khi tìm được slot trống → evict một slot luân phiên tùy ý, nên một spark mới 0.22s có thể bị giết nhường cho một spark mới hơn (cosmetic). Và `:33` scan **toàn bộ pool** cho **từng** particle: worst case một frame ở tier High = 5 substep × 8 ball × 1 break × 12 spark × 192 slot ≈ **92.160 lần đọc typed-array/frame** trên UI runtime.
**Khắc phục:** free-list stack (`Int16Array` + top index) + ring FIFO thật cho eviction.

## F-61 — `Dimensions.get('window')` ở module scope
**Low** · `src/runtime/useGameLoop.ts:130`, `:268-271` · Chụp một lần mỗi JS bundle, stale khi split-screen/fold. Bị ghi đè bởi Skia `onSize` (`GameCanvas.tsx:18`) nhưng frame đầu letterbox theo cả window thay vì hộp playfield → một frame scale-pop. Guard `> 1` đã có ở `recordSprites.ts:152-153` và `PlayingHost.tsx:269` nên seed `0,0` là an toàn hơn.

## F-62 — Quality tier fallback về `low` cho thiết bị không biết; heuristic RAM; không có downgrade thích ứng
**Low** · `src/runtime/resolveQualityTier.ts:29-36`, `:49-63`, `:71-88`; `app/_components/PlayingHost.tsx:106-115` · Thứ tự resolve: (1) DEV override; (2) **danh sách model một dòng** `/Pixel 6a/i.test(modelName)` → `mid`; (3) heuristic RAM từ `expo-device.totalMemory` (`<4GB → low`, `<8GB → mid`, else `high`); (4) **fallback `'low'`** (`:60`, `?? 'low'`) khi `expo-device` thiếu hoặc trả null. Không benchmark, không tín hiệu GPU/chipset, không vòng feedback frame-time.

Rủi ro: thiết bị không biết → `low` → `glowScale = 0` → **glow brick baked, tính năng đầu bảng của Phase 7, biến mất im lặng** — đó là một khác biệt hướng nghệ thuật cả tier, không phải suy giảm mềm, và không có tín hiệu nào trong app. RAM cũng là proxy GPU kém trên iOS (iPhone 12 4GB → `mid`; iPhone SE2 3GB → `low`; một Android giá rẻ 8GB GPU yếu → `high` với 192 particle). Tier resolve **một lần mỗi mount** (`useMemo`) không downgrade khi frame vượt budget, dù `metrics.overBudget`/`p95Ms` đã được tính mỗi frame (F-29).

## F-63 — Hằng số trùng lặp bằng tay qua 8 file; module mồ côi; các hạng mục latent còn lại
**Low** ·
- **Hằng trùng lặp không có parity test:** kích thước logic 360×640, `PADDLE_HALF_W=36`, `SIM_PLAYING=1`, map `SIM`, `HUD_STRIP_CONTENT=48` được viết tay ở `app/_components/PlayingHost.tsx:41-42`, `src/input/constants.ts:8`, `src/input/usePaddleGesture.ts:30`, `src/render/recordSprites.ts:11-12,42,44,165-167,182`, `src/core/stepRun.ts:20`, `src/core/allocate.ts:18-19`, `src/runtime/GameScreen.tsx:18,21` — kèm comment "keep in sync", vì worklet không close-over module const. **Không gì assert chúng khớp.** Cùng họ với F-37.
- **Module mồ côi** (không importer nào; không reachable từ entry nên không bundle, nhưng gây nhầm lẫn): `src/runtime/SpikeScreen.tsx`, `src/runtime/useSpikeLoop.ts`, `src/render/SpikeCanvas.tsx`, `src/render/camera.ts`. Thêm nữa `src/ui/` **không tồn tại** nên element type `ui` và policy `app → ui` trong `eslint.config.js` là vô nghĩa.
- **`recordSprites.ts:52-64`/`:72-115` nhân bản** `src/render/colors.ts` và `src/core/levels/damageCues.ts` (có chủ đích, ghi rõ ở `:69-71`) — không có test đảm bảo đồng bộ.
- **`global.__gameRecorderTools`** (`recordSprites.ts:31-33`) và `global.__spikeOverlayPaint` (`recordOverlay.ts:4-6`) tồn tại trên UI runtime qua các lần remount và Fast Refresh, chia sẻ giữa mọi canvas. Bounded (không leak) và tốt cho allocation, nhưng nghĩa là hai loop đồng thời sẽ phá recording của nhau.
- **`console.error('[level]', loadResult.issues)`** tại `app/_components/PlayingHost.tsx:249` **không** `__DEV__`-gated → ship ra production. Mọi log khác đều gated (`:94, :174, :184`, `GameHost.tsx:39`, `asyncStorageStore.ts:43`, `expoAudioService.ts:268,277`).
- **`pickups.ts:93-97`** chụp AABB paddle một lần trước vòng; nếu pickup đầu tiên là expand thì `applyOrRefreshExpand` có thể nới paddle và dịch `paddleX` tới 18 đơn vị giữa vòng, nhưng các pickup sau vẫn test với AABB hẹp cũ (deterministic, trễ một step). Cùng cơ chế có thể khiến một ball nằm trong paddle vừa nới (được `sweep.ts:54-59,133-142` thu hồi ở step sau).
- **`effectUntilTick` là `Int32Array`** (`src/core/types.ts:108`) so với `tick` tăng đơn điệu (`step.ts:406`); `tick + 1200` overflow Int32 sau ≈207 ngày chơi liên tục trong một `World`. Không reachable thực tế.
- **`useKeepAwake()`** (`PlayingHost.tsx:65`) active suốt session Playing, kể cả khi paused và khi Result overlay đang mở.
- **`useFonts({SpaceMono})` gọi hai lần** (`GameHost.tsx:22-24` và `PlayingHost.tsx:67-69`) — expo-font cache nên chỉ là dư thừa.
- **Ba promise không cancel** ghi state/SharedValue sau khi có thể unmount: `useVfxIntensity.ts:20-27`, `GameHost.tsx:30-33`, `PlayingHost.tsx:154-164` — vô hại trong React 19/Reanimated, nhưng nên dùng pattern cờ `cancelled` như `PlayingHost.tsx:169-199` đã làm.
