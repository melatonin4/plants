// scripts/generate-image-manifest.js
const fs = require("fs");
const path = require("path");

const imageManifest = {};

// Read all plant folders
const imagesDir = path.join(__dirname, "../public/images");
const plantFolders = fs
  .readdirSync(imagesDir)
  .filter((folder) => folder.startsWith("plant-"));

plantFolders.forEach((folder) => {
  const folderPath = path.join(imagesDir, folder);
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".jpg"));
  imageManifest[folder] = files.map((file) => `/images/${folder}/${file}`);
});

// Write manifest file
fs.writeFileSync(
  path.join(__dirname, "../src/image-manifest.json"),
  JSON.stringify(imageManifest, null, 2)
);

console.log("✅ Image manifest generated!");
