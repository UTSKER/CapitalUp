const multer = require("multer");

const {
  CloudinaryStorage,
} = require("multer-storage-cloudinary");

const cloudinary = require(
  "../config/cloudinary"
);

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: {
      folder:
        "capitalup/kyc-documents",

      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "pdf",
      ],
    },
  });

const upload = multer({
  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },
});

module.exports = upload;