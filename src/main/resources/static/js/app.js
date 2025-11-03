let searchHistory = [];
let currentSuggestionIndex = -1;
let totalSearchCount = 0;
let todaySearchCount = 0;
let isSearching = false;

// DOM 요소
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const suggestionBox = document.getElementById('suggestionBox');
const suggestionList = document.getElementById('suggestionList');
const historyContainer = document.getElementById('searchHistory');

// localStorage에서 데이터 로드
function loadFromStorage() {
    const savedHistory = localStorage.getItem('searchHistory');
    const savedCount = localStorage.getItem('totalSearchCount');
    const savedToday = localStorage.getItem('todaySearchCount');
    const savedDate = localStorage.getItem('lastSearchDate');

    const today = new Date().toDateString();

    // 날짜가 바뀌었으면 오늘 검색 횟수 초기화
    if (savedDate !== today) {
        todaySearchCount = 0;
        localStorage.setItem('lastSearchDate', today);
    } else if (savedToday) {
        todaySearchCount = parseInt(savedToday);
    }

    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
    }

    if (savedCount) {
        totalSearchCount = parseInt(savedCount);
    }
}

// localStorage에 데이터 저장
function saveToStorage() {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    localStorage.setItem('totalSearchCount', totalSearchCount.toString());
    localStorage.setItem('todaySearchCount', todaySearchCount.toString());
    localStorage.setItem('lastSearchDate', new Date().toDateString());
}

// 캐시 통계 업데이트
async function updateCacheStats() {
    try {
        const response = await fetch('/api/stats/cache');
        const stats = await response.json();

        document.getElementById('cachedQueries').textContent = stats.cachedQueries;

        if (stats.error) {
            console.error('Cache stats error:', stats.error);
        }
    } catch (error) {
        console.error('캐시 통계 업데이트 실패:', error);
        document.getElementById('cachedQueries').textContent = '0';
    }
}

// 디바운스 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 자동완성 가져오기
async function fetchSuggestions(query) {
    if (!query || query.trim().length === 0) {
        hideSuggestions();
        return;
    }

    try {
        const response = await fetch(`/api/autocomplete?query=${encodeURIComponent(query)}`);
        const suggestions = await response.json();

        if (suggestions && suggestions.length > 0) {
            displaySuggestions(suggestions);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('자동완성 가져오기 실패:', error);
        hideSuggestions();
    }
}

// 자동완성 표시
function displaySuggestions(suggestions) {
    suggestionList.innerHTML = '';
    currentSuggestionIndex = -1;

    suggestions.forEach((suggestion, index) => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        li.dataset.index = index;

        li.addEventListener('click', () => {
            searchInput.value = suggestion;
            hideSuggestions();
            performSearch(suggestion);
        });

        suggestionList.appendChild(li);
    });

    suggestionBox.classList.remove('hidden');
}

// 자동완성 숨기기
function hideSuggestions() {
    suggestionBox.classList.add('hidden');
    currentSuggestionIndex = -1;
}

// 인기 검색어 새로고침
async function refreshPopularQueries() {
    try {
        const response = await fetch('/api/popular?limit=10');
        const popularQueries = await response.json();

        const popularGrid = document.querySelector('.popular-grid');
        popularGrid.innerHTML = '';

        let rank = 1;
        for (const [query, count] of Object.entries(popularQueries)) {
            const item = document.createElement('div');
            item.className = 'popular-item';
            item.innerHTML = `
                <span class="popular-rank">${rank}</span>
                <span class="popular-query">${query}</span>
                <span class="popular-count">${count}회</span>
            `;

            // 중요: 여기서는 이벤트를 등록하지 않음 (이벤트 위임 사용)

            popularGrid.appendChild(item);
            rank++;
        }
    } catch (error) {
        console.error('인기 검색어 업데이트 실패:', error);
    }
}

// 검색 수행
async function performSearch(query) {
    if (!query || query.trim().length === 0) {
        return;
    }

    // 중복 실행 방지
    if (isSearching) {
        return;
    }

    isSearching = true;

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query.trim() })
        });

        const result = await response.json();

        if (result.status === 'success') {
            addToHistory(query);
            totalSearchCount++;
            todaySearchCount++;
            updateStats();
            saveToStorage();

            // 인기 검색어와 캐시 통계 즉시 업데이트
            await Promise.all([
                refreshPopularQueries(),
                updateCacheStats()
            ]);

            showNotification(`"${query}" 검색 완료!`);
        }
    } catch (error) {
        console.error('검색 실패:', error);
        showNotification('검색 중 오류가 발생했습니다', 'error');
    } finally {
        isSearching = false;
    }
}

// 검색 기록 추가
function addToHistory(query) {
    const historyItem = {
        query: query,
        timestamp: new Date().toLocaleTimeString('ko-KR')
    };

    // 중복 제거
    searchHistory = searchHistory.filter(item => item.query !== query);

    // 최신 항목을 앞에 추가
    searchHistory.unshift(historyItem);

    // 최대 10개까지만 유지
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }

    displayHistory();
}

// 검색 기록 표시
function displayHistory() {
    if (searchHistory.length === 0) {
        historyContainer.innerHTML = '<p class="empty-message">최근 검색 기록이 없습니다</p>';
        return;
    }

    historyContainer.innerHTML = '';

    searchHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span>🔍 ${item.query}</span>
            <span class="history-time">${item.timestamp}</span>
        `;

        historyItem.addEventListener('click', () => {
            searchInput.value = item.query;
            performSearch(item.query);
        });

        historyContainer.appendChild(historyItem);
    });
}

// 통계 업데이트
function updateStats() {
    document.getElementById('totalSearches').textContent = totalSearchCount;
    document.getElementById('todaySearches').textContent = todaySearchCount;

    animateNumber('totalSearches');
    animateNumber('todaySearches');
}

// 숫자 애니메이션
function animateNumber(elementId) {
    const element = document.getElementById(elementId);
    element.style.transform = 'scale(1.2)';
    element.style.color = 'var(--success-color)';

    setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 300);
}

// 알림 표시
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 24px;
        background-color: ${type === 'success' ? 'var(--success-color)' : 'var(--warning-color)'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// 키보드 네비게이션
function handleKeyboardNavigation(e) {
    const suggestions = suggestionList.querySelectorAll('li');

    if (suggestions.length === 0) {
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestions.length;
        updateSuggestionHighlight(suggestions);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSuggestionIndex = currentSuggestionIndex <= 0
            ? suggestions.length - 1
            : currentSuggestionIndex - 1;
        updateSuggestionHighlight(suggestions);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSuggestionIndex >= 0 && currentSuggestionIndex < suggestions.length) {
            const selectedSuggestion = suggestions[currentSuggestionIndex].textContent;
            searchInput.value = selectedSuggestion;
            hideSuggestions();
            performSearch(selectedSuggestion);
        } else {
            performSearch(searchInput.value);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
}

// 자동완성 하이라이트 업데이트
function updateSuggestionHighlight(suggestions) {
    suggestions.forEach((li, index) => {
        if (index === currentSuggestionIndex) {
            li.classList.add('active');
            searchInput.value = li.textContent;
        } else {
            li.classList.remove('active');
        }
    });
}

// 이벤트 리스너
const debouncedFetchSuggestions = debounce((query) => {
    fetchSuggestions(query);
}, 300);

searchInput.addEventListener('input', (e) => {
    debouncedFetchSuggestions(e.target.value);
});

searchInput.addEventListener('keydown', handleKeyboardNavigation);

searchButton.addEventListener('click', () => {
    performSearch(searchInput.value);
    searchInput.value = '';
    hideSuggestions();
});

searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
        fetchSuggestions(searchInput.value);
    }
});

// 외부 클릭 시 자동완성 숨기기
document.addEventListener('click', (e) => {
    if (!suggestionBox.contains(e.target) && e.target !== searchInput) {
        hideSuggestions();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // localStorage에서 데이터 로드
    loadFromStorage();

    // UI 업데이트
    updateStats();
    displayHistory();
    updateCacheStats();

    // 인기 검색어 클릭 이벤트 (이벤트 위임, 한 번만 등록)
    document.querySelector('.popular-grid').addEventListener('click', (e) => {
        const popularItem = e.target.closest('.popular-item');
        if (popularItem) {
            const query = popularItem.querySelector('.popular-query').textContent;
            searchInput.value = query;
            performSearch(query);
        }
    });

    // 인기 검색어 애니메이션
    const popularItems = document.querySelectorAll('.popular-item');
    popularItems.forEach((item, index) => {
        item.style.animationDelay = `${0.1 * index}s`;
    });
});

// 주기적 업데이트 (30초마다)
setInterval(() => {
    refreshPopularQueries();
    updateCacheStats();
}, 30000);