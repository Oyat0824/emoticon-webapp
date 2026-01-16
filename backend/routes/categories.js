/**
 * 카테고리 관련 라우트
 * 카테고리 목록 조회 및 삭제를 처리합니다.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { EMOTICON_BASE_PATH } = require('../config');
const { verifyPassword } = require('../utils/auth');

/**
 * API: 카테고리 목록 조회
 * _emoticons 폴더 내의 모든 카테고리(폴더) 목록을 반환합니다.
 * 각 카테고리의 이미지 개수도 함께 반환합니다.
 */
router.get('/', async (req, res) => {
	try {
		const categories = [];
		const items = await fs.readdir(EMOTICON_BASE_PATH, { withFileTypes: true });

		for (const item of items) {
			if (item.isDirectory()) {
				const categoryPath = path.join(EMOTICON_BASE_PATH, item.name);
				const files = await fs.readdir(categoryPath);
				const imageFiles = files.filter(file =>
					/\.(png|jpg|jpeg|gif|webp)$/i.test(file)
				);

				if (imageFiles.length > 0) {
					categories.push({
						name: item.name,
						displayName: item.name,
						count: imageFiles.length
					});
				}
			}
		}

		res.json(categories);
	} catch (error) {
		console.error('카테고리 목록 가져오기 실패:', error);
		res.status(500).json({ error: '카테고리 목록을 가져올 수 없습니다.' });
	}
});

/**
 * API: 카테고리 삭제
 * 카테고리 전체를 삭제합니다.
 * 카테고리 내의 모든 이모티콘 이미지가 함께 삭제됩니다.
 * 비밀번호 인증이 필요합니다.
 * 
 * @param {string} category - 삭제할 카테고리 이름 (URL 파라미터)
 */
router.delete('/:category', async (req, res) => {
	try {
		const { password } = req.body;
		if (!verifyPassword(password)) {
			return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
		}

		const { category } = req.params;
		const categoryPath = path.join(EMOTICON_BASE_PATH, category);

		const exists = await fs.pathExists(categoryPath);
		if (!exists) {
			return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
		}

		await fs.remove(categoryPath);

		res.json({
			success: true,
			message: '카테고리가 삭제되었습니다.'
		});
	} catch (error) {
		console.error('카테고리 삭제 실패:', error);
		res.status(500).json({ error: '카테고리 삭제에 실패했습니다.' });
	}
});

module.exports = router;
