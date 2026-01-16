# Oracle Cloud Free Tier 서버 튜닝 가이드

## 서버 사양
- **CPU**: 1코어 (ARM 또는 x86)
- **RAM**: 6GB
- **예상 앱 수**: 4개

## 리소스 분배 계획

### 전체 리소스 할당
- **시스템 예약**: 약 1GB RAM (OS, Nginx, 기타 시스템 프로세스)
- **사용 가능 RAM**: 약 5GB
- **앱당 할당**: 약 1.25GB RAM (4개 앱 기준)

### 권장 설정
각 앱당:
- **Node.js 힙 메모리**: 최대 1GB
- **PM2 인스턴스**: 1개 (1코어이므로 클러스터 모드 비권장)
- **예상 사용량**: 평균 500-800MB, 피크 1GB

## 1. Node.js 메모리 제한 설정

각 앱의 PM2 설정에서 Node.js 힙 메모리를 제한합니다.

### PM2 Ecosystem 파일 생성

각 앱 디렉토리에 `ecosystem.config.js` 파일을 생성:

```javascript
module.exports = {
  apps: [{
    name: 'emoticon-web',
    script: 'backend/server.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',  // 1GB 초과 시 자동 재시작
    node_args: '--max-old-space-size=1024',  // 힙 메모리 1GB로 제한
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### PM2로 실행

```bash
pm2 start ecosystem.config.js
pm2 save
```

## 2. Nginx 튜닝

### Nginx 워커 프로세스 설정

1코어 서버이므로 워커 프로세스는 1개로 제한:

```bash
sudo nano /etc/nginx/nginx.conf
```

다음 설정 수정:

```nginx
worker_processes 1;  # 1코어이므로 1개로 설정
worker_connections 512;  # 연결 수 제한 (기본 1024에서 감소)

# 이벤트 블록
events {
    worker_connections 512;
    use epoll;  # Linux에서 효율적
    multi_accept on;
}

# HTTP 블록에 추가
http {
    # 기존 설정...
    
    # 버퍼 크기 조정 (메모리 절약)
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # 타임아웃 설정
	client_body_timeout 12;
	client_header_timeout 12;
	keepalive_timeout 15;
	send_timeout 10;
    
	# Gzip 압축 (CPU 사용하지만 대역폭 절약)
	gzip on;
	gzip_vary on;
	gzip_proxied any;
	gzip_comp_level 6;
	gzip_types text/plain text/css text/xml text/javascript 
				application/json application/javascript application/xml+rss 
				application/rss+xml font/truetype font/opentype 
				application/vnd.ms-fontobject image/svg+xml;
	gzip_min_length 1000;

	# 파일 캐싱 (디스크 I/O 감소)
	open_file_cache max=200000 inactive=20s;
	open_file_cache_valid 30s;
	open_file_cache_min_uses 2;
	open_file_cache_errors on;
}
```

### Nginx 설정 테스트 및 재시작

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 3. 시스템 리소스 모니터링

### PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 메모리 사용량 확인
pm2 list
pm2 info <app-name>

# 로그 확인
pm2 logs <app-name> --lines 100
```

### 시스템 리소스 확인

```bash
# 메모리 사용량
free -h

# CPU 사용량
top
# 또는
htop  # 설치: sudo apt install htop

# 디스크 사용량
df -h

# 네트워크 연결 수
ss -s
```

### 스왑 메모리 설정 (선택사항)

RAM이 부족할 경우를 대비해 스왑 파일 생성:

```bash
# 2GB 스왑 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 활성화
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 스왑 사용량 확인
swapon --show
free -h
```

**주의**: 스왑은 디스크 I/O를 사용하므로 성능이 저하될 수 있습니다. 가능하면 RAM으로 해결하는 것이 좋습니다.

## 4. 각 앱별 포트 및 리소스 할당

4개 앱을 실행할 경우 포트 분배 예시:

| 앱 이름 | 포트 | 예상 RAM 사용량 | PM2 이름 |
|--------|------|----------------|----------|
| emoticon-web | 3000 | 500-800MB | emoticon-web |
| app-2 | 3001 | 500-800MB | app-2 |
| app-3 | 3002 | 500-800MB | app-3 |
| app-4 | 3003 | 500-800MB | app-4 |

각 앱의 `ecosystem.config.js`에서 포트를 다르게 설정:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000  // 각 앱마다 다른 포트
}
```

## 5. Nginx 리버스 프록시 설정 (4개 앱)

각 앱에 대한 서버 블록을 설정하거나, 하나의 서버 블록에서 location으로 분기:

```nginx
# 앱 1: emoticon-web
server {
    listen 443 ssl http2;
    server_name emoticon.yourdomain.com;
    
    client_max_body_size 30m;
    
    # SSL 설정...
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# 앱 2
server {
    listen 443 ssl http2;
    server_name app2.yourdomain.com;
    
    client_max_body_size 30m;
    
    # SSL 설정...
    
    location / {
        proxy_pass http://localhost:3001;
        # ... 동일한 프록시 설정
    }
}

# 앱 3, 4도 동일하게 설정
```

## 6. 성능 최적화 팁

### Node.js 앱 최적화
- 불필요한 의존성 제거
- 이미지 최적화 (Sharp 사용 시 적절한 옵션 설정)
- 정적 파일은 Nginx에서 직접 서빙 (Express static 미들웨어 대신)
- 로깅 최소화 (프로덕션 환경)

### 데이터베이스 사용 시
- 연결 풀 크기 제한 (예: 최대 5-10개 연결)
- 쿼리 최적화
- 인덱스 적절히 설정

### 파일 업로드 최적화
- Multer 메모리 스토리지 사용 (현재 설정 유지)
- 큰 파일은 스트리밍 처리 고려
- 업로드 후 즉시 처리하여 메모리 해제

## 7. 모니터링 및 알림 설정

### PM2 로그 로테이션

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 리소스 임계값 모니터링 스크립트

`/home/ubuntu/scripts/check_resources.sh` 생성:

```bash
#!/bin/bash

# 메모리 사용률 확인
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')

# 임계값 초과 시 알림 (예: 메모리 90% 이상)
if [ $MEM_USAGE -gt 90 ]; then
    echo "경고: 메모리 사용률이 ${MEM_USAGE}%입니다."
    # 여기에 알림 로직 추가 (이메일, 슬랙 등)
fi

echo "메모리: ${MEM_USAGE}%, CPU: ${CPU_USAGE}%"
```

크론탭에 추가 (5분마다 실행):

```bash
crontab -e
# 추가
*/5 * * * * /home/ubuntu/scripts/check_resources.sh >> /var/log/resource_check.log 2>&1
```

## 8. 문제 발생 시 대응

### 메모리 부족 (OOM)
1. `dmesg | grep -i "out of memory"` 확인
2. PM2 로그 확인: `pm2 logs`
3. 앱별 메모리 사용량 확인: `pm2 list`
4. 필요시 `max_memory_restart` 값 조정

### CPU 100% 사용
1. `top` 또는 `htop`으로 프로세스 확인
2. PM2 모니터링: `pm2 monit`
3. 앱 로그에서 무한 루프나 무거운 작업 확인
4. Nginx 워커 연결 수 감소 고려

### 디스크 공간 부족
1. `df -h`로 확인
2. 로그 파일 정리: `pm2 flush`
3. 불필요한 파일 삭제
4. 로그 로테이션 설정 확인

## 9. 체크리스트

배포 전 확인사항:

- [ ] 각 앱의 `ecosystem.config.js` 설정 완료
- [ ] PM2로 모든 앱 실행 및 `pm2 save` 완료
- [ ] Nginx 설정 테스트 (`nginx -t`) 통과
- [ ] 각 앱 포트 확인 (3000, 3001, 3002, 3003)
- [ ] SSL 인증서 설정 완료
- [ ] 방화벽 규칙 확인
- [ ] 리소스 모니터링 스크립트 설정
- [ ] 로그 로테이션 설정
- [ ] 스왑 파일 설정 (선택사항)

## 10. 예상 리소스 사용량

### 정상 운영 시
- **시스템**: ~1GB RAM
- **Nginx**: ~50-100MB RAM
- **앱 4개**: 각 ~500-800MB RAM (총 2-3.2GB)
- **여유 메모리**: ~1-2GB
- **CPU**: 평균 20-40% (피크 80-90%)

### 주의사항
- 동시 업로드나 무거운 작업 시 메모리 사용량이 증가할 수 있음
- 모든 앱이 동시에 피크에 도달하면 메모리 부족 가능
- 정기적인 모니터링 권장

## 추가 참고사항

- Oracle Cloud Free Tier는 ARM 아키텍처일 수 있음 (Node.js 바이너리 호환성 확인)
- 네트워크 대역폭 제한이 있을 수 있음
- 디스크 I/O 성능이 제한적일 수 있음 (SSD 권장)
