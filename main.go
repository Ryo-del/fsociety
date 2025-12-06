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
	mux.HandleFunc("GET /job/{id}", job.OpenHandler)
	mux.HandleFunc("POST /createjob", job.CreateHandler)
	mux.HandleFunc("GET /showjobs", job.GetAllHandler)
	mux.HandleFunc("GET /myjobs", job.MyjobHandler)
	mux.HandleFunc("PUT /job/{id}", job.UpdateHandler)
	mux.HandleFunc("DELETE /job/{id}", job.DeleteHandler)

	mux.HandleFunc("/singin", auth.SingInHandler)
	mux.HandleFunc("/login", auth.LoaginHandler)
	mux.HandleFunc("/checkauth", auth.CheckAuthHandler)
	mux.HandleFunc("/logout", auth.LogOutHandler)

	mux.HandleFunc("POST /api/create-ankety", ankety.CreateHandler)
	mux.HandleFunc("PUT /api/update-ankety", ankety.UpdateAnketyHandler)
	mux.HandleFunc("GET /api/show-ankety", ankety.ShowAnketyHandler)

	// ИСПРАВЛЕНО: убрали "/api/" из путей
	mux.HandleFunc("POST /api/upload-photo", ankety.UploadPhotoHandler)
	mux.HandleFunc("GET /api/get-photo", ankety.GetPhotoHandler)
	mux.HandleFunc("DELETE /api/delete-photo", ankety.DeletePhotoHandler)

	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	// Оборачиваем роутер в CORS Middleware
	handler := auth.CORSMiddleware(mux)

	fmt.Println("Server starting on :8080\nhttp://localhost:8080")
	http.ListenAndServe(":8080", handler)
}
