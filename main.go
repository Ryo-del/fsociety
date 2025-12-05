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

	mux.HandleFunc("/createankety", ankety.CreateHandler)
	mux.HandleFunc("/showankety", ankety.ShowAnketyHandler)
	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	// Оборачиваем роутер в CORS Middleware
	handler := auth.CORSMiddleware(mux)

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", handler) // Используем обернутый handler
}
