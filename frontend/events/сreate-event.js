// Функция для переключения полей стоимости
function togglePriceFields() {
    const priceType = document.getElementById('event-price-type').value;
    const priceAmountGroup = document.getElementById('price-amount-group');
    const priceInput = document.getElementById('event-price');
    
    if (priceType === 'paid') {
        priceAmountGroup.style.display = 'block';
        priceInput.required = true;
    } else {
        priceAmountGroup.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
    }
}

// Функция для предпросмотра мероприятия
function previewEvent() {
    const form = document.getElementById('create-event-form');
    if (!validateForm(true)) {
        return;
    }
}
    const formData = new FormData(form);
    const previewContent = document.getElementById('preview-content');
    
    // Собираем данные для предпросмотра
    const title = formData.get('title');
    const type = formData.get('type');
    const format = formData.get('format');
    const description = formData.get('description');
    const date = formData.get('date');
    const time = formData.get('time');
    const duration = formData.get('duration');
    const location = formData.get('location');
    const priceType = formData.get('price_type');
    const price = formData.get('price');
    const maxParticipants = formData.get('max_participants');
    const organizer = formData.get('organizer');
    const organizerEmail = formData.get('organizer_email');
    
    // Получаем выбранные темы
    const selectedTopics = Array.from(form.querySelectorAll('input[name="topics"]:checked'))
        .map(checkbox => checkbox.nextElementSibling.textContent)
        .join(', ');
    
    // Получаем дополнительные теги
    const customTags = formData.get('custom_tags');
    
    // Форматируем дату
    const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Тексты для типов
    const typeTexts = {
        meetup: 'Митап',
        conference: 'Конференция',
        webinar: 'Вебинар',
        workshop: 'Воркшоп',
        hackathon: 'Хакатон',
        networking: 'Нетворкинг',
        training: 'Тренинг'
    };
    
    const formatTexts = {
        online: 'Онлайн',
        offline: 'Офлайн',
        hybrid: 'Гибрид'
    };
    
    const priceTexts = {
        free: 'Бесплатно',
        paid: 'Платно',
        donation: 'По donation'
    };
    
    // Создаем HTML для предпросмотра
    previewContent.innerHTML = `
        <div class="event-preview">
            <div class="preview-header">
                <h2 class="preview-title">${title}</h2>
                <div class="preview-badges">
                    <span class="preview-badge type">${typeTexts[type] || type}</span>
                    <span class="preview-badge format">${formatTexts[format] || format}</span>
                    <span class="preview-badge price">${priceType === 'paid' ? price + ' ₽' : priceTexts[priceType]}</span>
                </div>
            </div>
            
            <div class="preview-meta">
                <div class="meta-item">
                    <span class="meta-label">📅 Дата:</span>
                    <span class="meta-value">${formattedDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">⏰ Время:</span>
                    <span class="meta-value">${time}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">⏱️ Длительность:</span>
                    <span class="meta-value">${getDurationText(duration)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">📍 Место:</span>
                    <span class="meta-value">${location}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">👥 Участников:</span>
                    <span class="meta-value">${maxParticipants || 'Не ограничено'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">👨‍💼 Организатор:</span>
                    <span class="meta-value">${organizer}</span>
                </div>
            </div>
            
            <div class="preview-description">
                <h3>Описание</h3>
                <p>${description}</p>
            </div>
            
            {selectedTopics ? `
            
