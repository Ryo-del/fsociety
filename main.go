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
	mux.HandleFunc("POST /singin", auth.SingInHandler)
	mux.HandleFunc("POST /login", auth.LoaginHandler)
	mux.HandleFunc("GET /checkauth", auth.CheckAuthHandler)
	mux.HandleFunc("POST /logout", auth.LogOutHandler)

	// Основные обработчики анкет (ankety)
	mux.HandleFunc("POST /api/ankety/create", ankety.CreateHandler)
	mux.HandleFunc("PUT /api/ankety/update", ankety.UpdateAnketyHandler)
	mux.HandleFunc("GET /api/ankety/show", ankety.ShowAnketyHandler)
	mux.HandleFunc("GET /api/ankety/my", ankety.GetMyAnketaHandler)
	mux.HandleFunc("DELETE /api/ankety/delete", ankety.DeleteAnketyHandler)
	mux.HandleFunc("GET /api/ankety/search", ankety.SearchAnketyHandler)
	mux.HandleFunc("GET /api/ankety/stats", ankety.GetStatsHandler)
	mux.HandleFunc("GET /api/ankety/export", ankety.ExportCSVHandler)
	mux.HandleFunc("GET /api/ankety/get", ankety.GetAnketaByIDHandler)

	// Обработчики фотографий анкет (только один набор маршрутов)
	mux.HandleFunc("POST /api/ankety/photo/upload", ankety.UploadPhotoHandler)
	mux.HandleFunc("GET /api/ankety/photo/get", ankety.GetPhotoHandler)
	mux.HandleFunc("DELETE /api/ankety/photo/delete", ankety.DeletePhotoHandler)

	// Статические файлы фронтенда
	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	// Оборачиваем роутер в CORS Middleware
	handler := auth.CORSMiddleware(mux)

	fmt.Println("🚀 Сервер запущен на порту :8080")
	fmt.Println("🌐 Фронтенд доступен по адресу: http://localhost:8080")
	http.ListenAndServe(":8080", handler)
}
