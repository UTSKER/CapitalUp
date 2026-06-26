const OrderBook = require("./OrderBook");

class OrderBookManager {

    constructor() {

        this.books = new Map();

    }

    getBook(symbol) {

        if (!this.books.has(symbol)) {

            this.books.set(
                symbol,
                new OrderBook(symbol)
            );

        }

        return this.books.get(symbol);
    }

    hasBook(symbol) {
        return this.books.has(symbol);
    }

    removeBook(symbol) {
        this.books.delete(symbol);
    }

    totalBooks() {
        return this.books.size;
    }

}

module.exports = OrderBookManager;