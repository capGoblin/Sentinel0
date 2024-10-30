import { create } from "zustand";

type FileType = "folder" | "text" | "image";

interface File {
  id: string;
  name: string;
  type: FileType;
  owner: string;
  lastModified: string;
  size: string;
}

interface FileSystemState {
  filesByPath: Record<string, File[]>;
  currentPath: string;
  addFile: (file: Omit<File, "id">, path?: string) => void;
  addFolder: (name: string, path?: string) => void;
  deleteFile: (name: string, path?: string) => void;
  setCurrentPath: (path: string) => void;
  getFilesAtPath: (path: string) => File[];
}

const getFileType = (fileName: string): FileType => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  if (imageExtensions.includes(extension)) {
    return "image";
  }

  return "text";
};

export const useStore = create<FileSystemState>((set, get) => ({
  filesByPath: {
    "/": [
      {
        id: "1",
        name: "Photos",
        type: "folder",
        owner: "me",
        lastModified: new Date().toLocaleDateString(),
        size: "-",
      },
      {
        id: "2",
        name: "Documents",
        type: "folder",
        owner: "me",
        lastModified: new Date().toLocaleDateString(),
        size: "-",
      },
    ],
  },
  currentPath: "/",

  addFile: (file, path = get().currentPath) => {
    set((state) => {
      const newFilesByPath = { ...state.filesByPath };
      if (!newFilesByPath[path]) {
        newFilesByPath[path] = [];
      }

      // Check if file with same name exists
      const fileExists = newFilesByPath[path].some((f) => f.name === file.name);
      let fileName = file.name;

      // If file exists, add number to name
      if (fileExists) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const extension = file.name.split(".").pop();
        let counter = 1;
        while (newFilesByPath[path].some((f) => f.name === fileName)) {
          fileName = `${baseName} (${counter}).${extension}`;
          counter++;
        }
      }

      newFilesByPath[path] = [
        ...newFilesByPath[path],
        {
          ...file,
          id: crypto.randomUUID(),
          name: fileName,
          type: getFileType(fileName),
        },
      ];
      return { filesByPath: newFilesByPath };
    });
  },

  addFolder: (name, path = get().currentPath) => {
    const newFolder: Omit<File, "id"> = {
      name,
      type: "folder",
      owner: "me",
      lastModified: new Date().toLocaleDateString(),
      size: "-",
    };
    get().addFile(newFolder, path);

    // Initialize empty array for the new folder's path
    const newFolderPath = path === "/" ? `/${name}` : `${path}/${name}`;
    set((state) => ({
      filesByPath: {
        ...state.filesByPath,
        [newFolderPath]: [],
      },
    }));
  },

  deleteFile: (name, path = get().currentPath) => {
    set((state) => {
      const newFilesByPath = { ...state.filesByPath };

      // Remove file from current path
      newFilesByPath[path] = newFilesByPath[path].filter(
        (file) => file.name !== name
      );

      // If it's a folder, remove all subpaths
      const fullPath = path === "/" ? `/${name}` : `${path}/${name}`;
      Object.keys(newFilesByPath).forEach((key) => {
        if (key.startsWith(fullPath)) {
          delete newFilesByPath[key];
        }
      });

      return { filesByPath: newFilesByPath };
    });
  },

  setCurrentPath: (path) => set({ currentPath: path }),

  getFilesAtPath: (path) => {
    return get().filesByPath[path] || [];
  },
}));

// Helper functions
export const getParentPath = (path: string) => {
  if (path === "/") return "/";
  const segments = path.split("/").filter(Boolean);
  segments.pop();
  return segments.length === 0 ? "/" : "/" + segments.join("/");
};

export const getPathSegments = (path: string) => {
  return path.split("/").filter(Boolean);
};
