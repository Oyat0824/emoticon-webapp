/**
 * Express 서버
 * 이모티콘 웹 애플리케이션의 백엔드 서버입니다.
 * API 엔드포인트를 제공하고 파일 업로드/삭제를 처리합니다.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { PROJECT_ROOT, EMOTICON_BASE_PATH } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'default123';

// 미들웨어 설정
app.use(cors()); // CORS 허용
app.use(express.json()); // JSON 파싱

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // 프론트엔드 파일
app.use('/emoticons', express.static(EMOTICON_BASE_PATH)); // 이모티콘 이미지

// 파비콘 및 공유 이미지
app.get('/favicon.ico', (req, res) => {
	res.sendFile(path.join(PROJECT_ROOT, 'favicon.ico'));
});
app.get('/og-image.png', (req, res) => {
	res.sendFile(path.join(PROJECT_ROOT, 'og-image.png'));
});

// API 라우트
app.use('/api/categories', require('./routes/categories'));
app.use('/api/emoticons', require('./routes/emoticons'));
app.use('/api/upload', require('./routes/upload'));

/**
 * 서버 시작
 * 지정된 포트에서 서버를 시작합니다.
 */
app.listen(PORT, () => {
	console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
	console.log(`이모티콘 경로: ${EMOTICON_BASE_PATH}`);
	console.log(`업로드 비밀번호 설정: ${UPLOAD_PASSWORD}`);
	console.log(`비밀번호 소스: ${process.env.UPLOAD_PASSWORD ? '환경변수 (.env)' : '기본값 (default123)'}`);
});
