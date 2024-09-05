import type { Stat, TFile, Vault } from "obsidian";
import { Note } from "../src/engine/note";
import { NoteTree } from "../src/engine/noteTree";
import { parsePath } from "../src/path";
import { StructuredTreePluginSettings, DEFAULT_SETTINGS } from "../src/settings";

const testSettings: StructuredTreePluginSettings = {
  ...DEFAULT_SETTINGS,
  titleKey: "title",
  descKey: "desc",
};

describe("note title", () => {
  // ... (keep these tests as they are)
});

describe("note class", () => {
  it("append and remove child work", () => {
    const child = new Note("lala", true, testSettings);
    expect(child.parent).toBeUndefined();

    const parent = new Note("apa", true, testSettings);
    expect(parent.children).toEqual([]);

    parent.appendChild(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toEqual([child]);

    parent.removeChildren(child);
    expect(child.parent).toBeUndefined();
    expect(parent.children).toEqual([]);
  });

  it("append child must throw if child already has parent", () => {
    const origParent = new Note("root", true, testSettings);
    const parent = new Note("root2", true, testSettings);
    const child = new Note("child", true, testSettings);

    origParent.appendChild(child);

    expect(() => parent.appendChild(child)).toThrowError("has parent");
  });

  it("find children work", () => {
    const parent = new Note("parent", true, testSettings);
    const child1 = new Note("child1", true, testSettings);
    const child2 = new Note("child2", true, testSettings);
    const child3 = new Note("child3", true, testSettings);

    parent.appendChild(child1);
    parent.appendChild(child2);
    parent.appendChild(child3);

    expect(parent.findChildren("child1")).toBe(child1);
    expect(parent.findChildren("child2")).toBe(child2);
    expect(parent.findChildren("child3")).toBe(child3);
    expect(parent.findChildren("child4")).toBeUndefined();
  });

  it("non-recursive sort children work", () => {
    const parent = new Note("parent", true, testSettings);
    const child1 = new Note("gajak", true, testSettings);
    const child2 = new Note("lumba", true, testSettings);
    const child3 = new Note("biawak", true, testSettings);

    parent.appendChild(child1);
    parent.appendChild(child2);
    parent.appendChild(child3);

    expect(parent.children).toEqual([child1, child2, child3]);
    parent.sortChildren(false);
    expect(parent.children).toEqual([child3, child1, child2]);
  });

  it("recursive sort children work", () => {
    const parent = new Note("parent", true, testSettings);
    const child1 = new Note("lumba", true, testSettings);
    const child2 = new Note("galak", true, testSettings);
    const grandchild1 = new Note("lupa", true, testSettings);
    const grandchild2 = new Note("apa", true, testSettings);
    const grandchild3 = new Note("abu", true, testSettings);
    const grandchild4 = new Note("lagi", true, testSettings);

    parent.appendChild(child1);
    child1.appendChild(grandchild1);
    child1.appendChild(grandchild2);
    parent.appendChild(child2);
    child2.appendChild(grandchild3);
    child2.appendChild(grandchild4);

    expect(parent.children).toEqual([child1, child2]);
    expect(child1.children).toEqual([grandchild1, grandchild2]);
    expect(child2.children).toEqual([grandchild3, grandchild4]);
    parent.sortChildren(true);
    expect(parent.children).toEqual([child2, child1]);
    expect(child1.children).toEqual([grandchild2, grandchild1]);
    expect(child2.children).toEqual([grandchild3, grandchild4]);
  });

  it("get path on non-root", () => {
    const root = new Note("root", true, testSettings);
    const ch1 = new Note("parent", true, testSettings);
    const ch2 = new Note("parent2", true, testSettings);
    const ch3 = new Note("child", true, testSettings);

    root.appendChild(ch1);
    ch1.appendChild(ch2);
    ch2.appendChild(ch3);

    expect(ch3.getPath()).toBe("parent.parent2.child");
    expect(ch3.getPathNotes()).toEqual([root, ch1, ch2, ch3]);
  });

  it("get path on root", () => {
    const root = new Note("root", true, testSettings);
    expect(root.getPath()).toBe("root");
    expect(root.getPathNotes()).toEqual([root]);
  });

  it("use generated title when titlecase true", () => {
    const note = new Note("aku-cinta", true, testSettings);
    expect(note.title).toBe("Aku Cinta");
  });

  it("use filename as title when titlecase false", () => {
    const note = new Note("aKu-ciNta", false, testSettings);
    expect(note.title).toBe("aKu-ciNta");
  });

  it("use metadata title when has metadata", () => {
    const note = new Note("aKu-ciNta", false, testSettings);
    note.syncMetadata({
      title: "Butuh Kamu",
    });
    expect(note.title).toBe("Butuh Kamu");
  });
});

function createTFile(path: string): TFile {
  const { basename, name, extension } = parsePath(path);
  return {
    basename,
    extension,
    name,
    parent: null,
    path: path,
    stat: null as unknown as Stat,
    vault: null as unknown as Vault,
  };
}

describe("tree class", () => {
  it("add file without sort", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.jkl.md"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    expect(tree.root.children.length).toBe(1);
    expect(tree.root.children[0].name).toBe("abc");
    expect(tree.root.children[0].children.length).toBe(1);
    expect(tree.root.children[0].children[0].name).toBe("def");
    expect(tree.root.children[0].children[0].children.length).toBe(2);
    expect(tree.root.children[0].children[0].children[0].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[1].name).toBe("ghi");
  });

  it("add file with sort", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.jkl.md"), testSettings, true);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings, true);
    tree.addFile(createTFile("abc.def.mno.md"), testSettings, true);
    expect(tree.root.children[0].children[0].children.length).toBe(3);
    expect(tree.root.children[0].children[0].children[0].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[1].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
  });

  it("get note by file base name", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.jkl.md"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    expect(tree.getFromFileName("abc.def.jkl")?.name).toBe("jkl");
    expect(tree.getFromFileName("abc.def.ghi")?.name).toBe("ghi");
    expect(tree.getFromFileName("abc.def.mno")).toBeUndefined();
  });

  it("get note using blank path", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.jkl.md"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    expect(tree.getFromFileName("")).toBeUndefined();
  });

  it("delete note if do not have children", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.md"), testSettings);
    tree.deleteByFileName("abc");
    expect(tree.getFromFileName("abc")).toBeUndefined();
  });

  it("do not delete note if have children", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.md"), testSettings);
    tree.addFile(createTFile("abc.def.md"), testSettings);
    tree.deleteByFileName("abc");
    expect(tree.getFromFileName("abc")?.name).toBe("abc");
    expect(tree.getFromFileName("abc.def")?.name).toBe("def");
  });

  it("delete note and parent if do not have children and parent file is null", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    tree.deleteByFileName("abc.def.ghi");
    expect(tree.getFromFileName("abc.def.ghi")).toBeUndefined();
    expect(tree.getFromFileName("abc.def")).toBeUndefined();
    expect(tree.getFromFileName("abc")?.name).toBe("abc");
  });

  it("sort note", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.jkl.md"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    tree.addFile(createTFile("abc.def.mno.md"), testSettings);
    expect(tree.root.children[0].children[0].children.length).toBe(3);
    expect(tree.root.children[0].children[0].children[0].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[1].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
    tree.sort();
    expect(tree.root.children[0].children[0].children[0].name).toBe("ghi");
    expect(tree.root.children[0].children[0].children[1].name).toBe("jkl");
    expect(tree.root.children[0].children[0].children[2].name).toBe("mno");
  });

  it("flatten note", () => {
    const tree = new NoteTree(testSettings);
    tree.addFile(createTFile("abc.def.md"), testSettings);
    tree.addFile(createTFile("abc.def.ghi.md"), testSettings);
    tree.addFile(createTFile("abc.jkl.mno.md"), testSettings);
    expect(tree.flatten().map((note) => note.getPath())).toEqual([
      "root",
      "abc",
      "abc.def",
      "abc.def.ghi",
      "abc.jkl",
      "abc.jkl.mno",
    ]);
  });
});
