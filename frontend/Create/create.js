// Базовый URL API
const API_BASE_URL = window.location.origin;

// 1. АВТОРИЗАЦИЯ И УВЕДОМЛЕНИЯ (СКОПИРОВАНО ИЗ MYJOB.JS)
// -----------------------------------------------------------

// Уведомления
function notify(text, type = "info") {
    const box = document.createElement("div");
    box.className = `notification ${type}`;
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(() => box.classList.add("show"), 10);
    setTimeout(() => box.remove(), 3500);
}

// Авторизация
async function initPage() {
    try {
        const res = await fetch(`${API_BASE_URL}/checkauth`, { credentials: "include" });
        if (!res.ok) {
            location.href = "../auth/login.html";
            return false;
        }

        const user = await res.json();
        // Устанавливаем имя пользователя, если элемент существует (в create.html он есть)
        const welcomeMessage = document.getElementById("welcome-message");
        if (welcomeMessage) {
            welcomeMessage.textContent = user.name || user.username || "Пользователь";
        }

        return true;
    } catch {
        location.href = "../auth/login.html";
        return false;
    }
}

// 2. ЛОГИКА СОЗДАНИЯ ВАКАНСИИ
// -----------------------------------------------------------

// Функция создания вакансии
async function createJob(jobData) {
    // Используем /createjob, как определено в main.go
    const CREATE_URL = `${API_BASE_URL}/createjob`; 
    
    try {
        const formData = new URLSearchParams();
        Object.keys(jobData).forEach(key => {
            // Исключаем пустые поля, чтобы не засорять FormValue на бэкенде,
            // кроме тех, что обязательны и проверены ранее.
            if (jobData[key]) {
                formData.append(key, jobData[key]);
            }
        });
        
        const response = await fetch(CREATE_URL, {
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
            // Используем response.statusText как запасной вариант, если нет тела ошибки
            return { success: false, error: errorText || response.statusText }; 
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
    // Используем querySelector для поиска элемента внутри формы
    const messageElement = form.querySelector('.form-message'); 
    
    // Собираем данные формы
    const jobData = {
        title: form.querySelector('[name="title"]').value,
        company: form.querySelector('[name="company"]').value,
        description: form.querySelector('[name="description"]').value,
        salary: form.querySelector('[name="salary"]').value,
        skills: form.querySelector('[name="skills"]').value,
        // Собираем дополнительные поля, которые есть в HTML
        location: form.querySelector('[name="location"]').value,
        experience: form.querySelector('[name="experience"]').value,
        job_type: form.querySelector('[name="job_type"]').value
        // School здесь не используется, но можно добавить, если нужно:
        // school: form.querySelector('[name="school"]').value,
    };
    
    // Валидация обязательных полей (должна быть в HTML, но проверяем и здесь)
    if (!jobData.title || !jobData.description || !jobData.company || !jobData.salary || !jobData.skills) {
        messageElement.textContent = 'Пожалуйста, заполните все обязательные поля';
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
            // Меняем адрес на ../myjob/myjob.html для корректного перехода
            if (confirm('Вакансия создана! Хотите перейти к списку ваших вакансий?')) {
                window.location.href = '../myjob/myjob.html';
            }
        }, 1000);
    } else {
        messageElement.textContent = `Ошибка: ${result.error}`;
        messageElement.className = 'form-message error';
    }
}

// 3. ИНИЦИАЛИЗАЦИЯ
// -----------------------------------------------------------

// Инициализация страницы create.html
document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
    
    // Назначаем обработчик формы
    const form = document.getElementById('create-job-form');
    if (form) {
        form.addEventListener('submit', handleCreateJobSubmit);
        
        // Автофокус на первое поле
        const titleInput = form.querySelector('[name="title"]');
        if (titleInput) {
            titleInput.focus();
        }
    }
});