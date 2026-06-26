const DoublyLinkedList = require(
    "../datastructures/DoublyLinkedList"
);

class PriceLevel {

    constructor(price) {

        this.price = price;

        // FIFO queue of orders
        this.orders = new DoublyLinkedList();

        // Sum of remaining quantities
        this.totalQuantity = 0;

        // Pointer to corresponding RBNode
        this.treeNode = null;
    }

    addOrder(orderNode) {

        orderNode.priceLevel = this;

        this.orders.pushBack(orderNode);

        this.totalQuantity += orderNode.remainingQuantity;
    }

    removeOrder(orderNode) {

        this.orders.remove(orderNode);

        this.totalQuantity -= orderNode.remainingQuantity;

        orderNode.priceLevel = null;
    }

    reduceQuantity(orderNode, quantity) {

        if (quantity > orderNode.remainingQuantity) {
            throw new Error(
                "Quantity exceeds remaining quantity"
            );
        }

        orderNode.fill(quantity);

        this.totalQuantity -= quantity;
    }

    peek() {
        return this.orders.peekFront();
    }

    first() {
        return this.orders.head;
    }

    last() {
        return this.orders.tail;
    }

    isEmpty() {
        return this.orders.isEmpty();
    }

    size() {
        return this.orders.size();
    }

}

module.exports = PriceLevel;