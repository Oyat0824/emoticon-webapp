/**
 * 인증 관련 유틸리티
 * 비밀번호 검증 기능을 제공합니다.
 */

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'default123';

/**
 * 비밀번호 검증
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} - 비밀번호가 올바른지 여부
 */
function verifyPassword(password) {
	return password && password === UPLOAD_PASSWORD;
}

module.exports = {
	verifyPassword
};
