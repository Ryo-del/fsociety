// Функция для загрузки всех вакансий
async function loadJobs() {
    try {
        const response = await fetch(`${API_BASE_URL}/job`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const jobs = await response.json();
        renderJobs(jobs);
        updateJobCount(jobs.length);
    } catch (error) {
        console.error('Error loading jobs:', error);
        showMessage(document.getElementById('jobs-list-container'), 'Ошибка загрузки вакансий', true);
    }
}

// Функция для отображения вакансий
function renderJobs(jobs) {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '';
    
    if (jobs.length === 0) {
        jobsList.innerHTML = '<p class="no-jobs">Нет доступных вакансий</p>';
        return;
    }
    
    jobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsList.appendChild(jobCard);
    });
    
    // Применяем фильтры
    applyFilters();
}

// Функция создания карточки вакансии
function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.id = job.id;
    jobCard.dataset.type = job.job_type || 'full';
    jobCard.dataset.salary = parseSalary(job.salary);
    
    // Определяем тип вакансии
    const jobTypeMap = {
        'full': 'Полная занятость',
        'part': 'Частичная занятость',
        'remote': 'Удалённая работа',
        'internship': 'Стажировка'
    };
    
    const jobType = jobTypeMap[job.job_type] || 'Полная занятость';
    
    // Разбиваем навыки на теги
    const skills = job.skills ? job.skills.split(',').map(skill => skill.trim()) : [];
    const skillsHTML = skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    
    jobCard.innerHTML = `
        <div class="job-card-header">
            <h3>${job.title || 'Название не указано'}</h3>
            <span class="job-type">${jobType}</span>
        </div>
        <div class="job-card-company">${job.company || 'Компания не указана'}</div>
        <div class="job-card-salary">${job.salary || 'Зарплата не указана'}</div>
        <div class="job-card-skills">
            ${skillsHTML || '<span class="no-skills">Навыки не указаны</span>'}
        </div>
        <p class="job-description">${job.description || 'Описание отсутствует'}</p>
        <div class="job-card-footer">
            <span class="job-location">${job.location || 'Локация не указана'}</span>
            <span class="job-date">${formatDate(job.created_at)}</span>
        </div>
    `;
    
    return jobCard;
}

// Вспомогательная функция для парсинга зарплаты
function parseSalary(salary) {
    if (!salary) return 0;
    
    // Извлекаем числа из строки зарплаты
    const numbers = salary.match(/\d+/g);
    if (!numbers) return 0;
    
    // Берем первое число как среднюю зарплату
    return parseInt(numbers[0]);
}

// Вспомогательная функция для форматирования даты
function formatDate(dateString) {
    if (!dateString) return 'Дата не указана';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    } catch (e) {
        return dateString;
    }
}

// Функция обновления счетчика вакансий
function updateJobCount(count) {
    const messageElement = document.querySelector('.form-message.info');
    if (messageElement) {
        messageElement.textContent = `Найдено ${count} вакансий`;
    }
}

// Функция применения фильтров
function applyFilters() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('job-type-filter').value;
    const salaryFilter = document.getElementById('salary-filter').value;
    
    const jobCards = document.querySelectorAll('.job-card');
    let visibleCount = 0;
    
    jobCards.forEach(card => {
        let show = true;
        
        // Фильтр по поиску
        if (searchInput) {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const company = card.querySelector('.job-card-company').textContent.toLowerCase();
            if (!title.includes(searchInput) && !company.includes(searchInput)) {
                show = false;
            }
        }
        
        // Фильтр по типу
        if (typeFilter && card.dataset.type !== typeFilter) {
            show = false;
        }
        
        // Фильтр по зарплате
        if (salaryFilter) {
            const salary = parseInt(card.dataset.salary);
            switch (salaryFilter) {
                case '0-50000':
                    if (salary > 50000) show = false;
                    break;
                case '50000-100000':
                    if (salary < 50000 || salary > 100000) show = false;
                    break;
                case '100000-200000':
                    if (salary < 100000 || salary > 200000) show = false;
                    break;
                case '200000+':
                    if (salary < 200000) show = false;
                    break;
            }
        }
        
        card.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
    });
    
    updateJobCount(visibleCount);
}
// Функция выхода
async function logout() {
    if (!confirm('Выйти из системы?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Явно удаляем ВСЕ возможные cookies на клиенте
        const cookies = document.cookie.split(";");
        
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Удаляем каждый cookie
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname + ";";
        }
        
        // Также очищаем localStorage и sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Добавляем параметр к URL, чтобы предотвратить автоматический вход
        window.location.href = '../index.html?logout=true&t=' + new Date().getTime();
        
    } catch (error) {
        console.error('Logout error:', error);
        // В случае ошибки все равно перенаправляем с параметром
        window.location.href = '../index.html?logout=true&t=' + new Date().getTime();
    }
}

// Обновленная функция initPage с правильной привязкой кнопок выхода
async function initPage() {
    // Проверяем авторизацию
    const authState = await checkAuth();
    
    if (!authState.isAuthenticated) {
        // Если не авторизован, перенаправляем на страницу входа
        window.location.href = '../index.html';
        return;
    }
    
    // Обновляем приветственное сообщение, если есть элемент
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Добро пожаловать, ${authState.username}!`;
        welcomeMessage.style.display = 'inline';
    }
    
    // Находим все кнопки выхода и вешаем обработчики
    const logoutButtons = document.querySelectorAll('button');
    logoutButtons.forEach(button => {
        // Проверяем текст кнопки или атрибут onclick
        if (button.textContent.trim() === 'Выход' || 
            button.textContent.trim() === 'Logout' ||
            (button.onclick && button.onclick.toString().includes('logout'))) {
            
            // Удаляем старые обработчики
            button.onclick = null;
            
            // Добавляем новый обработчик
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
    
    // Также обрабатываем кнопки с атрибутом onclick="logout()"
    const logoutInlineButtons = document.querySelectorAll('[onclick*="logout"]');
    logoutInlineButtons.forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
}
// Инициализация страницы main.html
document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
    
    // Загружаем вакансии
    await loadJobs();
    
    // Назначаем обработчики фильтров
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('job-type-filter').addEventListener('change', applyFilters);
    document.getElementById('salary-filter').addEventListener('change', applyFilters);
});