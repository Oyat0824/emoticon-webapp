/**
 * 업로드 관련 라우트
 * 이모티콘 이미지 및 ZIP 파일 업로드를 처리합니다.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/upload');
const { verifyPassword } = require('../utils/auth');
const { saveImageFile, processZipFile } = require('../utils/fileHandler');
const { MAX_IMAGE_FILE_SIZE, MAX_ZIP_FILE_SIZE } = require('../config');

/**
 * API: 이모티콘 업로드
 * 단일 이미지 파일 또는 ZIP 파일을 업로드합니다.
 * 비밀번호 인증이 필요합니다.
 * 
 * - 단일 이미지: 최대 1MB, 200x200 픽셀 초과 시 자동 리사이즈
 * - ZIP 파일: 최대 20MB, 내부 이미지 파일 자동 추출
 */
router.post('/', upload.single('image'), async (req, res) => {
	try {
		if (!verifyPassword(req.body.password)) {
			return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
		}

		if (!req.file) {
			return res.status(400).json({ error: '파일이 없습니다.' });
		}

		const { category } = req.body;
		if (!category) {
			return res.status(400).json({ error: '카테고리를 지정해주세요.' });
		}

		const isZip = req.file.mimetype === 'application/zip' ||
		              req.file.mimetype === 'application/x-zip-compressed' ||
		              req.file.originalname.toLowerCase().endsWith('.zip');

		if (!isZip && req.file.size > MAX_IMAGE_FILE_SIZE) {
			return res.status(400).json({ error: `이미지 파일 크기는 ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB 이하여야 합니다.` });
		}

		if (isZip) {
			const uploadedFiles = await processZipFile(req.file.buffer, category);
			return res.json({
				success: true,
				message: `ZIP 파일에서 ${uploadedFiles.length}개의 이미지가 업로드되었습니다.`,
				files: uploadedFiles
			});
		}

		const originalExt = path.extname(req.file.originalname) || '.png';
		const result = await saveImageFile(req.file.buffer, category, originalExt, false);

		res.json({
			success: true,
			message: '이미지가 업로드되었습니다.',
			filename: result.filename,
			url: `/emoticons/${encodeURIComponent(category)}/${encodeURIComponent(result.filename)}`
		});
	} catch (error) {
		console.error('파일 업로드 실패:', error);

		if (error.message.includes('지원하지 않는')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.message.includes('ZIP')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ error: `ZIP 파일 크기는 ${MAX_ZIP_FILE_SIZE / (1024 * 1024)}MB 이하여야 합니다.` });
		}

		res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
	}
});

module.exports = router;
