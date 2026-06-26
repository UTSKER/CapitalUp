const RedBlackTree = require("../datastructures/RedBlackTree");

const tree = new RedBlackTree();

const values = [
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
    1000,
    1100,
    1200,
    1300,
    1400,
    1500
];

for (const value of values) {
    tree.insert(value);
}

console.log("=================================");
console.log("ROOT");
console.log("=================================");
console.log(tree.root.price);
console.log(tree.root.color);

console.log();

console.log("=================================");
console.log("TREE");
console.log("=================================");

printTree(tree.root);

console.log();

console.log("=================================");
console.log("HEIGHT");
console.log("=================================");
console.log(height(tree.root));

console.log();

console.log("=================================");
console.log("BLACK HEIGHT");
console.log("=================================");
console.log(blackHeight(tree.root));

console.log();

console.log("=================================");
console.log("VALID");
console.log("=================================");
console.log(validate(tree.root));

function printTree(node, space = 0) {

    if (!node) return;

    space += 8;

    printTree(node.right, space);

    console.log(
        " ".repeat(space),
        `${node.price} (${node.color})`
    );

    printTree(node.left, space);
}

function height(node) {

    if (!node) {
        return 0;
    }

    return (
        1 +
        Math.max(
            height(node.left),
            height(node.right)
        )
    );
}

function blackHeight(node) {

    if (!node) {
        return 1;
    }

    const left =
        blackHeight(node.left);

    const right =
        blackHeight(node.right);

    if (left !== right) {

        throw new Error(
            "Black Height Violation"
        );

    }

    return (
        left +
        (node.color === "BLACK"
            ? 1
            : 0)
    );
}

function validate(node) {

    if (!node) {
        return true;
    }

    // RED node cannot have RED child
    if (node.color === "RED") {

        if (
            (node.left &&
                node.left.color === "RED") ||
            (node.right &&
                node.right.color === "RED")
        ) {

            return false;

        }

    }

    return (
        validate(node.left) &&
        validate(node.right)
    );
}


function validateBST(node, min = -Infinity, max = Infinity) {

    if (!node) {
        return true;
    }

    if (
        node.price <= min ||
        node.price >= max
    ) {
        return false;
    }

    return (
        validateBST(
            node.left,
            min,
            node.price
        ) &&
        validateBST(
            node.right,
            node.price,
            max
        )
    );
}

console.log();
console.log("BST:", validateBST(tree.root));