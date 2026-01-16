/**
 * API 호출 관련 함수들
 * 서버와 통신하여 카테고리 목록, 이모티콘 목록을 가져오고
 * 업로드, 삭제 등의 작업을 수행합니다.
 */

/**
 * 서버에서 카테고리 목록을 가져옵니다.
 * 성공 시 화면에 카테고리 버튼을 렌더링하고 첫 번째 카테고리를 선택합니다.
 */
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

			if (visibleCategories.size === 0) {
				categories.forEach(function(cat) {
					visibleCategories.add(cat.name);
				});
				saveVisibleCategories();
			} else {
				categories.forEach(function(cat) {
					if (!oldCategoryNames.has(cat.name)) {
						visibleCategories.add(cat.name);
					}
				});
				saveVisibleCategories();
			}

			renderCategories();

			const visibleCats = categories.filter(function(cat) {
				return visibleCategories.has(cat.name);
			});

			if (visibleCats.length > 0 && !selectedCategory) {
				selectCategory(visibleCats[0].name);
			} else if (visibleCats.length === 0 && categories.length > 0) {
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

/**
 * 선택한 카테고리의 이모티콘 목록을 서버에서 가져옵니다.
 * @param {string} category - 카테고리 이름
 */
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

/**
 * 파일 업로드를 처리합니다.
 * 단일 이미지 파일 또는 ZIP 파일을 업로드할 수 있습니다.
 * - 단일 이미지: 최대 1MB
 * - ZIP 파일: 최대 20MB
 */
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
		const maxSize = 20 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('ZIP 파일 크기는 20MB 이하여야 합니다.');
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

/**
 * 선택한 이모티콘 이미지를 삭제합니다.
 * 비밀번호 인증이 필요하며, 삭제 후 카테고리 목록을 갱신합니다.
 */
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

/**
 * 카테고리 전체를 삭제합니다.
 * 카테고리 내의 모든 이모티콘 이미지가 함께 삭제됩니다.
 * 비밀번호 인증이 필요합니다.
 */
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

			$.ajax({
				url: '/api/categories',
				method: 'GET',
				success: function(data) {
					categories = data;
					visibleCategories.delete(category);
					saveVisibleCategories();
					renderCategories();

					if (!$('#settings-modal').hasClass('hidden')) {
						renderCategorySettingsList();
					}

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
