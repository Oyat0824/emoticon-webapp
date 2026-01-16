# 이모티콘 웹 애플리케이션

이모티콘 이미지를 클릭하면 클립보드에 복사되고, 디스코드나 다른 앱에 바로 붙여넣을 수 있는 웹 앱입니다.

## 주요 기능

- `_emoticons/` 폴더 안의 하위 폴더를 자동으로 카테고리로 인식
- 카테고리별로 이모티콘을 그리드로 보여줌
- 클릭하면 클립보드에 복사 (HTTPS 필수, 지원 안 되는 브라우저는 다운로드)
- 비밀번호 인증 후 이모티콘 업로드 및 삭제 가능
- ZIP 파일 업로드 지원 (내부 이미지 파일 자동 추출)
- GIF 애니메이션 유지 (업로드 시 원본 그대로 저장)
- 빈 카테고리 폴더 자동 삭제
- 비밀번호 자동 저장 (세션 동안 유지)
- 반응형 UI (Tailwind CSS 사용)

## 프로젝트 구조

```
emoticon_web/
├── backend/
│   ├── server.js          # Express 서버 진입점
│   ├── config.js          # 설정 상수 (파일 크기 제한, 경로 등)
│   ├── middleware/
│   │   └── upload.js      # Multer 파일 업로드 미들웨어
│   ├── routes/
│   │   ├── categories.js  # 카테고리 API 라우트
│   │   ├── emoticons.js   # 이모티콘 API 라우트
│   │   └── upload.js      # 업로드 API 라우트
│   └── utils/
│       ├── auth.js        # 인증 유틸리티
│       └── fileHandler.js # 파일 처리 유틸리티
├── frontend/
│   ├── index.html         # 메인 HTML
│   └── js/
│       ├── app.js         # 메인 애플리케이션 파일 (이벤트 핸들러 등록)
│       ├── api.js         # API 호출 함수
│       ├── ui.js          # UI 렌더링 함수
│       ├── modals.js      # 모달 관리 함수
│       ├── clipboard.js   # 클립보드 복사 함수
│       └── utils.js       # 유틸리티 함수
├── _emoticons/            # 이모티콘 이미지들
├── favicon.ico            # 파비콘 (브라우저 탭 아이콘)
├── og-image.png           # 공유 이미지 (카카오톡, 디스코드 등 링크 미리보기)
├── package.json           # 프로젝트 의존성 및 스크립트
├── .gitignore             # Git 제외 파일 목록
└── README.md              # 프로젝트 설명서
```

## 로컬 개발

```bash
# 의존성 설치
npm install

# 서버 실행
npm start
```

서버: `http://localhost:3000`

### 환경변수 설정

업로드 기능을 사용하려면 비밀번호를 설정해야 합니다.

**방법 1: .env 파일 사용 (권장)**

프로젝트 루트에 `.env` 파일을 만들고:
```
UPLOAD_PASSWORD=your_password_here
```

**방법 2: 환경변수로 설정**

```bash
export UPLOAD_PASSWORD=your_password_here
npm start
```

비밀번호를 설정하지 않으면 기본값 `default123`이 사용됩니다.

### 업로드 제약사항

**단일 이미지 파일:**
- 파일 크기: 최대 1MB
- 이미지 크기: 최대 200x200 픽셀
- 파일 형식: PNG, JPG, GIF 지원
- GIF: 애니메이션 유지 (원본 그대로 저장)

**ZIP 파일:**
- 파일 크기: 최대 20MB
- 내부 이미지: PNG, JPG, GIF, WEBP 자동 추출
- 크기 검증: 각 이미지 200x200 픽셀 이하만 저장
- macOS 메타데이터: `__MACOSX` 폴더 및 `._` 파일 자동 제외

## 서버 배포

> **참고**: 아래 설치 방법은 Ubuntu 환경 기준으로 작성되었습니다. 각자의 서버 환경(OS, 패키지 관리자 등)에 맞게 설치 방법을 조정해주세요.

### 1. 서버 준비

#### Node.js 설치 (nvm 사용)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --lts
nvm use --lts
```

#### PM2 설치

```bash
npm install -g pm2
```

#### Nginx 설치

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 프로젝트 배포

```bash
cd ~
mkdir -p app
cd app
git clone <your-repo-url> emoticon_web
cd emoticon_web
npm install
```

### 3. 백엔드 서버 실행

```bash
cd ~/app/emoticon_web
pm2 start backend/server.js --name emoticon-web
pm2 startup  # 출력되는 명령어 실행
pm2 save
```

### 4. 방화벽 설정

```bash
# 목록 확인
sudo iptables -L INPUT -n -v --line-numbers

# 방화벽 규칙 추가 (HTTP, HTTPS)
sudo iptables -I INPUT 5 -p tcp -m state --state NEW --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp -m state --state NEW --dport 443 -j ACCEPT

# 규칙 저장 (Ubuntu/Debian)
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 5. HTTPS 설정

도메인을 사용한다면 HTTPS 설정이 필요합니다. 클립보드 복사 기능이 HTTPS에서만 제대로 작동합니다.

#### Certbot 설치

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx python3-certbot-dns-cloudflare
```

#### Cloudflare API 토큰 생성

Cloudflare → My Profile → API Tokens
Create Token
권한 설정:
- Zone → DNS → Edit
- Zone → Zone → Read
토큰 생성 후 복사

#### Cloudflare 자격 증명 파일 생성

```bash
sudo mkdir -p /etc/letsencrypt
sudo nano /etc/letsencrypt/cloudflare.ini
```

다음 내용 입력:
```
dns_cloudflare_api_token = YOUR_API_TOKEN_HERE
```

```bash
sudo chmod 600 /etc/letsencrypt/cloudflare.ini
```

#### DNS 설정

도메인 관리 페이지에서 A 레코드 추가:
```
타입: A
호스트: @ (또는 원하는 서브도메인)
값: 서버 IP 주소
TTL: 3600
```

DNS 전파 확인:
```bash
nslookup yourdomain.com
```

#### SSL 인증서 발급

DNS-01 챌린지를 사용하여 인증서 발급 (Cloudflare 사용 시):

```bash
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini -d yourdomain.com
```

또는 HTTP-01 챌린지를 사용하는 경우 (일반적인 방법):

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

질문에 답변:
- Email: 입력
- Terms of Service: Y
- Share email: N (또는 원하는 대로)

#### 인증서 자동 갱신 설정

인증서 갱신 후 Nginx를 자동으로 재시작하도록 설정:

```bash
sudo nano /etc/letsencrypt/renewal/yourdomain.com.conf
```

`[renewalparams]` 섹션에 다음 줄 추가:
```
post_hook = systemctl reload nginx
```

또는 전역 설정으로 적용하려면:

```bash
sudo nano /etc/letsencrypt/cli.ini
```

다음 내용 추가:
```
post-hook = systemctl reload nginx
```

#### 인증서 자동 갱신 확인

```bash
# 자동 갱신 타이머 확인
sudo systemctl list-timers | grep certbot

# 갱신 테스트
sudo certbot renew --dry-run

# 인증서 만료일 확인
sudo certbot certificates
```

자동 갱신은 만료 30일 전부터 시도하고, 성공하면 설정한 post_hook이 실행되어 Nginx가 자동으로 재시작됩니다.

### 6. Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/emoticon-web
```

다음 내용을 입력:

```nginx
# HTTP를 HTTPS로 리다이렉트
server {
	listen 80;
	server_name yourdomain.com;
	return 301 https://$server_name$request_uri;
}

# HTTPS 서버
server {
	listen 443 ssl http2;
	server_name yourdomain.com;

	client_max_body_size 30m;

	# SSL 인증서 (Certbot이 발급한 경로)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

	# SSL 설정
	ssl_protocols TLSv1.2 TLSv1.3;
	ssl_prefer_server_ciphers on;
	ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

	# 프론트엔드 정적 파일
	root /home/ubuntu/app/emoticon_web/frontend;
	index index.html;

	# 이모티콘 이미지 프록시
	location /emoticons {
		proxy_pass http://localhost:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}

	# API 프록시
	location /api {
		proxy_pass http://localhost:3000;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection 'upgrade';
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_cache_bypass $http_upgrade;
	}

	# 파비콘 및 공유 이미지 프록시 (Express 서버에서 처리)
	location ~ ^/(favicon\.(ico|png)|og-image\.png)$ {
		proxy_pass http://localhost:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		expires 1y;
		add_header Cache-Control "public, immutable";
	}

	# 프론트엔드 정적 파일 캐싱
	location ~* \.(css|js)$ {
		expires 1y;
		add_header Cache-Control "public, immutable";
	}

	# 프론트엔드 라우팅
	location / {
		try_files $uri $uri/ /index.html;
	}
}
```

설정 활성화:

```bash
sudo ln -s /etc/nginx/sites-available/emoticon-web /etc/nginx/sites-enabled/emoticon-web
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 이모티콘 관리

### 이모티콘 추가

**방법 1: 웹에서 업로드 (권장)**

1. 웹 페이지에서 "이모티콘 업로드" 버튼 클릭
2. 비밀번호 입력 (처음 한 번만, 이후 자동 저장)
3. 카테고리 선택 또는 새 카테고리 이름 입력
4. 이미지 파일 또는 ZIP 파일 선택
5. 업로드 완료

**특징:**
- 비밀번호는 세션 동안 자동 저장되어 재입력 불필요
- ZIP 파일 업로드 시 내부 이미지 파일 자동 추출
- GIF 애니메이션 유지
- 파일명 자동 생성 (`icon_001.png`, `icon_002.png` 등)

**방법 2: 직접 파일 추가**

`_emoticons/` 폴더 안에 새 폴더 만들고 이미지 넣으면 됩니다.

```
_emoticons/
├── 이모티콘/
│   ├── icon_001.png
│   └── ...
└── 다른세트/
    └── ...
```

지원 포맷: `png`, `jpg`, `jpeg`, `gif`, `webp`

새 폴더 추가 후 서버 재시작:
```bash
pm2 restart emoticon-web
```

### 이모티콘 삭제

1. 이미지에 마우스 호버 → 우측 상단 삭제 버튼(×) 표시
2. 삭제 버튼 클릭
3. 비밀번호 입력 (자동 입력된 경우 엔터 키로 바로 삭제 가능)
4. 삭제 완료

**참고:**
- 마지막 이미지 삭제 시 카테고리 폴더도 자동 삭제
- 삭제 후 첫 번째 카테고리로 자동 전환

## 도메인 관리

### 도메인 갱신 (같은 도메인 유지)

도메인을 1년 더 연장하는 경우:
- **별도 작업 없음** - SSL 인증서는 자동 갱신됨
- Nginx 설정 변경 불필요

### 도메인 변경 (새 도메인 사용)

1. **DNS 설정**: 새 도메인 관리 페이지에서 A 레코드 추가
2. **SSL 인증서 발급**: `sudo certbot --nginx -d yourdomain.com`
3. **Nginx 설정 수정**: `server_name`과 `ssl_certificate` 경로 변경
4. **Open Graph 메타 태그 수정**: `frontend/index.html`에서 도메인 URL 변경
   ```html
   <meta property="og:url" content="https://새도메인.com">
   <meta property="og:image" content="https://새도메인.com/og-image.png">
   ```
5. **Nginx 재시작**: `sudo systemctl restart nginx`
6. **서버 재시작**: `pm2 restart emoticon-web`
7. (선택사항) **기존 인증서 삭제**: `sudo certbot delete --cert-name yourdomain.com`

### 도메인 만료 시

도메인을 갱신하지 않으면:
- DNS가 해제되어 사이트 접속 불가
- SSL 인증서 갱신 실패 (도메인 검증 실패)
- 사이트 작동 중단

## 문제 해결

### 포트 충돌

```bash
sudo ss -tlnp | grep 3000
```

### Nginx 502 오류

```bash
pm2 status
pm2 logs emoticon-web
```

### 권한 문제

```bash
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/app
sudo chmod 755 /home/ubuntu/app/emoticon_web
sudo chmod 755 /home/ubuntu/app/emoticon_web/frontend
sudo chmod 644 /home/ubuntu/app/emoticon_web/frontend/*
```

### 클립보드 복사 안 될 때

- HTTPS로 접속했는지 확인 (HTTP에서는 Clipboard API 사용 불가)
- 브라우저 개발자 도구 콘솔에서 에러 확인
- CORS 문제일 수 있으니 서버의 `/emoticons` 라우트에 CORS 헤더 확인

## 기술 스택

- **백엔드**: Node.js + Express
- **프론트엔드**: HTML + jQuery + Tailwind CSS (CDN)
- **파일 업로드**: Multer (메모리 스토리지)
- **이미지 처리**: Sharp (크기 검증 및 저장)
- **ZIP 처리**: adm-zip (ZIP 파일 압축 해제)
- **배포**: PM2 + Nginx + Let's Encrypt (HTTPS)
