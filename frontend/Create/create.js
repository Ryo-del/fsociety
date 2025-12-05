// Функция создания вакансии
async function createJob(jobData) {
    try {
        const formData = new URLSearchParams();
        Object.keys(jobData).forEach(key => {
            formData.append(key, jobData[key]);
        });
        
        const response = await fetch(`${API_BASE_URL}/job`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            credentials: 'include'
        });
        
        if (response.status === 201) {
            const createdJob = await response.json();
            return { success: true, job: createdJob };
        } else if (response.status === 409) {
            return { success: false, error: 'Вы уже создали вакансию. Удалите существующую, чтобы создать новую.' };
        } else {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('Error creating job:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

// Обработчик отправки формы
async function handleCreateJobSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('create-job-form');
    const messageElement = form.querySelector('.form-message');
    
    // Собираем данные формы
    const jobData = {
        title: form.querySelector('[name="title"]').value,
        company: form.querySelector('[name="company"]').value,
        school: form.querySelector('[name="school"]').value,
        description: form.querySelector('[name="description"]').value,
        salary: form.querySelector('[name="salary"]').value,
        skills: form.querySelector('[name="skills"]').value,
        location: form.querySelector('[name="location"]').value,
        experience: form.querySelector('[name="experience"]').value,
        job_type: form.querySelector('[name="job_type"]').value
    };
    
    // Валидация обязательных полей
    if (!jobData.title || !jobData.description) {
        messageElement.textContent = 'Пожалуйста, заполните название и описание вакансии';
        messageElement.className = 'form-message error';
        return;
    }
    
    // Показываем загрузку
    messageElement.textContent = 'Создание вакансии...';
    messageElement.className = 'form-message info';
    
    // Отправляем запрос
    const result = await createJob(jobData);
    
    if (result.success) {
        messageElement.textContent = 'Вакансия успешно создана!';
        messageElement.className = 'form-message success';
        
        // Очищаем форму
        form.reset();
        
        // Предлагаем перейти к просмотру вакансий
        setTimeout(() => {
            if (confirm('Вакансия создана! Хотите перейти к списку ваших вакансий?')) {
                window.location.href = 'myjob.html';
            }
        }, 1000);
    } else {
        messageElement.textContent = `Ошибка: ${result.error}`;
        messageElement.className = 'form-message error';
    }
}

// Инициализация страницы create.html
document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
    
    // Назначаем обработчик формы
    const form = document.getElementById('create-job-form');
    form.addEventListener('submit', handleCreateJobSubmit);
    
    // Автофокус на первое поле
    form.querySelector('[name="title"]').focus();
});