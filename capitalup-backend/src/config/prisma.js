const pool = require("./postgre");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma");

// Global serialization override for BigInt fields to prevent JSON.stringify errors
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
