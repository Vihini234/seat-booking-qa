# Seat Booking QA — Test Cases

| ID | Scenario | Request / setup | Expected result |
|---|---|---|---|
| TC-01 | Retrieve seats | `GET /api/seats` | `200 OK`; seat list reflects the database |
| TC-02 | Book available seat | `POST /api/book`, A2, TestUser | `201 Created`; A2 becomes BOOKED |
| TC-03 | Book already-booked seat | Try booking A1 | `409 Conflict`; existing booking remains unchanged |
| TC-04 | Non-existent seat | Try booking A99 | `404 Not Found` |
| TC-05 | Missing request fields | Empty JSON body | `400 Bad Request` |
| TC-06 | Concurrent booking in FIXED mode | Two simultaneous requests for A2 | Exactly one `201`, one `409`; one stored winner |
| TC-07 | Concurrent booking in BUGGY mode | Two simultaneous requests for A2 | Race condition may be reproduced; inspect both responses and final database row |
| TC-08 | Reset test data | `POST /api/reset` | `200 OK`; A1 booked by ExistingCustomer, other seats available |
| TC-09 | Database persistence | Book A2, then query `seats` table | Stored status and booked_by match the successful response |

## SQL checks

```sql
SELECT seat_number, status, booked_by
FROM seats
ORDER BY seat_number;

SELECT seat_number, status, booked_by
FROM seats
WHERE seat_number = 'A2';
```

## Notes

- Use only the local test database.
- Run the concurrency test in FIXED mode for a passing expected result.
- BUGGY mode is intentionally unsafe and included only to demonstrate race-condition testing.
