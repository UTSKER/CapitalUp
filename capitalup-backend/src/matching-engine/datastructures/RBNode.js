class RBNode {

    constructor(priceLevel) {

        this.priceLevel = priceLevel;

        // Link back from PriceLevel to this tree node
        priceLevel.treeNode = this;

        this.color = "RED";

        this.parent = null;
        this.left = null;
        this.right = null;
    }

    get price() {
        return this.priceLevel.price;
    }

}

module.exports = RBNode;