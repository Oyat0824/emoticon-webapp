// 전역 변수
let categories = [];
let selectedCategory = null;
let emoticons = [];
let copiedEmoticonUrl = null;
let visibleCategories = new Set(); // 표시할 카테고리 목록
let categorySettingsSearchTimeout = null; // 카테고리 설정 검색 디바운스용
let deleteMode = false; // 삭제 모드 상태
let deleteTargetCategory = null; // 삭제할 카테고리

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

	// 카테고리 설정 모달
	$('#settings-btn').on('click', function() {
		openSettingsModal();
	});

	$('#close-settings-modal, #cancel-settings').on('click', function() {
		closeSettingsModal();
	});

	$('#save-settings').on('click', function() {
		saveCategorySettings();
	});

	$('#select-all-categories').on('click', function() {
		$('#category-settings-list input[type="checkbox"]').prop('checked', true);
	});

	$('#deselect-all-categories').on('click', function() {
		$('#category-settings-list input[type="checkbox"]').prop('checked', false);
	});

	// 삭제 모드 토글
	$('#delete-mode-toggle').on('click', function() {
		toggleDeleteMode();
	});

	// 카테고리 삭제 모달 이벤트
	$('#close-delete-category-modal, #cancel-delete-category').on('click', function() {
		closeDeleteCategoryModal();
	});

	$('#delete-category-form').on('submit', function(e) {
		e.preventDefault();
		handleCategoryDelete();
	});

	// 카테고리 설정 모달 검색 기능 (디바운스 적용)
	$('#category-settings-search').on('input', function() {
		const searchTerm = $(this).val();

		// 이전 타이머가 있으면 취소
		if (categorySettingsSearchTimeout) {
			clearTimeout(categorySettingsSearchTimeout);
		}

		// 300ms 후에 검색 실행 (디바운스)
		categorySettingsSearchTimeout = setTimeout(function() {
			filterCategorySettings(searchTerm);
		}, 300);
	});

	$('#upload-category').on('change', function() {
		if ($(this).val()) {
			$('#new-category').val('');
		}
	});

	$('#new-category').on('input', function() {
		if ($(this).val()) {
			$('#upload-category').val('').trigger('change');
		}
	});

	// localStorage에서 표시할 카테고리 로드
	loadVisibleCategories();
});

// 카테고리 목록 조회 - 서버에서 카테고리 목록을 가져와서 화면에 표시
function fetchCategories() {
	showLoading();

	$.ajax({
		url: '/api/categories',
		method: 'GET',
		success: function(data) {
			const oldCategoryNames = new Set(categories.map(function(cat) {
				return cat.name;
			}));

			categories = data;

			// localStorage에 저장된 설정이 없으면 모든 카테고리 표시
			if (visibleCategories.size === 0) {
				categories.forEach(function(cat) {
					visibleCategories.add(cat.name);
				});
				saveVisibleCategories();
			} else {
				// 새로 추가된 카테고리는 자동으로 visibleCategories에 추가
				categories.forEach(function(cat) {
					if (!oldCategoryNames.has(cat.name)) {
						visibleCategories.add(cat.name);
					}
				});
				saveVisibleCategories();
			}

			renderCategories();

			// 표시된 카테고리 중 첫 번째 선택
			const visibleCats = categories.filter(function(cat) {
				return visibleCategories.has(cat.name);
			});

			if (visibleCats.length > 0 && !selectedCategory) {
				selectCategory(visibleCats[0].name);
			} else if (visibleCats.length === 0 && categories.length > 0) {
				// 표시된 카테고리가 없으면 모든 카테고리 표시
				categories.forEach(function(cat) {
					visibleCategories.add(cat.name);
				});
				saveVisibleCategories();
				selectCategory(categories[0].name);
			}

			hideLoading();
		},
		error: function(xhr, status, error) {
			showError('카테고리를 불러올 수 없습니다: ' + error);
		}
	});
}

// 카테고리 버튼 렌더링 - 사용자가 선택한 카테고리만 버튼으로 표시
function renderCategories() {
	const $container = $('#category-buttons');
	$container.empty();

	// 표시할 카테고리만 필터링
	const visibleCats = categories.filter(function(category) {
		return visibleCategories.has(category.name);
	});

	if (visibleCats.length === 0) {
		$container.html('<p class="text-gray-500 text-sm">표시할 카테고리가 없습니다. 설정에서 카테고리를 선택해주세요.</p>');
		return;
	}

	visibleCats.forEach(function(category) {
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

// 카테고리 선택 - 선택한 카테고리의 이모티콘 목록을 불러옴
function selectCategory(categoryName) {
	selectedCategory = categoryName;
	renderCategories();
	fetchEmoticons(categoryName);
}

// 이모티콘 목록 조회 - 선택한 카테고리의 이모티콘 이미지 목록을 서버에서 가져옴
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
			.addClass('delete-btn absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-opacity hover:bg-red-700 z-10')
			.html('&times;')
			.on('click', function(e) {
				e.stopPropagation();
				confirmDelete(emoticon, categoryName);
			});

		// 삭제 모드에 따라 버튼 표시/숨김
		if (deleteMode) {
			$deleteBtn.addClass('opacity-100');
		} else {
			$deleteBtn.addClass('opacity-0');
		}

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

// 클립보드에 이미지 복사 - 이모티콘 이미지를 클립보드에 복사 (GIF는 다운로드)
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

// 에러 메시지 표시/숨김 - API 호출 실패 시 에러 메시지 표시
function showError(message) {
	$('#error-message p').text('오류: ' + message);
	$('#error-message').removeClass('hidden');
	hideLoading();
}

function hideError() {
	$('#error-message').addClass('hidden');
}

// 토스트 메시지 표시 - 작업 완료나 알림 메시지를 화면 하단에 표시
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

// Select2 초기화 함수 - 업로드 모달의 카테고리 선택 드롭다운을 검색 가능하게 만듦
function initSelect2() {
	if ($('#upload-category').hasClass('select2-hidden-accessible')) {
		$('#upload-category').select2('destroy');
	}

	const $categorySelect = $('#upload-category');
	$categorySelect.select2({
		placeholder: '카테고리 검색 및 선택',
		allowClear: false,
		minimumResultsForSearch: 0, // 항상 검색 필드 표시
		language: {
			noResults: function() {
				return '검색 결과가 없습니다.';
			},
			searching: function() {
				return '검색 중...';
			}
		},
		// 한글 검색을 위한 커스텀 매처 - 카테고리 이름과 표시 이름 모두 검색 가능
		matcher: function(params, data) {
			if (!params.term || params.term.trim() === '') {
				return data;
			}
			const term = params.term.toLowerCase().trim();
			const text = data.text.toLowerCase();
			const id = data.id ? data.id.toLowerCase() : '';
			if (text.includes(term) || id.includes(term)) {
				return data;
			}
			return null;
		},
		dropdownParent: $('#upload-modal'), // 모달 내에서 드롭다운이 제대로 표시되도록 설정
		width: '100%'
	});
}

// 업로드 모달 열기 - 카테고리 목록을 select에 추가하고 Select2 초기화
function openUploadModal() {
	const $categorySelect = $('#upload-category');
	$categorySelect.empty();
	$categorySelect.append('<option value="">카테고리 선택</option>');

	categories.forEach(function(category) {
		$categorySelect.append($('<option>')
			.val(category.name)
			.text(category.displayName + ' (' + category.count + ')'));
	});

	// 옵션 추가 후 Select2 초기화 (비동기 처리)
	setTimeout(function() {
		initSelect2();
	}, 10);

	const savedPassword = sessionStorage.getItem('uploadPassword');
	$('#upload-form')[0].reset();
	if (savedPassword) {
		$('#upload-password').val(savedPassword);
	}
	$('#upload-preview').addClass('hidden');
	$('#upload-modal').removeClass('hidden');
}

// 업로드 모달 닫기 - Select2 인스턴스 제거 및 폼 초기화
function closeUploadModal() {
	if ($('#upload-category').hasClass('select2-hidden-accessible')) {
		$('#upload-category').select2('destroy');
	}
	$('#upload-modal').addClass('hidden');
	$('#upload-form')[0].reset();
	$('#upload-preview').addClass('hidden');
}

// 파일 미리보기 처리 - 업로드할 파일의 미리보기 이미지와 정보 표시
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

// 삭제 확인 모달 열기 - 삭제할 이모티콘 정보를 모달에 표시
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

// 삭제 모달 닫기
function closeDeleteModal() {
	$('#delete-modal').addClass('hidden');
	deleteTargetEmoticon = null;
}

// 이미지 삭제 처리 - 서버에 삭제 요청을 보내고 성공 시 목록 갱신
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

// 카테고리 설정 모달 열기 - 표시할 카테고리를 선택할 수 있는 체크박스 목록 표시
function openSettingsModal() {
	// 검색 필드 초기화
	$('#category-settings-search').val('');
	renderCategorySettingsList();
	$('#settings-modal').removeClass('hidden');

	// 삭제 모드 안내 메시지 표시/숨김
	if (deleteMode) {
		$('#delete-mode-notice').removeClass('hidden');
	} else {
		$('#delete-mode-notice').addClass('hidden');
	}
}

// 카테고리 설정 목록 렌더링 - 모든 카테고리를 체크박스로 표시
function renderCategorySettingsList() {
	const $list = $('#category-settings-list');
	$list.empty();

	categories.forEach(function(category) {
		const isVisible = visibleCategories.has(category.name);
		const $item = $('<div>')
			.addClass('category-settings-item flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50')
			.attr('data-category-name', category.name.toLowerCase())
			.attr('data-category-display', category.displayName.toLowerCase());

		const $checkbox = $('<input>')
			.attr('type', 'checkbox')
			.attr('id', 'cat-' + category.name)
			.attr('data-category', category.name)
			.prop('checked', isVisible)
			.addClass('w-5 h-5 text-blue-600 rounded focus:ring-blue-500');

		const $label = $('<label>')
			.attr('for', 'cat-' + category.name)
			.addClass('ml-3 flex-1 cursor-pointer')
			.html('<span class="font-medium">' + category.displayName + '</span> <span class="text-gray-500 text-sm">(' + category.count + '개)</span>');

		// 삭제 모드일 때만 삭제 버튼 표시
		const $deleteBtn = $('<button>')
			.addClass('ml-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors')
			.text('삭제')
			.on('click', function(e) {
				e.stopPropagation();
				confirmDeleteCategory(category);
			});

		$item.append($checkbox);
		$item.append($label);
		if (deleteMode) {
			$item.append($deleteBtn);
		}
		$list.append($item);
	});
}

// 삭제 모드 토글 - 삭제 모드를 켜고 끄며 삭제 버튼 표시/숨김
function toggleDeleteMode() {
	deleteMode = !deleteMode;
	const $toggleBtn = $('#delete-mode-toggle');

	if (deleteMode) {
		// 삭제 모드 ON: 빨간색 배경, 흰색 텍스트
		$toggleBtn.removeClass('bg-gray-600 hover:bg-gray-700');
		$toggleBtn.addClass('bg-red-600 hover:bg-red-700 ring-2 ring-red-300');
		// 모든 삭제 버튼 표시
		$('.delete-btn').addClass('opacity-100').removeClass('opacity-0');
	} else {
		// 삭제 모드 OFF: 회색 배경, 흰색 텍스트
		$toggleBtn.removeClass('bg-red-600 hover:bg-red-700 ring-2 ring-red-300');
		$toggleBtn.addClass('bg-gray-600 hover:bg-gray-700');
		// 모든 삭제 버튼 숨김
		$('.delete-btn').addClass('opacity-0').removeClass('opacity-100');
	}

	// 카테고리 설정 모달이 열려있으면 다시 렌더링 및 안내 메시지 업데이트
	if (!$('#settings-modal').hasClass('hidden')) {
		renderCategorySettingsList();
		if (deleteMode) {
			$('#delete-mode-notice').removeClass('hidden');
		} else {
			$('#delete-mode-notice').addClass('hidden');
		}
	}
}

// 카테고리 삭제 확인 모달 열기
function confirmDeleteCategory(category) {
	deleteTargetCategory = category;
	const categoryName = category.displayName || category.name;
	$('#delete-category-name').text(categoryName + ' (' + category.count + '개)');

	const savedPassword = sessionStorage.getItem('uploadPassword');
	$('#delete-category-password').val(savedPassword || '');
	$('#delete-category-modal').removeClass('hidden');

	setTimeout(function() {
		if (savedPassword) {
			$('#confirm-delete-category').focus();
		} else {
			$('#delete-category-password').focus();
		}
	}, 100);
}

// 카테고리 삭제 모달 닫기
function closeDeleteCategoryModal() {
	$('#delete-category-modal').addClass('hidden');
	deleteTargetCategory = null;
}

// 카테고리 삭제 처리 - 서버에 카테고리 폴더 삭제 요청
function handleCategoryDelete() {
	const password = $('#delete-category-password').val().trim();

	if (!password) {
		showToast('비밀번호를 입력해주세요.');
		return;
	}

	if (!deleteTargetCategory) {
		showToast('삭제할 카테고리를 찾을 수 없습니다.');
		return;
	}

	const category = deleteTargetCategory.name;

	$.ajax({
		url: '/api/categories/' + encodeURIComponent(category),
		method: 'DELETE',
		contentType: 'application/json',
		data: JSON.stringify({ password: password }),
		success: function(response) {
			sessionStorage.setItem('uploadPassword', password);
			showToast('카테고리가 삭제되었습니다.');
			closeDeleteCategoryModal();

			// 카테고리 목록 갱신
			$.ajax({
				url: '/api/categories',
				method: 'GET',
				success: function(data) {
					categories = data;

					// 삭제된 카테고리를 visibleCategories에서 제거
					visibleCategories.delete(category);
					saveVisibleCategories();

					// 카테고리 버튼 렌더링
					renderCategories();

					// 카테고리 설정 모달이 열려있으면 목록 다시 렌더링
					if (!$('#settings-modal').hasClass('hidden')) {
						renderCategorySettingsList();
					}

					// 삭제된 카테고리가 선택되어 있었다면 첫 번째 카테고리 선택
					if (selectedCategory === category) {
						const visibleCats = categories.filter(function(cat) {
							return visibleCategories.has(cat.name);
						});
						if (visibleCats.length > 0) {
							selectCategory(visibleCats[0].name);
						} else if (categories.length > 0) {
							selectCategory(categories[0].name);
						} else {
							$('#emoticon-section').html('<div class="text-center py-12 text-gray-500">이모티콘이 없습니다.</div>');
						}
					}
				},
				error: function() {
					showToast('카테고리 목록을 불러오는데 실패했습니다.');
				}
			});
		},
		error: function(xhr) {
			const errorMsg = xhr.responseJSON?.error || '카테고리 삭제에 실패했습니다.';
			showToast(errorMsg);
		}
	});
}

// 카테고리 설정 검색 필터링 - 검색어에 따라 카테고리 목록 필터링
function filterCategorySettings(searchTerm) {
	const term = searchTerm.toLowerCase().trim();
	const $items = $('.category-settings-item');

	if (term === '') {
		$items.show();
		return;
	}

	$items.each(function() {
		const $item = $(this);
		const categoryName = $item.attr('data-category-name');
		const categoryDisplay = $item.attr('data-category-display');

		if (categoryName.includes(term) || categoryDisplay.includes(term)) {
			$item.show();
		} else {
			$item.hide();
		}
	});
}

// 카테고리 설정 모달 닫기
function closeSettingsModal() {
	$('#settings-modal').addClass('hidden');
}

// 카테고리 설정 저장 - 체크박스로 선택한 카테고리만 표시하도록 설정
function saveCategorySettings() {
	visibleCategories.clear();

	$('#category-settings-list input[type="checkbox"]:checked').each(function() {
		const categoryName = $(this).data('category');
		visibleCategories.add(categoryName);
	});

	saveVisibleCategories();
	renderCategories();

	// 현재 선택된 카테고리가 숨겨졌다면 첫 번째 표시된 카테고리 선택
	if (!visibleCategories.has(selectedCategory)) {
		const visibleCats = categories.filter(function(cat) {
			return visibleCategories.has(cat.name);
		});
		if (visibleCats.length > 0) {
			selectCategory(visibleCats[0].name);
		} else {
			$('#emoticon-section').html('<div class="text-center py-12 text-gray-500">표시할 카테고리가 없습니다.</div>');
		}
	}

	showToast('카테고리 설정이 저장되었습니다.');
	closeSettingsModal();
}

// localStorage에 표시할 카테고리 저장 - 브라우저 재시작 후에도 설정 유지
function saveVisibleCategories() {
	const categoriesArray = Array.from(visibleCategories);
	localStorage.setItem('visibleCategories', JSON.stringify(categoriesArray));
}

// localStorage에서 표시할 카테고리 로드 - 저장된 카테고리 표시 설정 불러오기
function loadVisibleCategories() {
	const saved = localStorage.getItem('visibleCategories');
	if (saved) {
		try {
			const categoriesArray = JSON.parse(saved);
			visibleCategories = new Set(categoriesArray);
		} catch (e) {
			console.error('카테고리 설정 로드 실패:', e);
		}
	}
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
