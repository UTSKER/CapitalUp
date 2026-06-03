const bcrypt = require("bcrypt");

const {
  findUserByEmail,
  findUserByMobile,
  createUser,
} = require("../repositories/auth.repository");

async function registerUser({
  full_name,
  email,
  mobile_number,
  password,
}) {
  const existingEmail = await findUserByEmail(email);

  if (existingEmail) {
    throw new Error("Email already exists");
  }

  const existingMobile =
    await findUserByMobile(mobile_number);

  if (existingMobile) {
    throw new Error("Mobile number already exists");
  }

  const password_hash =
    await bcrypt.hash(password, 12);

  const user = await createUser({
    full_name,
    email,
    mobile_number,
    password_hash,
  });

  delete user.password_hash;
  return user;
}

module.exports = {
  registerUser,
};