const OrderBookManager =
require("../core/OrderBookManager");

const StopOrderBook =
require("../core/StopOrderBook");

class MatchingEngine {

    constructor() {

        this.bookManager =
            new OrderBookManager();

        this.orderBooks =
            this.bookManager.books;

        this.stopBooks = new Map();

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

    placeStopOrder(order) {

        const book =
            this.getOrCreateStopOrderBook(order.symbol);

        return book.processOrder(order);

    }

    cancelStopOrder(symbol, orderId) {

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return false;
        }

        return book.cancelOrder(orderId);

    }

    getStopOrder(symbol, orderId) {

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return null;
        }

        return book.getOrder(orderId) || null;
    }

    processMarketPriceForStops(symbol, currentPrice) {

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return [];
        }

        return book.triggerEligibleOrders(currentPrice);
    }

    getOrCreateStopOrderBook(symbol) {

        if (!this.stopBooks.has(symbol)) {
            this.stopBooks.set(
                symbol,
                new StopOrderBook(symbol)
            );
        }

        return this.stopBooks.get(symbol);
    }

}

module.exports = MatchingEngine;
