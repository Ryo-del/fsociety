// Глобальные переменные
let currentAnketa = null;
let photoFile = null;
let defaultAvatar = "https://avatars.githubusercontent.com/u/583231?v=4";
let authUser = null;

// Функция для обрезки и сжатия изображения
async function processImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Рассчитываем новые размеры с сохранением пропорций
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Конвертируем в blob
                canvas.toBlob(function(blob) {
                    // Создаем новый файл с обработанным изображением
                    const processedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(processedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Проверка авторизации и загрузка профиля
async function initializeProfile() {
    console.log('Инициализация профиля...');
    
    // Показываем скелетон загрузки
    showSkeletonLoading();
    
    try {
        const response = await fetch('/checkauth', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            authUser = await response.json();
            console.log('Авторизованный пользователь:', authUser);
            
            // Обновляем приветственное сообщение
            updateWelcomeMessage(authUser.username || 'Пользователь');
            
            // Загружаем анкету пользователя
            await loadUserProfile();
        } else {
            console.warn('Пользователь не авторизован');
            showMessage('Для доступа к профилю необходимо войти в систему', 'warning');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showMessage('Ошибка проверки авторизации', 'error');
        hideSkeletonLoading();
    }
}

// Показать скелетон загрузки
function showSkeletonLoading() {
    document.getElementById('profile-name-display').innerHTML = 
        '<div class="skeleton skeleton-text" style="width: 200px; height: 40px;"></div>';
    
    document.getElementById('profile-job-display').innerHTML = 
        '<div class="skeleton skeleton-text" style="width: 150px; height: 25px;"></div>';
    
    document.getElementById('profile-stats-display').innerHTML = `
        <div class="stat-card">
            <div class="skeleton skeleton-text" style="width: 120px; height: 15px; margin-bottom: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 80px; height: 25px;"></div>
        </div>
        <div class="stat-card">
            <div class="skeleton skeleton-text" style="width: 120px; height: 15px; margin-bottom: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 80px; height: 25px;"></div>
        </div>
        <div class="stat-card">
            <div class="skeleton skeleton-text" style="width: 120px; height: 15px; margin-bottom: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 80px; height: 25px;"></div>
        </div>
    `;
    
    document.getElementById('profile-description-display').innerHTML = `
        <div class="skeleton skeleton-text" style="margin-bottom: 10px;"></div>
        <div class="skeleton skeleton-text" style="margin-bottom: 10px;"></div>
        <div class="skeleton skeleton-text" style="width: 70%;"></div>
    `;
    
    document.getElementById('profile-skills-display').innerHTML = `
        <div class="skeleton skeleton-text" style="width: 100%; height: 25px; margin-bottom: 10px;"></div>
        <div class="skeleton skeleton-text" style="width: 80%; height: 25px;"></div>
    `;
}

// Скрыть скелетон загрузки
function hideSkeletonLoading() {
    // Код скрытия скелетона
}

// Обновление приветственного сообщения
function updateWelcomeMessage(username) {
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `👤 ${username}`;
        welcomeMessage.style.display = 'inline';
        localStorage.setItem('userName', username);
    }
}

// Загрузка профиля пользователя
async function loadUserProfile() {
    try {
        console.log('Загрузка профиля пользователя...');
        
        const response = await fetch('/api/ankety/my', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Статус загрузки профиля:', response.status);
        
        if (response.ok) {
            const profileData = await response.json();
            console.log('Получен профиль:', profileData);
            
            currentAnketa = profileData;
            updateProfileDisplay(profileData);
            
            const editButton = document.getElementById('profile-edit-button');
            editButton.innerHTML = '<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Редактировать профиль';
            
        } else if (response.status === 404) {
            console.log('Анкета не найдена');
            displayEmptyProfile();
            
            const editButton = document.getElementById('profile-edit-button');
            editButton.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
            
        } else {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showMessage('Не удалось загрузить профиль', 'error');
        displayEmptyProfile();
    }
}

// Отображение пустого профиля
function displayEmptyProfile() {
    document.getElementById('profile-name-display').textContent = 'Неизвестный пользователь';
    document.getElementById('profile-job-display').innerHTML = '<i class="fas fa-briefcase" style="margin-right: 5px;"></i> Не указано';
    document.getElementById('profile-description-display').textContent = 'У вас еще нет созданной анкеты. Нажмите "Создать анкету" чтобы заполнить информацию о себе.';
    document.getElementById('profile-avatar-display').src = defaultAvatar;
    
    document.getElementById('profile-stats-display').innerHTML = `
        <div class="stat-card">
            <h4>Возраст</h4>
            <p>Не указан</p>
        </div>
        <div class="stat-card">
            <h4>Город</h4>
            <p>Не указан</p>
        </div>
        <div class="stat-card">
            <h4>Опыт работы</h4>
            <p>Не указан</p>
        </div>
    `;
    
    document.getElementById('profile-skills-display').innerHTML = 'Навыки не указаны';
}

// Обновление отображения профиля
function updateProfileDisplay(anketa) {
    console.log('Обновление отображения профиля:', anketa);
    
    // Обновляем имя
    document.getElementById('profile-name-display').textContent = anketa.name || authUser?.username || 'Пользователь';
    
    // Обновляем профессию в бейдже
    const jobDisplay = document.getElementById('profile-job-display');
    if (anketa.job) {
        jobDisplay.innerHTML = `<i class="fas fa-briefcase" style="margin-right: 5px;"></i> ${anketa.job}`;
        jobDisplay.style.display = 'inline-block';
    } else {
        jobDisplay.style.display = 'none';
    }
    
    // Обновляем фото профиля
    updateProfilePhoto(anketa.photo);
    
    // Обновляем статистику
    updateProfileStats(anketa);
    
    // Обновляем описание
    document.getElementById('profile-description-display').textContent = 
        anketa.description || 'Нет описания';
    
    // Обновляем навыки
    updateSkillsDisplay(anketa.skills);
    
    // Обновляем приветственное сообщение
    updateWelcomeMessage(anketa.name || authUser?.username || 'Пользователь');
}

// Обновление статистики профиля
function updateProfileStats(anketa) {
    const statsHTML = `
        <div class="stat-card">
            <h4><i class="fas fa-birthday-cake" style="margin-right: 5px;"></i> Возраст</h4>
            <p>${anketa.age || 'Не указан'}</p>
        </div>
        <div class="stat-card">
            <h4><i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i> Город</h4>
            <p>${anketa.city || 'Не указан'}</p>
        </div>
        <div class="stat-card">
            <h4><i class="fas fa-chart-line" style="margin-right: 5px;"></i> Опыт работы</h4>
            <p>${anketa.experience || 'Не указан'}</p>
        </div>
        <div class="stat-card">
            <h4><i class="fas fa-graduation-cap" style="margin-right: 5px;"></i> Образование</h4>
            <p>${anketa.school || 'Не указано'}</p>
        </div>
        ${anketa.salary ? `
        <div class="stat-card">
            <h4><i class="fas fa-money-bill-wave" style="margin-right: 5px;"></i> Зарплата</h4>
            <p>${anketa.salary}</p>
        </div>
        ` : ''}
        ${anketa.jobtype ? `
        <div class="stat-card">
            <h4><i class="fas fa-briefcase" style="margin-right: 5px;"></i> Тип работы</h4>
            <p>${anketa.jobtype}</p>
        </div>
        ` : ''}
    `;
    
    document.getElementById('profile-stats-display').innerHTML = statsHTML;
}

// Обновление отображения навыков
function updateSkillsDisplay(skills) {
    if (!skills) {
        document.getElementById('profile-skills-display').innerHTML = 'Навыки не указаны';
        return;
    }
    
    const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    const skillsHTML = skillsArray.map(skill => 
        `<span class="skill-tag">${skill}</span>`
    ).join('');
    
    document.getElementById('profile-skills-display').innerHTML = skillsHTML;
}

// Обновление фото профиля
async function updateProfilePhoto(photoPath) {
    const avatarDisplay = document.getElementById('profile-avatar-display');
    
    if (photoPath && photoPath.trim() !== "") {
        console.log('Обновление фото по пути:', photoPath);
        
        if (photoPath.startsWith('blob:')) {
            // Используем локальный blob
            avatarDisplay.src = photoPath;
            return;
        }
        
        // Получаем имя файла из пути (убираем лишние префиксы)
        let filename = photoPath;
        if (filename.includes('/')) {
            filename = filename.split('/').pop();
        }
        
        console.log('Загрузка фото:', filename);
        
        // Загружаем фото с сервера
        try {
            // Добавляем timestamp для предотвращения кеширования
            const timestamp = Date.now();
            const photoUrl = `/api/ankety/photo/get?filename=${encodeURIComponent(filename)}&t=${timestamp}`;
            
            // Проверяем доступность фото
            const response = await fetch(photoUrl, {
                method: 'HEAD',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Фото существует, устанавливаем источник
                avatarDisplay.src = photoUrl;
                console.log('Фото успешно загружено');
            } else {
                console.warn('Фото не найдено на сервере:', response.status);
                avatarDisplay.src = defaultAvatar;
            }
            
        } catch (error) {
            console.error('Ошибка при загрузке фото:', error);
            avatarDisplay.src = defaultAvatar;
        }
        
    } else {
        console.log('Путь к фото пустой, использую дефолтное фото');
        avatarDisplay.src = defaultAvatar;
    }
}

// Открытие модального окна для редактирования
function openProfileModal() {
    console.log('Открытие модального окна профиля');
    
    const modal = document.getElementById('profile-edit-modal');
    const modalTitle = document.getElementById('profile-modal-title');
    
    // Сбрасываем состояние
    photoFile = null;
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('photo-input').value = '';
    
    if (currentAnketa && currentAnketa.id) {
        modalTitle.textContent = 'Редактировать профиль';
        document.getElementById('profile-save-button').innerHTML = 
            '<i class="fas fa-save" style="margin-right: 8px;"></i> Сохранить изменения';
        
        fillProfileForm(currentAnketa);
        showCurrentPhoto(currentAnketa.photo);
        
    } else {
        modalTitle.textContent = 'Создать анкету';
        document.getElementById('profile-save-button').innerHTML = 
            '<i class="fas fa-plus" style="margin-right: 8px;"></i> Создать анкету';
        
        document.getElementById('profile-edit-form').reset();
        document.getElementById('profile-id').value = '';
        
        document.getElementById('current-photo-container').style.display = 'none';
        document.getElementById('photo-upload-area').style.display = 'block';
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}



// Заполнение формы данными анкеты (уже есть в вашем коде)
function fillProfileForm(anketa) {
    document.getElementById('profile-id').value = anketa.id || '';
    document.getElementById('profile-name').value = anketa.name || '';
    document.getElementById('profile-telegram').value = anketa.Telegram || '';
    document.getElementById('profile-age').value = anketa.age || '';
    document.getElementById('profile-gender').value = anketa.gender || '';
    document.getElementById('profile-city').value = anketa.city || '';
    document.getElementById('profile-position').value = anketa.position || '';
    document.getElementById('profile-job').value = anketa.job || '';
    document.getElementById('profile-school').value = anketa.school || '';
    document.getElementById('profile-skills').value = anketa.skills || '';
    document.getElementById('profile-experience').value = anketa.experience || '';
    document.getElementById('profile-jobtype').value = anketa.jobtype || '';
    document.getElementById('profile-salary').value = anketa.salary || '';
    document.getElementById('profile-description').value = anketa.description || '';
}

// Показ текущего фото
function showCurrentPhoto(photoPath) {
    const currentPhotoContainer = document.getElementById('current-photo-container');
    const currentPhotoPreview = document.getElementById('current-photo-preview');
    const uploadArea = document.getElementById('photo-upload-area');
    
    if (photoPath && photoPath.trim() !== "") {
        // Используем тот же источник, что и в основном аватаре
        currentPhotoPreview.src = document.getElementById('profile-avatar-display').src;
        currentPhotoContainer.style.display = 'block';
        uploadArea.style.display = 'none';
    } else {
        currentPhotoContainer.style.display = 'none';
        uploadArea.style.display = 'block';
    }
}

// Закрытие модального окна
function closeProfileModal() {
    const modal = document.getElementById('profile-edit-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Drag & drop для фото
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
    
    uploadArea.addEventListener('drop', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '#f8f9fa';
        this.style.borderColor = '#667eea';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handlePhotoFile(files[0]);
        }
    });
}

// Обработка файла фото
async function handlePhotoFile(file) {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('Неверный формат файла. Разрешены: JPG, PNG, GIF, WebP', 'error');
        return;
    }
    
    // Ограничение размера файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('Файл слишком большой. Максимальный размер: 10MB', 'error');
        return;
    }
    
    // Обрабатываем изображение (обрезаем и сжимаем)
    try {
        showMessage('Обработка изображения...', 'info');
        const processedFile = await processImage(file);
        photoFile = processedFile;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            document.getElementById('current-photo-container').style.display = 'none';
            document.getElementById('photo-upload-area').style.display = 'block';
            
            showMessage('Изображение готово к загрузке', 'success');
        };
        reader.readAsDataURL(processedFile);
        
    } catch (error) {
        console.error('Ошибка обработки изображения:', error);
        showMessage('Ошибка обработки изображения', 'error');
    }
}

// Удаление фото
async function deleteCurrentPhoto() {
    if (!confirm('Вы уверены, что хотите удалить текущее фото?')) {
        return;
    }
    
    try {
        showMessage('Удаление фото...', 'info');
        
        const response = await fetch('/api/ankety/photo/delete', {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('Фото удалено', 'success');
            
            if (currentAnketa) {
                currentAnketa.photo = '';
                updateProfilePhoto('');
            }
            
            document.getElementById('current-photo-container').style.display = 'none';
            document.getElementById('photo-upload-area').style.display = 'block';
            
        } else {
            throw new Error(`Ошибка: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка удаления фото:', error);
        showMessage('Не удалось удалить фото', 'error');
    }
}

// Загрузка фото на сервер
async function uploadPhoto(file) {
    console.log('Загрузка фото на сервер:', file.name, file.type, file.size);
    
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        showMessage('Загрузка фото...', 'info');
        
        const response = await fetch('/api/ankety/photo/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
            // Content-Type для FormData устанавливается автоматически
        });
        
        console.log('Статус загрузки фото:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка загрузки: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Фото загружено успешно:', result);
        showMessage('Фото успешно загружено!', 'success');
        return result;
        
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        throw error;
    }
}

// Создание новой анкеты
async function createNewAnketa(data) {
    console.log('Создание новой анкеты:', data);
    
    try {
        const response = await fetch('/api/ankety/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data),
            credentials: 'include'
        });
        
        console.log('Статус создания анкеты:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка создания: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Анкета создана:', result);
        showMessage('Анкета успешно создана!', 'success');
        return result;
        
    } catch (error) {
        console.error('Ошибка создания анкеты:', error);
        throw error;
    }
}

// Обновление анкеты
async function updateAnketa(data) {
    console.log('Обновление анкеты:', data);
    
    try {
        const response = await fetch('/api/ankety/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data),
            credentials: 'include'
        });
        
        console.log('Статус обновления:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка обновления: ${response.status} - ${errorText}`);
        }
        
        showMessage('Профиль успешно обновлен!', 'success');
        return true;
        
    } catch (error) {
        console.error('Ошибка обновления анкеты:', error);
        throw error;
    }
}

// Обработка отправки формы профиля
async function handleProfileSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Обработка отправки формы профиля...');
    
    // Собираем данные формы
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log('Данные формы:', data);
    
    // Валидация обязательных полей (telegram теперь необязателен)
    if (!data.name || !data.age || !data.gender || !data.job || !data.school || !data.skills) {
        showMessage('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    try {
        let photoResult = null;
        if (photoFile) {
            photoResult = await uploadPhoto(photoFile);
            if (photoResult && photoResult.photo) {
                data.photo = photoResult.photo;
            }
        }
        
        let result;
        if (data.id) {
            result = await updateAnketa(data);
        } else {
            result = await createNewAnketa(data);
            if (result && result.id) {
                data.id = result.id;
            }
        }
        
        // Обновляем текущую анкету
        currentAnketa = { ...currentAnketa, ...data };
        
        closeProfileModal();
        
        // Перезагружаем профиль для обновления данных
        setTimeout(() => {
            loadUserProfile();
        }, 300);
        
    } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        showMessage('Не удалось сохранить профиль: ' + error.message, 'error');
    }
}

// Функция для показа сообщений
function showMessage(message, type = 'info') {
    // Удаляем существующие сообщения
    const existingMessages = document.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    // Цвета в зависимости от типа
    switch(type) {
        case 'success':
            messageDiv.style.backgroundColor = '#28a745';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#ffc107';
            messageDiv.style.color = '#212529';
            break;
        default:
            messageDiv.style.backgroundColor = '#17a2b8';
    }
    
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}" 
           style="margin-right: 10px;"></i>
        ${message}
    `;
    
    document.body.appendChild(messageDiv);
    
    // Автоматическое скрытие через 5 секунд
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

// Функции навигации
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        }).then(() => {
            localStorage.removeItem('userName');
            window.location.href = '../index.html';
        }).catch(error => {
            console.error('Ошибка выхода:', error);
        });
    }
}

function goToProfile() {
    window.location.href = 'profile.html';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Страница профиля загружена');
    
    // Добавляем стили для тегов навыков
    const style = document.createElement('style');
    style.textContent = `
        .skill-tag {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 15px;
            border-radius: 20px;
            margin: 5px;
            font-size: 0.9em;
            font-weight: 500;
        }
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
        }
        .skeleton-text {
            height: 1em;
        }
        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Инициализируем профиль
    await initializeProfile();
    
    // Назначаем обработчики событий
    document.getElementById('profile-edit-button').onclick = openProfileModal;
    document.getElementById('profile-edit-form').onsubmit = handleProfileSubmit;
    document.getElementById('photo-upload-area').onclick = () => document.getElementById('photo-input').click();
    document.getElementById('photo-input').onchange = (e) => handlePhotoFile(e.target.files[0]);
    document.getElementById('delete-photo-btn').onclick = deleteCurrentPhoto;
    
    // Настраиваем drag & drop
    setupDragAndDrop();
    
    // Обработчики закрытия модального окна
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
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeProfileModal();
        }
    });
});

// Экспорт для отладки
if (typeof window !== 'undefined') {
    window.getCurrentAnketa = () => currentAnketa;
    window.clearProfileData = () => {
        localStorage.removeItem('userName');
        location.reload();
    };
}