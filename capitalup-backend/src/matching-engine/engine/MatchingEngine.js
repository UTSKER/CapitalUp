const OrderBookManager =
require("../core/OrderBookManager");

class MatchingEngine {

    constructor() {

        this.bookManager =
            new OrderBookManager();

        this.orderBooks =
            this.bookManager.books;

    }

    placeOrder(order) {

        const book =
            this.getOrCreateOrderBook(order.symbol);

        return book.processOrder(order);

    }

    cancelOrder(symbol, orderId) {

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return false;
        }

        return book.cancelOrder(orderId);

    }

    getOrder(symbol, orderId) {

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return null;
        }

        return book.getOrder(orderId) || null;
    }

    processMarketPrice(symbol, currentPrice) {

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return [];
        }

        return book.executeEligibleOrders(currentPrice);
    }

    getOrCreateOrderBook(symbol) {

        return this.bookManager.getBook(symbol);
    }

}

module.exports = MatchingEngine;
