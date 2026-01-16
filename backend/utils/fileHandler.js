/**
 * 파일 처리 유틸리티
 * 이미지 파일 저장 및 ZIP 파일 처리를 담당합니다.
 */

const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const AdmZip = require('adm-zip');
const { EMOTICON_BASE_PATH, MAX_IMAGE_SIZE } = require('../config');

/**
 * 이미지 파일을 저장합니다.
 * GIF는 애니메이션을 유지하기 위해 원본 그대로 저장하고,
 * 다른 이미지는 크기 초과 시 자동으로 리사이즈합니다.
 * 
 * @param {Buffer} imageBuffer - 이미지 파일 버퍼
 * @param {string} category - 카테고리 이름
 * @param {string} originalExt - 원본 파일 확장자
 * @param {boolean} skipIfOversized - 크기 초과 시 건너뛸지 여부 (ZIP 파일 처리용)
 * @returns {Object|null} - {filename, filePath} 또는 null (skipIfOversized가 true일 때)
 */
async function saveImageFile(imageBuffer, category, originalExt, skipIfOversized = false) {
	const categoryPath = path.join(EMOTICON_BASE_PATH, category);
	await fs.ensureDir(categoryPath);

	const existingFiles = await fs.readdir(categoryPath);
	const imageFiles = existingFiles.filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file));
	const nextNumber = imageFiles.length + 1;

	const ext = originalExt || '.png';
	const isGif = ext === '.gif';

	let metadata;
	try {
		metadata = await sharp(imageBuffer).metadata();
	} catch (err) {
		if (isGif) {
			const filename = `icon_${String(nextNumber).padStart(3, '0')}.gif`;
			const filePath = path.join(categoryPath, filename);
			await fs.writeFile(filePath, imageBuffer);
			return { filename, filePath };
		}
		throw new Error('이미지 파일을 읽을 수 없습니다.');
	}

	const filename = `icon_${String(nextNumber).padStart(3, '0')}${ext}`;
	const filePath = path.join(categoryPath, filename);

	if (isGif) {
		if (metadata.width > MAX_IMAGE_SIZE || metadata.height > MAX_IMAGE_SIZE) {
			if (skipIfOversized) {
				return null;
			}
			throw new Error(`이미지 크기는 ${MAX_IMAGE_SIZE}x${MAX_IMAGE_SIZE} 픽셀 이하여야 합니다. (현재: ${metadata.width}x${metadata.height})`);
		}
		await fs.writeFile(filePath, imageBuffer);
	} else {
		let sharpInstance = sharp(imageBuffer);
		if (metadata.width > MAX_IMAGE_SIZE || metadata.height > MAX_IMAGE_SIZE) {
			sharpInstance = sharpInstance.resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
				fit: 'inside',
				withoutEnlargement: true
			});
		}
		await sharpInstance.toFile(filePath);
	}

	return { filename, filePath };
}

/**
 * ZIP 파일을 처리합니다.
 * ZIP 파일 내부의 이미지 파일들을 추출하여 저장합니다.
 * macOS 메타데이터 파일(__MACOSX, ._파일)은 자동으로 제외됩니다.
 * 
 * @param {Buffer} zipBuffer - ZIP 파일 버퍼
 * @param {string} category - 카테고리 이름
 * @returns {Array<string>} - 업로드된 파일명 목록
 */
async function processZipFile(zipBuffer, category) {
	const categoryPath = path.join(EMOTICON_BASE_PATH, category);
	await fs.ensureDir(categoryPath);

	const zip = new AdmZip(zipBuffer);
	const zipEntries = zip.getEntries();

	const imageEntries = zipEntries.filter(entry => {
		if (entry.isDirectory) return false;
		if (entry.entryName.includes('__MACOSX') || entry.entryName.startsWith('._')) {
			return false;
		}
		const ext = path.extname(entry.entryName).toLowerCase();
		return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
	})
	.sort((a, b) => {
		return a.entryName.localeCompare(b.entryName, undefined, {
			numeric: true,
			sensitivity: 'base'
		});
	});

	if (imageEntries.length === 0) {
		throw new Error('ZIP 파일에 이미지 파일이 없습니다.');
	}

	const uploadedFiles = [];

	for (const entry of imageEntries) {
		try {
			const entryData = entry.getData();
			const originalExt = path.extname(entry.entryName).toLowerCase() || '.png';

			const result = await saveImageFile(entryData, category, originalExt, true);
			if (result) {
				uploadedFiles.push(result.filename);
			}
		} catch (err) {
			console.error(`ZIP 내부 파일 처리 실패: ${entry.entryName}`, err);
		}
	}

	if (uploadedFiles.length === 0) {
		throw new Error('ZIP 파일 내의 모든 이미지가 크기 제한을 초과했습니다.');
	}

	return uploadedFiles;
}

module.exports = {
	saveImageFile,
	processZipFile
};
