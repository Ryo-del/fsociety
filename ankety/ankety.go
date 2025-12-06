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
	Position    string `json:"position"`
	Salary      string `json:"salary"`
	Experience  string `json:"experience"`
	City        string `json:"city"`
	Jobtype     string `json:"jobtype"`
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
		City:        r.FormValue("city"),
		Position:    r.FormValue("position"),
		Salary:      r.FormValue("salary"),
		Experience:  r.FormValue("experience"),
		Jobtype:     r.FormValue("jobtype"),
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
			anketyList[i].City = r.FormValue("city")
			anketyList[i].Position = r.FormValue("position")
			anketyList[i].Salary = r.FormValue("salary")
			anketyList[i].Experience = r.FormValue("experience")
			anketyList[i].Jobtype = r.FormValue("jobtype")
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
func GetMyAnketaHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Проверяем авторизацию
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}
	userID, username, err := auth.ValidateJWT(cookie.Value)
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
	var myAnketa *Ankety
	for i := range anketyList {
		if anketyList[i].UserId == userID {
			myAnketa = &anketyList[i]
			break
		}
	}

	if myAnketa == nil {
		http.Error(w, "Anketa not found", http.StatusNotFound)
		return
	}

	// Добавляем username в ответ
	response := struct {
		Ankety
		Username string `json:"username"`
	}{
		Ankety:   *myAnketa,
		Username: username,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
func DeleteAnketyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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

	// Ищем и удаляем анкету пользователя
	found := false
	newAnketyList := []Ankety{}
	for _, a := range anketyList {
		if a.UserId == userID {
			found = true
			// Удаляем фотографию, если она есть
			if a.Photo != "" {
				photoPath := filepath.Join("uploads", a.Photo)
				if _, err := os.Stat(photoPath); err == nil {
					os.Remove(photoPath)
				}
			}
		} else {
			newAnketyList = append(newAnketyList, a)
		}
	}

	if !found {
		http.Error(w, "Anketa not found", http.StatusNotFound)
		return
	}

	// Сохраняем обновленные данные
	err = SaveAnkety(newAnketyList)
	if err != nil {
		http.Error(w, "Error saving data", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Anketa deleted successfully"))
}
func SearchAnketyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем параметры поиска
	query := r.URL.Query()
	searchTerm := query.Get("q")
	gender := query.Get("gender")
	minAge := query.Get("min_age")
	maxAge := query.Get("max_age")
	job := query.Get("job")
	city := query.Get("city")
	skills := query.Get("skills")

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Фильтруем анкеты
	var filteredAnkety []Ankety
	for _, a := range anketyList {
		match := true

		// Поиск по общему тексту
		if searchTerm != "" {
			searchTerm = strings.ToLower(searchTerm)
			textToSearch := strings.ToLower(a.Name + " " + a.Job + " " + a.School + " " + a.Skills + " " + a.Description)
			if !strings.Contains(textToSearch, searchTerm) {
				match = false
			}
		}

		// Фильтр по полу
		if gender != "" && a.Gender != gender {
			match = false
		}

		// Фильтр по возрасту
		if minAge != "" {
			minAgeInt := 0
			fmt.Sscanf(minAge, "%d", &minAgeInt)
			ageInt := 0
			fmt.Sscanf(a.Age, "%d", &ageInt)
			if ageInt < minAgeInt {
				match = false
			}
		}

		if maxAge != "" {
			maxAgeInt := 0
			fmt.Sscanf(maxAge, "%d", &maxAgeInt)
			ageInt := 0
			fmt.Sscanf(a.Age, "%d", &ageInt)
			if ageInt > maxAgeInt {
				match = false
			}
		}

		// Фильтр по работе
		if job != "" && !strings.Contains(strings.ToLower(a.Job), strings.ToLower(job)) {
			match = false
		}

		// Фильтр по городу
		if city != "" && !strings.Contains(strings.ToLower(a.City), strings.ToLower(city)) {
			match = false
		}

		// Фильтр по навыкам
		if skills != "" {
			requiredSkills := strings.Split(strings.ToLower(skills), ",")
			userSkills := strings.ToLower(a.Skills)
			allSkillsFound := true
			for _, reqSkill := range requiredSkills {
				reqSkill = strings.TrimSpace(reqSkill)
				if reqSkill != "" && !strings.Contains(userSkills, reqSkill) {
					allSkillsFound = false
					break
				}
			}
			if !allSkillsFound {
				match = false
			}
		}

		if match {
			filteredAnkety = append(filteredAnkety, a)
		}
	}

	// Подготавливаем ответ
	response := struct {
		Count   int      `json:"count"`
		Results []Ankety `json:"results"`
	}{
		Count:   len(filteredAnkety),
		Results: filteredAnkety,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
func GetStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Считаем статистику
	stats := struct {
		TotalAnkety     int            `json:"total_ankety"`
		GenderStats     map[string]int `json:"gender_stats"`
		AgeGroups       map[string]int `json:"age_groups"`
		TopJobs         map[string]int `json:"top_jobs"`
		TopSkills       map[string]int `json:"top_skills"`
		AnketyWithPhoto int            `json:"ankety_with_photo"`
	}{
		TotalAnkety:     len(anketyList),
		GenderStats:     make(map[string]int),
		AgeGroups:       make(map[string]int),
		TopJobs:         make(map[string]int),
		TopSkills:       make(map[string]int),
		AnketyWithPhoto: 0,
	}

	for _, a := range anketyList {
		// Статистика по полу
		stats.GenderStats[a.Gender]++

		// Статистика по возрастным группам
		age := 0
		fmt.Sscanf(a.Age, "%d", &age)
		ageGroup := "unknown"
		switch {
		case age < 18:
			ageGroup = "under_18"
		case age >= 18 && age < 25:
			ageGroup = "18_24"
		case age >= 25 && age < 35:
			ageGroup = "25_34"
		case age >= 35 && age < 45:
			ageGroup = "35_44"
		case age >= 45 && age < 55:
			ageGroup = "45_54"
		case age >= 55:
			ageGroup = "55_plus"
		}
		stats.AgeGroups[ageGroup]++

		// Статистика по профессиям
		stats.TopJobs[a.Job]++

		// Статистика по навыкам
		skills := strings.Split(a.Skills, ",")
		for _, skill := range skills {
			skill = strings.TrimSpace(skill)
			if skill != "" {
				stats.TopSkills[skill]++
			}
		}

		// Статистика по фото
		if a.Photo != "" {
			stats.AnketyWithPhoto++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Обработчик для экспорта анкет в CSV
func ExportCSVHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Создаем CSV
	var csvBuilder strings.Builder
	csvBuilder.WriteString("ID,UserID,Name,Gender,Age,Job,School,Skills,Photo,City,Description\n")

	for _, a := range anketyList {
		csvBuilder.WriteString(fmt.Sprintf(`"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"`,
			a.Id,
			a.UserId,
			strings.ReplaceAll(a.Name, `"`, `""`),
			a.Gender,
			a.Age,
			strings.ReplaceAll(a.Job, `"`, `""`),
			strings.ReplaceAll(a.School, `"`, `""`),
			strings.ReplaceAll(a.Skills, `"`, `""`),
			a.Photo,
			a.City,
			strings.ReplaceAll(a.Description, `"`, `""`),
		))
		csvBuilder.WriteString("\n")
	}

	// Устанавливаем заголовки для скачивания файла
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=ankety_export.csv")
	w.Write([]byte(csvBuilder.String()))
}

// Обработчик для получения анкеты по ID
func GetAnketaByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем ID из URL
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	// Загружаем все анкеты
	anketyList, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading ankety", http.StatusInternalServerError)
		return
	}

	// Ищем анкету по ID
	var foundAnketa *Ankety
	for i := range anketyList {
		if anketyList[i].Id == id {
			foundAnketa = &anketyList[i]
			break
		}
	}

	if foundAnketa == nil {
		http.Error(w, "Anketa not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(foundAnketa)
}

// Функция для регистрации всех обработчиков
func RegisterHandlers() {
	http.HandleFunc("/ankety/create", CreateHandler)
	http.HandleFunc("/ankety/update", UpdateAnketyHandler)
	http.HandleFunc("/ankety/show", ShowAnketyHandler)
	http.HandleFunc("/ankety/my", GetMyAnketaHandler)
	http.HandleFunc("/ankety/delete", DeleteAnketyHandler)
	http.HandleFunc("/ankety/search", SearchAnketyHandler)
	http.HandleFunc("/ankety/stats", GetStatsHandler)
	http.HandleFunc("/ankety/export", ExportCSVHandler)
	http.HandleFunc("/ankety/get", GetAnketaByIDHandler)
	http.HandleFunc("/ankety/photo/upload", UploadPhotoHandler)
	http.HandleFunc("/ankety/photo/get", GetPhotoHandler)
	http.HandleFunc("/ankety/photo/delete", DeletePhotoHandler)
}

// Вспомогательная функция для проверки существования анкеты пользователя
func HasUserAnketa(userID string) (bool, error) {
	anketyList, err := LoadUser()
	if err != nil {
		return false, err
	}

	for _, a := range anketyList {
		if a.UserId == userID {
			return true, nil
		}
	}
	return false, nil
}

// Вспомогательная функция для получения анкеты по UserID
func GetAnketaByUserID(userID string) (*Ankety, error) {
	anketyList, err := LoadUser()
	if err != nil {
		return nil, err
	}

	for i := range anketyList {
		if anketyList[i].UserId == userID {
			return &anketyList[i], nil
		}
	}
	return nil, nil
}
