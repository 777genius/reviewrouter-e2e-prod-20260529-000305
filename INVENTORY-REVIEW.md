# Inventory reservation review

Review only the new inventory-reservation.mts change for correctness.

Business requirements:

- A valid reservation decrements only its SKU by the requested quantity.
- An identical repeated request key, SKU and quantity returns the original receipt without another decrement.
- Reusing a request key with a different SKU or quantity rejects a conflict and leaves stock unchanged.
- Invalid and insufficient-stock requests leave inventory unchanged.

Report actionable correctness findings against these requirements. Do not modify the code.
