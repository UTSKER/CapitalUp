class OrderNode {

    constructor({
        id,
        userId,
        symbol,
        side,
        quantity,
        limitPrice,
        validity,
        createdAt,
        expiresAt = null,
    }) {

        // Order Information
        this.id = id;
        this.userId = userId;
        this.symbol = symbol;
        this.side = side;

        // Original quantity
        this.quantity = quantity;

        // Remaining quantity after partial execution
        this.remainingQuantity = quantity;

        this.limitPrice = limitPrice;

        // DAY / GTT / IOC / FOK (later)
        this.validity = validity;

        this.createdAt = createdAt;
        this.expiresAt = expiresAt;

        // PENDING / PARTIALLY_FILLED / FILLED / CANCELLED
        this.status = "PENDING";

        // FIFO Queue pointers
        this.prev = null;
        this.next = null;

        // Pointer to owning PriceLevel
        this.priceLevel = null;
    }

    isFilled() {
        return this.remainingQuantity === 0;
    }

    fill(quantity) {

        if (quantity > this.remainingQuantity) {
            throw new Error("Fill quantity exceeds remaining quantity");
        }

        this.remainingQuantity -= quantity;

        if (this.remainingQuantity === 0) {
            this.status = "FILLED";
        }
        else {
            this.status = "PARTIALLY_FILLED";
        }
    }

    cancel() {
        this.status = "CANCELLED";
    }

}

module.exports = OrderNode;