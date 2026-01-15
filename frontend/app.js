// 전역 변수
let categories = [];
let selectedCategory = null;
let emoticons = [];
let copiedEmoticonUrl = null;

// 초기화
$(document).ready(function() {
	$('#current-year').text(new Date().getFullYear());

	fetchCategories();

	$('#retry-button').on('click', function() {
		hideError();
		fetchCategories();
	});

	$('#upload-btn').on('click', function() {
		openUploadModal();
	});

	$('#close-upload-modal, #cancel-upload').on('click', function() {
		closeUploadModal();
	});

	$('#upload-file').on('change', function(e) {
		handleFilePreview(e.target.files[0]);
	});

	$('#upload-category').on('change', function() {
		if ($(this).val()) {
			$('#new-category').val('');
		}
	});

	$('#new-category').on('input', function() {
		if ($(this).val()) {
			$('#upload-category').val('');
		}
	});

	$('#upload-form').on('submit', function(e) {
		e.preventDefault();
		handleUpload();
	});

	$('#close-delete-modal, #cancel-delete').on('click', function() {
		closeDeleteModal();
	});

	$('#delete-form').on('submit', function(e) {
		e.preventDefault();
		handleDelete();
	});

	$('#confirm-delete').on('click', function(e) {
		e.preventDefault();
		handleDelete();
	});

	$('#delete-password').on('keydown', function(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleDelete();
		}
	});
});

// 카테고리 목록 조회
function fetchCategories() {
	showLoading();

	$.ajax({
		url: '/api/categories',
		method: 'GET',
		success: function(data) {
			categories = data;
			renderCategories();

			if (categories.length > 0 && !selectedCategory) {
				selectCategory(categories[0].name);
			}

			hideLoading();
		},
		error: function(xhr, status, error) {
			showError('카테고리를 불러올 수 없습니다: ' + error);
		}
	});
}

// 카테고리 버튼 렌더링
function renderCategories() {
	const $container = $('#category-buttons');
	$container.empty();

	categories.forEach(function(category) {
		const isSelected = selectedCategory === category.name;
		const buttonClass = isSelected
			? 'px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white'
			: 'px-4 py-2 rounded-lg font-medium transition-colors bg-white text-gray-700 hover:bg-gray-100 border border-gray-300';

		const $button = $('<button>')
			.addClass(buttonClass)
			.text(category.displayName + ' (' + category.count + ')')
			.on('click', function() {
				selectCategory(category.name);
			});

		$container.append($button);
	});
}

// 카테고리 선택
function selectCategory(categoryName) {
	selectedCategory = categoryName;
	renderCategories();
	fetchEmoticons(categoryName);
}

// 이모티콘 목록 조회
function fetchEmoticons(category) {
	showLoading();

	$.ajax({
		url: '/api/emoticons/' + encodeURIComponent(category),
		method: 'GET',
		success: function(data) {
			emoticons = data;
			renderEmoticons();
			hideLoading();
		},
		error: function(xhr, status, error) {
			showError('이모티콘을 불러올 수 없습니다: ' + error);
		}
	});
}

// 이모티콘 그리드 렌더링
function renderEmoticons() {
	const $section = $('#emoticon-section');
	$section.empty();

	if (emoticons.length === 0) {
		$section.html('<div class="text-center py-12 text-gray-500">이모티콘이 없습니다.</div>');
		return;
	}

	const categoryName = categories.find(function(c) {
		return c.name === selectedCategory;
	})?.displayName || selectedCategory;

	const $title = $('<h2>')
		.addClass('text-xl font-semibold text-gray-700 mb-4')
		.text(categoryName + ' 이모티콘');

	const $grid = $('<div>')
		.addClass('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4');

	emoticons.forEach(function(emoticon) {
		const isCopied = copiedEmoticonUrl === emoticon.url;
		const borderClass = isCopied
			? 'border-green-500 ring-4 ring-green-200'
			: 'border-gray-200 hover:border-blue-500 hover:shadow-lg';

		const $item = $('<div>')
			.addClass('relative group');

		const $imageWrapper = $('<div>')
			.addClass('cursor-pointer')
			.on('click', function() {
				copyToClipboard(emoticon.url);
			});

		const $imageContainer = $('<div>')
			.addClass('aspect-square rounded-lg overflow-hidden border-2 transition-all ' + borderClass);

		const $img = $('<img>')
			.attr('src', emoticon.url)
			.attr('alt', emoticon.filename)
			.addClass('w-full h-full object-contain bg-white')
			.attr('loading', 'lazy');

		$imageContainer.append($img);
		$imageWrapper.append($imageContainer);

		const $deleteBtn = $('<button>')
			.addClass('absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10')
			.html('&times;')
			.on('click', function(e) {
				e.stopPropagation();
				confirmDelete(emoticon, categoryName);
			});

		$item.append($imageWrapper);
		$item.append($deleteBtn);

		if (isCopied) {
			const $copiedOverlay = $('<div>')
				.addClass('absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-90 rounded-lg');

			const $copiedText = $('<span>')
				.addClass('text-white font-bold text-sm')
				.text('복사됨!');

			$copiedOverlay.append($copiedText);
			$item.append($copiedOverlay);
		}

		const $filenameOverlay = $('<div>')
			.addClass('absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all p-1');

		const $filenameText = $('<p>')
			.addClass('text-white text-xs truncate opacity-0 group-hover:opacity-100')
			.text(emoticon.filename);

		$filenameOverlay.append($filenameText);
		$item.append($filenameOverlay);

		$grid.append($item);
	});

	$section.append($title);
	$section.append($grid);
}

// 클립보드에 이미지 복사
async function copyToClipboard(imageUrl) {
	let absoluteUrl = imageUrl;
	if (imageUrl.startsWith('/')) {
		absoluteUrl = window.location.origin + imageUrl;
	}

	try {
		const response = await fetch(absoluteUrl);
		if (!response.ok) {
			throw new Error('이미지 로드 실패');
		}

		const blob = await response.blob();

		if (blob.type === 'image/gif') {
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = imageUrl.split('/').pop() || 'emoticon.gif';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(link.href);

			showToast('GIF 애니메이션은 클립보드 복사가 불가능합니다. 다운로드되었습니다.');
			return;
		}

		if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
			try {
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
				return;
			} catch (clipErr) {
				console.error('클립보드 복사 실패:', clipErr);
			}
		}

		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = imageUrl.split('/').pop() || 'emoticon.png';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);

		alert('이 브라우저는 이미지 클립보드 복사를 지원하지 않습니다.\n이미지가 다운로드되었습니다. 다운로드한 이미지를 사용하세요.');

	} catch (err) {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			try {
				await navigator.clipboard.writeText(absoluteUrl);
				alert('이미지 복사에 실패했습니다.\n이미지 URL이 클립보드에 복사되었습니다.');
			} catch (finalErr) {
				alert('클립보드 복사에 실패했습니다.\n\n이미지 URL: ' + absoluteUrl);
			}
		} else {
			alert('클립보드 복사에 실패했습니다.\n\n이미지 URL: ' + absoluteUrl);
		}
	}
}

// 복사 완료 피드백 표시
function showCopiedFeedback(imageUrl) {
	copiedEmoticonUrl = imageUrl;
	renderEmoticons();

	setTimeout(function() {
		copiedEmoticonUrl = null;
		renderEmoticons();
	}, 2000);
}

// 로딩 화면 표시/숨김
function showLoading() {
	$('#loading-overlay').removeClass('hidden');
}

function hideLoading() {
	$('#loading-overlay').addClass('hidden');
}

// 에러 메시지 표시/숨김
function showError(message) {
	$('#error-message p').text('오류: ' + message);
	$('#error-message').removeClass('hidden');
	hideLoading();
}

function hideError() {
	$('#error-message').addClass('hidden');
}

// 토스트 메시지 표시
function showToast(message) {
	const $toast = $('#toast');
	const $toastMessage = $('#toast-message');

	$toastMessage.text(message);
	$toast.removeClass('hidden opacity-0 translate-y-2');
	$toast.addClass('opacity-100 translate-y-0');

	setTimeout(function() {
		$toast.removeClass('opacity-100 translate-y-0');
		$toast.addClass('opacity-0 translate-y-2');

		setTimeout(function() {
			$toast.addClass('hidden');
		}, 300);
	}, 3000);
}

// 업로드 모달 열기/닫기
function openUploadModal() {
	const $categorySelect = $('#upload-category');
	$categorySelect.empty();
	$categorySelect.append('<option value="">카테고리 선택</option>');

	categories.forEach(function(category) {
		$categorySelect.append($('<option>').val(category.name).text(category.displayName));
	});

	const savedPassword = sessionStorage.getItem('uploadPassword');
	$('#upload-form')[0].reset();
	if (savedPassword) {
		$('#upload-password').val(savedPassword);
	}
	$('#upload-preview').addClass('hidden');
	$('#upload-modal').removeClass('hidden');
}

function closeUploadModal() {
	$('#upload-modal').addClass('hidden');
	$('#upload-form')[0].reset();
	$('#upload-preview').addClass('hidden');
}

// 파일 미리보기 처리
function handleFilePreview(file) {
	if (!file) {
		$('#upload-preview').addClass('hidden');
		return;
	}

	const isZip = file.type === 'application/zip' ||
	             file.type === 'application/x-zip-compressed' ||
	             file.name.toLowerCase().endsWith('.zip');

	if (isZip) {
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('ZIP 파일 크기는 10MB 이하여야 합니다.');
			$('#upload-file').val('');
			$('#upload-preview').addClass('hidden');
			return;
		}
		$('#preview-image').hide();
		$('#preview-info').text(`📦 ZIP 파일 (${(file.size / 1024).toFixed(2)} KB)\n내부 이미지 파일이 자동으로 추출됩니다.`).removeClass('text-red-600');
		$('#upload-preview').removeClass('hidden');
		return;
	}

	const maxSize = 1 * 1024 * 1024;
	if (file.size > maxSize) {
		showToast('파일 크기는 1MB 이하여야 합니다.');
		$('#upload-file').val('');
		$('#upload-preview').addClass('hidden');
		return;
	}

	const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
	if (!allowedTypes.includes(file.type)) {
		showToast('PNG, JPG, GIF, ZIP 파일만 업로드 가능합니다.');
		$('#upload-file').val('');
		$('#upload-preview').addClass('hidden');
		return;
	}

	const reader = new FileReader();
	reader.onload = function(e) {
		const img = new Image();
		img.onload = function() {
			$('#preview-image').attr('src', e.target.result).show();

			const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

			if (img.width > 200 || img.height > 200) {
				if (isGif) {
					$('#preview-info').addClass('text-red-600').text(
						`⚠️ 크기 초과: ${img.width}x${img.height} (GIF는 200x200 이하여야 합니다)`
					);
				} else {
					$('#preview-info').addClass('text-blue-600').text(
						`ℹ️ ${img.width}x${img.height} 픽셀 → 200x200 이하로 자동 리사이즈됩니다`
					);
				}
			} else {
				$('#preview-info').removeClass('text-blue-600 text-red-600').text(
					`${img.width}x${img.height} 픽셀, ${(file.size / 1024).toFixed(2)} KB`
				);
			}

			$('#upload-preview').removeClass('hidden');
		};
		img.onerror = function() {
			$('#preview-image').hide();
			$('#preview-info').text(`이미지 파일 (${(file.size / 1024).toFixed(2)} KB)`);
			$('#upload-preview').removeClass('hidden');
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

// 삭제 관련 변수 및 함수
let deleteTargetEmoticon = null;

function confirmDelete(emoticon, categoryName) {
	deleteTargetEmoticon = emoticon;
	$('#delete-filename').text(`${categoryName} / ${emoticon.filename}`);

	const savedPassword = sessionStorage.getItem('uploadPassword');
	$('#delete-password').val(savedPassword || '');
	$('#delete-modal').removeClass('hidden');

	setTimeout(function() {
		if (savedPassword) {
			$('#confirm-delete').focus();
		} else {
			$('#delete-password').focus();
		}
	}, 100);
}

function closeDeleteModal() {
	$('#delete-modal').addClass('hidden');
	deleteTargetEmoticon = null;
}

// 이미지 삭제 처리
function handleDelete() {
	const password = $('#delete-password').val().trim();

	if (!password) {
		showToast('비밀번호를 입력해주세요.');
		return;
	}

	if (!deleteTargetEmoticon) {
		showToast('삭제할 이미지를 찾을 수 없습니다.');
		return;
	}

	const filename = deleteTargetEmoticon.filename;
	const category = selectedCategory;

	$.ajax({
		url: `/api/emoticons/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`,
		method: 'DELETE',
		contentType: 'application/json',
		data: JSON.stringify({ password: password }),
		success: function(response) {
			sessionStorage.setItem('uploadPassword', password);
			showToast('이미지가 삭제되었습니다.');
			closeDeleteModal();

			$.ajax({
				url: '/api/categories',
				method: 'GET',
				success: function(data) {
					categories = data;
					renderCategories();

					const categoryExists = categories.some(function(c) {
						return c.name === category;
					});

					if (categoryExists) {
						fetchEmoticons(category);
					} else {
						if (categories.length > 0) {
							selectCategory(categories[0].name);
						} else {
							$('#emoticon-section').html('<div class="text-center py-12 text-gray-500">이모티콘이 없습니다.</div>');
						}
					}
				},
				error: function() {
					fetchEmoticons(category);
				}
			});
		},
		error: function(xhr) {
			const errorMsg = xhr.responseJSON?.error || '삭제에 실패했습니다.';
			showToast(errorMsg);
		}
	});
}

// 파일 업로드 처리
function handleUpload() {
	const password = $('#upload-password').val().trim();
	const selectedCategory = $('#upload-category').val();
	const newCategory = $('#new-category').val().trim();
	const category = selectedCategory || newCategory;
	const fileInput = $('#upload-file')[0];

	if (!password) {
		showToast('비밀번호를 입력해주세요.');
		return;
	}

	if (!category || category.length === 0) {
		showToast('카테고리를 선택하거나 입력해주세요.');
		return;
	}

	if (!fileInput.files || fileInput.files.length === 0) {
		showToast('이미지 파일을 선택해주세요.');
		return;
	}

	const file = fileInput.files[0];
	const isZip = file.type === 'application/zip' ||
	             file.type === 'application/x-zip-compressed' ||
	             file.name.toLowerCase().endsWith('.zip');

	if (!isZip) {
		const maxSize = 1 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('파일 크기는 1MB 이하여야 합니다.');
			return;
		}
	} else {
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('ZIP 파일 크기는 10MB 이하여야 합니다.');
			return;
		}
	}

	const formData = new FormData();
	formData.append('password', password);
	formData.append('category', category);
	formData.append('image', file);

	const $submitBtn = $('#submit-upload');
	$submitBtn.prop('disabled', true).text('업로드 중...');

	$.ajax({
		url: '/api/upload',
		method: 'POST',
		data: formData,
		processData: false,
		contentType: false,
		success: function(response) {
			sessionStorage.setItem('uploadPassword', password);
			showToast('업로드 성공!');
			closeUploadModal();

			fetchCategories();

			if (selectedCategory !== category) {
				setTimeout(function() {
					selectCategory(category);
				}, 500);
			} else {
				fetchEmoticons(category);
			}
		},
		error: function(xhr) {
			const errorMsg = xhr.responseJSON?.error || '업로드에 실패했습니다.';
			showToast(errorMsg);
		},
		complete: function() {
			$submitBtn.prop('disabled', false).text('업로드');
		}
	});
}
