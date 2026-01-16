/**
 * 메인 애플리케이션 파일
 * 전역 변수를 정의하고 페이지 로드 시 이벤트 핸들러를 등록합니다.
 */

// 전역 변수
let categories = []; // 서버에서 가져온 카테고리 목록
let selectedCategory = null; // 현재 선택된 카테고리 이름
let emoticons = []; // 현재 선택된 카테고리의 이모티콘 목록
let copiedEmoticonUrl = null; // 최근 복사된 이모티콘 URL (피드백 표시용)
let visibleCategories = new Set(); // 화면에 표시할 카테고리 목록
let categorySettingsSearchTimeout = null; // 카테고리 설정 검색 디바운스 타이머
let deleteMode = false; // 삭제 모드 활성화 여부
let deleteTargetCategory = null; // 삭제할 카테고리 객체
let deleteTargetEmoticon = null; // 삭제할 이모티콘 객체
let lastCopyTime = 0; // 마지막 복사 시간 (쿨다운 체크용)
let isCopying = false; // 현재 복사 진행 중 여부
const COPY_COOLDOWN = 500; // 복사 쿨다운 시간 (밀리초)

/**
 * 페이지 로드 완료 시 실행되는 초기화 함수
 * 모든 이벤트 핸들러를 등록하고 초기 데이터를 불러옵니다.
 */
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

	$('#delete-mode-toggle').on('click', function() {
		toggleDeleteMode();
	});

	$('#close-delete-category-modal, #cancel-delete-category').on('click', function() {
		closeDeleteCategoryModal();
	});

	$('#delete-category-form').on('submit', function(e) {
		e.preventDefault();
		handleCategoryDelete();
	});

	$('#category-settings-search').on('input', function() {
		const searchTerm = $(this).val();
		if (categorySettingsSearchTimeout) {
			clearTimeout(categorySettingsSearchTimeout);
		}
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

	loadVisibleCategories();
});
