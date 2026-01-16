/**
 * 파일 업로드 미들웨어
 * Multer를 사용한 파일 업로드 설정입니다.
 */

const multer = require('multer');
const { MAX_ZIP_FILE_SIZE, ALLOWED_TYPES } = require('../config');

/**
 * Multer 설정
 * 파일 업로드를 처리하기 위한 설정입니다.
 * 메모리 스토리지를 사용하여 파일을 메모리에 저장합니다.
 */
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: MAX_ZIP_FILE_SIZE
	},
	fileFilter: (req, file, cb) => {
		if (ALLOWED_TYPES.includes(file.mimetype) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
			cb(null, true);
		} else {
			cb(new Error('지원하지 않는 파일 형식입니다. PNG, JPG, GIF, ZIP만 업로드 가능합니다.'));
		}
	}
});

module.exports = upload;
