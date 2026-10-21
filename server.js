const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5000);

// BUGGY mode is enabled by default for controlled race-condition practice.
// Set BUGGY=false to use the fixed atomic update.
const BUGGY = process.env.BUGGY !== "false";

app.use(cors());
app.use(express.json());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSeatFromDatabase(seatId) {
    const [rows] = await pool.execute(
        `SELECT seat_number, status, booked_by
         FROM seats
         WHERE seat_number = ?`,
        [seatId]
    );
    return rows[0] || null;
}

// GET all seats from MariaDB
app.get("/api/seats", async (req, res) => {
    try {
        const [seats] = await pool.query(`
            SELECT seat_number AS id, status, booked_by AS bookedBy
            FROM seats
            ORDER BY seat_number
        `);

        console.log("GET /api/seats:", {
            mode: BUGGY ? "BUGGY" : "FIXED",
            seats
        });

        return res.status(200).json({
            mode: BUGGY ? "BUGGY" : "FIXED",
            seats
        });
    } catch (error) {
        console.error("Could not fetch seats:", error.message);
        return res.status(500).json({ message: "Database error" });
    }
});

// POST a booking
app.post("/api/book", async (req, res) => {
    const { seatId, userId } = req.body || {};

    if (
        typeof seatId !== "string" || !seatId.trim() ||
        typeof userId !== "string" || !userId.trim()
    ) {
        return res.status(400).json({
            message: "seatId and userId are required"
        });
    }

    const cleanSeatId = seatId.trim();
    const cleanUserId = userId.trim();

    try {
        console.log("Booking request:", {
            mode: BUGGY ? "BUGGY" : "FIXED",
            seatId: cleanSeatId,
            userId: cleanUserId
        });

        if (BUGGY) {
            const [seats] = await pool.execute(
                "SELECT status FROM seats WHERE seat_number = ?",
                [cleanSeatId]
            );

            if (seats.length === 0) {
                return res.status(404).json({ message: "Seat not found" });
            }

            if (seats[0].status !== "AVAILABLE") {
                return res.status(409).json({
                    message: "Seat is no longer available"
                });
            }

            // Intentional delay to make the race condition easier to reproduce.
            await wait(100);

            // Intentionally unsafe: availability is not rechecked.
            const [result] = await pool.execute(
                `UPDATE seats
                 SET status = 'BOOKED', booked_by = ?
                 WHERE seat_number = ?`,
                [cleanUserId, cleanSeatId]
            );

            console.log("BUGGY update result:", {
                affectedRows: result.affectedRows
            });

            const savedSeat = await getSeatFromDatabase(cleanSeatId);
            console.log("Database after BUGGY booking:", savedSeat);

            return res.status(201).json({
                message: "Booking successful (BUGGY mode)",
                booking: { seatId: cleanSeatId, userId: cleanUserId },
                databaseAfterBooking: savedSeat
            });
        }

        // FIXED: only one concurrent request can change AVAILABLE to BOOKED.
        const [result] = await pool.execute(
            `UPDATE seats
             SET status = 'BOOKED', booked_by = ?
             WHERE seat_number = ? AND status = 'AVAILABLE'`,
            [cleanUserId, cleanSeatId]
        );

        console.log("FIXED update result:", {
            seatId: cleanSeatId,
            userId: cleanUserId,
            affectedRows: result.affectedRows
        });

        if (result.affectedRows === 0) {
            const currentSeat = await getSeatFromDatabase(cleanSeatId);
            console.log("Booking not completed. Current database row:", currentSeat);

            if (!currentSeat) {
                return res.status(404).json({ message: "Seat not found" });
            }

            return res.status(409).json({
                message: "Seat is no longer available"
            });
        }

        const savedSeat = await getSeatFromDatabase(cleanSeatId);
        console.log("Database after FIXED booking:", savedSeat);

        if (
            !savedSeat ||
            savedSeat.status !== "BOOKED" ||
            savedSeat.booked_by !== cleanUserId
        ) {
            console.error("Booking verification failed:", savedSeat);
            return res.status(500).json({
                message: "Booking could not be verified in the database"
            });
        }

        return res.status(201).json({
            message: "Booking successful",
            booking: {
                seatId: savedSeat.seat_number,
                userId: savedSeat.booked_by,
                status: savedSeat.status
            }
        });
    } catch (error) {
        console.error("Booking error:", error.message);
        return res.status(500).json({ message: "Database error" });
    }
});

// Local testing endpoint. It modifies all rows in the test table.
app.post("/api/reset", async (req, res) => {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.query(`
            UPDATE seats
            SET status = 'AVAILABLE', booked_by = NULL
        `);

        const [result] = await connection.execute(
            `UPDATE seats
             SET status = 'BOOKED', booked_by = ?
             WHERE seat_number = ?`,
            ["ExistingCustomer", "A1"]
        );

        if (result.affectedRows !== 1) {
            throw new Error("A1 was not found. Reset transaction cancelled.");
        }

        await connection.commit();

        const [seats] = await pool.query(`
            SELECT seat_number, status, booked_by
            FROM seats
            ORDER BY seat_number
        `);

        console.log("Database after reset:", seats);
        return res.status(200).json({
            message: "Seats reset successfully",
            seats
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Reset rollback failed:", rollbackError.message);
            }
        }

        console.error("Reset error:", error.message);
        return res.status(500).json({ message: "Database error" });
    } finally {
        if (connection) connection.release();
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Mode: ${BUGGY ? "BUGGY" : "FIXED"}`);
});

// Gracefully close database connections when stopping the server.
async function shutdown() {
    console.log("Shutting down server...");
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
