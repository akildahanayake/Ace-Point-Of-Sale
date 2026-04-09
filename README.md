# Ace Point Of Sale Deployment Instructions

This system is designed to be deployed on shared hosting (cPanel/GoDaddy) without requiring Node.js on the server.

## 1. Database Setup
1. Log in to your cPanel.
2. Go to **MySQL® Databases**.
3. Create a new database named `vibepos_db`.
4. Create a new user and assign it to the database with all privileges.
5. Go to **phpMyAdmin**.
6. Select your database and click **Import**.
7. Upload the `database.sql` file provided in the root of this project.

## 2. Backend (PHP API) Setup
1. Open `api/config/Database.php`.
2. Update the database credentials:
   ```php
   private $host = "localhost";
   private $db_name = "vibepos_db";
   private $username = "your_db_user";
   private $password = "your_db_password";
   ```
3. Upload the entire `api/` folder to your server (e.g., in `/public_html/api/`).

## 3. Frontend (React) Setup
1. In this environment, run `npm run build`.
2. This will generate a `dist/` folder.
3. Upload the contents of the `dist/` folder to your server's root directory (e.g., `/public_html/`).
4. Ensure the `index.html` is in the root.

## 4. Configuration
- Ensure your `.htaccess` files are correctly uploaded.
- If you host the API in a different subdirectory, update the API base URL in the React app (usually in a config file or `src/api.ts`).

## Security Note
- Change the default admin password immediately after login.
- Ensure HTTPS is enabled on your cPanel (use Let's Encrypt).
- The `api/.htaccess` handles routing for the REST API.

---
**Ace Point Of Sale** - Modern, Real-time, Multi-tenant POS System.
