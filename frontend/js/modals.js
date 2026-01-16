/**
 * 모달 관련 함수들
 * 업로드 모달, 설정 모달, 삭제 확인 모달 등을 관리합니다.
 */

/**
 * Select2 라이브러리를 초기화합니다.
 * 업로드 모달의 카테고리 선택 드롭다운을 검색 가능하게 만듭니다.
 */
function initSelect2() {
	if ($('#upload-category').hasClass('select2-hidden-accessible')) {
		$('#upload-category').select2('destroy');
	}

	const $categorySelect = $('#upload-category');
	$categorySelect.select2({
		placeholder: '카테고리 검색 및 선택',
		allowClear: false,
		minimumResultsForSearch: 0,
		language: {
			noResults: function() {
				return '검색 결과가 없습니다.';
			},
			searching: function() {
				return '검색 중...';
			}
		},
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
		dropdownParent: $('#upload-modal'),
		width: '100%'
	});
}

/**
 * 업로드 모달을 엽니다.
 * 카테고리 목록을 Select2 드롭다운에 추가하고 저장된 비밀번호를 불러옵니다.
 */
function openUploadModal() {
	const $categorySelect = $('#upload-category');
	$categorySelect.empty();
	$categorySelect.append('<option value="">카테고리 선택</option>');

	categories.forEach(function(category) {
		$categorySelect.append($('<option>')
			.val(category.name)
			.text(category.displayName + ' (' + category.count + ')'));
	});

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

/**
 * 업로드 모달을 닫습니다.
 * Select2 인스턴스를 제거하고 폼을 초기화합니다.
 */
function closeUploadModal() {
	if ($('#upload-category').hasClass('select2-hidden-accessible')) {
		$('#upload-category').select2('destroy');
	}
	$('#upload-modal').addClass('hidden');
	$('#upload-form')[0].reset();
	$('#upload-preview').addClass('hidden');
}

/**
 * 이모티콘 삭제 확인 모달을 엽니다.
 * @param {Object} emoticon - 삭제할 이모티콘 객체
 * @param {string} categoryName - 카테고리 이름
 */
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

/**
 * 카테고리 설정 모달을 엽니다.
 * 표시할 카테고리를 선택할 수 있는 체크박스 목록을 표시합니다.
 */
function openSettingsModal() {
	$('#category-settings-search').val('');
	renderCategorySettingsList();
	$('#settings-modal').removeClass('hidden');

	if (deleteMode) {
		$('#delete-mode-notice').removeClass('hidden');
	} else {
		$('#delete-mode-notice').addClass('hidden');
	}
}

function closeSettingsModal() {
	$('#settings-modal').addClass('hidden');
}

/**
 * 카테고리 삭제 확인 모달을 엽니다.
 * @param {Object} category - 삭제할 카테고리 객체
 */
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

function closeDeleteCategoryModal() {
	$('#delete-category-modal').addClass('hidden');
	deleteTargetCategory = null;
}
