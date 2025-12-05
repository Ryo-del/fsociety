// Global constants
const API_BASE_URL = window.location.origin;
let allJobs = []; // Хранит все загруженные вакансии для фильтрации

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
    let msgElement = document.querySelector('#jobs-list-container .form-message');
    if (!msgElement && container) {
        // Создаем элемент сообщения, если его нет
        msgElement = document.createElement('p');
        msgElement.className = 'form-message';
        // Вставляем после контейнера (jobs-list-container)
        container.parentNode.insertBefore(msgElement, container.nextSibling); 
    }
    if (msgElement) {
        msgElement.textContent = text;
        msgElement.className = isError ? 'form-message error' : 'form-message info';
    }
}

async function initPage() {
    try {
        const res = await fetch(`${API_BASE_URL}/checkauth`, { credentials: "include" });
        if (!res.ok) {
            location.href = "../auth/login.html";
            return false;
        }

        const user = await res.json();
        const welcomeMessage = document.getElementById("welcome-message");
        if (welcomeMessage) {
            welcomeMessage.textContent = user.name || user.username || "Пользователь";
            welcomeMessage.style.display = 'inline';
        }
        
        return true;
    } catch {
        location.href = "../auth/login.html";
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
    location.href = "../auth/login.html";
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


// Создание HTML-карточки вакансии
function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.id = job.id;
    
    // ИСПРАВЛЕНО: job.JobType -> job.job_type
    jobCard.dataset.type = job.job_type || 'full'; 
    jobCard.dataset.salary = parseSalary(job.salary);

    // ИСПРАВЛЕНО: job.Skills -> job.skills
    const skills = job.skills
        ? job.skills.split(",").map(s => `<span class="skill-tag">${s.trim()}</span>`).join("")
        : "<span class='skill-tag'>Навыки не указаны</span>";
    
    // ИСПРАВЛЕНО: job.JobType -> job.job_type
    const jobTypeDisplay = {
        'full': 'Полная занятость',
        'part': 'Частичная занятость',
        'remote': 'Удалённая работа',
        'internship': 'Стажировка'
    }[job.job_type] || 'Не указано';

    // ИСПРАВЛЕНО: job.Location -> job.location
    const jobLocation = job.location || 'Город не указан'; 

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
        <div class="job-actions"> 
            <button class="primary" onclick="notify('Отклик на вакансию ${job.title} отправлен!', 'success')">Откликнуться</button>
        </div>
    `;
    
    return jobCard;
}

// Обновление счетчика вакансий
function updateJobCount(count) {
    const container = document.getElementById('jobs-list-container');
    showMessage(container, `Найдено ${count} вакансий`, false);
}


// Отрисовка списка вакансий
function renderJobs(jobs) {
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) return;
    
    jobsList.innerHTML = '';
    
    if (jobs.length === 0) {
        jobsList.innerHTML = '<p class="no-jobs">Нет доступных вакансий, соответствующих фильтрам</p>';
        return;
    }
    
    jobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsList.appendChild(jobCard);
    });
}


// Загрузка всех вакансий (URL /showjobs)
async function loadJobs() {
    const container = document.getElementById('jobs-list-container');
    showMessage(container, 'Загрузка всех вакансий...', false);

    try {
        // Проверено: Используется правильный endpoint /showjobs
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
        showMessage(container, 'Ошибка загрузки вакансий: ' + error.message, true);
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
        // ИСПРАВЛЕНО: job.Title -> job.title, job.Company -> job.company
        const matchesSearch = !searchTerm || 
            (job.title && job.title.toLowerCase().includes(searchTerm)) ||
            (job.company && job.company.toLowerCase().includes(searchTerm));

        // ИСПРАВЛЕНО: job.JobType -> job.job_type
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
    
    // 2. Загрузка всех вакансий
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