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

## Development Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/cards | Retrieve all cards |
| POST   | /api/cards | Create a new card |
| PUT    | /api/cards/:id | Update a card by ID |
| DELETE | /api/cards/:id | Delete a card by ID |
| GET    | /api/sections | Retrieve all sections |
| POST   | /api/sections | Create a new section |
| PUT    | /api/sections/:id | Update a section by ID |
| DELETE | /api/sections/:id | Delete a section by ID |

## Debug Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/debug | Retrieve debug information |
| POST   | /api/debug | Create a new debug entry |
| PUT    | /api/debug/:id | Update a debug entry by ID |
| DELETE | /api/debug/:id | Delete a debug entry by ID |

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

## Docker Deployment

You can run this application in a Docker container for easier deployment and isolation.

### Using Docker Compose

1. Create a `docker-compose.yml` file in the project root:

```yaml
version: '3'
services:
  dashboard:
    build: .
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - NODE_ENV=production
      - ENVIRONMENT=PROD
      - DB_HOST=db
      - DB_PORT=3306
      - DB_NAME=dashboard_db
      - DB_USER=dashuser
      - DB_PASSWORD=your_secure_password
      - SESSION_SECRET=your_secure_session_secret
    depends_on:
      - db
    restart: unless-stopped
    
  db:
    image: mysql:8.0
    command: --default-authentication-plugin=mysql_native_password
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=dashboard_db
      - MYSQL_USER=dashuser
      - MYSQL_PASSWORD=your_secure_password
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:
```

2. Create a `Dockerfile` in the project root:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
```

3. Build and start the containers:

```bash
docker-compose up -d
```

4. Access the application at http://localhost:3002 (or your configured port)

### Using Docker without Compose

1. Create the `Dockerfile` as shown above

2. Build the Docker image:

```bash
docker build -t server-dashboard .
```

3. Run the container:

```bash
docker run -p 3002:3002 \
  -e PORT=3002 \
  -e NODE_ENV=production \
  -e ENVIRONMENT=PROD \
  -e DB_HOST=your_db_host \
  -e DB_PORT=3306 \
  -e DB_NAME=dashboard_db \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e SESSION_SECRET=your_session_secret \
  --name server-dashboard \
  -d server-dashboard
```

## Pterodactyl Deployment

You can deploy this application on a Pterodactyl panel using a NodeJS server egg.

### Setup Instructions

1. In your Pterodactyl panel, create a new server using a NodeJS egg

2. Server requirements:
   - NodeJS 14+ 
   - Minimum 512MB RAM
   - 1GB disk space

3. Upload your application files to the server:
   - Either using the file manager in the panel
   - Or via SFTP
   - Or by connecting your GitHub repository

4. Configure the following startup variables in the panel's Startup tab:
   - Make sure the startup command is set to `npm start`

5. Configure environment variables:
   - Add all required environment variables from the `.env` file in the Startup tab's Environment Variables section
   - Important: Make sure to set `DB_HOST` to point to your MySQL server's address

6. Start the server from the Pterodactyl panel

### Port Forwarding

The application uses the port specified in your `.env` file (default: 3002). Make sure:

1. This port is allocated in your Pterodactyl server configuration
2. The port is forwarded through your router if you're hosting at home
3. Any firewalls are configured to allow traffic on this port

**Note:** If you change the port in your `.env` file, you must make sure this new port:
- Is allocated in Pterodactyl
- Is not already in use by another application
- Is properly forwarded through any firewalls or routers

Using a reverse proxy like Nginx is recommended for exposing the application securely with SSL.

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
