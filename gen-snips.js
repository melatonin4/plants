const fs = require("fs");
const path = require("path");

const imagesDir = path.join(__dirname, "public", "images");

// Get ALL folders (not just plant-*)
const folders = fs
  .readdirSync(imagesDir)
  .filter((folder) => {
    const folderPath = path.join(imagesDir, folder);
    return fs.statSync(folderPath).isDirectory(); // Any directory
  })
  .map((folder) => {
    const folderPath = path.join(imagesDir, folder);
    const stats = fs.statSync(folderPath);
    return {
      name: folder,
      birthtime: stats.birthtime, // Creation time (macOS)
      ctime: stats.ctime, // Change time (fallback)
    };
  })
  // Sort by creation time (oldest first)
  .sort((a, b) => a.birthtime - b.birthtime || a.ctime - b.ctime);

const snippets = [];

folders.forEach((folder, index) => {
  const folderPath = path.join(imagesDir, folder.name);
  const files = fs
    .readdirSync(folderPath)
    .filter(
      (file) =>
        file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg")
    )
    .sort();

  if (files.length > 0) {
    // Convert folder name to display name (capitalize first letter)
    const displayName =
      folder.name.charAt(0).toUpperCase() + folder.name.slice(1);

    snippets.push({
      id: folder.name,
      title: `${index + 1}. ${displayName}: in CV plaza`,
      imageFilenames: files,
      defaultNote: "",
    });
  }
});

const jsCode = `// snippets-data.js
// Auto-generated from image folders (sorted by creation date)
// Last updated: ${new Date().toISOString()}

export const SNIPPET_DATA = ${JSON.stringify(snippets, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, "src", "snippets-data.js"), jsCode);
console.log(
  "✅ Generated snippets-data.js with",
  snippets.length,
  "folders (creation order)"
);
