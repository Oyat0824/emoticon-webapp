/**
 * 이모티콘 관련 라우트
 * 이모티콘 목록 조회 및 삭제를 처리합니다.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { EMOTICON_BASE_PATH } = require('../config');
const { verifyPassword } = require('../utils/auth');

/**
 * API: 이모티콘 목록 조회
 * 특정 카테고리의 모든 이모티콘 이미지 목록을 반환합니다.
 * 파일명의 숫자 순서로 정렬됩니다.
 * @param {string} category - 카테고리 이름 (URL 파라미터)
 */
router.get('/:category', async (req, res) => {
	try {
		const category = req.params.category;
		const categoryPath = path.join(EMOTICON_BASE_PATH, category);

		const exists = await fs.pathExists(categoryPath);
		if (!exists) {
			return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
		}

		const files = await fs.readdir(categoryPath);
		const imageFiles = files
			.filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
			.sort((a, b) => {
				const numA = parseInt(a.match(/\d+/)?.[0] || 0);
				const numB = parseInt(b.match(/\d+/)?.[0] || 0);
				return numA - numB;
			})
			.map(file => ({
				filename: file,
				url: `/emoticons/${encodeURIComponent(category)}/${encodeURIComponent(file)}`
			}));

		res.json(imageFiles);
	} catch (error) {
		console.error('이모티콘 목록 가져오기 실패:', error);
		res.status(500).json({ error: '이모티콘 목록을 가져올 수 없습니다.' });
	}
});

/**
 * API: 이모티콘 삭제
 * 특정 이모티콘 이미지를 삭제합니다.
 * 비밀번호 인증이 필요합니다.
 * 카테고리 내의 마지막 이미지를 삭제하면 카테고리 폴더도 자동으로 삭제됩니다.
 * 
 * @param {string} category - 카테고리 이름 (URL 파라미터)
 * @param {string} filename - 삭제할 파일명 (URL 파라미터)
 */
router.delete('/:category/:filename', async (req, res) => {
	try {
		const { password } = req.body;
		if (!verifyPassword(password)) {
			return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
		}

		const { category, filename } = req.params;
		const filePath = path.join(EMOTICON_BASE_PATH, category, filename);

		const exists = await fs.pathExists(filePath);
		if (!exists) {
			return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
		}

		await fs.remove(filePath);

		const categoryPath = path.join(EMOTICON_BASE_PATH, category);
		const remainingFiles = await fs.readdir(categoryPath);
		const remainingImages = remainingFiles.filter(file =>
			/\.(png|jpg|jpeg|gif|webp)$/i.test(file)
		);

		if (remainingImages.length === 0) {
			await fs.remove(categoryPath);
		}

		res.json({
			success: true,
			message: '이미지가 삭제되었습니다.'
		});
	} catch (error) {
		console.error('이미지 삭제 실패:', error);
		res.status(500).json({ error: '이미지 삭제에 실패했습니다.' });
	}
});

module.exports = router;
