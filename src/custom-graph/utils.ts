import { GraphView, LocalGraphView, View } from "obsidian";

export function isGraphView(view: View): view is GraphView {
  return view.getViewType() === "graph";
}

export function isLocalGraphView(view: View): view is LocalGraphView {
  return view.getViewType() === "localgraph";
}

export function getHierarchyRelationship(note1Path: string, note2Path: string): number | null {
  const parts1 = note1Path.split(".");
  const parts2 = note2Path.split(".");

  if (!note1Path.startsWith(parts2[0]) && !note2Path.startsWith(parts1[0])) {
    return null;
  }

  if (note1Path.startsWith(parts2[0])) {
    return parts1.length - parts2.length;
  } else {
    return parts2.length - parts1.length;
  }
}

export function getHierarchyWeight(levelDifference: number): number {
  return 1 / Math.abs(levelDifference);
}
