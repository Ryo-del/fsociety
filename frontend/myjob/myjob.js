// Базовый URL API
const API_BASE_URL = window.location.origin;

// Авторизация
async function initPage() {
    try {
        const res = await fetch(`${API_BASE_URL}/checkauth`, { credentials: "include" });
        if (!res.ok) {
            location.href = "../auth/login.html";
            return false;
        }

        const user = await res.json();
        document.getElementById("welcome-message").textContent =
            user.name || user.username || "Пользователь";

        return true;
    } catch {
        location.href = "../auth/login.html";
        return false;
    }
}

// Уведомления
function notify(text, type = "info") {
    const box = document.createElement("div");
    box.className = `notification ${type}`;
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(() => box.classList.add("show"), 10);
    setTimeout(() => box.remove(), 3500);
}

// Загрузка объявлений
async function loadMyJobs() {
    // Находим элемент сообщения, который находится вне контейнера списка
    const messageElement = document.querySelector('.form-message');
    
    if (messageElement) {
        messageElement.textContent = 'Загрузка ваших объявлений...';
        messageElement.className = 'form-message'; // Сброс классов
    }

    try {
        const response = await fetch(`${API_BASE_URL}/myjobs`, {
            method: 'GET',
            credentials: 'include'
        });

        // Перехват 401 и 403
        if (response.status === 401 || response.status === 403) {
            window.location.href = '../auth/login.html';
            return;
        }

        const responseText = await response.text();

        let jobs = [];

        // Если сервер вернул пустую строку → считаем, что объявлений нет
        if (!responseText.trim()) {
            console.warn("Empty response from backend — treating as empty job list");
        } else {
            try {
                jobs = JSON.parse(responseText);
                if (!Array.isArray(jobs)) {
                    console.error("Backend returned non-array JSON");
                    jobs = [];
                }
            } catch {
                console.error("JSON parse error:", responseText);
                jobs = [];
            }
        }

        renderMyJobs(jobs);

    } catch (error) {
        console.error('Error loading my jobs:', error);

        // Даже при ошибке — показываем пустое состояние
        renderMyJobs([]);

        notify('Ошибка соединения с сервером', 'error');
    }
}

// Рендер объявлений
function renderMyJobs(jobs) {
    const list = document.getElementById("my-jobs-list");
    // Находим элемент сообщения
    const msg = document.querySelector(".form-message");

    // Полностью очищаем контейнер списка
    list.innerHTML = "";

    // Если объялений нет → показываем пустой экран
    if (!jobs || jobs.length === 0) {
        if (msg) {
            msg.textContent = "Ваших объявлений нет";
            msg.className = "form-message info";
        }

        list.innerHTML = `
            <div class="no-jobs">
                <h3>Ваших объявлений нет</h3>
                <p>Создайте своё первое объявление и начните поиск кандидатов</p>
                <button class="primary" onclick="location.href='../create/create.html'">Создать объявление</button>
            </div>
        `;
        return;
    }

    // Если объявления есть — выводим их
    if (msg) {
        msg.textContent = `У вас ${jobs.length} объявлений`;
        msg.className = "form-message success";
    }

    jobs.forEach(job => {
        const card = jobCard(job);
        list.appendChild(card);
    });
}


// Карточка объявлений
function jobCard(job) {
    const div = document.createElement("div");
    div.className = "job-card";
    const id = job.id || job.Id;

    const skills = job.skills
        ? job.skills.split(",").map(s => `<span class="skill-tag">${s.trim()}</span>`).join("")
        : "<span class='skill-tag'>Без навыков</span>";

    div.innerHTML = `
        <div class="job-card-header">
            <h3>${job.title}</h3>
            <span class="job-type status-active">Активно</span> 
        </div>

        <div class="job-card-company">${job.company || "Компания не указана"}</div>
        <div class="job-card-salary">${job.salary || "Зарплата не указана"}</div>

        <div class="job-card-skills">${skills}</div>
        <p class="job-description">${job.description}</p>

        <div class="job-actions">
            <button class="primary" onclick="editJob('${id}')">Редактировать</button>
            <button class="danger" onclick="deleteJob('${id}')">Удалить</button>
        </div>
    `;

    return div;
}

// Редактирование (модальное окно)
async function editJob(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/job/${id}`, { credentials: "include" });
        if (!res.ok) return notify("Ошибка загрузки объявления", "error");

        const job = await res.json();
        openEditModal(job);

    } catch {
        notify("Ошибка загрузки объявлений", "error");
    }
}

function openEditModal(jobData) {
    const modal = document.getElementById('edit-modal');
    // Заполнение формы данными объявления
    document.getElementById('edit-id').value = jobData.id || jobData.Id;
    document.getElementById('edit-title').value = jobData.title;
    document.getElementById('edit-company').value = jobData.company;
    document.getElementById('edit-salary').value = jobData.salary;
    document.getElementById('edit-skills').value = jobData.skills;
    document.getElementById('edit-description').value = jobData.description;

    modal.style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-job-form').reset(); // Сброс формы
}


async function deleteJob(id) {
    if (!confirm("Удалить объявление?")) return;

    const res = await fetch(`${API_BASE_URL}/job/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    if (res.status === 204) {
        notify("Объявление удалено", "success");
        loadMyJobs();
    } else {
        // Проверяем, есть ли текст ошибки в ответе
        let errorText = "Ошибка удаления";
        try {
            const body = await res.text();
            if (body) errorText += ": " + body;
        } catch {}
        
        notify(errorText, "error");
    }
}

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
    if (await initPage()) loadMyJobs();
    
    // !!! Этот код должен быть здесь, внутри DOMContentLoaded !!!
    const editForm = document.getElementById('edit-job-form');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const form = e.target;
            const jobID = document.getElementById('edit-id').value;
            // Использование FormData для получения данных
            const formData = new URLSearchParams(new FormData(form)).toString();

            // Запрос на PUT /job/{id}
            try {
                const response = await fetch(`${API_BASE_URL}/job/${jobID}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData,
                    credentials: 'include'
                });

                if (response.ok) {
                    notify('Объявление успешно обновлено', 'success');
                    closeEditModal();
                    loadMyJobs(); // Перезагрузить список
                } else if (response.status === 403) {
                     notify('Ошибка: Вы не можете редактировать чужое объявление', 'error');
                } else if (response.status === 401) {
                     window.location.href = '../auth/login.html';
                } else {
                    const errorText = await response.text();
                    notify(`Ошибка сохранения: ${errorText || response.statusText}`, 'error');
                }

            } catch (error) {
                console.error('Save error:', error);
                notify('Ошибка соединения с сервером при сохранении', 'error');
            }
        });
    }
});