export const supportedExtensions = [
  "md",    // Markdown files
  "pdf",   // PDF documents
  "avif",  // Image files
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg", 
  "flac",  // Audio files
  "m4a",
  "mp3",
  "ogg",
  "wav",
  "webm",
  "3gp",   // Video files
  "mkv",
  "mov",
  "mp4",
  "ogv",
];

export function getSupportedExtensions(includeCanvas: boolean): Set<string> {
  const extensions = new Set(supportedExtensions);
  if (includeCanvas) {
    extensions.add("canvas");
  }
  return extensions;
}