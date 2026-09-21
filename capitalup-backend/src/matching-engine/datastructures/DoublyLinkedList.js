class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  pushBack(node) {
    node.prev = null;
    node.next = null;

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }

    this.length++;
  }

  popFront() {
    if (!this.head) {
      return null;
    }

    const node = this.head;

    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;
    } else {
      this.head = node.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
    }

    node.prev = null;
    node.next = null;

    if (this.length > 0) {
      this.length--;
    }

    return node;
  }

  remove(node) {
    if (!node) {
      return;
    }

    if (node === this.head) {
      return this.popFront();
    }

    if (node === this.tail) {
      this.tail = node.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
    } else {
      if (node.prev) {
        node.prev.next = node.next;
      }
      if (node.next) {
        node.next.prev = node.prev;
      }
    }

    node.prev = null;
    node.next = null;

    if (this.length > 0) {
      this.length--;
    }
  }

  toArray() {
    const list = [];
    let current = this.head;
    while (current) {
      list.push(current);
      current = current.next;
    }
    return list;
  }

  peekFront() {
    return this.head;
  }

  isEmpty() {
    return this.length === 0;
  }

  size() {
    return this.length;
  }
}

module.exports = DoublyLinkedList;