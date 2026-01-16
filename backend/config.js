/**
 * 설정 파일
 * 애플리케이션의 상수와 경로 설정을 관리합니다.
 */

const path = require('path');

// 업로드 제한 설정
const MAX_IMAGE_FILE_SIZE = 1 * 1024 * 1024; // 1MB (단일 이미지 파일)
const MAX_ZIP_FILE_SIZE = 20 * 1024 * 1024; // 20MB (ZIP 파일)
const MAX_IMAGE_SIZE = 200; // 200x200 픽셀 (최대 이미지 크기)
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

// 경로 설정
const EMOTICON_BASE_PATH = path.join(__dirname, '..', '_emoticons');
const PROJECT_ROOT = path.join(__dirname, '..');

module.exports = {
	MAX_IMAGE_FILE_SIZE,
	MAX_ZIP_FILE_SIZE,
	MAX_IMAGE_SIZE,
	ALLOWED_TYPES,
	EMOTICON_BASE_PATH,
	PROJECT_ROOT
};
