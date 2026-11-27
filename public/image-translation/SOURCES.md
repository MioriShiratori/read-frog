# Local image translation assets

OCR pre/postprocessing is adapted from Screen OCR Translator, commit
`d4a28e9a9014e4a6b89f50f336ddb2857c5bf5be`, under MPL-2.0.
Unused upstream text-direction overrides, stacked-line options, and dictionary
utilities are omitted. Pixel and quad math retains upstream algorithm contracts;
index assertions express the bounded-loop invariants for this project's strict
TypeScript configuration. The higher-level OCR adapter checks model tensor types.
See `licenses/MPL-2.0.txt` and the source headers.

The PP-OCRv6 Small detector and multilingual recognizer are the upstream
extension's weight-only INT8 conversions of PaddlePaddle's Apache-2.0 models.
The dictionary comes from the same fixed revision. Models are packaged locally;
no screenshot or image is sent to an OCR service.

| File     | SHA-256                                                          |
| -------- | ---------------------------------------------------------------- |
| det.onnx | 914c768d3987c50ee14c718ecbe3d765736c0958e66c872e58ce2490416284e2 |
| rec.onnx | 05d3020e86aaa3b361adc8f8c9d0438fe8f9e5299daf4173a13e6acbfc09cb47 |
| dict.txt | b5f2bfe2bdd9448429e3e82b51c789775d9b42f2403d082b00662eb77e401c5d |

Sources:

- https://github.com/OPerepadia/ocr-translator-extension/tree/d4a28e9a9014e4a6b89f50f336ddb2857c5bf5be/src/public/assets/ocr/ppocrv6-small
- https://huggingface.co/PaddlePaddle/PP-OCRv6_small_rec (Apache-2.0)
- https://github.com/PaddlePaddle/PaddleOCR (Apache-2.0)

`ort-wasm-simd-threaded.wasm` and its JavaScript glue are copied from the pinned
`onnxruntime-web@1.30.0` npm package (MIT). They must be updated together with that
dependency. These generated runtime files are excluded from formatting/linting.

The pixel-level Telea fast marching implementation is adapted from Kites,
commit `98751588e5f37ef468a0e00059d3eb953b66eb4c`, GPL-3.0-or-later.
The original Chrome/Node platform layer is removed. Stroke masking retains its
local Otsu thresholding and dilation approach. Upstream attribution to pyheal and
OpenCV is preserved in `licenses/KITES-NOTICES.md`; that document is an upstream
notice inventory, not a list of resources shipped by this extension. Kites
fonts, neural inpainting weights, login and cloud services are not included.

Only recognized text is passed to the user's existing webpage translation
provider. The source page and original image nodes are preserved; restoring an
image removes the extension's result overlay.
