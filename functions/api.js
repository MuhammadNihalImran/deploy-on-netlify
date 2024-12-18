if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
const express = require("express");
const serverless = require("serverless-http");
const app = express();
const router = express.Router();

const ImageUpload = require("./models/ImageSchema");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path"); // Require the path module

const cors = require("cors");

const { storage, cloudinary } = require("./cloudConfig");
const upload = multer({ storage });

router.get("/", (req, res) => {
  res.send("App is running..");
});

// app.use(
//   cors({
//     origin: [
//       "https://image-frontend-amber.vercel.app",
//       "https://melodious-cannoli-496acf.netlify.app",
//       "http://localhost:5173",
//     ],
//     methods: ["POST", "GET", "DELETE", "PUT"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

app.use(
  cors({
    origin: "*",
  })
);

// http://localhost:5173/

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// app.get("*", (req, res) =>
//   res.sendFile(path.join(__dirname, "./web/build/index.html"))
// );

console.log("MongoDB URI:", process.env.MONGODB_URI);
main()
  .then(() => {
    console.log("connection is done");
  })
  .catch((err) => console.log(err));

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("server connection is successful");
  } catch (err) {
    console.log("server connection is failed");
    throw err;
  }
}

router.post("/images", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const { filename, path } = req.file; // Use 'path' to get the file path
  const imageUpload = new ImageUpload({
    imageName: filename,
    imagePath: path,
  });

  try {
    // Log the correct file path

    await imageUpload.save();
    res.status(201).json({ url: path });
  } catch (error) {
    res.status(500).json({ error: "Error saving image" });
  }
});
router.get("/images", async (req, res) => {
  try {
    // Fetch all images from the database
    const images = await ImageUpload.find({});

    if (images.length === 0) {
      return res.status(404).json({ message: "No images found" });
    }

    // Map through the images and create a response with the correct URLs
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving images" });
  }
});

router.delete("/images/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const objectId = new mongoose.Types.ObjectId(id);
    const image = await ImageUpload.findById(objectId);
    if (!image) {
      console.error("Image not found in the database for ID:");
      return res.status(404).json({ error: "Image not found" });
    }

    // Deleting the image from Cloudinary
    const publicId = image.imageName.split(".")[0]; // Assuming imageName includes the extension
    await cloudinary.uploader.destroy(publicId);

    // Deleting the image document from the database
    await ImageUpload.findByIdAndDelete(objectId);

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error while deleting image:", error);
    res.status(500).json({ error: "Error deleting image" });
  }
});
// Edit Image Details Route
router.put("/images/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  try {
    const image = await ImageUpload.findById(id);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Logic for updating the image
    image.imageName = req.file.filename;
    image.imagePath = req.file.path;

    await image.save();
    res.status(200).json({
      message: "Image updated successfully",
      updatedImage: image,
    });
  } catch (error) {
    console.error("Error updating image:");
    res.status(500).json({ error: "Failed to update image" });
  }
});

console.log(path.resolve(__dirname, "../frontend/dist"));
router.use(express.static(path.join(__dirname, "../frontend/dist"))); // Adjust path accordingly

// Fallback route for serving index.html
router.get("*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
});

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

app.use("/.netlify/functions/api", router);
module.exports.handler = serverless(app);
