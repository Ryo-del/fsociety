
    const API_BASE_URL = "http://185.96.80.7:8080"; // Измените на ваш URL API
    // Глобальная переменная для хранения ID текущего кандидата
let currentCandidateId = null;
    // Глобальные переменные
    let allCandidates = [];
    let filteredCandidates = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Основная функция загрузки при загрузке страницы
    document.addEventListener('DOMContentLoaded', async function() {
        await loadCandidates();
        setupEventListeners();
    });
function goToProfile() {
    window.location.href = '../profile/profile.html';
}
    // Загрузка кандидатов из базы данных
    async function loadCandidates() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/api/ankety/search`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Преобразуем данные из вашего формата в формат для отображения
        allCandidates = data.results.map(anketa => ({
            id: anketa.id,
            name: anketa.name,
            title: getTitleFromJob(anketa.job),
            level: getLevelFromExperience(anketa.experience),
            experience: anketa.experience || getExperienceFromAge(anketa.age),
            salary: anketa.salary ? `от ${formatSalary(anketa.salary)} ₽` : 'Не указано',
            skills: anketa.skills ? anketa.skills.split(',').map(s => s.trim()) : [],
            city: anketa.city || 'Не указан',
            jobType: getJobTypeFromFormat(anketa.jobtype),
            education: anketa.school,
            description: anketa.description || 'Описание отсутствует',
            photo: anketa.photo ? `${API_BASE_URL}/api/get-photo?filename=${anketa.photo.split('/').pop()}` : 'https://via.placeholder.com/60',
            gender: anketa.gender,
            age: anketa.age,
            job: anketa.job,
            telegram: anketa.telegram || 'Не указан',
            updateDate: 'Сегодня'
        }));

        // Применяем фильтры и отображаем
        applyFilters();
        
    } catch (error) {
        console.error('Ошибка загрузки кандидатов:', error);
        showError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        
        // Отображаем пустой список
        allCandidates = [];
        renderCandidates([]);
        updateResultsCount(0);
    } finally {
        hideLoading();
    }
}

    // Настройка слушателей событий
    function setupEventListeners() {
        // Поиск по нажатию Enter
        document.getElementById('search-name').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPeople();
            }
        });

        // Применение фильтров при изменении значений
        document.getElementById('filter-specialty').addEventListener('change', applyFilters);
        document.getElementById('filter-level').addEventListener('change', applyFilters);
        document.getElementById('filter-salary').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('filter-skills').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('filter-city').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('filter-format').addEventListener('change', applyFilters);
        document.getElementById('sort-by').addEventListener('change', sortResults);
    }

    // Основная функция фильтрации
    function applyFilters() {
        const searchQuery = document.getElementById('search-name').value.toLowerCase();
        const specialty = document.getElementById('filter-specialty').value;
        const level = document.getElementById('filter-level').value;
        const minSalary = document.getElementById('filter-salary').value;
        const skillsFilter = document.getElementById('filter-skills').value.toLowerCase();
        const cityFilter = document.getElementById('filter-city').value.toLowerCase();
        const workFormat = document.getElementById('filter-format').value;

        filteredCandidates = allCandidates.filter(candidate => {
            // Поиск по имени/фамилии/ключевым словам
            let matchesSearch = true;
            if (searchQuery) {
                const searchFields = [
                    candidate.name,
                    candidate.job,
                    candidate.title,
                    candidate.description,
                    candidate.skills.join(' ')
                ].join(' ').toLowerCase();
                
                matchesSearch = searchFields.includes(searchQuery);
            }

            // Фильтр по специальности
            let matchesSpecialty = true;
            if (specialty) {
                const jobMap = {
                    'frontend': ['frontend', 'front-end', 'javascript', 'react', 'vue', 'angular'],
                    'backend': ['backend', 'back-end', 'python', 'java', 'php', 'node', 'django', 'spring'],
                    'fullstack': ['fullstack', 'full-stack'],
                    'mobile': ['mobile', 'android', 'ios', 'react native', 'flutter'],
                    'designer': ['designer', 'дизайн', 'ui', 'ux', 'figma'],
                    'analyst': ['analyst', 'аналитик', 'data', 'данных'],
                    'devops': ['devops', 'sre', 'инженер'],
                    'qa': ['qa', 'тестировщик', 'тестирование', 'quality'],
                    'manager': ['manager', 'менеджер', 'project', 'продукта'],
                    'marketing': ['marketing', 'маркетинг', 'маркетолог']
                };
                
                if (jobMap[specialty]) {
                    matchesSpecialty = jobMap[specialty].some(keyword => 
                        candidate.job.toLowerCase().includes(keyword) || 
                        candidate.title.toLowerCase().includes(keyword)
                    );
                }
            }

            // Фильтр по уровню
            let matchesLevel = true;
            if (level) {
                const levelMap = {
                    'intern': ['стажёр', 'intern', 'trainee'],
                    'junior': ['junior', 'младший'],
                    'middle': ['middle', 'средний'],
                    'senior': ['senior', 'старший'],
                    'lead': ['lead', 'ведущий', 'руководитель']
                };
                
                if (levelMap[level]) {
                    matchesLevel = levelMap[level].some(keyword => 
                        candidate.level.toLowerCase().includes(keyword) || 
                        candidate.experience.toLowerCase().includes(keyword)
                    );
                }
            }

            // Фильтр по зарплате
            let matchesSalary = true;
            if (minSalary) {
                const candidateSalary = extractSalary(candidate.salary);
                matchesSalary = candidateSalary >= parseInt(minSalary);
            }

            // Фильтр по навыкам
            let matchesSkills = true;
            if (skillsFilter) {
                const requiredSkills = skillsFilter.split(',').map(s => s.trim());
                matchesSkills = requiredSkills.every(skill => 
                    candidate.skills.some(candidateSkill => 
                        candidateSkill.toLowerCase().includes(skill)
                    )
                );
            }

            // Фильтр по городу
            let matchesCity = true;
            if (cityFilter) {
                matchesCity = candidate.city.toLowerCase().includes(cityFilter);
            }

            // Фильтр по формату работы
            let matchesFormat = true;
            if (workFormat) {
                const formatMap = {
                    'office': ['офис', 'office'],
                    'remote': ['удалённо', 'remote', 'удаленно'],
                    'hybrid': ['гибридный', 'гибрид', 'hybrid']
                };
                
                if (formatMap[workFormat]) {
                    matchesFormat = formatMap[workFormat].some(keyword => 
                        candidate.jobType.toLowerCase().includes(keyword)
                    );
                }
            }

            return matchesSearch && matchesSpecialty && matchesLevel && 
                   matchesSalary && matchesSkills && matchesCity && matchesFormat;
        });

        // Сортировка и отображение
        sortResults();
    }

    // Функция поиска (обработчик кнопки)
    function searchPeople() {
        applyFilters();
    }

    // Сортировка результатов
    function sortResults() {
        const sortBy = document.getElementById('sort-by').value;

        filteredCandidates.sort((a, b) => {
            switch (sortBy) {
                case 'salary_desc':
                    return extractSalary(b.salary) - extractSalary(a.salary);
                case 'salary_asc':
                    return extractSalary(a.salary) - extractSalary(b.salary);
                case 'experience':
                    return getExperienceValue(b.experience) - getExperienceValue(a.experience);
                case 'date':
                    // Здесь можно добавить сортировку по дате
                    return 0;
                default: // relevance
                    return 0;
            }
        });

        renderCandidates(filteredCandidates);
        updatePagination();
    }

    // Отображение кандидатов
    function renderCandidates(candidates) {
        const peopleList = document.getElementById('people-list');
        
        if (candidates.length === 0) {
            peopleList.innerHTML = `
                <div class="no-results">
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
                </div>
            `;
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageCandidates = candidates.slice(startIndex, endIndex);

        peopleList.innerHTML = pageCandidates.map(candidate => `
            <div class="person-card" data-id="${candidate.id}">
                <div class="person-header">
                    <div class="person-avatar">
                        <img src="${candidate.photo}" alt="Аватар ${candidate.name}" onerror="this.src='https://via.placeholder.com/60'">
                    </div>
                    <div class="person-info">
                        <h3 class="person-name">${escapeHtml(candidate.name)}</h3>
                        <div class="person-title">${escapeHtml(candidate.title)}</div>
                        <div class="person-level">
                            <span class="level-badge ${getLevelClass(candidate.level)}">${escapeHtml(candidate.level)}</span>
                            <span class="exp-badge">Опыт: ${escapeHtml(candidate.experience)}</span>
                        </div>
                    </div>
                    <div class="person-salary">
                        <span class="salary-amount">${escapeHtml(candidate.salary)}</span>
                    </div>
                </div>
                
                <div class="person-skills">
                    <h4>Ключевые навыки:</h4>
                    <div class="skills-list">
                        ${candidate.skills.slice(0, 5).map(skill => 
                            `<span class="skill-tag ${candidate.skills.indexOf(skill) < 3 ? 'main' : ''}">${escapeHtml(skill)}</span>`
                        ).join('')}
                        ${candidate.skills.length > 5 ? `<span class="skill-tag">+${candidate.skills.length - 5}</span>` : ''}
                    </div>
                </div>
                
                <div class="person-details">
                    <div class="detail-item">
                        <span class="detail-label">📍</span>
                        <span class="detail-text">${escapeHtml(candidate.city)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">💼</span>
                        <span class="detail-text">${escapeHtml(candidate.jobType)}</span>
                    </div>
                    ${candidate.education ? `
                    <div class="detail-item">
                        <span class="detail-label">🎓</span>
                        <span class="detail-text">${escapeHtml(candidate.education)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <span class="detail-label">👤</span>
                        <span class="detail-text">${escapeHtml(candidate.gender)}, ${escapeHtml(candidate.age)} лет</span>
                    </div>
                    ${candidate.telegram && candidate.telegram !== 'Не указан' ? `
                    <div class="detail-item">
                        <span class="detail-label">📱</span>
                        <span class="detail-text">Telegram: ${escapeHtml(candidate.telegram)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="person-description">
                    <p>${escapeHtml(candidate.description)}</p>
                </div>
                <div class="person-actions">

                </div>
            </div>
        `).join('');

        updateResultsCount(candidates.length);
    }

    // Сброс фильтров
    function resetFilters() {
        document.getElementById('search-name').value = '';
        document.getElementById('filter-specialty').value = '';
        document.getElementById('filter-level').value = '';
        document.getElementById('filter-salary').value = '';
        document.getElementById('filter-skills').value = '';
        document.getElementById('filter-city').value = '';
        document.getElementById('filter-format').value = '';
        
        currentPage = 1;
        applyFilters();
    }

    // Пагинация
    function changePage(direction) {
        const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
        
        if (direction === 1 && currentPage < totalPages) {
            currentPage++;
        } else if (direction === -1 && currentPage > 1) {
            currentPage--;
        } else if (typeof direction === 'number') {
            currentPage = direction;
        }
        
        renderCandidates(filteredCandidates);
        updatePagination();
    }

    // Обновление пагинации
    function updatePagination() {
        const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
        const paginationElement = document.querySelector('.pagination');
        
        if (totalPages <= 1) {
            paginationElement.innerHTML = '';
            return;
        }

        let pageNumbers = '';
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers += `
                    <span class="page-number ${i === currentPage ? 'page-active' : ''}" 
                          onclick="changePage(${i})">${i}</span>
                `;
            }
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                pageNumbers += '<span class="page-number" onclick="changePage(1)">1</span>';
                if (startPage > 2) pageNumbers += '<span class="page-dots">...</span>';
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers += `
                    <span class="page-number ${i === currentPage ? 'page-active' : ''}" 
                          onclick="changePage(${i})">${i}</span>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pageNumbers += '<span class="page-dots">...</span>';
                pageNumbers += `<span class="page-number" onclick="changePage(${totalPages})">${totalPages}</span>`;
            }
        }

        paginationElement.innerHTML = `
            <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>← Назад</button>
            <span class="page-numbers">${pageNumbers}</span>
            <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Вперёд →</button>
        `;
    }

    // Обновление счетчика результатов
    function updateResultsCount(count) {
        document.getElementById('results-count').textContent = count;
    }

    // Вспомогательные функции
    function getTitleFromJob(job) {
        const jobTitles = {
            'frontend': 'Frontend Developer',
            'backend': 'Backend Developer',
            'fullstack': 'Fullstack Developer',
            'mobile': 'Mobile Developer',
            'designer': 'UX/UI Designer',
            'analyst': 'Data Analyst',
            'devops': 'DevOps Engineer',
            'qa': 'QA Engineer',
            'manager': 'Project Manager',
            'marketing': 'Marketing Specialist'
        };
        
        return jobTitles[job.toLowerCase()] || job;
    }

    function getLevelFromExperience(experience) {
        if (!experience) return 'Не указан';
        
        if (experience.includes('опыт') || experience.includes('год')) {
            if (experience.includes('1') || experience.includes('младш')) return 'Junior';
            if (experience.includes('3') || experience.includes('средн')) return 'Middle';
            if (experience.includes('5') || experience.includes('старш')) return 'Senior';
        }
        
        return experience;
    }

    function getExperienceFromAge(age) {
        const ageNum = parseInt(age) || 25;
        const experience = Math.max(0, ageNum - 22);
        return `${experience} ${getRussianYears(experience)}`;
    }

    function getRussianYears(number) {
        if (number % 10 === 1 && number % 100 !== 11) return 'год';
        if ([2,3,4].includes(number % 10) && ![12,13,14].includes(number % 100)) return 'года';
        return 'лет';
    }

    function formatSalary(salary) {
        return parseInt(salary).toLocaleString('ru-RU');
    }

    function extractSalary(salaryString) {
        const match = salaryString.match(/\d+/g);
        return match ? parseInt(match.join('')) : 0;
    }

    function getJobTypeFromFormat(jobtype) {
        const formatMap = {
            'полный день': 'Офис',
            'удаленная работа': 'Удалённо',
            'гибридный график': 'Гибридный',
            'фриланс': 'Удалённо'
        };
        
        return formatMap[jobtype] || jobtype || 'Не указан';
    }

    function getLevelClass(level) {
        const levelStr = level.toLowerCase();
        if (levelStr.includes('senior') || levelStr.includes('старш')) return 'senior';
        if (levelStr.includes('middle') || levelStr.includes('средн')) return 'middle';
        if (levelStr.includes('junior') || levelStr.includes('младш')) return 'junior';
        if (levelStr.includes('intern') || levelStr.includes('стажёр')) return 'intern';
        if (levelStr.includes('lead') || levelStr.includes('руковод')) return 'lead';
        return '';
    }

    function getExperienceValue(experience) {
        const match = experience.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading() {
        document.getElementById('people-list').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка кандидатов...</p>
            </div>
        `;
    }

    function hideLoading() {
        // Удаляем спиннер если есть
        const loading = document.querySelector('.loading');
        if (loading) loading.remove();
    }

    function showError(message) {
        const peopleList = document.getElementById('people-list');
        peopleList.innerHTML = `
            <div class="error-message">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="loadCandidates()" class="btn-primary">Повторить попытку</button>
            </div>
        `;
    }

    // Обработчики действий
    function viewProfile(id) {
        window.location.href = `../profile/profile.html?id=${id}`;
    }

    async function sendInvite(jobTitle, telegramUsername) {
     // Формируем ссылку на Telegram
    let telegramLink;
    
    // Убираем @ если есть в начале
    const cleanUsername = telegramUsername.replace(/^@/, '');
    
    // Формируем ссылку для открытия чата в Telegram
    telegramLink = `https://t.me/${cleanUsername}`;
    
    // Показываем уведомление
    notify(`Вы откликаетесь на объявление "${jobTitle}". Открываю Telegram...`, 'success');
    
    // Открываем ссылку в новой вкладке
    setTimeout(() => {
        window.open(telegramLink, '_blank');
    }, 500);
    
    return false;
    }

    async function loadUserVacancies() {
        try {
            // Здесь нужно загрузить вакансии пользователя
            // Пока используем заглушку
            const vacancies = [
                { id: 1, title: 'Frontend Developer (React)' },
                { id: 2, title: 'Backend Developer (Python)' },
                { id: 3, title: 'UX/UI Designer' }
            ];
            
            const select = document.getElementById('vacancy-select');
            select.innerHTML = '<option value="">Выберите объявление...</option>' +
                vacancies.map(v => `<option value="${v.id}">${v.title}</option>`).join('');
                
        } catch (error) {
            console.error('Ошибка загрузки вакансий:', error);
        }
    }

    async function sendInvitation() {
        const vacancy = document.getElementById('vacancy-select').value;
        const message = document.getElementById('invite-message').value;
        
        if (!vacancy) {
            alert('Выберите объявление!');
            return;
        }
        
        try {
            // Здесь нужно отправить приглашение на сервер
            const response = await fetch(`${API_BASE_URL}/invitations/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    candidateId: currentCandidateId,
                    vacancyId: vacancy,
                    message: message
                }),
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Приглашение успешно отправлено!');
                closeModal();
            } else {
                alert('Ошибка при отправке приглашения');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось отправить приглашение');
        }
    }

    function closeModal() {
        document.getElementById('invite-modal').classList.add('hidden');
        currentCandidateId = null;
        document.getElementById('vacancy-select').value = '';
        document.getElementById('invite-message').value = '';
    }

    // Закрытие модального окна при клике вне его
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('invite-modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    async function logout() {
        try {
            await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error("Logout failed:", e);
        }
        location.href = "../index.html";
    }

    // Стили для загрузки и ошибок
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            text-align: center;
            padding: 40px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .no-results, .error-message {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error-message h3 {
            color: #dc3545;
        }
        
        .btn-outline {
            background-color: transparent;
            color: #667eea;
            border: 2px solid #667eea;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .btn-outline:hover {
            background-color: #667eea;
            color: white;
        }
    `;
    document.head.appendChild(style);
