// Функция загрузки вакансий пользователя
async function loadMyJobs() {
    try {
        const response = await fetch(`${API_BASE_URL}/myjob`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const jobs = await response.json();
        renderMyJobs(jobs);
        updateMyJobCount(jobs.length);
    } catch (error) {
        console.error('Error loading my jobs:', error);
        showMessage(document.getElementById('my-jobs-container'), 'Ошибка загрузки ваших вакансий', true);
    }
}

// Функция отображения вакансий пользователя
function renderMyJobs(jobs) {
    const jobsList = document.getElementById('my-jobs-list');
    jobsList.innerHTML = '';
    
    if (jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="no-jobs">
                <p>У вас еще нет созданных вакансий</p>
                <button onclick="location.href='create.html'">Создать вакансию</button>
            </div>
        `;
        return;
    }
    
    jobs.forEach(job => {
        const jobCard = createMyJobCard(job);
        jobsList.appendChild(jobCard);
    });
}

// Функция создания карточки вакансии пользователя
function createMyJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.id = job.id;
    
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
        <div class="job-actions">
            <button class="primary edit-job" data-id="${job.id}">Редактировать</button>
            <button class="danger delete-job" data-id="${job.id}">Удалить</button>
        </div>
    `;
    
    return jobCard;
}

// Функция обновления счетчика вакансий
function updateMyJobCount(count) {
    const messageElement = document.querySelector('.form-message');
    if (messageElement) {
        if (count > 0) {
            messageElement.textContent = `У вас ${count} активн${count === 1 ? 'ая' : 'ых'} ваканси${count === 1 ? 'я' : 'й'}`;
            messageElement.className = 'form-message success';
        } else {
            messageElement.textContent = 'У вас нет активных вакансий';
            messageElement.className = 'form-message info';
        }
    }
}

// Функция удаления вакансии
async function deleteJob(jobId) {
    if (!confirm('Вы уверены, что хотите удалить эту вакансию?')) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/job/${jobId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.status === 204) {
            return { success: true };
        } else if (response.status === 403) {
            return { success: false, error: 'Вы не можете удалить чужую вакансию' };
        } else {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

// Функция редактирования вакансии
function editJob(jobId) {
    // Можно реализовать редактирование через модальное окно
    // или перенаправление на отдельную страницу редактирования
    alert(`Редактирование вакансии ${jobId}. Эта функция в разработке.`);
    
    // Пример реализации:
    // window.location.href = `edit.html?id=${jobId}`;
}

// Обработчик кликов по действиям с вакансиями
function handleJobActions(e) {
    const target = e.target;
    const jobId = target.dataset.id;
    
    if (!jobId) return;
    
    if (target.classList.contains('delete-job')) {
        e.preventDefault();
        deleteJob(jobId).then(result => {
            if (result.success) {
                // Удаляем карточку из DOM
                const jobCard = target.closest('.job-card');
                if (jobCard) {
                    jobCard.remove();
                    // Обновляем счетчик
                    const remainingJobs = document.querySelectorAll('.job-card').length;
                    updateMyJobCount(remainingJobs);
                }
            } else {
                alert(`Ошибка при удалении: ${result.error}`);
            }
        });
    } else if (target.classList.contains('edit-job')) {
        e.preventDefault();
        editJob(jobId);
    }
}

// Инициализация страницы myjob.html
document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
    
    // Загружаем вакансии пользователя
    await loadMyJobs();
    
    // Назначаем делегированный обработчик для действий с вакансиями
    const jobsList = document.getElementById('my-jobs-list');
    if (jobsList) {
        jobsList.addEventListener('click', handleJobActions);
    }
});