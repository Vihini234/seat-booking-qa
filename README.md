# Seat Booking QA Project

A beginner-friendly API and database testing project built with **Node.js, Express, MariaDB/MySQL, and Postman**.

The project demonstrates how a QA engineer can test seat availability, booking validation, database persistence, duplicate bookings, and concurrent booking requests.

## Current project scope

- `GET /api/seats` — retrieve seats from the database.
- `POST /api/book` — book an available seat.
- `POST /api/reset` — reset the local test data for repeatable testing.
- BUGGY mode — intentionally unsafe booking logic for learning about race conditions.
- FIXED mode — atomic database update that prevents two concurrent requests from booking the same available seat.
- Database verification logs after booking and reset.
- Automated concurrency test script.
- Postman test examples and SQL verification queries.

> This is a learning project. Run it only against your local test database. The reset endpoint changes the seat records.

## Tech stack

- Node.js
- Express
- MariaDB/MySQL
- `mysql2`
- Postman
- phpMyAdmin / XAMPP

## Setup

### 1. Requirements

Install Node.js and XAMPP (or another local MariaDB/MySQL server). Start MySQL/MariaDB from XAMPP.

### 2. Create the database and table

Open phpMyAdmin, choose the **SQL** tab, and run `database/schema.sql`.

### 3. Install dependencies

Open a terminal in the `backend` folder:

```bash
npm install
```

### 4. Configure the database

The default local XAMPP setup uses:
- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: empty

If your local database credentials differ, update `backend/db.js`. Do not commit real passwords or credentials to GitHub.

### 5. Start the server

From the `backend` folder:

```bash
npm start
```

The server listens on `http://localhost:5000`. The default mode is **BUGGY** for race-condition practice.

For FIXED mode in Windows CMD:

```bat
set BUGGY=false
npm start
```

For PowerShell:

```powershell
$env:BUGGY="false"
npm start
```

The terminal should show `Mode: FIXED`.

## API endpoints

### GET `/api/seats`

URL: `http://localhost:5000/api/seats`

Expected: `200 OK` and a JSON response containing the mode and seats.

### POST `/api/book`

URL: `http://localhost:5000/api/book`

Choose **Body → raw → JSON** in Postman:

```json
{
  "seatId": "A2",
  "userId": "TestUser"
}
```

Expected in FIXED mode:
- `201 Created` if the seat was available and the booking was saved.
- `400 Bad Request` if `seatId` or `userId` is missing/invalid.
- `404 Not Found` if the seat does not exist.
- `409 Conflict` if the seat has already been booked.
- `500 Internal Server Error` if a database error occurs.

### POST `/api/reset`

URL: `http://localhost:5000/api/reset`

Resets all seats to `AVAILABLE`, then sets A1 to `BOOKED` by `ExistingCustomer`. This endpoint is for local testing only.

## Automated concurrency test

Start the server in FIXED mode. Then, in a second terminal from the `backend` folder, run:

```bash
npm test
```

The test resets the database, confirms A2 is available, sends two booking requests concurrently, and checks that exactly one request succeeds and the database stores one winner.

Expected result: one `201 Created`, one `409 Conflict`, and A2 saved as `BOOKED` by one of the two test users.

## SQL verification examples

```sql
-- View all seats
SELECT seat_number, status, booked_by
FROM seats
ORDER BY seat_number;

-- Verify A2 after a booking test
SELECT seat_number, status, booked_by
FROM seats
WHERE seat_number = 'A2';
```

## QA scenarios covered

See [`docs/test-cases.md`](docs/test-cases.md) for the test cases and expected results.

## Suggested GitHub repository name

`seat-booking-qa`

## LinkedIn sharing suggestion

> 🚀 I’m building a Seat Booking QA project to practise API testing and database validation.
>
> Using Postman, Node.js, Express, and MariaDB, I’ve tested seat availability, invalid seat IDs, duplicate booking prevention, and concurrent booking requests. I also implemented database verification and compared a deliberately buggy booking flow with a fixed atomic update.
>
> This project is helping me strengthen my practical skills in API testing, SQL validation, and defect analysis.
>
> #QualityAssurance #SoftwareTesting #APITesting #Postman #SQL #QAEngineer #LearningByDoing

## Important

This repository is a learning portfolio project, not a production booking system. It has no authentication or authorization. Do not deploy it publicly as-is. The `BUGGY` mode intentionally contains a race condition and should only be used for controlled local testing.
