

// Базовый URL для API запросов
const API_BASE_URL = "http://185.96.80.7:8080";

// Получение элементов
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const loginPasswordToggle = document.getElementById('login-password-toggle');
const registerPasswordToggle = document.getElementById('register-password-toggle');

// Функция активации формы входа
function activateLoginForm() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
}

// Функция активации формы регистрации
function activateRegisterForm() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
}

// Переключение на вкладку входа
loginTab.addEventListener('click', activateLoginForm);
switchToLogin.addEventListener('click', function(e) {
    e.preventDefault();
    activateLoginForm();
});

// Переключение на вкладку регистрации
registerTab.addEventListener('click', activateRegisterForm);
switchToRegister.addEventListener('click', function(e) {
    e.preventDefault();
    activateRegisterForm();
});

// Функция переключения видимости пароля
function togglePasswordVisibility(inputId, toggleButton) {
    const passwordInput = document.getElementById(inputId);
    const icon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Обработчики для переключения видимости пароля
loginPasswordToggle.addEventListener('click', function() {
    togglePasswordVisibility('login-password', this);
});

registerPasswordToggle.addEventListener('click', function() {
    togglePasswordVisibility('register-password', this);
});

// Функция для отображения сообщений
function showMessage(element, message, isError = false) {
    // Удаляем старые сообщения
    const oldMessages = element.querySelectorAll('.error-message, .success-message');
    oldMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = isError ? 'error-message' : 'success-message';
    
    const icon = document.createElement('i');
    icon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
    
    messageDiv.appendChild(icon);
    messageDiv.appendChild(document.createTextNode(message));
    
    // Вставить после заголовка формы
    const formTitle = element.querySelector('.form-title');
    if (formTitle) {
        formTitle.parentNode.insertBefore(messageDiv, formTitle.nextElementSibling);
    } else {
        element.prepend(messageDiv);
    }
    
    // Автоматическое удаление через 5 секунд (кроме ошибок)
    if (!isError) {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Функция для обработки логина
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage(loginForm, 'Пожалуйста, заполните все поля', true);
        return;
    }
    
    try {
        // Создаем URLSearchParams вместо FormData
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            credentials: 'include' // Важно для отправки и получения cookies
        });
        
        const responseText = await response.text();
        
        if (response.ok) {
            showMessage(loginForm, 'Вход выполнен успешно! Перенаправление...');
            
            // Очищаем поля формы
            loginForm.reset();
            
            // Перенаправление на главную страницу через 1 секунду
            setTimeout(() => {
                window.location.href = '../main/main.html';
            }, 1000);
            
        } else {
            console.error('Login error response:', responseText);
            showMessage(loginForm, `Ошибка входа: ${responseText}`, true);
        }
    } catch (error) {
        console.error('Login network error:', error);
        showMessage(loginForm, 'Ошибка соединения с сервером', true);
    }
}

// Функция для обработки регистрации
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const nickname = document.getElementById('register-nickname').value.trim();
    
    if (!username || !password || !nickname) {
        showMessage(registerForm, 'Пожалуйста, заполните все поля', true);
        return;
    }
    
    // Проверяем, является ли nickname email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(nickname);
    
    if (!isEmail) {
        showMessage(registerForm, 'Пожалуйста, введите корректный email в поле "Никнейм"', true);
        return;
    }
    
    try {
        // Создаем URLSearchParams вместо FormData
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('usermail', nickname); // Важно: используем usermail как в Go коде
        params.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/singin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            credentials: 'include' // Важно для cookies
        });
        
        const responseText = await response.text();
        
        if (response.status === 201) {
            showMessage(registerForm, 'Регистрация успешна! Теперь вы можете войти.');
            
            // Автоматически заполняем форму входа
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = password;
            
            // Переключаемся на форму входа
            setTimeout(() => {
                activateLoginForm();
            }, 2000);
            
            // Очищаем поля формы регистрации
            registerForm.reset();
        } else {
            console.error('Registration error response:', responseText);
            showMessage(registerForm, `Ошибка регистрации: ${responseText}`, true);
        }
    } catch (error) {
        console.error('Registration network error:', error);
        showMessage(registerForm, 'Ошибка соединения с сервером', true);
    }
}

// Функция проверки авторизации
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/checkauth`, {
            method: 'GET',
            credentials: 'include' // Важно для отправки cookies
        });
        
        if (response.ok) {
            const data = await response.json();
            return { isAuthenticated: data.is_authenticated, username: data.username };
        } else {
            // 401 (Unauthorized) - это нормально, пользователь не авторизован
            return { isAuthenticated: false, username: null };
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return { isAuthenticated: false, username: null };
    }
}


// Функция обновления состояния авторизации в интерфейсе (исправленная)
async function updateAuthState() {
    // Проверяем, был ли это принудительный выход
    const urlParams = new URLSearchParams(window.location.search);
    const isLogout = urlParams.has('logout');
    
    if (isLogout) {
        // Если это страница после выхода, НЕ проверяем авторизацию
        console.log('Страница загружена после выхода, пропускаем проверку авторизации');
        return;
    }
    
    const authState = await checkAuth();
    
    // Если пользователь уже авторизован, перенаправляем на главную
    if (authState.isAuthenticated) {
        console.log('Пользователь уже авторизован, перенаправляем на главную...');
        setTimeout(() => {
            window.location.href = '../main/main.html';
        }, 500);
    }
}

// Обработка отправки формы входа
loginForm.addEventListener('submit', handleLogin);

// Обработка отправки формы регистрации
registerForm.addEventListener('submit', handleRegister);

// Автоматическая проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию - если уже авторизован, перенаправляем
    await updateAuthState();
    
    // Фокус на поле логина при загрузке
    if (loginForm.classList.contains('active')) {
        document.getElementById('login-username').focus();
    }
    
    // Добавляем стили для сообщений
    if (!document.querySelector('#message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            .error-message {
                background-color: #ffebee;
                border-radius: 8px;
                padding: 12px 15px;
                margin: 15px 0;
                font-size: 0.9rem;
                color: #c62828;
                display: flex;
                align-items: center;
                border: 1px solid #ffcdd2;
                animation: fadeIn 0.3s ease;
            }
            
            .error-message i {
                margin-right: 10px;
                font-size: 1.1rem;
            }
            
            .success-message {
                background-color: #e8f4ff;
                border-radius: 8px;
                padding: 12px 15px;
                margin: 15px 0;
                font-size: 0.9rem;
                color: #2575fc;
                display: flex;
                align-items: center;
                border: 1px solid #bbdefb;
                animation: fadeIn 0.3s ease;
            }
            
            .success-message i {
                margin-right: 10px;
                font-size: 1.1rem;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
});

// Проверка доступности API при загрузке
document.addEventListener('DOMContentLoaded', function() {
    fetch(`${API_BASE_URL}/checkauth`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('API доступен, статус:', response.status);
    })
    .catch(error => {
        console.error('API недоступен:', error);
    });
});
