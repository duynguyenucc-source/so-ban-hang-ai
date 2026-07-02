import assert from 'node:assert/strict';
import { getImageUploadLabel, isSupportedImageFile } from './imageUpload';

assert.equal(isSupportedImageFile({ type: 'image/jpeg', size: 1024 }), true);
assert.equal(isSupportedImageFile({ type: 'image/png', size: 1024 }), true);
assert.equal(isSupportedImageFile({ type: 'image/webp', size: 1024 }), true);
assert.equal(isSupportedImageFile({ type: 'application/pdf', size: 1024 }), false);
assert.equal(isSupportedImageFile({ type: 'image/png', size: 7 * 1024 * 1024 }), false);

assert.equal(getImageUploadLabel(null), 'Chưa chọn ảnh');
assert.equal(getImageUploadLabel({ name: 'phieu-can.jpg', size: 2048 }), 'phieu-can.jpg - 2.0 KB');
