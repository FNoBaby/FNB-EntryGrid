# Server Management Dashboard

A web-based management dashboard that organizes server tools and services in a customizable card layout with authentication.

## Features

- **User Authentication System**: Secure login with role-based access
- **Customizable Dashboard**: Organize services in sections and cards
- **Card Management**: Add, edit, and delete cards that link to various services
- **Section Management**: Group cards into logical sections
- **Mobile Responsive**: Works on desktop and mobile devices
- **Dark Mode Support**: Toggle between light and dark themes

## Setup

### Prerequisites

- Node.js (v14 or later)
- MySQL Database

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Main-Page-Redirection
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables by creating a `.env` file in the root directory (see Environment Variables section below)

4. Start the server:
   ```
   npm start
   ```

5. Access the application at http://localhost:3002 (or your configured port)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=3002
NODE_ENV=development
ENVIRONMENT=DEV
DEBUG=false

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dashboard_db
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_DIALECT=mysql
USE_MYSQL=true

# Session Secret (generate a strong random string)
SESSION_SECRET=your-secure-session-secret-key
```

### Environment Variable Details

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | The port on which the server will run | 3002 |
| NODE_ENV | Node environment (development/production) | development |
| ENVIRONMENT | Application environment (DEV/PROD) | DEV |
| DEBUG | Enable debug logging | true/false |
| DB_HOST | MySQL database host | localhost |
| DB_PORT | MySQL database port | 3306 |
| DB_NAME | MySQL database name | dashboard_db |
| DB_USER | MySQL database username | dbuser |
| DB_PASSWORD | MySQL database password | dbpassword |
| DB_DIALECT | Database dialect (always mysql) | mysql |
| USE_MYSQL | Use MySQL for card storage | true |
| SESSION_SECRET | Secret for session encryption | random-string |

## Usage

### Default Login

- **Username**: admin
- **Password**: admin123

### Dashboard Management

1. Log in with the default credentials
2. Use the "Add New Section" button to create sections
3. Use the "Add Card" button within each section to add tools or services
4. Edit or delete existing cards and sections as needed

### Card Configuration

When adding a card, you can configure:

- **Title**: Name of the service
- **Description**: Brief description of the service
- **URL**: Link to the service
- **Icon**: Either an image URL or a Bootstrap icon
- **Button Icon**: Icon displayed on the action button
- **Order**: Position within its section

## Security

- The application uses secure session management
- Passwords are hashed using bcrypt
- Authentication is required for all routes
- Content Security Policy is implemented to prevent XSS attacks
- All API endpoints are protected against unauthorized access

## License

This project is licensed under the MIT License - a permissive open-source license developed at the Massachusetts Institute of Technology. This license allows you to:

- Use the software for commercial purposes
- Modify the software
- Distribute the software
- Use and modify the software in private

The main requirement is that the license and copyright notice must be included in all copies of the software.

## About

Developed by FNB (F No Baby) as a centralized dashboard solution for server management and service organization.

© 2025 FNB - All Rights Reserved
