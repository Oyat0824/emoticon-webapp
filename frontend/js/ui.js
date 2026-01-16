/**
 * UI 렌더링 관련 함수들
 * 화면에 카테고리 버튼, 이모티콘 그리드 등을 렌더링하고
 * 로딩, 에러, 토스트 메시지를 표시합니다.
 */

/**
 * 카테고리 버튼을 화면에 렌더링합니다.
 * visibleCategories에 포함된 카테고리만 표시됩니다.
 */
function renderCategories() {
	const $container = $('#category-buttons');
	$container.empty();

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

/**
 * 선택한 카테고리의 이모티콘을 그리드 형태로 렌더링합니다.
 * 각 이모티콘은 클릭 시 클립보드에 복사되며,
 * 삭제 모드일 때는 삭제 버튼이 표시됩니다.
 */
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

/**
 * 카테고리 설정 모달의 카테고리 목록을 렌더링합니다.
 * 각 카테고리마다 체크박스와 삭제 버튼이 표시됩니다.
 */
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

/**
 * 로딩 오버레이를 표시합니다.
 */
function showLoading() {
	$('#loading-overlay').removeClass('hidden');
}

function hideLoading() {
	$('#loading-overlay').addClass('hidden');
}

/**
 * 에러 메시지를 표시합니다.
 * @param {string} message - 표시할 에러 메시지
 */
function showError(message) {
	$('#error-message p').text('오류: ' + message);
	$('#error-message').removeClass('hidden');
	hideLoading();
}

function hideError() {
	$('#error-message').addClass('hidden');
}

// 토스트 메시지 타이머 (중복 표시 방지용)
let toastTimer = null;

/**
 * 토스트 메시지를 우측 상단에 표시합니다.
 * 3초 후 자동으로 사라집니다.
 * 이미 표시 중인 토스트가 있으면 기존 타이머를 취소하고 새 메시지로 업데이트합니다.
 * @param {string} message - 표시할 메시지
 */
function showToast(message) {
	const $toast = $('#toast');
	const $toastMessage = $('#toast-message');

	// 기존 타이머가 있으면 취소
	if (toastTimer) {
		clearTimeout(toastTimer);
		toastTimer = null;
	}

	$toastMessage.text(message);
	$toast.removeClass('hidden opacity-0 -translate-y-2');
	$toast.addClass('opacity-100 translate-y-0');

	toastTimer = setTimeout(function() {
		$toast.removeClass('opacity-100 translate-y-0');
		$toast.addClass('opacity-0 -translate-y-2');

		setTimeout(function() {
			$toast.addClass('hidden');
			toastTimer = null;
		}, 300);
	}, 3000);
}

/**
 * 이모티콘 복사 완료 피드백을 표시합니다.
 * 복사된 이모티콘에 녹색 테두리와 "복사됨!" 오버레이를 표시합니다.
 * @param {string} imageUrl - 복사된 이모티콘의 URL
 */
function showCopiedFeedback(imageUrl) {
	copiedEmoticonUrl = imageUrl;
	renderEmoticons();

	setTimeout(function() {
		copiedEmoticonUrl = null;
		renderEmoticons();
	}, 2000);
}
