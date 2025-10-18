import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, "public", "images");

// Get ALL folders
const folders = fs
  .readdirSync(imagesDir)
  .filter((folder) => {
    const folderPath = path.join(imagesDir, folder);
    return fs.statSync(folderPath).isDirectory();
  })
  .map((folder) => {
    const folderPath = path.join(imagesDir, folder);
    const stats = fs.statSync(folderPath);
    return {
      name: folder,
      birthtime: stats.birthtime,
      ctime: stats.ctime,
    };
  })
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
    // Extract base name by removing numbering suffixes like -01, -02, etc.
    const baseName = folder.name.replace(/-\d+$/, "");

    // Convert to display name (capitalize first letter of each word)
    const displayName = baseName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    snippets.push({
      id: folder.name,
      title: `${index + 1}. ${displayName}`,
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
