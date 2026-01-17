/**
 * 클립보드 관련 함수들
 * 이모티콘 이미지를 클립보드에 복사하는 기능을 제공합니다.
 */

/**
 * 이모티콘 이미지를 클립보드에 복사합니다.
 * - GIF 파일: URL을 텍스트로 복사
 * - 기타 이미지: 이미지를 PNG로 변환하여 클립보드에 복사
 * 
 * 연속 클릭 방지를 위해 500ms 쿨다운이 적용됩니다.
 * 
 * @param {string} imageUrl - 복사할 이미지의 URL
 */
async function copyToClipboard(imageUrl) {
	const now = Date.now();
	if (isCopying) {
		showToast('복사 중입니다. 잠시만 기다려주세요.');
		return;
	}
	if (now - lastCopyTime < COPY_COOLDOWN) {
		showToast('잠시 후 다시 시도해주세요.');
		return;
	}

	isCopying = true;
	lastCopyTime = now;

	let absoluteUrl = imageUrl.startsWith('/') 
		? window.location.origin + imageUrl 
		: imageUrl;
	const isGif = imageUrl.toLowerCase().endsWith('.gif');

	if (isGif) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(absoluteUrl);
				showCopiedFeedback(imageUrl);
				showToast('URL이 클립보드에 복사되었습니다.');
			} else {
				showToast('URL: ' + absoluteUrl);
			}
		} catch (err) {
			console.error('URL 복사 실패:', err);
			showToast('URL 복사에 실패했습니다.');
		} finally {
			isCopying = false;
		}
		return;
	}

	try {
		const response = await fetch(absoluteUrl);
		if (!response.ok) {
			throw new Error('이미지 로드 실패');
		}

		const blob = await response.blob();

		if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
			let pngBlob = blob;
			
			if (blob.type !== 'image/png') {
				const img = await createImageBitmap(blob);
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);

				pngBlob = await new Promise((resolve, reject) => {
					canvas.toBlob((blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error('PNG 변환 실패'));
						}
					}, 'image/png');
				});
			}

			const item = new ClipboardItem({ 'image/png': pngBlob });
			await navigator.clipboard.write([item]);
			showCopiedFeedback(imageUrl);
			showToast('이미지가 클립보드에 복사되었습니다.');
		} else {
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = imageUrl.split('/').pop() || 'emoticon.png';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(link.href);
			alert('이 브라우저는 이미지 클립보드 복사를 지원하지 않습니다.\n이미지가 다운로드되었습니다.');
		}
	} catch (err) {
		console.error('이미지 복사 실패:', err);
		showToast('이미지 복사에 실패했습니다.');
	} finally {
		isCopying = false;
	}
}
