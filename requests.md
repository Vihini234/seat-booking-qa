# Postman Requests

Base URL: `http://localhost:5000`

## 1. Get all seats

- Method: `GET`
- URL: `{{baseUrl}}/api/seats`
- Body: none
- Expected: `200 OK`

## 2. Book an available seat

- Method: `POST`
- URL: `{{baseUrl}}/api/book`
- Body → raw → JSON:

```json
{
  "seatId": "A2",
  "userId": "TestUser"
}
```

- Expected: `201 Created` if A2 is available.

## 3. Test a missing seat

Use the booking request above with `"seatId": "A99"`.

- Expected: `404 Not Found`

## 4. Test duplicate booking

Try booking A1, which is reserved for `ExistingCustomer` after reset.

- Expected: `409 Conflict`

## 5. Reset local test data

- Method: `POST`
- URL: `{{baseUrl}}/api/reset`
- Body: none
- Expected: `200 OK`

> Create an environment variable named `baseUrl` with value `http://localhost:5000` if you want to use the `{{baseUrl}}` syntax.
