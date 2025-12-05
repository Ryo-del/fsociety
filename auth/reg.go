package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	//"strings"
	"github.com/golang-jwt/jwt/v5" // token generation
	"github.com/google/uuid"       // UUID generation
	"golang.org/x/crypto/bcrypt"   // password hashing
)

type User struct {
	Id       string `json:"id"`
	Username string `json:"username"`
	Usermail string `json:"usermail"`
	Password string `json:"password"`
}

type CustomClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

var dataFile string = "data.json"
var jwtSecretKey = []byte("YOUR_EXTREMELY_STRONG_SECRET_KEY") // Секретный ключ для подписи JWT
// Middleware для обработки CORS
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		// Помечаем, что ответ зависит от Origin, чтобы кэширующие прокси не мешали
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		// Разрешаем отправлять cookie/credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Обязательная обработка Preflight-запросов
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Передаем управление основному обработчику
		next.ServeHTTP(w, r)
	})
}

func CheckAuthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("auth_token")
	if err != nil {
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}
	_, username, err := ValidateJWT(cookie.Value)
	if err != nil {
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(username))
}
func LogOutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	expiredCookie := http.Cookie{
		Name:     "auth_token",               // Имя куки, которое вы устанавливали при входе
		Value:    "",                         // Обнуляем значение токена
		Path:     "/",                        // Путь должен совпадать
		Expires:  time.Now().Add(-time.Hour), // Устанавливаем дату в прошлом
		MaxAge:   -1,                         // Также устанавливаем MaxAge в отрицательное значение
		HttpOnly: true,                       // Важно: HttpOnly должен быть true
		Secure:   false,                      // Используйте 'true', если работаете по HTTPS
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "id_cookie", // Используем более явное имя
		Value:    "",
		HttpOnly: true,  // Защита от XSS
		Secure:   false, // !!! Использовать TRUE для продакшена (HTTPS)
		Expires:  time.Now().Add(24 * time.Hour),
		Path:     "/",
	})
	http.SetCookie(w, &expiredCookie)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logged out successfully"))
}
func LoadUser() ([]User, error) {
	data, err := os.ReadFile(dataFile)
	if err != nil {
		fmt.Printf("Ошибка чтения файла %s: %v\n", dataFile, err)
		if os.IsNotExist(err) {
			return []User{}, nil // Файл не найден, возвращаем пустой список
		}
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	var users []User
	err = json.Unmarshal(data, &users)
	if err != nil {
		fmt.Printf("Ошибка парсинга JSON: %v. Данные: %s\n", err, string(data))
		return nil, fmt.Errorf("ошибка парсинга JSON: %w", err)
	}

	return users, nil
}

// GenerateJWT создает подписанный токен
func GenerateJWT(userID, username string) (string, error) {
	// Устанавливаем срок действия (например, 24 часа)
	expirationTime := time.Now().Add(24 * time.Hour)

	// 1. Создание полезной нагрузки (Claims)
	claims := &CustomClaims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime), // 'exp' - время истечения
			IssuedAt:  jwt.NewNumericDate(time.Now()),     // 'iat' - время создания
			Subject:   userID,                             // 'sub' - тема (часто UserID)
		},
	}

	// 2. Создание токена с алгоритмом подписи HS256
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 3. Подписание токена Секретным Ключом
	tokenString, err := token.SignedString(jwtSecretKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateJWT распарсивает и валидирует токен, возвращая userID и username
func ValidateJWT(tokenString string) (string, string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecretKey, nil
	})
	if err != nil {
		return "", "", err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims.UserID, claims.Username, nil
	}

	return "", "", fmt.Errorf("invalid token")
}

// Хеширует пароль и возвращает строку хэша
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	// Возвращаем хэш в виде строки
	return string(bytes), nil
}
func LoaginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	r.ParseForm()
	usernameOrMail := r.FormValue("username")
	password := r.FormValue("password")
	if usernameOrMail == "" || password == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}
	users, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading users", http.StatusInternalServerError)
		return
	}
	var authenticatedUser *User
	for i, user := range users {
		if user.Username == usernameOrMail || user.Usermail == usernameOrMail {
			if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err == nil {
				authenticatedUser = &users[i]
				break
			}
		}
	}

	if authenticatedUser == nil {
		// Если пользователь не найден ИЛИ пароль был неверен
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}
	userID := authenticatedUser.Id

	// 2. ГЕНЕРАЦИЯ НОВОГО ТОКЕНА (Правильно!)
	tokenString, err := GenerateJWT(authenticatedUser.Id, authenticatedUser.Username)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	// 3. Установка Cookie с новым токеном
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token", // Используем более явное имя
		Value:    tokenString,
		HttpOnly: true,  // Защита от XSS
		Secure:   false, // !!! Использовать TRUE для продакшена (HTTPS)
		Expires:  time.Now().Add(24 * time.Hour),
		Path:     "/",
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "id_cookie", // Используем более явное имя
		Value:    userID,
		HttpOnly: true,  // Защита от XSS
		Secure:   false, // !!! Использовать TRUE для продакшена (HTTPS)
		Expires:  time.Now().Add(24 * time.Hour),
		Path:     "/",
	})

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Login successful. New token set."))
}

func SingInHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	r.ParseForm()
	username := r.FormValue("username")
	usermail := r.FormValue("usermail")
	password := r.FormValue("password")
	if username == "" || usermail == "" || password == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	users, err := LoadUser()
	if err != nil {
		http.Error(w, "Error loading users", http.StatusInternalServerError)
		return
	}
	for _, user := range users {
		if user.Username == username || user.Usermail == usermail {
			http.Error(w, "Username or email already exists", http.StatusConflict)
			return
		}
	}
	//если не найден пользователь:

	id := uuid.New().String()
	hashedPassword, err := HashPassword(password)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	newUser := User{
		Id:       id,
		Username: username,
		Usermail: usermail,
		Password: hashedPassword,
	}
	users = append(users, newUser)
	updatedData, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		http.Error(w, "Error encoding data", http.StatusInternalServerError)
		return
	}

	err = os.WriteFile(dataFile, updatedData, 0644)
	if err != nil {
		// Если запись не удалась, возвращаем ошибку, и прекращаем выполнение
		http.Error(w, "Error writing data file", http.StatusInternalServerError)
		return
	}

	// Если все успешно, отправляем ответ 201
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Sign up successful"))
}
