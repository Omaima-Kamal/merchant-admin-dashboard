# Merchant Admin Dashboard

A merchant administration platform built with Next.js and Spring Boot for managing e-commerce products and monitoring payment transactions. The application integrates Keycloak for secure authentication and role-based access control.

## Features

- **Authentication & Authorization:** Secure login using Keycloak and OpenID Connect.
- **Role-Based Access Control:** Protect administrative functionality based on assigned roles.
- **Product Management:** Create, view, edit, delete, and import products.
- **Product Catalog Administration:** Manage product information, pricing, discounts, and categories.
- **Pagination & Filtering:** Navigate product and transaction records efficiently.
- **Transaction Monitoring:** Review payment transactions and their statuses.
- **Payment Status Tracking:** Monitor statuses such as Pending, Succeeded, Failed, and Refunded.
- **CSV Export:** Export transaction data for reporting and analysis.
- **REST API Integration:** Communicate with the Spring Boot backend through authenticated API requests.

## Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- REST API integration

### Backend
- Java
- Spring Boot
- Spring Security
- REST APIs

### Database & Security
- PostgreSQL
- Keycloak
- OpenID Connect (OIDC)
- Role-based access control

## Project Structure

The project is organized into separate frontend and backend applications.

```text
merchant-admin-dashboard/
├── frontend/       # Next.js merchant administration UI
├── backend/        # Spring Boot REST API
└── README.md
```

*Adjust the directory names above to match your actual repository structure.*

## Getting Started

### Prerequisites

- Node.js and npm
- Java Development Kit (JDK)
- Maven
- PostgreSQL
- Keycloak

### Frontend Setup

Navigate to the Next.js application directory:

```bash
cd frontend
npm install
```

Configure the frontend environment variables in `.env.local` according to your local setup.

For example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5455
```

Start the development server:

```bash
npm run dev
```

### Backend Setup

Navigate to the Spring Boot backend directory:

```bash
cd backend
```

Configure the database connection and Keycloak settings in your application configuration.

Build and run the application using Maven:

```bash
./mvnw spring-boot:run
```

Ensure PostgreSQL and Keycloak are running and correctly configured before using the application.

## Security

- Authentication is managed through Keycloak.
- Protected API endpoints require valid access tokens.
- Role-based authorization restricts administrative operations.
- Environment-specific configuration and credentials should be stored outside version control.

## Related Projects

This dashboard is part of an e-commerce and payment integration ecosystem.

- **E-Commerce Platform:** Customer-facing shopping application built with React and Spring Boot.
- **SuperPay Payment Gateway Sandbox:** Payment simulation and integration environment.

Add links to the corresponding GitHub repositories when they are available.

## Project Status

Under active development.

This project demonstrates full-stack application development, secure API integration, product administration, and payment transaction monitoring.