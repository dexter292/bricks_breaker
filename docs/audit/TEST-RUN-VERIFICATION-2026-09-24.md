# PHỤ LỤC — XÁC MINH ĐỘC LẬP `267/267`

**Ngày chạy:** 2026-09-24 (UTC 03:12)
**Đối tượng:** HEAD **`f445e0cba23351ce2f37989c8959e7598c6d6fda`** (`f445e0c`), working tree **clean** (`git status --porcelain` → 0 dòng)
**Người chạy:** audit (độc lập với dev)
**Liên quan:** [MVP-CLOSE-REPORT.md](../MVP-CLOSE-REPORT.md) · [FINAL-ACCEPTANCE-REPORT.md](./FINAL-ACCEPTANCE-REPORT.md) §1

---

## 0. Kết luận

> **`267 pass / 0 fail / 59 file` — KHỚP CHÍNH XÁC con số dev báo cáo.**
>
> Đây là lần đầu trong toàn bộ 9 vòng audit mà **cả 4 file `*.test.tsx`** được audit **thực thi** chứ không chỉ đọc code. Khuyến nghị "phải chạy lại `npm test` trước khi ký" ở vòng review MVP-close **đã được đáp ứng**.

---

## 1. Kết quả

| Nhóm | File | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| `tests/*.test.ts` | 55 | **261** | 0 | 0 |
| `tests/ui/*.test.tsx` (jsdom) | 4 | **6** | 0 | 0 |
| **Tổng** | **59** | **267** | **0** | **0** |

Bốn file `.tsx`: `CountdownOverlay` 2p · `HudStrip` 2p · `LevelErrorOverlay` 1p · `jsdom-harness` 1p.

### Gate khác, chạy lại cùng HEAD

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | **exit 0**, 0 lỗi |
| `npx eslint . --max-warnings 0` | **exit 0** |
| `node scripts/assert-worklet-closures.mjs` | **exit 0** — `Worklet closure guard OK (89 files)` |
| `node scripts/assert-skia-version.mjs` | **exit 0** — `@shopify/react-native-skia@2.12.0 OK` |
| `node scripts/assert-privacy-manifest.mjs` | **exit 0** — `privacyManifests OK (config + 1 PrivacyInfo.xcprivacy)` |

---

## 2. Tính toàn vẹn của nguồn chạy — phải nêu rõ

`src/`, `tests/`, `app/`, `assets/` được copy sang thư mục scratch **ngoài repository**, rồi đối chiếu:

```
diff -rq src <repo>/src ; diff -rq tests <repo>/tests ; diff -rq app <repo>/app
→ DIFF_EXIT=0 (không có khác biệt)
```

Riêng file nhạy cảm nhất được checksum trực tiếp:

```
344ffcefa2598b2efc141772ae5014cc  scratch/src/services/storage/asyncStorageStore.ts
344ffcefa2598b2efc141772ae5014cc  repo/src/services/storage/asyncStorageStore.ts
```

**Không có dòng production code nào bị sửa.** Toàn bộ điều chỉnh nằm trong harness (xem §3).

---

## 3. Giới hạn của harness — đây KHÔNG phải output vitest chính thức

`npx vitest run` **không chạy được** trong môi trường audit:

```
Error: Cannot find native binding …
  cause: Cannot find module '@rolldown/binding-wasm32-wasi'
EXIT=1
```

`node_modules` được cài cho **darwin-arm64** (`@rolldown/binding-darwin-arm64` là binding duy nhất có mặt), môi trường audit là Linux, và npm registry trả **403** cho `@rolldown/binding-linux-x64-gnu`.

Harness thay thế: shim `vitest` + `@fast-check/vitest` + Node 22 `--experimental-strip-types` với ESM loader hook, chạy trong scratch ngoài repo. Để tương đương vitest, harness phải cung cấp bốn thứ mà vitest tự lo:

| Harness cung cấp | Vì vitest/Vite cung cấp sẵn |
|---|---|
| `__dirname` / `__filename` | Vite SSR transform inject |
| `require()` toàn cục | `loadLevel.ts:26` dùng Metro static require cho JSON |
| `expect.any` / `expect.objectContaining` | matcher bất đối xứng, shim ban đầu thiếu |
| alias `react-native` → `react-native-web` + interop CJS | `vitest.config.ts` `resolve.alias` |

**Lần chạy đầu (trước khi vá 4 mục trên) ra `246p/4f`. Cả 4 fail đều là lỗ hổng harness, không phải lỗi repo** — chứng minh ở §4. Sau khi vá: `267p/0f`.

---

## 4. Đính chính: cảnh báo `TurboModuleRegistry` của audit là **quá nặng**

Tại vòng review MVP-close, audit nêu rủi ro `src/services/storage/asyncStorageStore.ts:1` có thể làm suite đỏ. **Nhận định đó sai.** Ghi lại để không ai hành động theo nó.

Lỗi thực sự quan sát được lúc đầu:

```
SyntaxError: The requested module 'react-native'
  does not provide an export named 'TurboModuleRegistry'
```

Nhưng đó là **ESM strict của Node**, không phải ngữ nghĩa Vite. Ba bằng chứng:

1. `react-native-web@0.21.2` **không có field `exports`**; `main` = `dist/cjs/index.js` → **CJS**. Vite/vite-node externalize CJS rồi truy cập **theo property**, trả `undefined` lúc runtime; nó **không** validate named export lúc link như Node.
2. Thay alias bằng shim mô phỏng đúng hành vi đó (`export const TurboModuleRegistry = undefined`), **giữ nguyên file gốc không sửa một byte** → `storage.personal-best.test.ts` **10 pass**.
3. Nhánh đó vô hiệu dưới test: `hasAsyncStorageNative()` chỉ có **một** call site — `asyncStorageStore.ts:54` — nằm *sau* early-return `process.env.VITEST` ở `asyncStorageStore.ts:51`.

**→ Không cần sửa `asyncStorageStore.ts`. Đề xuất trước đó được rút lại.**

---

## 5. Quan sát còn lại (không phải blocker)

**`267/267` không phủ hai nhánh production bị tắt cứng khi test:**

| Vị trí | Nhánh bị bỏ qua |
|---|---|
| `src/services/storage/asyncStorageStore.ts:51` | toàn bộ `hasAsyncStorageNative()` + native AsyncStorage load |
| `src/services/audio/expoAudioService.ts:236` | native audio load |

Kill-switch là hợp lý (Node không có native module), nhưng hệ quả là **persistence thật và audio thật chỉ có bằng chứng thiết bị, không có bằng chứng unit**. iOS D-16 playtest đã phủ phần này trên thực tế.

**Khuyến nghị:** thêm một dòng chú thích cạnh con số `267/267` trong MVP-CLOSE-REPORT, để sau này không ai đọc nó thành "mọi nhánh đã được test".

---

## 6. Việc còn lại trước khi ký MVP tạm thời

Không còn hạng mục nào cần **chạy**. Bốn mục còn lại là chữ nghĩa, trong `docs/phase8-certification.md` và `docs/MVP-CLOSE-REPORT.md`:

1. **D4** `PASS` → `PASS (dev-build; profiling IPA debt)` — gate ghi "iOS **profiling** SC-2 re-run", bằng chứng là development build.
2. **Soak** `PASS (harness)` → `HARNESS-ONLY (sim; no mem/frame data)` — chạy trên iPhone 17 Pro **Simulator**, mem/frame đều `n/a`; `measurement-methodology.md:46` nói simulator không tính cho gate.
3. **D2 iOS** `PASS` → `PASS (indirect — live play)` — overlay không baked, kết luận là suy luận từ Release build chơi được offline.
4. Thêm legend **`WAIVED ≠ PASS`** ngay trên bảng Results (PENDING_DEVICE đi 12 → 0 = 10 WAIVED + 6 PASS; gate Android **không tồn tại**, không phải đã đạt), và sửa `HEAD: 2aaa9cf` → `f445e0c`.

Nội dung các note hiện tại **đều trung thực**; chỉ là cột verdict đọc tách khỏi note sẽ bị hiểu quá.
