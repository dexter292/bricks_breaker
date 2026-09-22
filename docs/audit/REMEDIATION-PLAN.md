# REMEDIATION PLAN

**Ngày audit:** 2026-09-21
**Trạng thái:** **ĐÃ PHÊ DUYỆT** 2026-09-21 (owner: `duyệt`).  
**Tiến độ (2026-09-21):** Code + ledger remediations **DONE** for WP-1…5, WP-7, WP-8 (partial).  
WP-1 includes **T1.4** (single chrome SharedValue + one reaction).  
WP-2–5 complete in code. WP-3 **T3.4 decided** (no ramp MVP; soften duration target).  
WP-6 **T6.1 only** — T6.2+ need hardware. WP-7 T7.1–T7.5 contracts.  
WP-8 T8.1–T8.8 done in-repo; **T8.5** informal clearance logged (trademark opinion still not obtained); **T8.9** blocked on WP-6.  
**Còn lại (không fix được chỉ bằng code):** WP-6 device cert/soak/playtest; formal trademark opinion; Phase 8 close (T8.9).

Các task được nhóm thành **8 work package** có thể dùng trực tiếp làm input cho GSD. Mỗi WP có ràng buộc thứ tự rõ ràng.

## Đồ thị phụ thuộc

```
WP-1 (Thread boundary & shell correctness)   ← BẮT BUỘC TRƯỚC TIÊN
  ├─→ WP-2 (Core sim correctness)
  ├─→ WP-3 (Gameplay feel: serve, stall, tempo)
  ├─→ WP-4 (Render & audio correctness + perf)
  ├─→ WP-5 (Lifecycle & persistence)
  └─→ WP-7 (Test infrastructure)
             ↓
       WP-6 (Device certification & playtest)   ← chỉ chạy sau WP-1/2/4/7
             ↓
       WP-8 (Ledger, docs & store compliance)
```

**Lý do WP-1 phải đi trước mọi thứ:** F-01 khiến `injectCertWorstCase` chưa bao giờ inject được gì, nên mọi phép đo hiệu năng thực hiện trước WP-1 sẽ đo một cảnh không phải worst-case. Đo trước khi sửa là đo một sản phẩm không tồn tại.

---

# WP-1 — Thread boundary & shell correctness

**Mục tiêu:** khôi phục tính đúng đắn của biên RN↔UI runtime, và làm cho các modal thực sự là modal.
**Thành phần bị ảnh hưởng:** `src/runtime/useGameLoop.ts`, `src/runtime/overlays/*`, `app/_components/PlayingHost.tsx`, `app/index.tsx`
**Dependencies:** không
**Chặn:** WP-2, WP-3, WP-4, WP-5, WP-6, WP-7

### T1.1 — Chuyển mọi mutation World khỏi RN runtime (**F-01**, Critical)
- **Hướng triển khai:** thêm `resetRequest: SharedValue<number>` (bộ đếm đơn điệu) và `accumResetRequest` (hoặc reset accumulator vô điều kiện khi `uiPhase !== PLAYING`). `retry()` chỉ làm `resetRequest.value += 1`. Frame callback so `resetRequest.value` với một `lastReset` lưu trên `World`; khi khác thì thực hiện `resetWorld` + `applyCompiledLevel(compiled.value)` + `dockBall` + `accumulator = 0` **trên UI runtime**, rồi publish mirror. Áp dụng cùng pattern cho `setActive(false)` và `injectCertWorstCase`.
- **Acceptance criteria:**
  1. Sau khi thua rồi Retry: `world.tick` về 0, mọi brick HP được phục hồi, score = 0, lives = 3, phase = `DOCKED`, và result overlay **không** hiện lại.
  2. Không còn lời đọc `world.value` nào trên RN runtime trong `src/runtime/useGameLoop.ts` (kiểm tra bằng grep + lint rule mới ở T7.3).
  3. `injectCertWorstCase` thực sự tạo ≥3 ball đang bay và particle gần cap (kiểm tra bằng mắt + `activeBallCount` qua mirror).
- **Regression test cần bổ sung:**
  - `tests/runtime.reset-request.test.ts` — mô phỏng pattern: `resetRequest` tăng → hàm reset (đã tách thành pure function) đưa World từ trạng thái `LOST` về `DOCKED` với tick 0 và HP đầy.
  - Test tích hợp trên thiết bị (WP-7 T7.1): assert `world.tick` giảm sau hai lần Retry liên tiếp.

### T1.2 — Sửa scrim của 4 overlay (**F-09**, High)
- **Hướng triển khai:** đổi `...StyleSheet.absoluteFillObject` → `...StyleSheet.absoluteFill` ở `CountdownOverlay.tsx:35`, `PauseOverlay.tsx:63`, `ResultOverlay.tsx:75`, `LevelErrorOverlay.tsx:49`. Sửa luôn typo `styles.fill` → `styles.fills` ở `app/index.tsx:8,9`.
- **Acceptance criteria:** `npx tsc --noEmit` hết 6 lỗi; scrim phủ toàn màn hình, panel canh giữa, touch playfield bị chặn khi overlay mở; screenshot ở 3 tỉ lệ khác nhau.
- **Regression test:** thuộc WP-7 (component test render overlay và assert `position: 'absolute'` có mặt trong style đã resolve).

### T1.3 — Ổn định identity của frame callback (**F-10**, High)
- **Hướng triển khai:** bọc worklet trong `useCallback` chỉ với dep là SharedValue (đều ổn định), hoặc hoist thành module-level worklet factory gọi một lần. Đồng thời **quyết định tường minh** trạng thái React Compiler của `useGameLoop`: mở rộng vùng `eslint-disable` + thêm `'use no memo'` có document, **hoặc** restructure để compiler chấp nhận. Không để trạng thái memo của hook nóng nhất là một tai nạn.
- **Acceptance criteria:** log số lần `registerFrameCallback` trong một session 30 giây có score/combo thay đổi liên tục ⇒ **đúng 1**. `npm run lint` không còn error ở `useGameLoop.ts`.
- **Regression test:** thuộc WP-7.

### T1.4 — Gộp 4 reaction thành 1 (**F-25**, Medium)
- **Hướng triển khai:** pack 5 mirror (phase, lives, score, combo, stallTier) vào một SharedValue duy nhất ghi một lần/frame, một `useAnimatedReaction`, một `runOnJS` batched. Cân nhắc throttle score/combo về ~10Hz (cosmetic) hoặc vẽ chúng trong Skia picture thay vì React.
- **Acceptance criteria:** tối đa 1 React render/frame khi score+combo+lives đổi cùng frame.
- **Regression test:** thuộc WP-7.

---

# WP-2 — Core simulation correctness

**Mục tiêu:** đóng ba đường tunneling còn hở và chính sách event ring.
**Thành phần:** `src/core/step.ts`, `src/core/stepRun.ts`, `src/core/physics/broadphase.ts`, `src/core/levels/apply.ts`, `src/core/levels/spatial.ts`, `src/core/hash.ts`
**Dependencies:** WP-1 (để test được trên thiết bị)

### T2.1 — Clear event ring ở mọi nhánh `stepRun` (**F-08**, High)
- **Hướng triển khai:** gọi `clearEvents(world)` ở đầu `stepRun` cho **mọi** phase, hoặc (bền hơn) để runtime clear sau khi drain và bỏ chính sách "stepRun owns clear". Chọn một và ghi vào `02-PATTERNS.md`.
- **Acceptance criteria:** sau khi mất mạng, mọi step `DOCKED` tiếp theo có `evCount === 0`; `life_lost` phát **đúng một lần**; `shakeAmp` decay bình thường.
- **Regression test:**
  - `tests/stepRun.clear-policy.test.ts` — drive `PLAYING → BALL_OUT → LIFE_LOST → DOCKED`, step thêm 2 lần, assert `evCount === 0`. Tương tự cho `WON`/`LOST`.
  - Assert **đúng một** entry `LIFE_LOST`/`WIN`/`LOSE` được quan sát mỗi transition khi drain chạy theo pattern substep của `useGameLoop.ts:349-353`.

### T2.2 — Sửa double-advance ở miss path (**F-11**, High)
- **Hướng triển khai:** `remaining = 0` trước `break` tại `step.ts:281`, hoặc cờ `exitedOnMiss` tường minh gate khối `:378-386`.
- **Acceptance criteria:** với một step buộc 4 collision rồi 1 miss, tổng displacement ≤ `speed * dt`.
- **Regression test:** `tests/physics.ccd-exhaustion.test.ts` — dựng ≥5 contact thật trong một step (chữ V steel hẹp ở 2× `MAX_BALL_SPEED`); assert tâm ball cuối step nằm ngoài mọi AABB solid, không collider nào bị vượt qua bởi lần advance dư, và tổng displacement ≤ `speed * dt`.

### T2.3 — Depenetration pass (**F-12**, High)
- **Hướng triển khai:** trước vòng CCD, với mọi collider đang chồng, đẩy tâm ball ra mặt gần nhất + `radius + eps`. Advance sau khi cạn lượt phải zero-length hoặc sweep-limited. Dedupe event cùng-collider trong một step (mở rộng ý tưởng `brickDamagedThisStep` sang paddle/wall/steel — cũng đóng **F-48**).
- **Acceptance criteria:** ball đặt trong brick/paddle/steel tách ra trong ≤2 step, emit ≤1 event/collider/step, và **không bao giờ** bị kéo xuyên qua paddle từ dưới lên.
- **Regression test (giá trị cao nhất trong toàn kế hoạch):**
  - `tests/physics.overlap.test.ts` — tâm ball đặt trong brick breakable ⇒ trong N step tâm ra ngoài AABB, ≤1 `BRICK_HIT`/step.
  - Tâm trong brick **unbreakable** ⇒ assert tách ra, không phải 5 `BRICK_HIT`/step vĩnh viễn.
  - Tâm giữa `paddleY + paddleH` và `640 - radius` đi xuống ⇒ **`BALL_OUT`**, `ballActive[0] === 0`, ≤1 `PADDLE_HIT`, và tâm **không bao giờ** vượt lên trên `paddleY`.

### T2.4 — Sửa dedup của broadphase (**F-47**, Medium, latent)
- **Hướng triển khai:** dừng quét tại cell hiện tại (cờ `done` thoát cả hai vòng), hoặc thay bằng mảng visited-stamp per-step.
- **Acceptance criteria:** brick chiếm 2 cell cùng cột / cùng hàng / block 2×2 đều được visit **đúng một lần**.
- **Regression test:** `tests/physics.broadphase.test.ts` — test trực tiếp `forEachBrickCandidate` cho ba layout trên. (Case dọc hiện **fail**.)

### T2.5 — Fail-closed cho `applyCompiledLevel` + spatial grid (**F-38**, Medium)
- **Hướng triển khai:** trả status (hoặc assert) khi `compiled.brickCount > world.brickX.length`; ở đường early-return của `assignSpatialBrickCells`, fallback về mapping exhaustive (`apply.ts:47-57`) thay vì để grid stale.
- **Acceptance criteria:** không cấu hình nào dẫn tới `useSpatial === true` trên một grid toàn `-1`.
- **Regression test:** `applyCompiledLevel` lên một world có `cellToBrick` quá nhỏ **sau** một lần apply thành công ⇒ assert hoặc có failure được báo, hoặc fallback giữ brick collidable.

### T2.6 — Canonical hóa `hashWorld` (**F-32**, **F-50**, Medium/Low)
- **Hướng triển khai:** loại `rngCosmetic` khỏi hash (hoặc chuyển stream cosmetic sang `VfxState`); mix thêm `lives` và `simPhase`; hash chỉ `[start, start+evCount)` hoặc zero payload trong `clearEvents`.
- **Acceptance criteria:** `hashWorld` bằng nhau giữa run có VFX và run `vfx = null`; và giữa hai world cùng state sống nhưng khác lịch sử event.
- **Regression test:** `tests/physics.hash-canonical.test.ts` cho cả hai tính chất.

### T2.7 — Pin tie-break va chạm đồng thời (**F-41**, Medium)
- **Hướng triển khai:** hoặc document + test luật hiện tại (candidate đầu tiên theo thứ tự broadphase thắng), hoặc resolve mọi collider cùng TOI nhỏ nhất.
- **Regression test:** hai brick kề nhau, ball đi thẳng lên vào khe; assert brick nào mất HP và tổng HP mất = 1.

### T2.8 — Dev-time signal cho `evOverflow` (**F-53**, Low)
- **Hướng triển khai:** assert/metric dev-time khi `evOverflow !== 0`; xem xét drop-oldest cho code cosmetic.
- **Regression test:** `allocateWorld({ eventCap: 8 })`, buộc >8 event trong một `stepRun`; assert `evOverflow === 1` **và** document hệ quả mất điểm/mất drop như một hợp đồng có ý thức.

### T2.9 — Chính sách substep cap (**F-51**, Low)
- **Hướng triển khai:** chỉ zero accumulator khi `accumulator >= fixedDt` sau vòng lặp (tức thực sự đang tụt lại); ghi trần 41.7ms vào comment của `MAX_SUBSTEPS`.
- **Regression test:** `tests/runtime.substep-cap.test.ts` — accumulator = `5 * FIXED_DT + 4ms` ⇒ 5 step chạy, 4ms dư **còn lại**; frame 200ms ⇒ đúng 5 step.

---

# WP-3 — Gameplay feel: serve, anti-stall, tempo

**Mục tiêu:** đóng PHYS-05, làm anti-stall thực sự hiệu quả, và xử lý gap tempo đe dọa LVL-04.
**Thành phần:** `src/core/rules/serve.ts`, `src/core/rules/stall.ts`, `src/core/physics/resolve.ts`, `src/core/step.ts`, `src/core/types.ts`, `src/input/usePaddleGesture.ts`
**Dependencies:** WP-1

### T3.1 — Quyết định và triển khai aimed launch (**F-21**, High)
- **Hướng triển khai:** hai lựa chọn, cần quyết định của owner:
  - **(a) Triển khai đúng requirement:** thêm `aimAngle: number` vào `Intent`; khi `DOCKED`, drag ngang điều khiển góc ngắm (hiển thị một indicator trong record path); `applyServe` dùng góc đó với clamp `PADDLE_ANGLE_CLAMP_DEG` + `MIN_VERTICAL_RATIO`. Lưu ý: `dockBall` hiện re-snap `ballX = paddleX` mỗi step docked nên không thể dùng offset ball làm input ngắm — phải đi qua `Intent`.
  - **(b) Hạ scope tường minh:** xóa lời gọi english chết trong `applyServe`, ghi rõ serve cố định thẳng đứng, cập nhật REQUIREMENTS PHYS-05.
- **Acceptance criteria (a):** với `aimAngle` khác nhau, velocity sau launch khác nhau và luôn nằm trong clamp; drag paddle khi docked **không** vô tình trigger serve (gate hiện có ở `gestureGates.ts:13-18` phải vẫn giữ).
- **Regression test:** viết lại `tests/rules.serve.test.ts` theo hợp đồng thật — hiện tại test comment là đang kiểm chứng serve lệch góc mà code không thể sinh ra. Với (b): assert với mọi `paddleX` và mọi `ballX` pre-set, velocity sau launch là **chính xác** `(0, -SERVE_SPEED)`.

### T3.2 — Enforce sàn góc sau mọi reflection (**F-22**, Medium)
- **Hướng triển khai:** áp `MIN_VERTICAL_RATIO` ngay sau `reflectVelocity` trong `step.ts:320-347` (wall và brick), giữ bảo toàn tốc độ.
- **Acceptance criteria:** sau bất kỳ `WALL_HIT`/`BRICK_HIT`, `|vy|/speed >= MIN_VERTICAL_RATIO`; tốc độ không đổi trong 1e-4.
- **Regression test:** `tests/physics.min-vertical.test.ts` — property test trên `stepWorld`. **Hiện tại sẽ fail** — viết cùng fix, hoặc đánh dấu xfail có document.

### T3.3 — Làm tier-2 và tier-3 anti-stall thực sự hiệu quả (**F-22**, **F-23**, **F-27**)
- **SUPERSEDED (NH-7 / NG-1):** The original F-23 "prefer steeper / increase |vy| share" contract is **no longer the product behavior**. Tier-3 uses NG-1 escalating ±nudge (8°/16°/24°…cap 30°) with dual angle floors; parity-signed rotation **may flatten** toward the mid-band when the sign opposes steepening — intentional. See `docs/audit/DEFERRED-ITEMS.md` (F-23 SUPERSEDED) and `stall.ts` `applyTier3AngleNudge`.
- **Hướng triển khai (historical):** tier 2 áp angle nudge when clamp tốc độ khiến velocity không đổi. Tier 3 (old F-23 text): lấy dấu rotation từ **heading** để `|vy|` luôn tăng — **replaced by NG-1**, do not re-assert "prefer steeper".
- **Acceptance criteria:** ball near-horizontal ở đúng `MAX_BALL_SPEED` phục hồi chuyển động dọc **trước tick 1200**, không phải 1440 (F-22 / F-27 still apply; F-23 does not).
- **Regression test:**
  - Tier-3 nudge under NG-1: assert dual floors + escalating magnitude — **not** `|vy|/speed` never decreases (F-23 removed on purpose).
  - Ball ở `MAX_BALL_SPEED`: assert tier 2 **đổi** velocity.
  - Tier 0 → 3 trong một lần evaluate (set `stallIdleTicks = 1439` rồi step): assert cả hai effect áp đúng một lần.
  - Multi-ball tier-2/3 với ≥3 ball: mọi ball được mutate và clamp về `MAX_BALL_SPEED`.
  - Stall state qua life loss: idle 950 tick → ball cuối rơi → serve → assert hành vi escalation trên ball mới là **chủ ý** (hiện `lives.ts` cố ý không reset stall — cần pin).

### T3.4 — Quyết định về ball speed ramp (**F-45**, Medium)
- **Quyết định 2026-09-21 (owner “fix hết”):** **không** thêm speed ramp trong MVP. Giữ `SERVE_SPEED` cố định; `MAX_BALL_SPEED` vẫn là trần an toàn. Mục tiêu thời lượng LVL-04 "~2–3 phút" được **nới** thành *"arcade challenge; đo median ở WP-6 playtest — chấp nhận >3 phút nếu feel đạt"*. Speed ramp / siết band thời lượng → backlog post-MVP (phase 9 research đã ghi).
- **Acceptance criteria:** quyết định ghi nhận ở đây + `docs/audit/DEFERRED-ITEMS.md`; golden-replay không đổi.
- **Regression test:** không bắt buộc (không đổi code core).

### T3.5 — Dọn level-02 (**F-02**, Medium)
- **Hướng triển khai:** quyết định level-02 là fixture compile/regression hay level chơi được. Nếu fixture: ghi rõ trong `name`/comment. Nếu chơi được: mở hàng steel full-width (khe ≥ `2*radius` + margin) hoặc dịch cột steel khỏi tường.
- **Regression test:** `tests/levels.solvability.test.ts` — bot headless (paddle bám ball, schedule offset cố định, seed deterministic) phải đạt `WON` trên level-01 và level-03 trong một tick budget; **assert trạng thái của level-02 tường minh** để 8 brick bị gate là một quyết định được ghi nhận, không phải tai nạn.

---

# WP-4 — Render & audio correctness + performance

**Mục tiêu:** sửa 4 defect thị giác, 3 defect audio, và giảm allocation per-frame.
**Thành phần:** `src/render/recordSprites.ts`, `src/render/textures/bakeGlowSprites.ts`, `src/vfx/*`, `src/services/audio/expoAudioService.ts`, `src/runtime/useGameLoop.ts`, `app/_components/PlayingHost.tsx`
**Dependencies:** WP-1

### T4.1 — Bật anti-alias (**F-15**, High) — *fix một dòng, đòn bẩy thị giác cao nhất*
- `tools.paint.setAntiAlias(true)` một lần trong `ensureRecorderTools` (`recordSprites.ts:39-45`).
- **Acceptance criteria:** ball/particle/trail/cue stroke mượt; đo lại bằng gfxinfo để xác nhận chi phí không đáng kể.

### T4.2 — Glow atlas khớp kích thước brick thật (**F-14**, High)
- **Hướng triển khai:** truyền `brickW`/`brickH` của level đang chơi vào `bakeGlowSprites`, key atlas theo `color×w×h`; **hoặc** blit bằng `drawImageRect` sized `(bw+2*pad, bh+2*pad)`. Cân nhắc bake ở `ceil(deviceScale)` để tránh banding khi upscale 3× trên màn 1080p (halo hiện chỉ có 4 ring đồng tâm nên mỗi ring thành bậc ~3px).
- **Acceptance criteria:** halo overhang ≤8px (trần của `07-UI-SPEC.md:42`) trên level-03; không có khối màu đặc thò ra góc dưới-phải.

### T4.3 — Particle nổ thừa hưởng màu brick (**F-13**, High)
- **Hướng triển khai:** mang HP trước-khi-trừ vào một slot của event (`evA` còn rỗi cho brick) và resolve màu từ đó, hoặc snapshot RGB tại chỗ push trong `step.ts`.
- **Acceptance criteria:** brick magenta nổ ra spark magenta; orange → orange; amber → amber.
- **Regression test:** `tests/vfx.brick-color.test.ts` — test trực tiếp `defaultResolveBrickRgb` + một test end-to-end `BRICK_BREAK` → màu particle theo từng loại brick. (Đây là test **chưa từng tồn tại** — lý do defect này ship được.)

### T4.4 — Clear trail ring (**F-16**, High)
- **Hướng triển khai:** zero ring liên quan khi reset (T1.1) và khi `activeBallCount` giảm (hook vào `compactBallPool` hoặc so sánh count ở runtime); hoặc seed mọi sample của ring mới-được-chiếm bằng vị trí hiện tại của ball.
- **Acceptance criteria:** không có vệt ghost nào trải giữa hai vị trí ball khác nhau sau khi một ball chết hoặc sau Retry.
- **Regression test:** mở rộng `tests/vfx.trails.test.ts` sang nhiều slot + kịch bản compaction.

### T4.5 — Dispose Skia surface/image của glow atlas (**F-18**, High)
- **Hướng triển khai:** `surface.dispose()` sau `makeImageSnapshot()` trong `bakeHalo`; trong cleanup của `PlayingHost`, iterate `glowAtlasSv.value`, `variant.soft.dispose()`, rồi `glowAtlasSv.value = null`. Cân nhắc hoist atlas thành singleton module-level bake một lần mỗi launch (khi đó T4.2 **phải** dùng `drawImageRect`).
- **Acceptance criteria:** soak 100 chu kỳ Title↔Playing không cho thấy tăng trưởng PSS đơn điệu.

### T4.6 — Cắt allocation per-frame (**F-17**, **F-56**, **F-60**)
- **Hướng triển khai:**
  - Pre-convert palette cố định thành `Float32Array` cache một lần (module-level hoặc trong `ensureRecorderTools`); `setColor` dùng cache.
  - Particle: dùng `setColorComponents`/scratch 4-float lấy **trực tiếp** từ `vfx.r/g/b/a` (đã là float 0-1) — bỏ hẳn vòng `×255 → template string → parse CSS → ÷255`.
  - `planBrickDamageCuesLocal`: ghi vào `Float32Array(12)` scratch + trả count, thay vì array + object literal mới mỗi brick.
  - Hoist object `intent` (`useGameLoop.ts:345-348`) và closure `rng` (`consumeEvents.ts:61-66`) ra ngoài vòng lặp.
  - Hoist `considerBrick` ra ngoài vòng CCD (`step.ts:239`); cho `sweepCircleAabb`/`resolve*` out-param hoặc scratch module-level.
  - Particle allocation: free-list stack (`Int16Array` + top index) thay scan O(cap); ring FIFO thật cho eviction.
- **Acceptance criteria:** allocation/frame giảm từ ~970 xuống <50; gfxinfo cho thấy hết các hitch định kỳ.
- **Lưu ý:** **không phá** những gì đã reuse đúng — `PictureRecorder`, một `SkPaint`, ba `SkRect`, và việc không tạo `SkPath` nào.

### T4.7 — Sửa `punchShake` và hướng shake (**F-28**, **F-31**)
- `vfx.shakeAmp = Math.min(2.5, Math.max(vfx.shakeAmp, impulse * intensity));`
- Lấy `(nx, ny)` từ `rngCosmetic` hoặc một hạng luân phiên (`sin(tick)`) và đưa qua `shakeOffset()` — hàm đã tồn tại nhưng chết trong render path. Chuyển decay sang dt-based.
- **Regression test:** mở rộng `tests/vfx.shake.test.ts` sang `intensity < 1` cho phép merge (hiện chỉ test 1.0 — lý do F-28 xanh); test decay ở 60Hz vs 120Hz cho cùng thời gian tắt.

### T4.8 — Sửa preload + dedupe + latch của audio (**F-33**, **F-34**, **F-35**)
- Đưa `ensurePools()` ra ngoài khối `try` của `preload`; dùng `Promise.allSettled` cho các source.
- Dedupe `sfxId` trùng trong một batch (phát một lần, có thể nhích gain theo `min(n,3)` dB), hoặc bỏ retrigger nếu voice vừa start trong ~40ms.
- Cho `release()` reversible (reset `released` trong `preload()`), hoặc gắn service vào effect thay vì memo `[]`.
- **Regression test:** `tests/audio.batch-dedupe.test.ts` — batch 8 `BRICK_BREAK` ⇒ ≤3 lần phát; `preload` reject ⇒ pool **vẫn** được dựng; `release()` rồi `preload()` lại ⇒ audio hoạt động.

### T4.9 — Wire hoặc gate `PERF_OVERLAY` (**F-29**, Medium) — *điều kiện tiên quyết cho WP-6*
- **Hướng triển khai:** truyền `PERF_OVERLAY` → `drawOverlayFlag` + `hudFont` trong `PlayingHost`; **và** gate `pushSample`/`percentileMs` theo `overlayEnabled` để production không trả thuế CPU. Xóa hoặc wire `CLIFF_RAMP`. Sửa comment `devflags.ts:3` cho khớp hành vi thật.
- **Acceptance criteria:** build `profiling` hiện overlay FPS; build `production` không tính percentile nào.

### T4.10 — Tier: phân biệt `high` vs `mid`, và fallback an toàn hơn (**F-58**, **F-62**)
- **Hướng triển khai:** cho `high` tăng `trailMax` hoặc thêm glow variant (SC3 nói tier cap "particle count, trail length, and glow variants"). Đổi fallback cho thiết bị lạ từ `'low'` sang `'mid'` **hoặc** giữ `low` nhưng `glowScale > 0` — mất hẳn glow là một khác biệt hướng nghệ thuật cả tier, không phải suy giảm mềm. Cân nhắc downgrade thích ứng dựa trên `metrics.p95Ms`/`overBudget` (đã được tính mỗi frame).
- **Regression test:** mở rộng `tests/runtime.quality-tiers.test.ts` cho fallback mới và (nếu làm) logic downgrade.

---

# WP-5 — Lifecycle & persistence

**Mục tiêu:** đóng Android Back và làm personal best đáng tin.
**Thành phần:** `app/_components/PlayingHost.tsx`, `app/_components/GameHost.tsx`, `src/services/storage/*`, `src/runtime/appStatePause.ts`
**Dependencies:** WP-1

### T5.1 — Xử lý Android hardware Back (**F-30**, Medium)
- **Hướng triển khai:** subscription `BackHandler` trong `PlayingHost`: `uiPhase === 'playing'` → `onPause()` và return `true`; `uiPhase === 'paused'` hoặc `result != null` → `onMenu()` và return `true`; ở Title → return `false` (cho thoát).
- **Acceptance criteria:** Back giữa ván → pause, không thoát app; Back ở Pause/Result → về Menu; Back ở Title → thoát.
- **Regression test:** test tích hợp trong WP-7 + kiểm chứng thủ công trên Android.

### T5.2 — Làm personal best đáng tin (**F-26**, Medium)
- **Hướng triển khai:**
  - Một instance store duy nhất ở module scope hoặc context (hiện `GameHost.tsx:30` và `PlayingHost.tsx:87` tạo riêng; ở đường soft-fail thì `memoryStore` mới có `bestScore = 0` mỗi lần).
  - Await ghi trước khi cho navigate, **hoặc** re-write khi `AppState → background` (mở rộng `appStatePause.ts`).
  - Phân biệt "absent" vs "corrupt": key sidecar, hoặc từ chối hạ best khi parse fail — hiện `parseBlob.ts:4-15` trả `0` cho mọi blob lỗi và best thật bị ghi đè ngay ván sau.
- **Acceptance criteria:** best sống qua force-quit ngay sau khi lập kỷ lục; blob lỗi **không** dẫn tới ghi đè best; best nhất quán giữa Title và Playing kể cả khi native AsyncStorage thiếu.
- **Regression test:** mở rộng `tests/storage.personal-best.test.ts` — corrupt blob ⇒ best **không** bị hạ; hai reader thấy cùng giá trị; ghi được flush khi background.

### T5.3 — Dọn các hạng mục lifecycle nhỏ (**F-61**, **F-63**)
- Seed `surfaceSize` bằng `0,0` thay vì `Dimensions.get('window')` ở module scope (guard `> 1` đã có).
- Gate `console.error` ở `PlayingHost.tsx:249` theo `__DEV__`.
- Release `useKeepAwake` khi pause.
- Bỏ `useFonts` trùng lặp.
- Thêm pattern cờ `cancelled` cho 3 promise chưa cancel (`useVfxIntensity.ts:20-27`, `GameHost.tsx:30-33`, `PlayingHost.tsx:154-164`).
- Xóa module mồ côi (`SpikeScreen.tsx`, `useSpikeLoop.ts`, `SpikeCanvas.tsx`, `camera.ts`) và element type `ui` vô nghĩa trong `eslint.config.js` (hoặc tạo `src/ui/`).

---

# WP-6 — Device certification & playtest

**Mục tiêu:** thực thi `08-06-PLAN.md` và lấy những bằng chứng mà không loại test tự động nào có thể thay thế.
**Dependencies:** **WP-1 (bắt buộc)**, WP-2, WP-4, T4.9. Không chạy trước.

### T6.1 — Instrument soak harness (**F-07**)
- Cho harness (`GameHost.tsx:38-88`) **tự ghi** `adb dumpsys meminfo` + `gfxinfo` ở đầu và cuối vào log — hiện nó chỉ log cycle nên kể cả khi chạy cũng không sinh artifact.
- **Acceptance criteria:** một lần chạy sinh ra log có thể paste trực tiếp vào bảng Results.

### T6.2 — Android certification (**F-04**)
- Protocol đầy đủ theo checklist ở [PERFORMANCE-REVIEW §8](./PERFORMANCE-REVIEW.md): Pixel 6a vật lý, profiling build, Mid tier, level-03, Cert WC đã **xác nhận bằng mắt** là ≥3 ball + particle gần cap + shake, `gfxinfo reset` → ≥30s → `framestats`, **≥2 run**, bỏ ~2s đầu, ghi p50/p95/jank cả hai run, **lấy run tệ hơn**, paste nguyên văn.
- **Acceptance criteria:** pass lock `phase8-certification.md:73-79` (`p50 ≤ 16.7ms` **và** `p95 ≤ 20ms`, **hoặc** jank ≤ 5%). Không silently remap về Low.

### T6.3 — iOS validation + discharge D2/D4 (**F-20**)
- iPhone vật lý, profiling build, Instruments (Core Animation + Allocations), cùng scenario, ≥30s × ≥2 run.
- **Và** tạo ô Results riêng cho **D2** (SC-2 worklet mutation trên profiling/release) và **D4** (iOS profiling re-run sau fix HUD font) — schema p50/p95/jank hiện **không biểu diễn được** hai mục này, đó là lý do chúng bị bỏ rơi.
- **Acceptance criteria:** cả hai waiver được discharge tường minh, có ô Results tương ứng.

### T6.4 — Soak (**F-07**)
- 100 chu kỳ Title↔Playing: ghi PSS đầu/cuối, kiểm tra duplicate game loop (qua `nextCallId`), orphaned worklet.
- 15 phút gameplay liên tục: memory growth + frame-time drift (so p95 của 30s đầu vs 30s cuối).
- **Acceptance criteria:** không tăng trưởng PSS đơn điệu, không drift p95, không crash, không mất khả năng điều khiển.

### T6.5 — Playtest LVL-04 có ghi số (**LVL-04**, **F-45**)
- ≥5 người chơi lần đầu, 3 mạng, level-03, tier Mid. Ghi: thời gian clear, số mạng dùng, và trả lời câu "muốn chơi lại?".
- **Acceptance criteria:** median thời lượng trong band 2-3 phút, **hoặc** một quyết định chính thức sửa mục tiêu / thêm speed ramp (T3.4). Dữ liệu headless của audit (bot hoàn hảo: 156-317s) cho thấy band hiện tại **có thể không đạt được**.

### T6.6 — Kiểm chứng lifecycle trên thiết bị (**PLT-01**, **PLT-02**)
- Lock/unlock; cuộc gọi đến; notification; Android Back (sau T5.1); mount/unmount nhiều lần; đưa app xuống background giữa countdown.
- Layout ở ≥4 kích thước: điện thoại thấp, điện thoại cao (20:9), tablet portrait, thiết bị có notch lớn. Chụp screenshot.
- **Acceptance criteria:** mọi kịch bản trong bảng checklist của [CODE-REVIEW](./CODE-REVIEW.md) chuyển từ "untestable-without-device" sang có bằng chứng.

### T6.7 — Xác nhận Skia trên Android vật lý (**F-59**)
- Install + chạy FPS harness trên Android vật lý (tiêu chí của chính `skia-version-decision.md:20`), rồi mới để status là "Confirmed".

---

# WP-7 — Test infrastructure

**Mục tiêu:** đóng khoảng trống mà ba finding nặng nhất của audit đã sống trong đó.
**Dependencies:** WP-1 (để có API đúng mà test)

### T7.1 — Thêm component / integration test (**F-43**)
- **Hướng triển khai:** cài `@testing-library/react-native` + `react-test-renderer` (hoặc `jest-expo`). Cover: `PlayingHost` FSM (title→playing→pause→countdown→resume; result→retry), `GameScreen` layout, gesture composition trong ngữ cảnh, và **biên thread** (assert `retry()` thực sự đổi `world.tick`).
- **Acceptance criteria:** một test duy nhất kiểu "`retry()` có đổi `world.tick`?" — thứ đã đủ bắt F-01 — tồn tại và pass.

### T7.2 — Trỏ test freeze vào code đang chạy (**F-36**)
- Xóa `src/runtime/freeze.ts` và export `clampFrameDtLocal`/`resetAccumulatorLocal` từ `useGameLoop.ts`, hoặc đưa logic trở lại `freeze.ts` và import từ đó. Hiện `tests/runtime.accumulator-reset.test.ts:11-26` chứng minh tính chất của hàm **production không gọi**.

### T7.3 — Bịt các lỗ của ma trận ESLint (**F-24**)
- Mở scope rule LC-07 (`eslint.config.js:81`) thành `['src/runtime/**','src/render/**','app/**']`, giữ override cho `eventBridge.ts`; thêm selector cho `runOnRuntime`/`runOnUI`/dạng member-call; **hoặc** chuyển chrome bridge từ `app/` sang `src/runtime` để exception trở nên tường minh. Thêm rule cấm đọc `world.value` ngoài worklet (hỗ trợ T1.1). Đưa `src/devflags.ts` vào một `boundaries/elements` pattern.

### T7.4 — Parity test cho constants (**F-37**, **F-63**)
- Assert mỗi literal inline bằng constant đã export, cho ~16 giá trị của Phase 5 + các hằng trùng lặp qua 8 file (360×640, `PADDLE_HALF_W`, `SIM_PLAYING`, map `SIM`, `HUD_STRIP_CONTENT`). Repo đã chấp nhận test đọc source (`tests/rules.stall.test.ts:95-100`) nên pattern này hợp lệ.
- Thêm test đảm bảo `recordSprites.ts:52-64`/`:72-115` đồng bộ với `src/render/colors.ts` và `src/core/levels/damageCues.ts`.

### T7.5 — Test cho render path (**F-13**/**F-14**/**F-15**/**F-16** sẽ không tái phát)
- Grep 37 file test cho `recordFrame|bakeGlowSprites|defaultResolveBrickRgb|GlowAtlas|useVfxIntensity|createExpoAudioService` hiện trả về **một** match duy nhất. Thêm: draw order/geometry của `recordFrame`, khóa của glow atlas vs brick size, `defaultResolveBrickRgb`, `useVfxIntensity`, và tính trung lập của VFX với world hash.

### T7.6 — Test cho các edge case còn trống
Theo bảng ở [REQUIREMENTS-MATRIX §cuối](./REQUIREMENTS-MATRIX.md): corner hit qua `stepWorld`, hai brick đồng thời, ball spawn chồng collider, ball ra khỏi field cùng lúc collision, pause giữa CCD (snapshot hash → freeze N frame → resume → so với run liên tục), pickup pool cạn, multiball catch cùng step ball cuối rơi, `levels.budget.test.ts` pin cấu trúc ba act của level-03 (33/52/8 breakable, 172 HP, mọi brick trong `[0,360]×[0,640]`).

### T7.7 — Sửa runner test cho môi trường Linux/CI (tùy chọn)
- Hiện `npx vitest run` và `npx eslint .` **crash** khi `node_modules` được cài trên macOS rồi chạy trên Linux (native binding của `rolldown` và `unrs-resolver`). Nếu muốn CI trên Linux, cần cài lại dependency trong môi trường đó (hoặc pin optional dependency đa nền tảng).

---

# WP-8 — Ledger, docs & store compliance

**Mục tiêu:** làm cho tài liệu trạng thái phản ánh sự thật, và đóng các hạng mục store còn thiếu.
**Dependencies:** WP-6 cho các hạng mục cần số đo

### T8.1 — Dọn ledger requirements (**F-04**, **F-06**, **F-19**, **F-57**)
- Revert `PLT-03` (`REQUIREMENTS.md:50,125`), và xem xét `LVL-04` (`:112`) + `PLT-04` (`:126`) về `Pending` cho tới khi có bằng chứng tương ứng.
- Xóa `requirements-completed: [PLT-03]` khỏi `08-00/02/03/04-SUMMARY.md` — harness không phải requirement.
- Đồng bộ PHYS-01 (`:12,102`), PHYS-05 (`:16,106`), RUN-02 (`:30,114`), PLT-01 (`:48,123`) — hiện ghi `Pending` dù Phase 3 `6/6 Complete`.
- Hạ Phase 7 SC-5 về không-đạt tới khi có số đo (`07-VERIFICATION.md:30`).
- Sửa số học roll-up trong `ROADMAP.md:173,175-180,200` và `STATE.md:9-14,29,33,39`; cập nhật test count ở `PROJECT.md:20`.
- Dọn mâu thuẫn trong `HOSTING.md:5` vs `:58-66` và `08-05-SUMMARY.md:34` vs `:40/48/59` — **URL đã được audit xác nhận live 200**, nên chỉ cần xóa phần waiver lỗi thời.
- Cập nhật `05-VERIFICATION.md:105-106` (WR-01/WR-02 đã được fix ở `05-REVIEW-FIX.md`).

### T8.2 — Mở lại các deferred item mồ côi (**F-20**, **F-44**)
- **D2** (SC-2 release-build worklet mutation) và **D4** (iOS profiling re-run) cần một plan sở hữu và một ô Results biểu diễn được chúng.
- **D13** (6 lỗi `tsc`) — đóng bằng T1.2, và **đưa `tsc --noEmit` trở lại phase gate** (Phase 1 đã từng có: `01-VALIDATION.md:48`; gate hiện tại `08-06-PLAN.md:94` chỉ có `npm test` + `assert-privacy-manifest`).

### T8.3 — Khôi phục các gate quy trình (**F-03**)
- PLAN-CHECK (2/8), REVIEW (2/8), `01-PATTERNS.md`, `08-VERIFICATION.md`, `08-06-SUMMARY.md`, `nyquist_compliant` ở 4 phase, sign-off trống ở `03-VALIDATION.md:82-90` và `04-VALIDATION.md:83-90`. Hoặc thực hiện, hoặc ghi waiver tường minh — hiện chúng chỉ đơn giản bị bỏ qua.

### T8.4 — Siết gate privacy manifest (**F-39**)
- Mở rộng `scripts/assert-privacy-manifest.mjs` để so **nội dung** (không chỉ 4 key tồn tại), và nếu `ios/` tồn tại thì so luôn artifact đã prebuild (`PrivacyInfo.xcprivacy` hiện thiếu `NSPrivacyTrackingDomains`, thiếu DiskSpace, chỉ 1/3 reason FileTimestamp). Hoặc `expo prebuild --clean` trước mọi build release.

### T8.5 — App name clearance (**F-54**)
- Thực hiện 4 search mà `name-clearance.md:13-18` liệt kê, **ghi lại ngày, từ khóa, và kết quả**. Lấy ý kiến trademark nếu cần trước khi tạo listing.

### T8.6 — Provenance của asset (**F-40**)
- Thêm dòng nguồn gốc thật (tác giả / công cụ / license / ngày) cho 7 file `.wav`.
- Với `assets/images/`: xóa asset template Expo không dùng (`expo-logo.png`, `tabIcons/*`) **hoặc** sửa attestation cho đúng — hiện `originality-attestation.md:13` khai chúng là "project art".
- Cân nhắc nâng SFX lên 44.1 kHz (**F-62**): hiện tất cả là 22.05 kHz mono, Nyquist 11 kHz, mất đúng dải cao tạo "sparkle" mà `07-UI-SPEC.md:201` yêu cầu. Tổng asset ~32 KB → ~64 KB, không đáng kể.

### T8.7 — Kênh liên hệ privacy (**F-55**)
- Cung cấp một contact tiếp cận được (email hoặc repo public) trước khi submit; hiện policy nói "when published" / "when one exists".

### T8.8 — Dọn production build (**F-42**)
- Gate plugin `expo-dev-client` theo profile (config plugin có điều kiện, hoặc `app.config.js` đọc env) thay vì load không điều kiện ở `app.json:56`.
- Thực hiện visual QA trên build production để đóng mitigation T-08-30 (`08-06-PLAN.md:160`): xác nhận không có UI Cert/Soak, không có dev level switch, không có dev launcher.

### T8.9 — Đóng Phase 8 (**F-05**)
- Tạo `08-06-SUMMARY.md` và `08-VERIFICATION.md` **sau khi** WP-6 có số liệu thật. Chỉ khi đó mới được mô tả dự án là "8 phase completed".

---

## Ghi chú về phạm vi

Theo đúng giới hạn của đợt audit, kế hoạch này **không** bao gồm:
- Tính năng gameplay ngoài phạm vi MVP (v2: haptics, paddle bump, combo juice, music, level editor, leaderboard, ads/IAP).
- Refactor hoặc nâng cấp dependency không liên quan. **Không có đề xuất nâng version nào** trong toàn bộ kế hoạch — `@shopify/react-native-skia@2.12.0` được cố ý pin và `assert:skia` PASS; Expo 57 / RN 0.86 / Reanimated 4.5.1 đều nhất quán với nhau.
- Thay đổi cấu hình Apple Developer / Google Play Console, hay submit app.
- Sửa đổi approved planning documents ngoài các hạng mục ledger được liệt kê tường minh ở T8.1-T8.3 (và những hạng mục đó cần phê duyệt vì chúng chạm vào tài liệu GSD đã chốt).
