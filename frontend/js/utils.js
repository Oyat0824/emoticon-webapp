/**
 * 유틸리티 함수들
 * 카테고리 선택, 파일 미리보기, 설정 저장 등 다양한 유틸리티 기능을 제공합니다.
 */

/**
 * 카테고리를 선택하고 해당 카테고리의 이모티콘을 불러옵니다.
 * @param {string} categoryName - 선택할 카테고리 이름
 */
function selectCategory(categoryName) {
	selectedCategory = categoryName;
	renderCategories();
	fetchEmoticons(categoryName);
}

/**
 * 업로드할 파일의 미리보기를 표시합니다.
 * 파일 크기, 이미지 크기 등을 확인하고 미리보기 이미지를 표시합니다.
 * @param {File} file - 미리보기할 파일 객체
 */
function handleFilePreview(file) {
	if (!file) {
		$('#upload-preview').addClass('hidden');
		return;
	}

	const isZip = file.type === 'application/zip' ||
	             file.type === 'application/x-zip-compressed' ||
	             file.name.toLowerCase().endsWith('.zip');

	if (isZip) {
		const maxSize = 20 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('ZIP 파일 크기는 20MB 이하여야 합니다.');
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

/**
 * 카테고리 설정 모달에서 검색어에 따라 카테고리 목록을 필터링합니다.
 * @param {string} searchTerm - 검색어
 */
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

/**
 * 삭제 모드를 토글합니다.
 * 삭제 모드가 활성화되면 모든 삭제 버튼이 표시됩니다.
 */
function toggleDeleteMode() {
	deleteMode = !deleteMode;
	const $toggleBtn = $('#delete-mode-toggle');

	if (deleteMode) {
		$toggleBtn.removeClass('bg-gray-600 hover:bg-gray-700');
		$toggleBtn.addClass('bg-red-600 hover:bg-red-700 ring-2 ring-red-300');
		$('.delete-btn').addClass('opacity-100').removeClass('opacity-0');
	} else {
		$toggleBtn.removeClass('bg-red-600 hover:bg-red-700 ring-2 ring-red-300');
		$toggleBtn.addClass('bg-gray-600 hover:bg-gray-700');
		$('.delete-btn').addClass('opacity-0').removeClass('opacity-100');
	}

	if (!$('#settings-modal').hasClass('hidden')) {
		renderCategorySettingsList();
		if (deleteMode) {
			$('#delete-mode-notice').removeClass('hidden');
		} else {
			$('#delete-mode-notice').addClass('hidden');
		}
	}
}

/**
 * 카테고리 설정을 저장합니다.
 * 체크박스로 선택한 카테고리만 화면에 표시되도록 설정합니다.
 */
function saveCategorySettings() {
	visibleCategories.clear();

	$('#category-settings-list input[type="checkbox"]:checked').each(function() {
		const categoryName = $(this).data('category');
		visibleCategories.add(categoryName);
	});

	saveVisibleCategories();
	renderCategories();

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

/**
 * 표시할 카테고리 목록을 localStorage에 저장합니다.
 * 브라우저를 재시작해도 설정이 유지됩니다.
 */
function saveVisibleCategories() {
	const categoriesArray = Array.from(visibleCategories);
	localStorage.setItem('visibleCategories', JSON.stringify(categoriesArray));
}

/**
 * localStorage에서 표시할 카테고리 목록을 불러옵니다.
 * 페이지 로드 시 자동으로 호출됩니다.
 */
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
