const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const multer = require('multer');
const sharp = require('sharp');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'default123';

// 업로드 제한 설정
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_IMAGE_SIZE = 200; // 200x200 픽셀
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

app.use(cors());
app.use(express.json());

const EMOTICON_BASE_PATH = path.join(__dirname, '..', '_emoticons');
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/emoticons', express.static(EMOTICON_BASE_PATH));

// 카테고리 목록 조회
app.get('/api/categories', async (req, res) => {
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

// 이모티콘 목록 조회
app.get('/api/emoticons/:category', async (req, res) => {
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

// Multer 설정
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB
	},
	fileFilter: (req, file, cb) => {
		if (ALLOWED_TYPES.includes(file.mimetype) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
			cb(null, true);
		} else {
			cb(new Error('지원하지 않는 파일 형식입니다. PNG, JPG, GIF, ZIP만 업로드 가능합니다.'));
		}
	}
});

function verifyPassword(password) {
	return password && password === UPLOAD_PASSWORD;
}

// 단일 이미지 파일 저장 (공통 로직)
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
			// GIF 메타데이터 읽기 실패 시 원본 그대로 저장
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
		// GIF는 애니메이션 유지를 위해 원본 그대로 저장 (리사이즈 불가)
		if (metadata.width > MAX_IMAGE_SIZE || metadata.height > MAX_IMAGE_SIZE) {
			if (skipIfOversized) {
				return null; // ZIP 파일 처리 시 건너뛰기
			}
			throw new Error(`이미지 크기는 ${MAX_IMAGE_SIZE}x${MAX_IMAGE_SIZE} 픽셀 이하여야 합니다. (현재: ${metadata.width}x${metadata.height})`);
		}
		await fs.writeFile(filePath, imageBuffer);
	} else {
		// PNG, JPG는 크기 초과 시 자동 리사이즈
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

// ZIP 파일 처리
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

// 이모티콘 업로드
app.post('/api/upload', upload.single('image'), async (req, res) => {
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

		if (isZip) {
			const uploadedFiles = await processZipFile(req.file.buffer, category);
			return res.json({
				success: true,
				message: `ZIP 파일에서 ${uploadedFiles.length}개의 이미지가 업로드되었습니다.`,
				files: uploadedFiles
			});
		}

		// 단일 이미지 파일 처리
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
			return res.status(400).json({ error: `파일 크기는 10MB 이하여야 합니다.` });
		}

		res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
	}
});

// 이모티콘 삭제
app.delete('/api/emoticons/:category/:filename', async (req, res) => {
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

app.listen(PORT, () => {
	console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
	console.log(`이모티콘 경로: ${EMOTICON_BASE_PATH}`);
	console.log(`업로드 비밀번호 설정: ${UPLOAD_PASSWORD}`);
	console.log(`비밀번호 소스: ${process.env.UPLOAD_PASSWORD ? '환경변수 (.env)' : '기본값 (default123)'}`);
});
