const RBNode = require("./RBNode");

class RedBlackTree {
    constructor() {
        this.root = null;
    }

    insert(priceLevel) {

    const existingNode =
        this.find(priceLevel.price);

    if (existingNode) {
        return existingNode;
    }

    const newNode =
        new RBNode(priceLevel);

    let parent = null;
    let current = this.root;

    while (current) {

        parent = current;

        if (newNode.price < current.price) {
            current = current.left;
        }
        else {
            current = current.right;
        }

    }

    newNode.parent = parent;

    if (!parent) {
        this.root = newNode;
    }
    else if (newNode.price < parent.price) {
        parent.left = newNode;
    }
    else {
        parent.right = newNode;
    }

    this.setRed(newNode);

    if (newNode === this.root) {
        this.setBlack(newNode);
        return newNode;
    }

    this.insertFixup(newNode);

    return newNode;
}

    find(price) {
        let current = this.root;

        while (current) {

            if (price === current.price) {
                return current;
            }

            if (price < current.price) {
                current = current.left;
            }
            else {
                current = current.right;
            }
        }

        return null;
    }

    minimum(node = this.root) {

        if (!node) {
            return null;
        }

        let current = node;

        while (current.left) {
            current = current.left;
        }

        return current;
    }

    maximum(node = this.root) {

        if (!node) {
            return null;
        }

        let current = node;

        while (current.right) {
            current = current.right;
        }

        return current;
    }

    delete(nodeOrPrice) {
        const node =
            typeof nodeOrPrice === "number"
                ? this.find(nodeOrPrice)
                : nodeOrPrice;

        if (!node) {
            return false;
        }

        let nodeToRemove = node;
        let originalColor = nodeToRemove.color;
        let replacement = null;
        let replacementParent = null;

        if (!node.left) {
            replacement = node.right;
            replacementParent = node.parent;
            this.transplant(node, node.right);
        }
        else if (!node.right) {
            replacement = node.left;
            replacementParent = node.parent;
            this.transplant(node, node.left);
        }
        else {
            nodeToRemove = this.minimum(node.right);
            originalColor = nodeToRemove.color;
            replacement = nodeToRemove.right;

            if (nodeToRemove.parent === node) {
                replacementParent = nodeToRemove;
            }
            else {
                replacementParent = nodeToRemove.parent;
                this.transplant(nodeToRemove, nodeToRemove.right);
                nodeToRemove.right = node.right;
                nodeToRemove.right.parent = nodeToRemove;
            }

            this.transplant(node, nodeToRemove);
            nodeToRemove.left = node.left;
            nodeToRemove.left.parent = nodeToRemove;
            nodeToRemove.color = node.color;
        }

        node.priceLevel.treeNode = null;
        node.parent = null;
        node.left = null;
        node.right = null;

        if (originalColor === "BLACK") {
            this.deleteFixup(replacement, replacementParent);
        }

        return true;
    }

    transplant(oldNode, newNode) {
        if (!oldNode.parent) {
            this.root = newNode;
        }
        else if (oldNode === oldNode.parent.left) {
            oldNode.parent.left = newNode;
        }
        else {
            oldNode.parent.right = newNode;
        }

        if (newNode) {
            newNode.parent = oldNode.parent;
        }
    }

    deleteFixup(node, parent) {
        while (
            node !== this.root &&
            this.isBlack(node)
        ) {
            if (!parent) {
                break;
            }

            if (node === parent.left) {
                let sibling = parent.right;

                if (this.isRed(sibling)) {
                    this.setBlack(sibling);
                    this.setRed(parent);
                    this.leftRotate(parent);
                    sibling = parent.right;
                }

                if (
                    this.isBlack(sibling && sibling.left) &&
                    this.isBlack(sibling && sibling.right)
                ) {
                    this.setRed(sibling);
                    node = parent;
                    parent = node.parent;
                }
                else {
                    if (this.isBlack(sibling && sibling.right)) {
                        this.setBlack(sibling && sibling.left);
                        this.setRed(sibling);
                        this.rightRotate(sibling);
                        sibling = parent.right;
                    }

                    if (sibling) {
                        sibling.color = parent.color;
                    }

                    this.setBlack(parent);
                    this.setBlack(sibling && sibling.right);
                    this.leftRotate(parent);
                    node = this.root;
                    parent = null;
                }
            }
            else {
                let sibling = parent.left;

                if (this.isRed(sibling)) {
                    this.setBlack(sibling);
                    this.setRed(parent);
                    this.rightRotate(parent);
                    sibling = parent.left;
                }

                if (
                    this.isBlack(sibling && sibling.right) &&
                    this.isBlack(sibling && sibling.left)
                ) {
                    this.setRed(sibling);
                    node = parent;
                    parent = node.parent;
                }
                else {
                    if (this.isBlack(sibling && sibling.left)) {
                        this.setBlack(sibling && sibling.right);
                        this.setRed(sibling);
                        this.leftRotate(sibling);
                        sibling = parent.left;
                    }

                    if (sibling) {
                        sibling.color = parent.color;
                    }

                    this.setBlack(parent);
                    this.setBlack(sibling && sibling.left);
                    this.rightRotate(parent);
                    node = this.root;
                    parent = null;
                }
            }
        }

        this.setBlack(node);
    }

    grandparent(node) {

        if (!node || !node.parent) {
            return null;
        }

        return node.parent.parent;
    }

    uncle(node) {

        const gp = this.grandparent(node);

        if (!gp) {
            return null;
        }

        if (node.parent === gp.left) {
            return gp.right;
        }

        return gp.left;
    }

    sibling(node) {

        if (!node || !node.parent) {
            return null;
        }

        if (node === node.parent.left) {
            return node.parent.right;
        }

        return node.parent.left;
    }

    isRed(node) {
        return node && node.color === "RED";
    }

    isBlack(node) {
        return !node || node.color === "BLACK";
    }

    setRed(node) {

        if (node) {
            node.color = "RED";
        }

    }

    setBlack(node) {

        if (node) {
            node.color = "BLACK";
        }

    }

    leftRotate(x) {

        const y = x.right;

        if (!y) {
            return;
        }

        x.right = y.left;

        if (y.left) {
            y.left.parent = x;
        }

        y.parent = x.parent;

        if (!x.parent) {
            this.root = y;
        }
        else if (x === x.parent.left) {
            x.parent.left = y;
        }
        else {
            x.parent.right = y;
        }

        y.left = x;
        x.parent = y;
    }

    rightRotate(y) {

        const x = y.left;

        if (!x) {
            return;
        }

        y.left = x.right;

        if (x.right) {
            x.right.parent = y;
        }

        x.parent = y.parent;

        if (!y.parent) {
            this.root = x;
        }
        else if (y === y.parent.left) {
            y.parent.left = x;
        }
        else {
            y.parent.right = x;
        }

        x.right = y;
        y.parent = x;
    }

    insertFixup(node) {

        while (
            node !== this.root &&
            this.isRed(node.parent)
        ) {

            const gp = this.grandparent(node);

            if (!gp) {
                break;
            }

            // Parent is LEFT child
            if (node.parent === gp.left) {

                const uncle = gp.right;

                // CASE 1
                if (this.isRed(uncle)) {

                    this.setBlack(node.parent);
                    this.setBlack(uncle);
                    this.setRed(gp);

                    node = gp;
                }

                else {

                    // CASE 2
                    if (node === node.parent.right) {

                        node = node.parent;
                        this.leftRotate(node);

                    }

                    // CASE 3
                    this.setBlack(node.parent);
                    this.setRed(gp);

                    this.rightRotate(gp);

                }

            }

            // Parent is RIGHT child (Mirror Cases)
            else {

                const uncle = gp.left;

                // CASE 1
                if (this.isRed(uncle)) {

                    this.setBlack(node.parent);
                    this.setBlack(uncle);
                    this.setRed(gp);

                    node = gp;
                }

                else {

                    // CASE 2
                    if (node === node.parent.left) {

                        node = node.parent;
                        this.rightRotate(node);

                    }

                    // CASE 3
                    this.setBlack(node.parent);
                    this.setRed(gp);

                    this.leftRotate(gp);

                }

            }

        }

        this.setBlack(this.root);
    }
}

module.exports = RedBlackTree;
