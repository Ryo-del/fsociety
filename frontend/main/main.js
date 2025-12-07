// Global constants
const API_BASE_URL = "https://fsociety-production-82b4.up.railway.app";
let allJobs = []; // Хранит все загруженные объявления для фильтрации

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (УВЕДОМЛЕНИЯ, АВТОРИЗАЦИЯ, ВЫХОД) ---

function notify(text, type = "info") {
    const box = document.createElement("div");
    box.className = `notification ${type}`;
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(() => box.classList.add("show"), 10);
    setTimeout(() => box.remove(), 3500);
}

function showMessage(container, text, isError = false) {
    let msgElement = container.querySelector('.form-message');
    
    if (!msgElement) {
        msgElement = document.createElement('p');
        msgElement.className = 'form-message';
        container.prepend(msgElement); // Добавляем в начало контейнера
    }
    
    msgElement.textContent = text;
    msgElement.className = isError ? 'form-message error' : 'form-message info';
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (msgElement.textContent === text) {
            msgElement.textContent = '';
            msgElement.className = 'form-message';
        }
    }, 5000);
}

// Функция для перехода в профиль
function goToProfile() {
    window.location.href = '../profile/profile.html';
}

async function initPage() {
    try {
        const res = await fetch(`${API_BASE_URL}/checkauth`, { credentials: "include" });
        if (!res.ok) {
            location.href = "../index.html";
            return false;
        }

        const user = await res.json();
        const welcomeMessage = document.getElementById("welcome-message");
        if (welcomeMessage) {
            welcomeMessage.textContent = user.name || user.username || "Пользователь";
            welcomeMessage.style.display = 'inline';
            
            // Добавляем иконку профиля рядом с именем пользователя
            welcomeMessage.innerHTML = `<i class="fas fa-user-circle"></i> ${welcomeMessage.textContent}`;
            
            // Добавляем стили для курсора и внешнего вида
            welcomeMessage.style.cursor = 'pointer';
            welcomeMessage.style.color = '#2575fc';
            welcomeMessage.style.fontWeight = '500';
            welcomeMessage.style.padding = '5px 10px';
            welcomeMessage.style.borderRadius = '5px';
            welcomeMessage.style.transition = 'all 0.3s ease';
            
            // Добавляем обработчик hover эффекта
            welcomeMessage.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f0f5ff';
                this.style.textDecoration = 'underline';
            });
            
            welcomeMessage.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
                this.style.textDecoration = 'none';
            });
        }
        
        return true;
    } catch {
        location.href = "../index.html";
        return false;
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.error("Logout failed but proceeding with redirect:", e);
    }
    location.href = "../index.html";
}

// --- ОСНОВНАЯ ЛОГИКА ОТОБРАЖЕНИЯ И ЗАГРУЗКИ ---

function parseSalary(salaryStr) {
    if (!salaryStr) return 0;
    const cleanStr = salaryStr.replace(/[^\d\s\-,]/g, ''); 
    const parts = cleanStr.split(/[\s\-]/);
    
    for (const part of parts) {
        const num = parseFloat(part.replace(/,/g, ''));
        if (!isNaN(num)) return num;
    }
    return 0;
}

// ФУНКЦИЯ: Переключение описания
function toggleDescription(button) {
    // Находим родительскую карточку
    const jobCard = button.closest('.job-card');
    
    if (jobCard.classList.contains('expanded')) {
        jobCard.classList.remove('expanded');
        button.textContent = 'Показать больше...';
    } else {
        jobCard.classList.add('expanded');
        button.textContent = 'Показать меньше...';
    }
}

// Функция для обработки отклика на объявления
async function sendInvite(candidateId) {
    // Найти кандидата по ID
    const candidate = allCandidates.find(c => c.id == candidateId);
    
    if (!candidate) {
        alert('Кандидат не найден');
        return;
    }
    
    // Проверить наличие Telegram
    if (!candidate.telegram || candidate.telegram === 'Не указан') {
        alert('У кандидата не указан Telegram');
        return;
    }
    
    // Формируем ссылку на Telegram
    const cleanUsername = candidate.telegram.replace(/^@/, '');
    const telegramLink = `https://t.me/${cleanUsername}`;
    
    // Показываем уведомление
    notify(`Вы приглашаете ${candidate.name} на позицию "${candidate.title}". Открываю Telegram...`, 'success');
    
    // Открываем ссылку в новой вкладке
    setTimeout(() => {
        window.open(telegramLink, '_blank');
    }, 500);
}

// Создание HTML-карточки объявления
function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.id = job.id;
    jobCard.dataset.type = job.job_type || 'full'; 
    jobCard.dataset.salary = parseSalary(job.salary);

    const skills = job.skills
        ? job.skills.split(",").map(s => `<span class="skill-tag">${s.trim()}</span>`).join("")
        : "<span class='skill-tag'>Навыки не указаны</span>";
    
    const jobTypeDisplay = {
        'full': 'Полная занятость',
        'part': 'Частичная занятость',
        'remote': 'Удалённая работа',
        'internship': 'Стажировка'
    }[job.job_type] || 'Не указано';

    const jobLocation = job.location || 'Город не указан';
    
    // Проверяем наличие Telegram username
    const hasTelegram = job.telegram && job.telegram.trim() !== '';
    const telegramUsername = hasTelegram ? job.telegram.replace(/^@/, '') : '';
    const telegramDisplay = hasTelegram ? `@${telegramUsername}` : 'Не указан';
    
    // Формируем ссылку на Telegram
    const telegramLink = hasTelegram ? `https://t.me/${telegramUsername}` : '#';

    jobCard.innerHTML = `
        <div class="job-card-header">
            <h3>${job.title}</h3>
            <span class="job-type">${jobTypeDisplay}</span>
        </div>
        <div class="job-card-company">${job.company || "Компания не указана"}</div>
        <div class="job-card-salary">${job.salary || "Зарплата не указана"}</div>
        <div class="job-card-skills">${skills}</div>
        
        <p class="job-description">${job.description}</p>
        <button class="toggle-btn" onclick="toggleDescription(this)">Показать больше...</button>

        <div class="job-card-footer">
            <span class="job-location">${jobLocation}</span>
            <span class="job-date">Сегодня</span> 
        </div>
        
        <div class="job-contact-info">
            <div class="contact-item">
                <i class="fas fa-comment-alt"></i>
                <span>Контакты: ${telegramDisplay}</span>
            </div>
        </div>
        
        <div class="job-actions"> 
            <button class="primary" onclick="respondToJob('${job.title.replace(/'/g, "\\'")}', '${telegramUsername}')">
                <i class="fab fa-telegram"></i> Откликнуться в Telegram
            </button>
        </div>
    `;
    
    return jobCard;
}

// Обновление счетчика объявления
function updateJobCount(count) {
    const container = document.getElementById('jobs-list-container');
    if (container) {
        // Убираем предыдущее сообщение
        const prevMsg = container.querySelector('.form-message');
        if (prevMsg) {
            prevMsg.textContent = '';
        }
        
        // Можно показать уведомление сверху
        if (count === 0) {
            showMessage(container, 'Нет объявлений по вашему запросу', false);
        }
    }
}

function renderJobs(jobs) {
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) return;
    
    jobsList.innerHTML = '';
    
    if (jobs.length === 0) {
        jobsList.innerHTML = '<p class="no-jobs">Нет доступных объявлений, соответствующих фильтрам</p>';
        return;
    }
    
    jobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsList.appendChild(jobCard);
    });
}

// Загрузка всех объявлений(URL /showjobs)
async function loadJobs() {
    const container = document.getElementById('jobs-list-container');
    showMessage(container, 'Загрузка всех объявлений...', false);

    try {
        const response = await fetch(`${API_BASE_URL}/showjobs`, { 
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const responseText = await response.text();
        if (!responseText.trim() || responseText.trim() === '[]') {
            allJobs = [];
        } else {
            allJobs = JSON.parse(responseText);
        }

        renderJobs(allJobs);
        updateJobCount(allJobs.length);

    } catch (error) {
        console.error('Error loading jobs:', error);
        showMessage(container, 'Ошибка загрузки объявлений: ' + error.message, true);
    }
}

// --- ЛОГИКА ФИЛЬТРАЦИИ ---

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('job-type-filter');
    const salaryFilter = document.getElementById('salary-filter'); 

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedType = typeFilter ? typeFilter.value : '';
    const selectedSalaryRange = salaryFilter ? salaryFilter.value : '0'; 
    
    let filteredJobs = allJobs.filter(job => {
        const matchesSearch = !searchTerm || 
            (job.title && job.title.toLowerCase().includes(searchTerm)) ||
            (job.company && job.company.toLowerCase().includes(searchTerm));

        const matchesType = !selectedType || job.job_type === selectedType;

        // Фильтр по зарплате (использует job.salary)
        let matchesSalary = true;
        const jobSalaryMin = parseSalary(job.salary);
        const minSalaryThreshold = parseInt(selectedSalaryRange); 
        
        if (!isNaN(minSalaryThreshold)) {
            matchesSalary = jobSalaryMin >= minSalaryThreshold;
        }
        
        return matchesSearch && matchesType && matchesSalary;
    });

    renderJobs(filteredJobs);
    updateJobCount(filteredJobs.length);
}

// --- ИНИЦИАЛИЗАЦИЯ ---

document.addEventListener('DOMContentLoaded', async function() {
    // 1. Проверка авторизации
    await initPage();
    
    // 2. Загрузка всех объявления
    await loadJobs();
    
    // 3. Назначение обработчиков для фильтров
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('job-type-filter');
    const salaryFilter = document.getElementById('salary-filter'); 

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }
    if (salaryFilter) {
        salaryFilter.addEventListener('change', applyFilters);
    }
    
    // Назначение обработчика выхода (для кнопки в header)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});