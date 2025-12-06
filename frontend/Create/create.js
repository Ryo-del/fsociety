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

// 2. ЛОГИКА СОЗДАНИЯ ОБЪЯВЛЕНИЙ
// -----------------------------------------------------------

// Функция создания объявления
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
        
        console.log('Отправляемые данные:', Object.fromEntries(formData)); // Для отладки
        
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
            return { success: false, error: 'Вы уже создали объявление. Удалите существующую, чтобы создать новую.' };
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
    
    // Собираем данные формы - ВАЖНО: используем правильные имена полей
    const jobData = {
        title: form.querySelector('[name="title"]').value,
        company: form.querySelector('[name="company"]').value,
        description: form.querySelector('[name="description"]').value,
        salary: form.querySelector('[name="salary"]').value,
        skills: form.querySelector('[name="skills"]').value,
        // Собираем дополнительные поля, которые есть в HTML
        location: form.querySelector('[name="location"]').value,
        experience: form.querySelector('[name="experience"]').value,
        job_type: form.querySelector('[name="job_type"]').value,
        // Используем правильное имя поля из HTML
        telegram: form.querySelector('[name="telegram"]').value,
    };
    
    // Валидация обязательных полей
    const requiredFields = ['title', 'company', 'description', 'salary', 'skills', 'telegram'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!jobData[field] || jobData[field].trim() === '') {
            missingFields.push(field);
        }
    });
    
    if (missingFields.length > 0) {
        messageElement.textContent = `Пожалуйста, заполните все обязательные поля: ${missingFields.join(', ')}`;
        messageElement.className = 'form-message error';
        return;
    }
    
    // Проверка формата Telegram (опционально, можно добавить валидацию)
    if (jobData.telegram) {
        // Убираем @ в начале, если есть
        jobData.telegram = jobData.telegram.replace(/^@/, '');
        
        // Проверяем, что это допустимый username Telegram
        const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
        if (!telegramRegex.test(jobData.telegram)) {
            messageElement.textContent = 'Некорректный формат Telegram username. Используйте только буквы, цифры и подчеркивания (5-32 символа)';
            messageElement.className = 'form-message error';
            return;
        }
    }
    
    // Показываем загрузку
    messageElement.textContent = 'Создание объявления...';
    messageElement.className = 'form-message info';
    
    // Отправляем запрос
    const result = await createJob(jobData);
    
    if (result.success) {
        messageElement.textContent = 'Объявление успешно создано!';
        messageElement.className = 'form-message success';
        
        // Очищаем форму
        form.reset();
        
        // Предлагаем перейти к просмотру объявлений
        setTimeout(() => {
            if (confirm('Объявление создано! Хотите перейти к списку ваших объявлений?')) {
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
        
        // Добавляем обработчик для автоматического добавления @ в поле Telegram (опционально)
        const telegramInput = form.querySelector('[name="telegram"]');
        if (telegramInput) {
            telegramInput.addEventListener('input', function(e) {
                // Автоматически добавляем @ в начале, если его нет
                let value = e.target.value;
                if (value && !value.startsWith('@') && !value.includes(' ')) {
                    e.target.value = '@' + value;
                }
            });
        }
    }
});