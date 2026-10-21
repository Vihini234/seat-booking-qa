const BASE_URL = "http://localhost:5000";

async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    return { status: response.status, data };
}

async function main() {
    console.log("1. Resetting test data...");
    const reset = await request("/api/reset", { method: "POST" });

    if (reset.status !== 200) {
        throw new Error(`Reset failed: HTTP ${reset.status}`);
    }

    console.log("2. Checking that A2 is available...");
    const before = await request("/api/seats");

    if (before.status !== 200) {
        throw new Error(`GET seats failed: HTTP ${before.status}`);
    }

    const a2Before = before.data.seats.find((seat) => seat.id === "A2");

    if (!a2Before || a2Before.status !== "AVAILABLE") {
        throw new Error(`A2 is not available before the test: ${JSON.stringify(a2Before)}`);
    }

    console.log("3. Sending two concurrent booking requests...");
    const results = await Promise.all([
        request("/api/book", {
            method: "POST",
            body: JSON.stringify({ seatId: "A2", userId: "UserA" })
        }),
        request("/api/book", {
            method: "POST",
            body: JSON.stringify({ seatId: "A2", userId: "UserB" })
        })
    ]);

    results.forEach((result, index) => {
        console.log(`Request ${index + 1}: HTTP ${result.status}`, result.data);
    });

    const successful = results.filter((result) => result.status === 201).length;
    const conflicts = results.filter((result) => result.status === 409).length;

    console.log("4. Verifying final database state through the API...");
    const after = await request("/api/seats");

    if (after.status !== 200) {
        throw new Error(`Final GET seats failed: HTTP ${after.status}`);
    }

    const a2After = after.data.seats.find((seat) => seat.id === "A2");
    console.log("A2 after test:", a2After);
    console.log("Successful booking responses:", successful);
    console.log("Conflict responses:", conflicts);

    if (
        after.data.mode === "FIXED" &&
        successful === 1 &&
        conflicts === 1 &&
        a2After &&
        a2After.status === "BOOKED" &&
        ["UserA", "UserB"].includes(a2After.bookedBy)
    ) {
        console.log("PASS: Exactly one booking succeeded and the stored winner was verified.");
        return;
    }

    if (after.data.mode === "BUGGY" && successful === 2) {
        console.log("BUG REPRODUCED: Both concurrent requests reported success in BUGGY mode.");
        console.log("Inspect the final bookedBy value to see which request wrote last.");
        process.exitCode = 1;
        return;
    }

    console.error("FAIL: Results did not match the expected mode behaviour.");
    process.exitCode = 1;
}

main().catch((error) => {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
});
