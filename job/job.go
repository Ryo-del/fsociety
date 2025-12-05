package job

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
)

type Job struct {
	// JobId - уникальный ID вакансии
	Id string `json:"id"`
	// UserID - ID пользователя, создавшего вакансию (берется из куки)
	UserID      string `json:"user_id"` // НОВОЕ ПОЛЕ: Связь с пользователем
	Title       string `json:"title"`
	Company     string `json:"company"` // ИСПРАВЛЕНО: Добавлена закрывающая кавычка
	School      string `json:"school"`
	Description string `json:"description"`
	Salary      string `json:"salary"`
	Skills      string `json:"skills"`
}

var db string = "job.json"

func LoadJobs() ([]Job, error) {
	data, err := os.ReadFile(db)
	if err != nil {
		if os.IsNotExist(err) {
			// Если файл не существует, возвращаем пустой список
			return []Job{}, nil
		}
		return nil, fmt.Errorf("ошибка чтения файла %s: %w", db, err)
	}

	// Если файл пустой
	if len(data) == 0 {
		return []Job{}, nil
	}

	var jobs []Job
	err = json.Unmarshal(data, &jobs)
	if err != nil {
		return nil, fmt.Errorf("ошибка разбора JSON из файла %s: %w", db, err)
	}
	return jobs, nil
}

func SaveJobs(jobs []Job) error {
	data, err := json.MarshalIndent(jobs, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка кодирования в JSON: %w", err)
	}

	err = os.WriteFile(db, data, 0644)
	if err != nil {
		return fmt.Errorf("ошибка записи в файл %s: %w", db, err)
	}
	return nil
}
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDCookie, err := r.Cookie("id_cookie")
	if err != nil {
		http.Error(w, "Unauthorized: Missing user ID cookie", http.StatusUnauthorized)
		return
	}
	currentUserID := userIDCookie.Value

	jobID := strings.TrimPrefix(r.URL.Path, "/job/")
	if jobID == "" {
		http.Error(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad form", http.StatusBadRequest)
		return
	}

	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Load error", http.StatusInternalServerError)
		return
	}

	updated := false

	for i := range jobs {
		if jobs[i].Id == jobID {
			if jobs[i].UserID != currentUserID {
				http.Error(w, "Forbidden: cannot edit other user's job", http.StatusForbidden)
				return
			}

			jobs[i].Title = r.FormValue("title")
			jobs[i].Company = r.FormValue("company")
			jobs[i].School = r.FormValue("school")
			jobs[i].Description = r.FormValue("description")
			jobs[i].Salary = r.FormValue("salary")
			jobs[i].Skills = r.FormValue("skills")

			updated = true
			break
		}
	}

	if !updated {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

	if err := SaveJobs(jobs); err != nil {
		http.Error(w, "Save error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Updated"))
}

func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDCookie, err := r.Cookie("id_cookie")
	if err != nil {
		http.Error(w, "Unauthorized: Missing user ID cookie", http.StatusUnauthorized)
		return
	}
	userID := userIDCookie.Value

	err = r.ParseForm()
	if err != nil {
		http.Error(w, "Error parsing form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 1. Проверка на ограничение 1 вакансией
	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Error loading jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Если нужна проверка "не более 1 вакансии на пользователя"
	for _, job := range jobs {
		if job.UserID == userID {
			http.Error(w, "User can only create one job", http.StatusConflict)
			return
		}
	}

	// 2. Генерация уникального Job ID
	jobID := uuid.New().String()

	newJob := Job{
		Id:          jobID,  // УНИКАЛЬНЫЙ ID ВАКАНСИИ
		UserID:      userID, // ID создателя
		Title:       r.FormValue("title"),
		Company:     r.FormValue("company"),
		School:      r.FormValue("school"),
		Description: r.FormValue("description"),
		Salary:      r.FormValue("salary"),
		Skills:      r.FormValue("skills"),
	}

	if newJob.Title == "" || newJob.Description == "" {
		http.Error(w, "Title and Description are required", http.StatusBadRequest)
		return
	}

	jobs = append(jobs, newJob)

	err = SaveJobs(jobs)
	if err != nil {
		http.Error(w, "Error saving job: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newJob)
}

func OpenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ИСПРАВЛЕНИЕ: Получаем ID вакансии из URL (например, /job/123-abc)
	jobID := strings.TrimPrefix(r.URL.Path, "/job/")
	if jobID == "" || jobID == "job" {
		http.Error(w, "Missing job ID in URL path", http.StatusBadRequest)
		return
	}

	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Error loading jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Ищем вакансию по JobID
	var foundJob *Job
	for _, job := range jobs {
		if jobID == job.Id {
			foundJob = &job
			break
		}
	}

	if foundJob == nil {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

	// ЭТО ИСПРАВЛЯЕТ ПРОБЛЕМУ "НЕЛЬЗЯ РАЗВЕРНУТЬ"
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(foundJob)
}

// Дополнительные полезные handlers:

func GetAllHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Error loading jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDCookie, err := r.Cookie("id_cookie")
	if err != nil {
		http.Error(w, "Unauthorized: Missing user ID cookie", http.StatusUnauthorized)
		return
	}
	currentUserID := userIDCookie.Value

	// ИСПРАВЛЕНИЕ: Получаем ID вакансии из URL (например, /job/123-abc)
	jobID := strings.TrimPrefix(r.URL.Path, "/job/")
	if jobID == "" || jobID == "job" {
		http.Error(w, "Missing job ID in URL path", http.StatusBadRequest)
		return
	}

	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Error loading jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var updatedJobs []Job
	var found bool
	var unauthorized bool

	// ИСПРАВЛЕНИЕ: Проверяем, что ID вакансии совпадает, И что текущий пользователь — создатель
	for _, job := range jobs {
		if job.Id == jobID {
			if job.UserID == currentUserID { // Проверка прав
				found = true
				// Не добавляем в updatedJobs (удаляем)
			} else {
				unauthorized = true
				updatedJobs = append(updatedJobs, job) // Нельзя удалять чужую
			}
		} else {
			updatedJobs = append(updatedJobs, job) // Оставляем
		}
	}

	if unauthorized {
		http.Error(w, "Forbidden: You can only delete your own jobs", http.StatusForbidden)
		return
	}

	if !found {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

	err = SaveJobs(updatedJobs)
	if err != nil {
		http.Error(w, "Error saving jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func MyjobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDCookie, err := r.Cookie("id_cookie")
	if err != nil {
		http.Error(w, "Unauthorized: Missing user ID cookie", http.StatusUnauthorized)
		return
	}
	currentUserID := userIDCookie.Value

	jobs, err := LoadJobs()
	if err != nil {
		http.Error(w, "Error loading jobs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ИСПРАВЛЕНИЕ: Ищем ВСЕ вакансии, созданные текущим пользователем
	var userJobs []Job
	for _, job := range jobs {
		if currentUserID == job.UserID { // Ищем по UserID
			userJobs = append(userJobs, job)
		}
	}

	// ИСПРАВЛЕНИЕ: Возвращаем массив (даже если он пустой [])
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userJobs)
}
