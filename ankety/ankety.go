package ankety

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"talant/auth"

	"github.com/google/uuid"
)

type Ankety struct {
	Id     string `json:"id"`
	UserId string `json:"user_id"`
	Name   string `json:"name"`
	Gender string `json:"gender"`
	Age    string `json:"age"`
	Job    string `json:"job"`
	School string `json:"school"`
}

var anketybase string = "ankety.json"

func LoadUser() ([]Ankety, error) {
	data, err := os.ReadFile(anketybase)
	if err != nil {
		fmt.Printf("Ошибка чтения файла %s: %v\n", anketybase, err)
		return nil, err
	}
	var ankety []Ankety
	err = json.Unmarshal(data, &ankety)
	if err != nil {
		fmt.Printf("Ошибка разбора JSON из файла %s: %v\n", anketybase, err)
		return nil, err
	}
	return ankety, nil
}

func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	name := r.FormValue("name")
	gender := r.FormValue("gender")
	age := r.FormValue("age")
	job := r.FormValue("job")
	school := r.FormValue("school")
	if name == "" || age == "" || job == "" || school == "" || gender == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	// Требуется получить идентификатор зарегистрированного пользователя из токена
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}
	userID, _, err := auth.ValidateJWT(cookie.Value)
	if err != nil {
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}
	for _, a := range anketyList {
		if a.UserId == userID {
			http.Error(w, "Ankety already exists for this user", http.StatusBadRequest)
			return
		}
	}
	// Сохраняем отдельный id анкеты и привязываем к ней userID
	ankety := Ankety{
		Id:     uuid.New().String(),
		UserId: userID,
		Name:   name,
		Gender: gender,
		Age:    age,
		Job:    job,
		School: school,
	}

	anketyList = append(anketyList, ankety)
	updatedData, err := json.MarshalIndent(anketyList, "", "  ")
	if err != nil {
		http.Error(w, "Error encoding data", http.StatusInternalServerError)
		return
	}
	err = os.WriteFile(anketybase, updatedData, 0644)
	if err != nil {
		http.Error(w, "Error writing data file", http.StatusInternalServerError)
		return
	}
}

func ShowAnketyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	responseData, err := json.MarshalIndent(anketyList, "", "  ")
	if err != nil {
		http.Error(w, "Error encoding data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseData)
}
