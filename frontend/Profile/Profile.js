
    // Простые функции для навигации
    function logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            window.location.href = '..index.html';
        }
    }
    
    function goToProfile() {
        window.location.href = 'profile.html';
    }
    
    // Показываем приветственное сообщение если есть пользователь
    window.onload = function() {
        const welcomeMessage = document.getElementById('welcome-message');
        // Заглушка - в реальном приложении здесь будет имя из localStorage или API
        const userName = localStorage.getItem('userName') || 'octocat';
        if (userName) {
            welcomeMessage.textContent = `👤 ${userName}`;
            welcomeMessage.style.display = 'inline';
        }
        
        // Загружаем данные анкеты пользователя
        loadUserProfile();
    };
    
    // Функция для загрузки профиля пользователя
    async function loadUserProfile() {
        try {
            const response = await fetch('/api/show-ankety', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Важно для отправки cookies с токеном
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки профиля');
            }
            
            const allAnkety = await response.json();
            
            // Получаем ID текущего пользователя (из токена или другого источника)
            // В реальном приложении нужно получить ID текущего пользователя
            const currentUserId = getCurrentUserId(); // Нужно реализовать эту функцию
            
            // Ищем анкету текущего пользователя
            const userAnkety = allAnkety.find(anketa => anketa.user_id === currentUserId);
            
            if (userAnkety) {
                // Заполняем поля профиля данными из анкеты
                document.querySelector('.profile-name').textContent = userAnkety.name;
                document.querySelector('.profile-bio p').textContent = `Возраст: ${userAnkety.age}, Пол: ${userAnkety.gender}, Работа: ${userAnkety.job}, Образование: ${userAnkety.school}`;
                
                // Сохраняем ID анкеты для последующего редактирования
                document.querySelector('.profile-card').dataset.anketaId = userAnkety.id;
                
                // Меняем текст кнопки на "Редактировать профиль"
                const editButton = document.querySelector('.toggle-btn');
                editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
                editButton.onclick = editProfile;
            } else {
                // Если анкеты нет, меняем кнопку на "Создать анкету"
                const editButton = document.querySelector('.toggle-btn');
                editButton.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
                editButton.onclick = createProfile;
            }
            
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            // Показываем сообщение об ошибке
            showMessage('Не удалось загрузить профиль. Пожалуйста, попробуйте позже.', 'error');
        }
    }
    
    // Функция для получения ID текущего пользователя
    // В реальном приложении нужно получить это из токена или другого источника
    function getCurrentUserId() {
        // Заглушка - в реальном приложении нужно декодировать JWT токен
        // или получить ID из localStorage/sessionStorage
        return localStorage.getItem('userId') || '';
    }
    
    // Функция для редактирования профиля
    function editProfile() {
        const profileCard = document.querySelector('.profile-card');
        const anketaId = profileCard.dataset.anketaId;
        
        if (!anketaId) {
            showMessage('ID анкеты не найден', 'error');
            return;
        }
        
        // Запрашиваем новые данные у пользователя
        const currentName = document.querySelector('.profile-name').textContent;
        const currentBio = document.querySelector('.profile-bio p').textContent;
        
        // Парсим текущие данные из биографии
        const bioParts = currentBio.split(', ');
        const age = bioParts[0].replace('Возраст: ', '');
        const gender = bioParts[1].replace('Пол: ', '');
        const job = bioParts[2].replace('Работа: ', '');
        const school = bioParts[3].replace('Образование: ', '');
        
        // Запрашиваем новые данные
        const newName = prompt('Введите ваше имя:', currentName);
        if (newName === null) return; // Пользователь отменил
        
        const newAge = prompt('Введите ваш возраст:', age);
        if (newAge === null) return;
        
        const newGender = prompt('Введите ваш пол (мужской/женский):', gender);
        if (newGender === null) return;
        
        const newJob = prompt('Введите вашу работу:', job);
        if (newJob === null) return;
        
        const newSchool = prompt('Введите ваше образование:', school);
        if (newSchool === null) return;
        
        // Отправляем запрос на обновление анкеты
        updateAnketa(anketaId, newName, newGender, newAge, newJob, newSchool);
    }
    
    // Функция для создания новой анкеты
    function createProfile() {
        const name = prompt('Введите ваше имя:');
        if (!name) return;
        
        const age = prompt('Введите ваш возраст:');
        if (!age) return;
        
        const gender = prompt('Введите ваш пол (мужской/женский):');
        if (!gender) return;
        
        const job = prompt('Введите вашу работу:');
        if (!job) return;
        
        const school = prompt('Введите ваше образование:');
        if (!school) return;
        
        // Отправляем запрос на создание анкеты
        createNewAnketa(name, gender, age, job, school);
    }
    
    // Функция для обновления анкеты
    async function updateAnketa(anketaId, name, gender, age, job, school) {
        try {
            const response = await fetch('/api/update-ankety', {
                method: 'PUT', // или POST, в зависимости от вашего бэкенда
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'id': anketaId,
                    'name': name,
                    'gender': gender,
                    'age': age,
                    'job': job,
                    'school': school
                }),
                credentials: 'include'
            });
            
            if (response.ok) {
                showMessage('Профиль успешно обновлен!', 'success');
                // Обновляем данные на странице
                document.querySelector('.profile-name').textContent = name;
                document.querySelector('.profile-bio p').textContent = `Возраст: ${age}, Пол: ${gender}, Работа: ${job}, Образование: ${school}`;
            } else {
                throw new Error('Ошибка обновления профиля');
            }
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            showMessage('Не удалось обновить профиль. Пожалуйста, попробуйте позже.', 'error');
        }
    }
    
    // Функция для создания новой анкеты
    async function createNewAnketa(name, gender, age, job, school) {
        try {
            const response = await fetch('/api/create-ankety', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'name': name,
                    'gender': gender,
                    'age': age,
                    'job': job,
                    'school': school
                }),
                credentials: 'include'
            });
            
            if (response.ok) {
                showMessage('Анкета успешно создана!', 'success');
                // Перезагружаем профиль
                loadUserProfile();
            } else {
                throw new Error('Ошибка создания анкеты');
            }
        } catch (error) {
            console.error('Ошибка создания анкеты:', error);
            showMessage('Не удалось создать анкету. Пожалуйста, попробуйте позже.', 'error');
        }
    }
    
    // Функция для показа сообщений
    function showMessage(message, type = 'info') {
        // Удаляем предыдущие сообщения
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Создаем новое сообщение
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message ${type}`;
        messageDiv.textContent = message;
        
        // Вставляем сообщение перед профилем
        const profileCard = document.querySelector('.profile-card');
        profileCard.parentNode.insertBefore(messageDiv, profileCard);
        
        // Автоматически скрываем сообщение через 5 секунд
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
