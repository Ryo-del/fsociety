package ankety

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"talant/auth"

	"github.com/google/uuid"
)

type Ankety struct {
	Id          string `json:"id"`
	UserId      string `json:"user_id"`
	Name        string `json:"name"`
	Gender      string `json:"gender"`
	Age         string `json:"age"`
	Job         string `json:"job"`
	School      string `json:"school"`
	Skills      string `json:"skills"`
	Photo       string `json:"photo"`
	Description string `json:"description,omitempty"`
}

var anketybase string = "ankety.json"

func LoadUser() ([]Ankety, error) {
	// Проверяем существование файла
	if _, err := os.Stat(anketybase); os.IsNotExist(err) {
		// Создаем файл с пустым массивом
		fmt.Println("Файл ankety.json не найден, создаем новый...")
		emptyData := []Ankety{}
		data, err := json.MarshalIndent(emptyData, "", "  ")
		if err != nil {
			return nil, err
		}
		err = os.WriteFile(anketybase, data, 0644)
		if err != nil {
			return nil, err
		}
		fmt.Println("Файл ankety.json успешно создан")
		return emptyData, nil
	}

	data, err := os.ReadFile(anketybase)
	if err != nil {
		fmt.Printf("Ошибка чтения файла %s: %v\n", anketybase, err)
		return nil, err
	}

	// Проверяем, не пустой ли файл
	if len(data) == 0 {
		return []Ankety{}, nil
	}

	var ankety []Ankety
	err = json.Unmarshal(data, &ankety)
	if err != nil {
		fmt.Printf("Ошибка разбора JSON из файла %s: %v\n", anketybase, err)
		return nil, err
	}
	fmt.Printf("Загружено %d анкет из файла\n", len(ankety))
	return ankety, nil
}

// Обновите CreateHandler
func SaveAnkety(anketyList []Ankety) error {
	fmt.Printf("Сохранение %d анкет в файл...\n", len(anketyList))
	updatedData, err := json.MarshalIndent(anketyList, "", "  ")
	if err != nil {
		fmt.Printf("Ошибка кодирования данных: %v\n", err)
		return err
	}

	err = os.WriteFile(anketybase, updatedData, 0644)
	if err != nil {
		fmt.Printf("Ошибка записи в файл %s: %v\n", anketybase, err)
		return err
	}

	fmt.Println("Анкеты успешно сохранены в файл")
	return nil
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
func CreateHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("=== ОБРАБОТЧИК СОЗДАНИЯ АНКЕТЫ ===")
	fmt.Printf("Метод: %s\n", r.Method)
	fmt.Printf("Content-Type: %s\n", r.Header.Get("Content-Type"))

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ПАРСИМ ФОРМУ ПЕРВЫМ ДЕЛОМ
	if err := r.ParseForm(); err != nil {
		fmt.Printf("Ошибка парсинга формы: %v\n", err)
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Логируем все полученные значения
	fmt.Println("Полученные значения формы:")
	for key, values := range r.Form {
		fmt.Printf("  %s: %v\n", key, values)
	}

	name := r.FormValue("name")
	gender := r.FormValue("gender")
	age := r.FormValue("age")
	job := r.FormValue("job")
	school := r.FormValue("school")
	skills := r.FormValue("skills")
	description := r.FormValue("description")

	fmt.Printf("Поля анкеты: name='%s', gender='%s', age='%s', job='%s', school='%s', skills='%s'\n",
		name, gender, age, job, school, skills)

	if name == "" || age == "" || job == "" || school == "" || gender == "" || skills == "" {
		errorMsg := "Missing required fields: "
		if name == "" {
			errorMsg += "name "
		}
		if age == "" {
			errorMsg += "age "
		}
		if job == "" {
			errorMsg += "job "
		}
		if school == "" {
			errorMsg += "school "
		}
		if gender == "" {
			errorMsg += "gender "
		}
		if skills == "" {
			errorMsg += "skills "
		}
		fmt.Println("Ошибка: " + errorMsg)
		http.Error(w, errorMsg, http.StatusBadRequest)
		return
	}

	// Получаем userID из токена
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		fmt.Println("Ошибка: отсутствует токен авторизации")
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}

	userID, username, err := auth.ValidateJWT(cookie.Value)
	if err != nil {
		fmt.Printf("Ошибка валидации токена: %v\n", err)
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}

	fmt.Printf("Пользователь: ID=%s, username=%s\n", userID, username)

	anketyList, err := LoadUser()
	if err != nil {
		fmt.Printf("Ошибка загрузки анкет: %v\n", err)
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Проверяем, существует ли уже анкета для этого пользователя
	for _, a := range anketyList {
		if a.UserId == userID {
			fmt.Printf("Анкета для пользователя %s уже существует\n", userID)
			// Возвращаем ошибку или можно обновить существующую
			http.Error(w, "Ankety already exists for this user", http.StatusBadRequest)
			return
		}
	}

	// Создаем новую анкету
	newID := uuid.New().String()
	anketa := Ankety{
		Id:          newID,
		UserId:      userID,
		Name:        name,
		Gender:      gender,
		Age:         age,
		Job:         job,
		School:      school,
		Skills:      skills,
		Description: description,
		Photo:       "",
	}

	fmt.Printf("Создана новая анкета: ID=%s, UserID=%s, Name=%s\n", newID, userID, name)

	anketyList = append(anketyList, anketa)

	// Сохраняем анкеты
	err = SaveAnkety(anketyList)
	if err != nil {
		fmt.Printf("Ошибка сохранения анкет: %v\n", err)
		http.Error(w, "Error writing data file", http.StatusInternalServerError)
		return
	}

	// Возвращаем успешный ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	response := map[string]string{
		"message": "Anketa created successfully",
		"id":      anketa.Id,
	}
	fmt.Printf("Отправлен ответ: %v\n", response)
	json.NewEncoder(w).Encode(response)
}

// Обработчик для обновления анкеты
func UpdateAnketyHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("=== ОБРАБОТЧИК ОБНОВЛЕНИЯ АНКЕТЫ ===")

	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ПАРСИМ ФОРМУ ПЕРВЫМ ДЕЛОМ
	if err := r.ParseForm(); err != nil {
		fmt.Printf("Ошибка парсинга формы: %v\n", err)
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Получаем данные из формы
	id := r.FormValue("id")
	name := r.FormValue("name")
	gender := r.FormValue("gender")
	age := r.FormValue("age")
	job := r.FormValue("job")
	school := r.FormValue("school")
	skills := r.FormValue("skills")
	description := r.FormValue("description")

	fmt.Printf("Обновление анкеты ID=%s: name='%s', gender='%s', age='%s', job='%s', school='%s', skills='%s'\n",
		id, name, gender, age, job, school, skills)

	if id == "" || name == "" || gender == "" || age == "" || job == "" || school == "" || skills == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	// Проверяем авторизацию
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

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Ищем анкету для обновления
	found := false
	for i, a := range anketyList {
		if a.Id == id && a.UserId == userID {
			// Сохраняем существующее фото, если оно есть
			photo := anketyList[i].Photo

			// Обновляем данные анкеты
			anketyList[i].Name = name
			anketyList[i].Gender = gender
			anketyList[i].Age = age
			anketyList[i].Job = job
			anketyList[i].School = school
			anketyList[i].Skills = skills
			anketyList[i].Photo = photo // Сохраняем старое фото
			anketyList[i].Description = description
			found = true

			fmt.Printf("Анкета обновлена: ID=%s\n", id)
			break
		}
	}

	if !found {
		fmt.Printf("Анкета не найдена: ID=%s, UserID=%s\n", id, userID)
		http.Error(w, "Ankety not found or access denied", http.StatusNotFound)
		return
	}

	// Сохраняем обновленные данные
	err = SaveAnkety(anketyList)
	if err != nil {
		http.Error(w, "Error writing data file", http.StatusInternalServerError)
		return
	}

	fmt.Println("Анкета успешно обновлена")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Profile updated successfully"))
}

// Обработчик для загрузки фотографии
func UploadPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Проверяем авторизацию
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

	// Парсим multipart форму
	err = r.ParseMultipartForm(10 << 20) // Максимальный размер 10MB
	if err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Получаем файл из формы
	file, handler, err := r.FormFile("photo")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Проверяем тип файла
	allowedTypes := []string{"image/jpeg", "image/jpg", "image/png", "image/gif"}
	fileType := handler.Header.Get("Content-Type")
	isValidType := false
	for _, allowed := range allowedTypes {
		if fileType == allowed {
			isValidType = true
			break
		}
	}

	if !isValidType {
		http.Error(w, "Invalid file type. Allowed: JPEG, JPG, PNG, GIF", http.StatusBadRequest)
		return
	}

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Ищем анкету пользователя
	userAnketaIndex := -1
	for i, a := range anketyList {
		if a.UserId == userID {
			userAnketaIndex = i
			break
		}
	}

	if userAnketaIndex == -1 {
		http.Error(w, "User anketa not found", http.StatusNotFound)
		return
	}

	// Создаем директорию для фотографий, если её нет
	uploadDir := "uploads/photos"
	err = os.MkdirAll(uploadDir, 0755)
	if err != nil {
		http.Error(w, "Error creating upload directory", http.StatusInternalServerError)
		return
	}

	// Генерируем уникальное имя файла
	fileExt := filepath.Ext(handler.Filename)
	newFileName := userID + "_" + uuid.New().String() + fileExt
	filePath := filepath.Join(uploadDir, newFileName)

	// Удаляем старую фотографию, если она есть
	oldPhoto := anketyList[userAnketaIndex].Photo
	if oldPhoto != "" {
		oldFilePath := filepath.Join("uploads", oldPhoto)
		if _, err := os.Stat(oldFilePath); err == nil {
			os.Remove(oldFilePath)
		}
	}

	// Создаем файл на сервере
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Копируем содержимое файла
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	// Обновляем путь к фото в анкете
	anketyList[userAnketaIndex].Photo = "photos/" + newFileName

	// Сохраняем обновленные данные
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

	// Возвращаем успешный ответ с путем к фото
	response := map[string]string{
		"message": "Photo uploaded successfully",
		"photo":   "photos/" + newFileName,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Обработчик для получения фотографии
func GetPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем имя файла из URL
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		http.Error(w, "Filename is required", http.StatusBadRequest)
		return
	}

	// Проверяем безопасность пути
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.Error(w, "Invalid filename", http.StatusBadRequest)
		return
	}

	// Формируем путь к файлу
	filePath := filepath.Join("uploads", "photos", filename)

	// Проверяем существование файла
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Если файл не найден, возвращаем дефолтную аватарку
		defaultAvatarPath := "uploads/photos/default_avatar.png"

		// Проверяем наличие дефолтной аватарки
		if _, err := os.Stat(defaultAvatarPath); os.IsNotExist(err) {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		filePath = defaultAvatarPath
	}

	// Определяем Content-Type по расширению файла
	ext := strings.ToLower(filepath.Ext(filePath))
	var contentType string
	switch ext {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".gif":
		contentType = "image/gif"
	default:
		contentType = "application/octet-stream"
	}

	// Отправляем файл
	w.Header().Set("Content-Type", contentType)
	http.ServeFile(w, r, filePath)
}

// Обработчик для удаления фотографии
func DeletePhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Проверяем авторизацию
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

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Ищем анкету пользователя
	userAnketaIndex := -1
	for i, a := range anketyList {
		if a.UserId == userID {
			userAnketaIndex = i
			break
		}
	}

	if userAnketaIndex == -1 {
		http.Error(w, "User anketa not found", http.StatusNotFound)
		return
	}

	// Удаляем старую фотографию, если она есть
	oldPhoto := anketyList[userAnketaIndex].Photo
	if oldPhoto != "" {
		oldFilePath := filepath.Join("uploads", oldPhoto)
		if _, err := os.Stat(oldFilePath); err == nil {
			os.Remove(oldFilePath)
		}
	}

	// Очищаем поле фото в анкете
	anketyList[userAnketaIndex].Photo = ""

	// Сохраняем обновленные данные
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

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Photo deleted successfully"))
}
