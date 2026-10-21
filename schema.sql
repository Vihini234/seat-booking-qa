CREATE DATABASE IF NOT EXISTS seat_booking_qa;
USE seat_booking_qa;

CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_number VARCHAR(10) NOT NULL UNIQUE,
    status ENUM('AVAILABLE', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    booked_by VARCHAR(100) DEFAULT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO seats (seat_number, status, booked_by)
VALUES
    ('A1', 'BOOKED', 'ExistingCustomer'),
    ('A2', 'AVAILABLE', NULL),
    ('A3', 'AVAILABLE', NULL);
