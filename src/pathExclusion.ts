export function isPathExcluded(path: string, excludedPaths: string[]): boolean {
  return excludedPaths.some(pattern => {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  });
}
