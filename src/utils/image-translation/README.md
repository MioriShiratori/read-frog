# Image translation

The floating image tool offers two explicit actions: drag a visible screen area, or click a webpage `<img>`. A completed result overlays the original location; it never replaces the site's image node. Close, Escape, navigation, or a changed source image removes the overlay. The result can switch between the captured original and the translation.

OCR runs locally in a dedicated Firefox background worker with packaged PP-OCRv6 Small models and ONNX Runtime WASM. Only recognized text goes through the existing webpage translation provider, source/target languages and glossary. Images and screenshots do not go to an OCR API. No extra Python server, GPU, account or OCR API key is required.

## Boundaries

- `capture.ts` fetches HTTP(S) image bytes in the background, or captures and scales a rectangle from the requesting active tab. It checks tab identity before and after capture. Direct image loading failures expose the visible-area fallback; blob/data images can use that fallback too.
- `ocr-jobs.ts` owns worker lifetime, cancellation, a two-job limit and a 120-second deadline. Closing a tab cancels that tab's workers. Every completed/failed worker terminates, releasing its WASM/model memory. The worker uses one WASM thread.
- `ocr/engine.ts` owns inference sessions and tensors. It converts detector coordinates back to original image pixels, orders quadrilateral corners before deriving text direction, and recognizes lines sequentially. Models and dictionary are bundled; their fixed sources, hashes and notices are in `public/image-translation/SOURCES.md`.
- `pipeline.ts` serializes text translation, retains block identity, rejects empty output, and checks cancellation at each asynchronous boundary. Cancellation stops OCR and future translation requests; an already sent provider request can still finish, but its result is discarded.
- `render/` masks foreground strokes inside OCR polygons, repairs them with the ported Telea algorithm, then fits and renders translated text. Text that cannot fit at the minimum font size causes a recoverable error. There is no silent clipping.
- The lazy content UI owns selection and the result overlay. Image results follow their source element's resize/scroll position. A screenshot area follows document scrolling and closes on viewport resize or independent container scrolling, where it has no DOM anchor. Captures temporarily hide extension UI with a shared visibility lease.

## Limits

Images are limited to 25 MB encoded and 16 million decoded pixels. Detection downsamples the longest side to 960 pixels; very long images or tiny text should be translated in smaller selected areas. Generic OCR does not guarantee decorative handwriting or manga reading order. Telea is local pixel repair, so complex artwork may retain artifacts; neural inpainting and manual text editing are not included. The overlay covers a rectangular image area and follows its `object-fit`; arbitrary CSS transforms and clipping are not reconstructed.

## Verification

Run local regression tests with `SKIP_FREE_API=true`. Numeric OCR tests exercise CTC decoding, tensor channels, perspective cropping, detector coordinate mapping and baseline direction. Other tests cover active-tab capture boundaries, pixel scaling, worker identity/concurrency/cleanup, cancellation, empty output, stroke preservation and fitting. Actual OCR and the two UI flows are additionally checked in a temporary Firefox profile using synthetic images and a local mock text-translation endpoint; this does not evaluate a live translation provider's quality.

Update both packaged ORT runtime files whenever changing the pinned `onnxruntime-web` dependency. Do not load runtime code or weights from a CDN.
