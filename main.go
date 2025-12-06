// main.go
package main

import (
	"fmt"
	"net/http"
	"talant/ankety"
	"talant/auth"
	"talant/job"
)

func main() {
	mux := http.NewServeMux()

	// Обработчики для вакансий (jobs)
	mux.HandleFunc("GET /job/{id}", job.OpenHandler)
	mux.HandleFunc("POST /createjob", job.CreateHandler)
	mux.HandleFunc("GET /showjobs", job.GetAllHandler)
	mux.HandleFunc("GET /myjobs", job.MyjobHandler)
	mux.HandleFunc("PUT /job/{id}", job.UpdateHandler)
	mux.HandleFunc("DELETE /job/{id}", job.DeleteHandler)

	// Обработчики аутентификации
	mux.HandleFunc("/singin", auth.SingInHandler)
	mux.HandleFunc("/login", auth.LoaginHandler)
	mux.HandleFunc("/checkauth", auth.CheckAuthHandler)
	mux.HandleFunc("/logout", auth.LogOutHandler)

	// Основные обработчики анкет (ankety)
	mux.HandleFunc("POST /api/create-ankety", ankety.CreateHandler)
	mux.HandleFunc("PUT /api/update-ankety", ankety.UpdateAnketyHandler)
	mux.HandleFunc("GET /api/show-ankety", ankety.ShowAnketyHandler)

	// Новые обработчики анкет
	mux.HandleFunc("GET /api/ankety/my", ankety.GetMyAnketaHandler)
	mux.HandleFunc("DELETE /api/ankety/delete", ankety.DeleteAnketyHandler)
	mux.HandleFunc("GET /api/ankety/search", ankety.SearchAnketyHandler)
	mux.HandleFunc("GET /api/ankety/stats", ankety.GetStatsHandler)
	mux.HandleFunc("GET /api/ankety/export", ankety.ExportCSVHandler)
	mux.HandleFunc("GET /api/ankety/get", ankety.GetAnketaByIDHandler)

	// Обработчики фотографий анкет
	mux.HandleFunc("POST /api/upload-photo", ankety.UploadPhotoHandler)
	mux.HandleFunc("GET /api/get-photo", ankety.GetPhotoHandler)
	mux.HandleFunc("DELETE /api/delete-photo", ankety.DeletePhotoHandler)

	// Статические файлы фронтенда
	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	// Оборачиваем роутер в CORS Middleware
	handler := auth.CORSMiddleware(mux)

	fmt.Println("🚀 Сервер запущен на порту :8080")
	fmt.Println("📁 Доступные эндпоинты:")
	fmt.Println("   📝 Анкеты:")
	fmt.Println("     POST   /api/create-ankety     - Создать анкету")
	fmt.Println("     PUT    /api/update-ankety     - Обновить анкету")
	fmt.Println("     GET    /api/show-ankety       - Показать все анкеты")
	fmt.Println("     GET    /api/ankety/my         - Моя анкета")
	fmt.Println("     DELETE /api/ankety/delete     - Удалить анкету")
	fmt.Println("     GET    /api/ankety/search     - Поиск анкет")
	fmt.Println("     GET    /api/ankety/stats      - Статистика")
	fmt.Println("     GET    /api/ankety/export     - Экспорт в CSV")
	fmt.Println("     GET    /api/ankety/get        - Получить анкету по ID")
	fmt.Println("")
	fmt.Println("   📸 Фотографии:")
	fmt.Println("     POST   /api/upload-photo      - Загрузить фото")
	fmt.Println("     GET    /api/get-photo         - Получить фото")
	fmt.Println("     DELETE /api/delete-photo      - Удалить фото")
	fmt.Println("")
	fmt.Println("   👤 Аутентификация:")
	fmt.Println("     POST   /singin                - Регистрация")
	fmt.Println("     POST   /login                 - Вход")
	fmt.Println("     GET    /checkauth             - Проверить авторизацию")
	fmt.Println("     POST   /logout                - Выход")
	fmt.Println("")
	fmt.Println("   💼 Вакансии:")
	fmt.Println("     GET    /job/{id}              - Получить вакансию")
	fmt.Println("     POST   /createjob             - Создать вакансию")
	fmt.Println("     GET    /showjobs              - Все вакансии")
	fmt.Println("     GET    /myjobs                - Мои вакансии")
	fmt.Println("     PUT    /job/{id}              - Обновить вакансию")
	fmt.Println("     DELETE /job/{id}              - Удалить вакансию")
	fmt.Println("")
	fmt.Println("🌐 Фронтенд доступен по адресу: http://localhost:8080")

	http.ListenAndServe(":8080", handler)
}
