# Local Service Management System — Backend

## Description

This is the backend server for a full-stack Local Service Management System. It is built using Node.js and Express.js and serves as the REST API layer for the entire application. The backend handles everything from user authentication and role management to bookings, payments, reviews, and admin controls. It communicates with a MongoDB database using Mongoose and is designed to support a React-based frontend client.

The platform connects regular users with local service providers such as plumbers, electricians, and home cleaners. Users can browse services, request a provider, book a job, pay online or in cash, and leave a review. Providers can manage their profiles and service listings, respond to requests, and track their earnings. Admins have full control over the platform including approving providers, managing categories and services, and monitoring activity.

---

## Tech Stack

The backend is built with **Node.js** using ES Module syntax. The web framework used is **Express.js v5**, which handles all routing and middleware. The database is **MongoDB**, accessed through the **Mongoose** ODM for schema validation and query abstraction.

Authentication is handled with **JSON Web Tokens (JWT)** using the `jsonwebtoken` package. Passwords are hashed using **bcryptjs**. File uploads such as provider profile images and service images are handled using **Multer** and stored on **Cloudinary**.

Payment processing is integrated with **Razorpay**, supporting both online card payments and cash payment recording. SMS-based OTP verification is powered by **Twilio**. Transactional emails such as OTP codes and password reset links are sent using **Nodemailer** with a Gmail account.

Additional utilities include **dotenv** for environment variable management, **cookie-parser** for reading httpOnly cookies, **cors** for cross-origin request handling, and **express-rate-limit** to protect auth and OTP endpoints from abuse.

---

## Project Structure

The project follows a clean MVC-inspired folder structure. The entry point is `server.js`, which initializes the Express app, connects to the database, registers all middleware, and mounts all route modules.

The `Controllers/` directory contains all the business logic. Each controller file corresponds to a specific feature area such as authentication, bookings, payments, reviews, and admin operations. The `Routes/` directory defines the URL paths and maps them to the appropriate controller functions along with any middleware guards.

The `models/` directory contains all Mongoose schemas. Models exist for users, service providers, services, service categories, provider services, service requests, provider responses, bookings, reviews, payments, notifications, wallet transactions, admin settings, and admin alerts.

The `middleware/` directory contains reusable middleware functions. The `authMiddleware.js` file exports the `protect` function which verifies the JWT and attaches the user to the request. The `userOnly.js`, `providerOnly.js`, and `adminOnly.js` files restrict access based on role. The `isPhoneVerified.js` middleware ensures that a user has verified their phone number before becoming a provider. The `rateLimiter.js` file configures IP-based rate limiters for sensitive endpoints. The `multer.js` file configures file upload handling.

The `config/` folder contains the database connection logic. The `utils/` folder holds shared helper functions. The `emails/` and `nodemailer/` folders contain email templates and the mailer setup respectively.

---

## Installation

To run this project locally, make sure you have Node.js v18 or higher installed along with a MongoDB Atlas account or a local MongoDB instance.

Start by cloning the repository and navigating into the backend directory. Run `npm install` to install all dependencies. Then create a `.env` file in the root of the backend directory and fill in all the required environment variables as described below. Finally, run `npm run dev` to start the development server using nodemon. The server will be available at `http://localhost:8080` by default.

---

## Environment Variables

The application relies on environment variables for all sensitive configuration. These should never be committed to version control.

`PORT` sets the port the server listens on. `NODE_ENV` sets the environment mode, either development or production. `MONGODB_URL` is the full MongoDB connection string including credentials and database name.

`ACCESS_TOKEN_SECRET` is the secret key used to sign and verify JWT access tokens. `FRONTEND_URL` is the URL of the frontend application and is used to configure CORS.

`GMAIL` and `NODEMAILER_PASS` are used to configure the email service. The password should be a Gmail App Password, not your regular Gmail password.

`ACCOUNT_SID_TWILIO`, `AUTH_TOKEN_TWILIO`, and `TWILIO_PHONE_NUMBER` are your Twilio credentials for sending SMS OTPs. `PERSONAL_PHONE_NUMBER` is an optional field used during development to redirect all SMS to a single test number.

`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are your Cloudinary credentials for image upload and storage.

`RAZORPAY_KEY_ID` and `RAZORPAY_SECRET` are your Razorpay API credentials for payment processing. Use the test key during development.

---

## API Endpoints

The API is organized into the following route groups, all prefixed with `/api`.

### Auth — `/api/auth`

Handles user registration, login, logout, OTP verification, password management, and Google OAuth. After signup, users receive an email OTP which must be verified before the account is active. Login returns a JWT access token and a refresh token, both stored in httpOnly cookies. Users can also sign in using Google OAuth. Password reset is done via a secure emailed token. Phone number verification is a separate two-step process using Twilio SMS OTPs and is required before a user can register as a service provider.

### Services — `/api/services`

Public endpoints allow anyone to browse all available services, fetch a service by its slug, filter services by category, or search by keyword. Admin-only endpoints allow creating, updating, soft-deleting, and restoring services. Service images are uploaded via Multer and stored on Cloudinary.

### Service Providers — `/api/service-providers`

Public endpoints allow browsing all approved providers, fetching a provider by ID, and searching providers by city. Authenticated users with a verified phone number can register as a provider. Providers can view and update their own profile. Admins can approve pending provider applications, block or unblock providers, and soft-delete provider accounts.

### Provider Services — `/api/provider-services`

Once registered as a provider, users can manage their own service listings. This includes adding services they offer, updating them, and removing them. Users can also browse provider-specific service listings publicly.

### Service Requests and Provider Responses — `/api/service-requests` and `/api/provider-responses`

Users can submit a service request describing what they need. Providers can then respond to those requests with availability and pricing. This forms the initial negotiation layer before a booking is confirmed.

### Bookings — `/api/bookings`

Bookings represent confirmed service appointments. Users and providers can both view their respective bookings. The booking lifecycle includes statuses like pending, confirmed, in-progress, and completed. Providers can update the booking status, set hours worked for hourly jobs, and set a post-inspection price if the actual cost differs from the estimate. Job start is secured with an OTP that the provider must verify. Job completion is confirmed by a separate OTP that the user verifies, ensuring both parties agree the work is done.

### Payments — `/api/payments`

Once a job is completed, the user can pay online using Razorpay or record a cash payment. For Razorpay, the flow involves creating a payment order and then verifying the payment signature after the user completes the transaction on the frontend. Users can view their full payment history and providers can view their earnings history. Individual payment details can also be fetched by ID.

### Reviews — `/api/reviews`

After a booking is completed and paid, users can submit a star rating and written review. Reviews can be edited or deleted by the author. Anyone can view reviews for a provider or see a rating summary showing the distribution of 1 to 5 star ratings. Admins can view all reviews across the platform for moderation purposes.

### Wallet — `/api/wallet`

Providers have a wallet that tracks their earnings. The wallet endpoints allow providers to view their current balance and browse their transaction history.

### Notifications — `/api/notifications`

In-app notifications are generated for key events such as booking confirmations, status changes, and payment receipts. Users and providers can fetch their notifications and mark them as read.

### Search — `/api/search`

A global search endpoint that queries across services and providers based on a keyword.

### Admin Dashboard — `/api/admin/dashboard`

A comprehensive suite of admin-only endpoints for managing the entire platform. This includes viewing statistics, managing users and providers, overseeing bookings and payments, moderating reviews, and configuring platform settings and alerts.

---

## Authentication

The system uses stateless JWT authentication. When a user logs in, two tokens are issued — a short-lived access token for authenticating API requests and a long-lived refresh token for issuing new access tokens when the original expires. Both tokens are stored in httpOnly cookies to prevent JavaScript access and reduce XSS risk. Tokens can also be sent via the `Authorization: Bearer <token>` header.

The `protect` middleware decodes and verifies the access token on every protected request. It checks the token against the user's current `tokenVersion` field in the database. When a user logs out or changes their password, the `tokenVersion` is incremented, which automatically invalidates all previously issued tokens without maintaining a blocklist.

---

## Error Handling

All API responses follow a consistent JSON format. Successful responses include a `success: true` field along with a `message` and optionally a `data` field. Error responses include `success: false` and a `message` describing what went wrong.

Standard HTTP status codes are used throughout. A `401` indicates a missing or invalid token. A `403` means the user is authenticated but does not have the required role. A `400` is returned for validation errors or bad input. A `404` is used when a requested resource does not exist. A `429` is returned when rate limits are exceeded. A `500` indicates an unexpected server-side error.

---

## Deployment

To deploy this backend, push your code to a Git repository and connect it to a hosting provider such as Render or Railway. Set all environment variables in the hosting dashboard. Make sure your MongoDB Atlas cluster has the server's IP address whitelisted under Network Access. Update the `FRONTEND_URL` environment variable to your production frontend URL to configure CORS correctly.

For VPS deployment, install Node.js and use PM2 as a process manager to keep the server running. Run `pm2 start server.js --name backend` and use `pm2 save` and `pm2 startup` to ensure it restarts automatically on server reboot.

---

## License

MIT
