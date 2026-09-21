# RELEASE READINESS

**Ngày audit:** 2026-09-21
**Câu hỏi:** còn thiếu gì trước khi (a) tiếp tục playtest nội bộ, (b) mở external testing, (c) phát hành công khai?

**Phân biệt bắt buộc trong toàn tài liệu này:** "**Đã chuẩn bị tài liệu**" ≠ "**Đã thực sự đáp ứng yêu cầu khi submit**".

---

## 0. Ba cổng

| Cổng | Trạng thái | Điều kiện còn thiếu |
|---|---|---|
| **(a) Playtest nội bộ tiếp tục** | ⚠️ **Gần đạt** | Cần sửa **F-01** (Retry không hoạt động) và **F-09** (4 overlay mất scrim). Cả hai là fix nhỏ. Không sửa thì mọi feedback playtest về "retry / màn hình kết quả" đều không đáng tin |
| **(b) External testing (TestFlight / Play internal)** | ❌ **Chưa đạt** | Toàn bộ nhóm Critical + High; cộng Android Back (F-30), persistence (F-26), và một đợt đo hiệu năng tối thiểu để biết game có chạy nổi trên máy tầm trung |
| **(c) Phát hành công khai** | ❌ **Chưa đạt** | Thêm: certification đầy đủ theo protocol, soak, name clearance, provenance asset, dọn dev tooling khỏi production, và đóng Phase 8 bằng verification thật |

---

## 1. Technical

| # | Hạng mục | Trạng thái | Chặn cổng | Finding |
|---|---|---|---|---|
| T-1 | `retry()` reset được ván chơi | ❌ **Không hoạt động** — mutate bản clone của World | (a) | F-01 |
| T-2 | Overlay Pause/Result/Countdown/LevelError hiển thị đúng modal | ❌ **Hỏng** — `absoluteFillObject` không tồn tại trong RN 0.86 | (a) | F-09 |
| T-3 | `npx tsc --noEmit` sạch | ❌ **6 lỗi**, deferred 5 lần, `tsc` bị loại khỏi phase gate | (b) | F-44 |
| T-4 | `npm run lint` sạch | ❌ **6 error + 7 warning** | (b) | F-46 |
| T-5 | Frame callback có identity ổn định | ❌ re-register mỗi React render | (b) | F-10 |
| T-6 | Không rò rỉ tài nguyên qua chu kỳ Title↔Playing | ❌ glow atlas: 4 Skia surface + 4 image mỗi mount, không dispose | (b) | F-18 |
| T-7 | Android hardware Back được xử lý | ❌ **không có ở đâu cả** — Back thoát app giữa ván | (b) | F-30 |
| T-8 | Personal best sống qua force-quit | ⚠️ **Yếu** — ghi fire-and-forget, không flush khi background, blob lỗi reset best về 0 | (b) | F-26 |
| T-9 | Không có React state update mỗi frame | ⚠️ đúng theo thiết kế, nhưng 4 reaction rời → tới 3-4 render/frame | (b) | F-25 |
| T-10 | Layer contract được enforce | ⚠️ enforce tốt hơn mức trung bình, nhưng 4 lỗ và `app/` có 4 `runOnJS` ngoài scope rule | (b) | F-24 |
| T-11 | Không allocation nặng trong render path | ❌ ~970 allocation/frame (452 SkColor + 192 string + ~320 object cue) | (b) | F-17 |
| T-12 | Có integration / thread-boundary test | ❌ **không có** — không `@testing-library`, không `react-test-renderer`, không `jest-expo` | (b) | F-43 |
| T-13 | `freeze.ts` được test là code đang chạy | ❌ test cover module **production không import** | (c) | F-36 |
| T-14 | Core constants thực sự configurable (D-04) | ❌ ~16 constant export nhưng inline literal, không parity test | (c) | F-37 |
| T-15 | Không log dev trong production | ⚠️ một `console.error` không gate (`PlayingHost.tsx:249`) | (c) | F-63 |
| T-16 | Unit test suite xanh | ✅ **179/179 pass** (xem cảnh báo runner trong PERFORMANCE-REVIEW §6) | — | — |
| T-17 | Layer purity của `core/` | ✅ enforce hai lớp (test grep source + ESLint), 0 vi phạm | — | — |
| T-18 | Seam ads/IAP/accounts no-op, offline | ✅ | — | — |

---

## 2. Gameplay

| # | Hạng mục | Trạng thái | Chặn cổng | Finding |
|---|---|---|---|---|
| G-1 | Aimed launch (PHYS-05) | ❌ **không tồn tại** — serve luôn chính xác `(0, -360)`; test tự tin sai | (b) | F-21 |
| G-2 | Particle nổ thừa hưởng màu brick (D-08/FX-02) | ❌ mọi brick nổ ra cùng màu amber | (b) | F-13 |
| G-3 | Glow khớp kích thước brick của level đang chơi | ❌ atlas bake 44×18, level-03 dùng 32×14 → halo trùm lệch 16px/8px | (b) | F-14 |
| G-4 | Anti-alias trong record path | ❌ **không bật** — ball, trail, particle, cue stroke 1.25px đều răng cưa | (b) | F-15 |
| G-5 | Trail không dính vệt của ball cũ | ❌ ring không bao giờ clear (retry + slot compaction) | (b) | F-16 |
| G-6 | Không phát lại SFX/shake trùng sau khi mất mạng | ❌ `life_lost` retrigger ~120 lần/giây, shake ghim ở max | (b) | F-08 |
| G-7 | Ball không xuyên collider | ⚠️ tunneling ở tốc độ thiết kế đã được property-test kỹ, nhưng 3 đường còn hở: CCD miss double-advance, ball chồng collider, grid stale | (b) | F-11, F-12, F-38 |
| G-8 | Ball không stall gần-ngang quá lâu | ⚠️ tới **12 giây** worst case (tier 2 no-op ở max speed) | (b) | F-22, F-23, F-27 |
| G-9 | Audio không flam/clip khi multiball | ⚠️ không dedupe `sfxId` trong batch; 3 bản sao cùng waveform ở 0.85 | (b) | F-34 |
| G-10 | Audio không chết im lặng | ⚠️ `release()` là latch một chiều trên memo `[]` | (c) | F-35 |
| G-11 | Shake là rung, không phải trượt một hướng | ⚠️ hướng hardcode `(0.85, 0.53)`, không jitter; decay theo frame không theo dt | (c) | F-31 |
| G-12 | level-03 clear trong ~2-3 phút | ❌ **chưa kiểm chứng.** Bot hoàn hảo: 2,6-5,3 phút. Người thật rất có thể >3 phút | (c) | LVL-04, F-45 |
| G-13 | Mọi level đang ship đều chơi được hợp lý | ⚠️ level-02: 50% breakable gate sau hàng steel, kênh 2 đơn vị dung sai. Production không load nó (DEV-only) | (c) | F-02 |
| G-14 | Deterministic replay không phụ thuộc VFX | ❌ `rngCosmetic` được mix vào `hashWorld`, và VFX advance nó → hash phụ thuộc setting reduce-motion | (c) | F-32 |
| G-15 | Fixed timestep + swept CCD + clamp góc paddle | ✅ chất lượng cao, property test 2× max speed | — | — |
| G-16 | Multiball / pickup / scoring / combo / lives / win | ✅ logic đúng, test tốt | — | — |
| G-17 | Level pipeline fail-closed, versioned | ✅ | — | — |
| G-18 | Sàn reduced-motion cho trail | ✅ lấy từ OS `AccessibilityInfo`, sàn ≥2, test kỹ | — | — |

---

## 3. Performance

| # | Hạng mục | Trạng thái | Chặn cổng | Finding |
|---|---|---|---|---|
| P-1 | Pixel 6a Mid certification (protocol đầy đủ) | ❌ **UNPROVEN** — 0 run; mọi ô `PENDING_DEVICE` | (b) tối thiểu / (c) đầy đủ | F-04 |
| P-2 | Cảnh worst-case thực sự dựng được | ❌ `injectCertWorstCase` chưa bao giờ inject được gì | (b) | F-01 |
| P-3 | Cross-check bằng in-app overlay | ❌ `PERF_OVERLAY` không có consumer; overlay không thể bật | (b) | F-29 |
| P-4 | iOS Instruments | ❌ chưa bao giờ chạy | (c) | — |
| P-5 | iOS install/render trên máy thật | ✅ có bằng chứng đáng tin (iPhone 16 Pro, UDID, `devicectl`) — nhưng **development build** | — | — |
| P-6 | Soak 100 chu kỳ + 15 phút | ❌ **UNPROVEN** — chưa chạy, **và harness không tự ghi số liệu** | (c) | F-07 |
| P-7 | Waiver hardware Phase 1 được discharge | ❌ D1/D2/D3 vẫn mở; D2 và D4 **mồ côi**, không plan nào sở hữu | (c) | F-20 |
| P-8 | Frame budget của VFX (FX-02) | ❌ `phase7-vfx-measurement.md:72` = `OPEN — PENDING_DEVICE`; SC-5 bị đánh VERIFIED trên tài liệu procedure | (c) | F-19 |
| P-9 | Xác nhận Skia 2.12.0 trên Android vật lý | ❌ chỉ có EAS build success; doc vẫn ghi "Confirmed" | (c) | F-59 |
| P-10 | Tier `high` thực sự khác `mid` | ⚠️ `trailMax` và `glowScale` giống nhau; chỉ `low` khác cả ba | (c) | F-58 |
| P-11 | Tier resolve đáng tin trên thiết bị lạ | ⚠️ fallback `'low'` → `glowScale = 0` → **glow biến mất im lặng**; heuristic RAM là proxy GPU kém; không downgrade thích ứng | (c) | F-62 |
| P-12 | Methodology đo được tài liệu hóa đúng chuẩn | ✅ **chất lượng tốt** — đúng công cụ, đúng ngưỡng, cấm RN Perf Monitor và simulator | — | — |
| P-13 | Metrics tính đúng phương pháp | ✅ rolling FPS = `1000/mean(interval)`, p95/p99 alloc-free | — | — |

---

## 4. Store compliance

**Tổng: chuẩn bị 8/9 · thỏa mãn thực tế 4/9.**

| # | Hạng mục | Đã chuẩn bị? | Thỏa mãn để submit? | Bằng chứng / khoảng trống |
|---|---|---|---|---|
| S-1 | Privacy policy — **nội dung** | ✅ | ✅ | `privacy-policy.md:15-20`, `privacy-policy.html:55-60`. Khớp hành vi thật: offline (seam ARCH-02 là no-op), AsyncStorage local (`@nbb/personal-best/v1`), **không** analytics/ads/IAP — đã đối chiếu `package.json:6-32`. `:24` carve-out trung thực cho crash reporting của platform. **Không tìm thấy mâu thuẫn nào** |
| S-2 | Privacy policy — **URL HTTPS công khai** | ✅ | ✅ **ĐÃ XÁC NHẬN** | Audit fetch trực tiếp `https://dexter292.github.io/bricks_breaker/store/privacy-policy.html` → **200**, nội dung đúng. `docs/.nojekyll` + `docs/index.html` nhất quán với Pages deploy. ⚠️ Tài liệu tự mâu thuẫn (`HOSTING.md:5` vs `:58-60`; `08-05-SUMMARY.md:34` vs `:40/48/59`) — chỉ cần dọn (F-57) |
| S-3 | Apple privacy manifest | ✅ | ⚠️ **Nguồn chân lý đúng, bản prebuild lệch** | `app.json:16-38` khai đủ 4 required-reason API. `ios/.../PrivacyInfo.xcprivacy` **thiếu** `NSPrivacyTrackingDomains`, **thiếu** DiskSpace, chỉ 1/3 reason cho FileTimestamp. `ios/` gitignore nên app.json thắng qua CNG, nhưng `assert-privacy-manifest.mjs:26-37` **chỉ kiểm tra key tồn tại** → không gate nào bắt divergence trong binary ship (F-39) |
| S-4 | Google Play Data Safety | ✅ | ❌ **Chỉ trên giấy** | `play-data-safety.md:9-15` bộ trả lời đầy đủ; `:19-23` lập luận "local score is not collected" vững (lưu trên máy, không truyền, không link ad-ID) với `:25` điều khoản revisit trung thực; `:29-42` checklist 13 category. Nhưng `:46` "No Play Console listing creation or `eas submit` in Phase 8 (D-26)" — **chưa nhập vào console** |
| S-5 | Age rating | ✅ | ❌ **Chỉ trên giấy** | `age-rating.md:5-9` (Play Everyone / Apple 4+ / PEGI 3) + `:15-20` rationale. Chưa hoàn thành questionnaire ở console nào |
| S-6 | App name clearance | ⚠️ **Một phần** | ❌ | `name-clearance.md:13-18` liệt kê 4 search **sẽ** làm — không ngày, không từ khóa, không kết quả. `:24-26` trademark opinion "Not obtained"; listing uniqueness "Deferred". **Zero bằng chứng clearance** (F-54) |
| S-7 | Nguồn gốc / attribution asset | ✅ (attestation) | ❌ | `originality-attestation.md:5,11-14`. Level: đáng tin (row-string viết tay). **SFX:** 7 file `.wav` khai "project-authored / **licensed for this app**" — either/or chưa giải quyết, **không tác giả/công cụ/license/ngày**. **Images:** attestation nói "project art" nhưng `assets/images/` chứa asset template Expo (`expo-logo.png`, `tabIcons/*`), không được reference ở đâu → attestation **sai** cho thư mục đó (F-40) |
| S-8 | Production build loại dev tooling | ✅ (env) | ⚠️ | `eas.json:22-24` profile production **không có block `env`** → `PERF_OVERLAY`/`CERT`/`SOAK`/`CLIFF_RAMP` đều unset; `devflags.ts:5-8` document đúng; cert/soak/dev-switch đều `__DEV__`-gated nên Metro strip. **Nhưng** `app.json:56` vẫn load plugin `expo-dev-client` **không điều kiện**, và `ios/Pods` chứa `expo-dev-launcher` + `expo-dev-menu` — App Store review không thích một dev launcher được ship. Mitigation T-08-30 ("Confirm production build lacks Cert/Soak UI during visual QA", `08-06-PLAN.md:160`) **chưa thực hiện** (F-42) |
| S-9 | Không có UI quảng cáo/IAP/account chưa triển khai | ✅ | ✅ | Seam là no-op thuần, không có UI nào; `tests/platform.seams.test.ts` (4 pass) |
| S-10 | Kênh liên hệ privacy hoạt động | ❌ | ❌ | `privacy-policy.md:36` — liên hệ là repository issues "**when published**" hoặc store listing "**when one exists**". Cả hai store đòi một contact tiếp cận được (F-55) |

**Lưu ý phạm vi:** audit **không** submit app, **không** tạo listing, và **không** thay đổi cấu hình Apple Developer / Google Play Console — theo đúng giới hạn được đặt ra.

---

## 5. Quy trình / tài liệu (chặn việc đóng Phase 8, không chặn kỹ thuật)

| # | Hạng mục | Trạng thái | Finding |
|---|---|---|---|
| D-1 | `08-VERIFICATION.md` tồn tại | ❌ thiếu — phase duy nhất không có | F-05 |
| D-2 | `08-06-SUMMARY.md` tồn tại | ❌ thiếu — plan duy nhất không có SUMMARY | F-05 |
| D-3 | Ledger requirements đáng tin | ❌ **vừa over-claim vừa under-claim**: PLT-03 tick Complete không có số đo; PHYS-01/PHYS-05/RUN-02/PLT-01 vẫn `Pending` dù Phase 3 `6/6 Complete` | F-04, F-57 |
| D-4 | `requirements-completed` trong SUMMARY chính xác | ❌ 4 file khai `[PLT-03]` cho harness/protocol; `08-00-SUMMARY.md:53` khai cả `[LVL-04, PLT-03, PLT-04]` cho plan output là `it.todo` stub | F-06 |
| D-5 | Gate quy trình đã cấu hình được thực thi | ❌ PLAN-CHECK 2/8, REVIEW 2/8, thiếu `01-PATTERNS.md`, `nyquist_compliant: false` ở 4 phase, sign-off trống ở 2 phase Complete | F-03 |
| D-6 | Số học roll-up nhất quán | ❌ 4 giá trị khác nhau cho "bao nhiêu plan đã xong" | F-57 |
| D-7 | `skia-version-decision.md` status đúng tiêu chí của chính nó | ❌ ghi "Confirmed" nhưng Android physical còn outstanding | F-59 |
| D-8 | Deferred item có owner | ❌ D2, D4, D13 không có phase/plan/Results nào sở hữu | F-20, F-44 |
| D-9 | `tsc --noEmit` trong phase gate | ❌ bị loại (Phase 1 đã từng có: `01-VALIDATION.md:48`) | F-44 |

---

## 6. Danh sách tối thiểu để mở external testing (cổng b)

Theo thứ tự thực hiện:

1. **F-01** — reset World qua SharedValue request thay vì mutate clone. *(Điều kiện tiên quyết cho cả Retry, accumulator reset, và mọi phép đo hiệu năng.)*
2. **F-09** — `absoluteFill` ở 4 overlay.
3. **F-08** — clear event ring ở mọi nhánh `stepRun`.
4. **F-13 + F-14 + F-15 + F-16** — bốn fix thị giác: màu particle, glow theo brick size, anti-alias, clear trail ring.
5. **F-30** — `BackHandler` cho Android.
6. **F-26** — một store instance, flush khi background, phân biệt corrupt vs absent.
7. **F-10 + F-17** — ổn định identity frame callback; cache SkColor + scratch cue.
8. **F-18** — dispose Skia surface/image của glow atlas.
9. **F-44 + F-46** — `tsc` và `lint` sạch; đưa `tsc` trở lại gate.
10. **F-29** — wire `PERF_OVERLAY` hoặc gate `pushSample`.
11. Một đợt đo hiệu năng tối thiểu trên Pixel 6a (chưa cần full protocol, nhưng phải là thiết bị thật + profiling build) để biết game có chạy nổi ở tầm trung.
12. **F-11 + F-12** — hai đường tunneling còn hở.

Chi tiết từng task kèm acceptance criteria và regression test: [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md).
