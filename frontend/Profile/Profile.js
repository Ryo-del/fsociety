// Глобальные переменные
let currentAnketa = null;
let photoFile = null;
let defaultAvatar = "https://avatars.githubusercontent.com/u/583231?v=4";

// Обработка ошибок CORS
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('CORS')) {
        console.error('CORS ошибка:', event.message);
        showMessage('Проблема с подключением к серверу. Проверьте консоль браузера.', 'error');
    }
});

// Проверка доступности API
async function checkApiAvailability() {
    try {
        const response = await fetch('/api/show-ankety', {
            method: 'GET',
            credentials: 'include'
        });
        return response.ok;
    } catch (error) {
        console.error('API недоступно:', error);
        return false;
    }
}

// Простые функции для навигации
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userProfile');
        window.location.href = '../index.html';
    }
}

function goToProfile() {
    window.location.href = 'profile.html';
}

// Проверка авторизации
async function checkAuthBeforeLoad() {
    try {
        console.log('Проверка авторизации...');
        const response = await fetch('/checkauth', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('Статус проверки авторизации:', response.status);
        
        if (!response.ok) {
            console.warn('Пользователь не авторизован');
            return null;
        }
        
        const userData = await response.json();
        console.log('Авторизованный пользователь:', userData);
        return userData;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return null;
    }
}

// Показываем приветственное сообщение если есть пользователь
window.onload = async function() {
    console.log('Страница профиля загружается...');
    
    const welcomeMessage = document.getElementById('welcome-message');
    const userName = localStorage.getItem('userName') || 'octocat';
    if (userName) {
        welcomeMessage.textContent = `👤 ${userName}`;
        welcomeMessage.style.display = 'inline';
    }
    
    // Проверяем доступность API
    const apiAvailable = await checkApiAvailability();
    if (!apiAvailable) {
        console.warn('API недоступно. Используем локальное хранилище.');
        showMessage('Сервер временно недоступен. Работаем в локальном режиме.', 'warning');
    }
    
    // Загружаем данные анкеты пользователя
    await loadUserProfile();
    
    // Назначаем обработчики
    document.getElementById('profile-edit-button').onclick = openProfileModal;
    document.getElementById('profile-edit-form').onsubmit = handleProfileSubmit;
    document.getElementById('photo-upload-area').onclick = () => document.getElementById('photo-input').click();
    document.getElementById('photo-input').onchange = handlePhotoSelect;
    document.getElementById('delete-photo-btn').onclick = deleteCurrentPhoto;
    
    // Обработка перетаскивания файлов
    setupDragAndDrop();
};

// Настройка drag & drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('photo-upload-area');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '#e9ecef';
        this.style.borderColor = '#4b6cb7';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '#f8f9fa';
        this.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '#f8f9fa';
        this.style.borderColor = '#667eea';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handlePhotoFile(files[0]);
        }
    });
}

// Сохранение профиля в localStorage
function saveProfileToLocalStorage(data) {
    localStorage.setItem('userProfile', JSON.stringify(data));
}

// Загрузка профиля из localStorage
function loadProfileFromLocalStorage() {
    const savedProfile = localStorage.getItem('userProfile');
    return savedProfile ? JSON.parse(savedProfile) : null;
}

// Функция для загрузки профиля пользователя
async function loadUserProfile() {
    try {
        console.log('Загрузка профиля...');
        
        // Сначала проверяем авторизацию
        const authUser = await checkAuthBeforeLoad();
        if (!authUser) {
            console.log('Пользователь не авторизован, проверяем локальное хранилище');
            
            // Пробуем загрузить из localStorage
            const savedProfile = loadProfileFromLocalStorage();
            if (savedProfile) {
                console.log('Найден профиль в localStorage:', savedProfile);
                currentAnketa = savedProfile;
                updateProfileDisplay(savedProfile);
                
                const editButton = document.getElementById('profile-edit-button');
                editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
                return;
            }
            
            console.log('Профиль не найден, показываем кнопку создания');
            const editButton = document.getElementById('profile-edit-button');
            editButton.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
            return;
        }
        
        // Затем загружаем анкеты с сервера
        console.log('Загрузка анкет с сервера...');
        const response = await fetch('/api/show-ankety', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Статус загрузки анкет:', response.status);
        
        if (response.ok) {
            const realData = await response.json();
            console.log('Полученные данные анкет:', realData);
            
            // Находим анкету текущего пользователя
            currentAnketa = realData.find(anketa => {
                // Проверяем несколько вариантов ID
                const userId = authUser.id || authUser.user_id;
                const anketaUserId = anketa.user_id || anketa.userId;
                return anketaUserId && userId && anketaUserId.toString() === userId.toString();
            });
            
            if (currentAnketa) {
                console.log('Найдена анкета пользователя:', currentAnketa);
                updateProfileDisplay(currentAnketa);
                saveProfileToLocalStorage(currentAnketa); // Сохраняем в localStorage для резервной копии
                
                const editButton = document.getElementById('profile-edit-button');
                editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
            } else {
                console.log('Анкета не найдена на сервере, проверяем localStorage');
                
                // Пробуем локальное хранилище
                const savedProfile = loadProfileFromLocalStorage();
                if (savedProfile) {
                    currentAnketa = savedProfile;
                    updateProfileDisplay(savedProfile);
                    
                    const editButton = document.getElementById('profile-edit-button');
                    editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
                } else {
                    console.log('Анкета не найдена, предлагаем создать');
                    const editButton = document.getElementById('profile-edit-button');
                    editButton.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
                }
            }
            
        } else {
            const errorText = await response.text();
            console.error('Ошибка загрузки анкет с сервера:', errorText);
            
            // Пробуем локальное хранилище при ошибке сервера
            const savedProfile = loadProfileFromLocalStorage();
            if (savedProfile) {
                console.log('Используем профиль из localStorage из-за ошибки сервера');
                currentAnketa = savedProfile;
                updateProfileDisplay(savedProfile);
                
                const editButton = document.getElementById('profile-edit-button');
                editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
            } else {
                throw new Error('Не удалось загрузить анкеты');
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        
        // Пробуем локальное хранилище
        const savedProfile = loadProfileFromLocalStorage();
        if (savedProfile) {
            console.log('Используем профиль из localStorage после ошибки');
            currentAnketa = savedProfile;
            updateProfileDisplay(savedProfile);
            
            const editButton = document.getElementById('profile-edit-button');
            editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
        } else {
            showMessage('Не удалось загрузить профиль. Создайте новую анкету.', 'info');
            
            // Показываем кнопку создания анкеты
            const editButton = document.getElementById('profile-edit-button');
            editButton.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
        }
    }
}

// Обновление отображения профиля
function updateProfileDisplay(anketa) {
    console.log('Обновление отображения профиля:', anketa);
    
    // Обновляем имя
    document.getElementById('profile-name-display').textContent = anketa.name;
    
    // Обновляем фото профиля
    updateProfilePhoto(anketa.photo);
    
    // Обновляем основную информацию
    const bioHTML = `
        <p><strong>Возраст:</strong> ${anketa.age}</p>
        <p><strong>Пол:</strong> ${anketa.gender}</p>
        <p><strong>Профессия:</strong> ${anketa.job}</p>
        <p><strong>Образование:</strong> ${anketa.school}</p>
        ${anketa.skills ? `<p><strong>Навыки:</strong> ${anketa.skills}</p>` : ''}
        ${anketa.description ? `<p><strong>О себе:</strong> ${anketa.description}</p>` : ''}
    `;
    
    document.getElementById('profile-bio-display').innerHTML = bioHTML;
    
    // Сохраняем в localStorage для отображения в header
    localStorage.setItem('userName', anketa.name);
    const welcomeMessage = document.getElementById('welcome-message');
    welcomeMessage.textContent = `👤 ${anketa.name}`;
    welcomeMessage.style.display = 'inline';
}

// Обновление фото профиля
function updateProfilePhoto(photoPath) {
    const avatarDisplay = document.getElementById('profile-avatar-display');
    
    if (photoPath && photoPath.trim() !== "") {
        // Если фото из localStorage (превью), используем его
        if (photoPath.startsWith('blob:')) {
            avatarDisplay.src = photoPath;
        } else {
            // Используем фото из сервера
            avatarDisplay.src = `/api/get-photo?filename=${encodeURIComponent(photoPath)}`;
        }
    } else {
        // Используем дефолтное фото
        avatarDisplay.src = defaultAvatar;
    }
}

// Открытие модального окна
function openProfileModal() {
    console.log('Открытие модального окна профиля');
    
    const modal = document.getElementById('profile-edit-modal');
    const modalTitle = document.getElementById('profile-modal-title');
    
    // Сбрасываем выбранное фото
    photoFile = null;
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('photo-input').value = '';
    
    if (currentAnketa) {
        // Режим редактирования
        modalTitle.textContent = 'Редактировать профиль';
        document.getElementById('profile-save-button').innerHTML = 
            '<i class="fas fa-save" style="margin-right: 8px;"></i> Сохранить изменения';
        
        // Заполняем форму текущими данными
        document.getElementById('profile-id').value = currentAnketa.id || '';
        document.getElementById('profile-name').value = currentAnketa.name || '';
        document.getElementById('profile-age').value = currentAnketa.age || '';
        document.getElementById('profile-gender').value = currentAnketa.gender || '';
        document.getElementById('profile-job').value = currentAnketa.job || '';
        document.getElementById('profile-school').value = currentAnketa.school || '';
        document.getElementById('profile-skills').value = currentAnketa.skills || '';
        document.getElementById('profile-description').value = currentAnketa.description || '';
        
        // Показываем текущее фото
        const currentPhotoContainer = document.getElementById('current-photo-container');
        const currentPhotoPreview = document.getElementById('current-photo-preview');
        const uploadArea = document.getElementById('photo-upload-area');
        
        if (currentAnketa.photo && currentAnketa.photo.trim() !== "") {
            if (currentAnketa.photo.startsWith('blob:')) {
                currentPhotoPreview.src = currentAnketa.photo;
            } else {
                currentPhotoPreview.src = `/api/get-photo?filename=${encodeURIComponent(currentAnketa.photo)}`;
            }
            currentPhotoContainer.style.display = 'block';
            uploadArea.style.display = 'none';
        } else {
            currentPhotoContainer.style.display = 'none';
            uploadArea.style.display = 'block';
        }
    } else {
        // Режим создания
        modalTitle.textContent = 'Создать анкету';
        document.getElementById('profile-save-button').innerHTML = 
            '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
        
        // Очищаем форму
        document.getElementById('profile-edit-form').reset();
        document.getElementById('profile-id').value = '';
        
        // Скрываем текущее фото
        document.getElementById('current-photo-container').style.display = 'none';
        document.getElementById('photo-upload-area').style.display = 'block';
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна
function closeProfileModal() {
    const modal = document.getElementById('profile-edit-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Обработка выбора фото
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    handlePhotoFile(file);
}

// Обработка файла фото
function handlePhotoFile(file) {
    if (!file) return;
    
    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('Неверный формат файла. Разрешены: JPG, PNG, GIF', 'error');
        return;
    }
    
    // Проверка размера файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('Файл слишком большой. Максимальный размер: 10MB', 'error');
        return;
    }
    
    photoFile = file;
    
    // Показываем превью
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('photo-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        
        // Скрываем текущее фото и показываем превью
        document.getElementById('current-photo-container').style.display = 'none';
        document.getElementById('photo-upload-area').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Удаление текущего фото
async function deleteCurrentPhoto() {
    if (!confirm('Вы уверены, что хотите удалить текущее фото?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/delete-photo', {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('Фото удалено', 'success');
            
            // Обновляем локальные данные
            if (currentAnketa) {
                currentAnketa.photo = '';
                updateProfilePhoto('');
                saveProfileToLocalStorage(currentAnketa);
            }
            
            // В модальном окне скрываем текущее фото и показываем загрузку
            document.getElementById('current-photo-container').style.display = 'none';
            document.getElementById('photo-upload-area').style.display = 'block';
            
        } else {
            throw new Error(`Ошибка: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка удаления фото:', error);
        
        // Локальное удаление
        if (currentAnketa) {
            currentAnketa.photo = '';
            updateProfilePhoto('');
            saveProfileToLocalStorage(currentAnketa);
            
            showMessage('Фото удалено (локально)', 'success');
            
            // В модальном окне скрываем текущее фото и показываем загрузку
            document.getElementById('current-photo-container').style.display = 'none';
            document.getElementById('photo-upload-area').style.display = 'block';
        } else {
            showMessage('Не удалось удалить фото', 'error');
        }
    }
}

// Загрузка фото на сервер - ИСПРАВЛЕНО: правильный endpoint
async function uploadPhoto(file) {
    console.log('Начало загрузки фото:', file.name);
    
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        // ИСПРАВЛЕНО: '/api/upload-photo' вместо '/api/get-photo'
        const response = await fetch('/api/upload-photo', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        console.log('Статус загрузки фото:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка загрузки фото:', errorText);
            
            // Возвращаем локальное фото для режима без сервера
            return {
                success: true,
                photo: URL.createObjectURL(file), // Создаем локальную ссылку
                local: true
            };
        }
        
        const result = await response.json();
        console.log('Фото загружено успешно:', result);
        return result;
        
    } catch (error) {
        console.error('Ошибка в uploadPhoto:', error);
        
        // Локальное сохранение
        return {
            success: true,
            photo: URL.createObjectURL(file),
            local: true
        };
    }
}

// Функция для создания новой анкеты
async function createNewAnketa(data) {
    console.log('Создание новой анкеты с данными:', data);
    
    try {
        // Проверяем авторизацию
        const authUser = await checkAuthBeforeLoad();
        if (!authUser) {
            throw new Error('Пользователь не авторизован');
        }
        
        console.log('Отправляем данные на сервер:', data);
        const response = await fetch('/api/create-ankety', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data),
            credentials: 'include'
        });
        
        console.log('Статус ответа создания анкеты:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Успешный ответ от сервера:', result);
            showMessage('Анкета успешно создана!', 'success');
            
            // Сохраняем ID новой анкеты
            data.id = result.id;
            return result;
        } else {
            const errorText = await response.text();
            console.error('Ошибка сервера при создании:', errorText);
            
            // Локальное сохранение при ошибке сервера
            if (!data.id) {
                data.id = 'local_' + Date.now();
            }
            saveProfileToLocalStorage(data);
            showMessage('Анкета сохранена локально (сервер недоступен)', 'warning');
            
            return {
                success: true,
                id: data.id,
                local: true
            };
        }
    } catch (error) {
        console.error('Ошибка запроса создания анкеты:', error);
        
        // Локальное сохранение при ошибке сети
        if (!data.id) {
            data.id = 'local_' + Date.now();
        }
        saveProfileToLocalStorage(data);
        showMessage('Анкета сохранена локально (ошибка сети)', 'warning');
        
        return {
            success: true,
            id: data.id,
            local: true
        };
    }
}

// Функция для обновления анкеты
async function updateAnketa(data) {
    console.log('Обновление анкеты с данными:', data);
    
    try {
        const response = await fetch('/api/update-ankety', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data),
            credentials: 'include'
        });
        
        console.log('Статус ответа обновления:', response.status);
        
        if (response.ok) {
            const result = await response.text();
            console.log('Успешное обновление:', result);
            showMessage('Профиль успешно обновлен!', 'success');
            return true;
        } else {
            const errorText = await response.text();
            console.error('Ошибка сервера при обновлении:', errorText);
            
            // Локальное сохранение при ошибке сервера
            saveProfileToLocalStorage(data);
            showMessage('Изменения сохранены локально (сервер недоступен)', 'warning');
            return true;
        }
    } catch (error) {
        console.error('Ошибка запроса обновления:', error);
        
        // Локальное сохранение при ошибке сети
        saveProfileToLocalStorage(data);
        showMessage('Изменения сохранены локально (ошибка сети)', 'warning');
        return true;
    }
}

// Обработка отправки формы
async function handleProfileSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Обработка отправки формы...');
    
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('id'),
        name: formData.get('name'),
        age: formData.get('age'),
        gender: formData.get('gender'),
        job: formData.get('job'),
        school: formData.get('school'),
        skills: formData.get('skills'),
        description: formData.get('description') || ''
    };
    
    console.log('Данные для отправки на сервер:', data);
    
    // Валидация обязательных полей
    if (!data.name || !data.age || !data.gender || !data.job || !data.school || !data.skills) {
        showMessage('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    try {
        // Шаг 1: Если есть фото, загружаем его
        if (photoFile) {
            console.log('Загрузка фото...');
            const uploadResult = await uploadPhoto(photoFile);
            console.log('Результат загрузки фото:', uploadResult);
            
            // Добавляем фото к данным
            if (uploadResult && uploadResult.photo) {
                data.photo = uploadResult.photo;
            }
        } else if (currentAnketa && currentAnketa.photo) {
            // Сохраняем существующее фото
            data.photo = currentAnketa.photo;
        }
        
        // Шаг 2: Сохраняем анкету
        if (data.id) {
            console.log('Обновление существующей анкеты...');
            await updateAnketa(data);
        } else {
            console.log('Создание новой анкеты...');
            const result = await createNewAnketa(data);
            if (result && result.id) {
                data.id = result.id;
            }
        }
        
        // Обновляем локальные данные
        currentAnketa = data;
        saveProfileToLocalStorage(data);
        
        closeProfileModal();
        
        // Обновляем отображение профиля
        setTimeout(() => {
            updateProfileDisplay(data);
        }, 300);
        
    } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        showMessage('Не удалось сохранить профиль: ' + error.message, 'error');
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
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Вставляем сообщение
    document.body.appendChild(messageDiv);
    
    // Автоматически скрываем сообщение через 5 секунд
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 500);
        }
    }, 5000);
}

// Закрытие модального окна по клику вне его
document.addEventListener('click', function(event) {
    const modal = document.getElementById('profile-edit-modal');
    const modalContent = document.querySelector('.modal-content');
    
    if (modal.style.display === 'flex' && 
        !modalContent.contains(event.target) && 
        !event.target.closest('#profile-edit-button') &&
        !event.target.closest('.profile-avatar-container') &&
        !event.target.closest('.avatar-overlay')) {
        closeProfileModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeProfileModal();
    }
});

// Дополнительные вспомогательные функции
async function testCreateAnketa() {
    console.log('Тестовое создание анкеты...');
    
    const testData = {
        name: 'Тестовый пользователь',
        age: '25',
        gender: 'мужской',
        job: 'Разработчик',
        school: 'МГУ',
        skills: 'Go, JavaScript, HTML, CSS',
        description: 'Тестовое описание профиля'
    };
    
    try {
        const response = await fetch('/api/create-ankety', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(testData),
            credentials: 'include'
        });
        
        console.log('Тестовый запрос - статус:', response.status);
        console.log('Тестовый запрос - текст:', await response.text());
    } catch (error) {
        console.error('Тестовый запрос - ошибка:', error);
    }
}

// Экспортируем функции для отладки (необязательно)
if (typeof window !== 'undefined') {
    window.testCreateAnketa = testCreateAnketa;
    window.getCurrentAnketa = () => currentAnketa;
    window.clearLocalStorage = () => {
        localStorage.removeItem('userProfile');
        location.reload();
    };
}