<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { VPdfViewer } from '@vue-pdf-viewer/viewer';

interface FileNode {
  name: string;
  type: 'directory' | 'file';
  path: string;
  extension?: string;
  children?: FileNode[];
}

const rootFiles = ref<FileNode[]>([]);
const currentPath = ref<string[]>([]);
const searchQuery = ref('');
const showPdfViewer = ref(false);
const currentPdfSrc = ref('');

// Fetch file index
onMounted(async () => {
  try {
    const response = await fetch('./files.json');
    rootFiles.value = await response.json();
  } catch (e) {
    console.error('Failed to load file index', e);
  }
});

// Helper to get current directory items
const currentItems = computed(() => {
  let items = rootFiles.value;
  for (const folder of currentPath.value) {
    const found = items.find(i => i.name === folder && i.type === 'directory');
    if (found && found.children) {
      items = found.children;
    } else {
      return [];
    }
  }
  return items;
});

// Filtered items
const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return currentItems.value;
  
  // Global search if query exists
  return searchRecursive(rootFiles.value, query);
});

function searchRecursive(nodes: FileNode[], query: string): FileNode[] {
  let results: FileNode[] = [];
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) {
      results.push(node);
    }
    if (node.type === 'directory' && node.children) {
      results = results.concat(searchRecursive(node.children, query));
    }
  }
  return results;
}

function handleItemClick(item: FileNode) {
  if (item.type === 'directory') {
    if (searchQuery.value) {
        // If clicking a folder in search results, navigate to it and clear search
        // item.path is like "Economics" or "Economics/Sub"
        // We need to split by '/' to get the path array
        const parts = item.path.split('/').filter(p => p);
        currentPath.value = parts;
        searchQuery.value = '';
    } else {
        currentPath.value.push(item.name);
    }
  } else if (item.extension === '.pdf') {
    // Construct full URL.
    // The script generates paths relative to public/Files, e.g. "Economics/file.pdf"
    // So we prepend /Files/
    // Note: On GitHub Pages with a subpath, we might need the base URL.
    // But usually standard href works if relative.
    // Let's use relative path "./Files/"
    currentPdfSrc.value = `./Files/${item.path}`;
    showPdfViewer.value = true;
  }
}

function goBack() {
  if (currentPath.value.length > 0) {
    currentPath.value.pop();
  }
}

function navigateTo(index: number) {
    if (index === -1) {
        currentPath.value = [];
    } else {
        currentPath.value = currentPath.value.slice(0, index + 1);
    }
}
</script>

<template>
  <div class="file-explorer">
    <!-- Header / Navigation -->
    <div class="header">
        <div class="breadcrumbs">
            <span class="crumb root" @click="navigateTo(-1)">
                <i class="fa-solid fa-home"></i> Home
            </span>
            <template v-for="(folder, index) in currentPath" :key="index">
                <span class="separator">/</span>
                <span class="crumb" @click="navigateTo(index)">{{ folder }}</span>
            </template>
        </div>
        <div class="search-box">
            <i class="fa-solid fa-search search-icon"></i>
            <input v-model="searchQuery" placeholder="Search files..." />
        </div>
    </div>

    <!-- Back Button -->
    <div v-if="currentPath.length > 0 && !searchQuery" class="actions">
        <button @click="goBack" class="back-btn">
            <i class="fa-solid fa-arrow-left"></i> Back
        </button>
    </div>

    <!-- File List -->
    <div class="file-list">
        <div v-for="item in filteredItems" :key="item.path" class="file-item" @click="handleItemClick(item)">
            <div class="icon">
                <i v-if="item.type === 'directory'" class="fa-solid fa-folder folder-icon"></i>
                <i v-else-if="item.extension === '.pdf'" class="fa-solid fa-file-pdf pdf-icon"></i>
                <i v-else class="fa-solid fa-file file-icon"></i>
            </div>
            <div class="info">
                <div class="name">{{ item.name }}</div>
                <div class="sub-text" v-if="searchQuery">{{ item.path }}</div>
            </div>
        </div>
        <div v-if="filteredItems.length === 0" class="empty-state">
            <i class="fa-solid fa-folder-open"></i>
            <p>No items found.</p>
        </div>
    </div>

    <!-- PDF Viewer Modal -->
    <div v-if="showPdfViewer" class="pdf-modal">
        <div class="pdf-header">
            <span class="pdf-title">{{ currentPdfSrc.split('/').pop() }}</span>
            <button @click="showPdfViewer = false" class="close-btn">
                <i class="fa-solid fa-times"></i> Close
            </button>
        </div>
        <div class="pdf-container">
            <VPdfViewer :src="currentPdfSrc" />
        </div>
    </div>
  </div>
</template>

<style scoped>
.file-explorer {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}

.crumb {
    cursor: pointer;
    color: #007bff;
    font-weight: 500;
    transition: color 0.2s;
}

.crumb:hover {
    color: #0056b3;
    text-decoration: underline;
}

.crumb.root {
    font-weight: bold;
}

.separator {
    margin: 0 8px;
    color: #6c757d;
}

.search-box {
    position: relative;
    width: 300px;
}

.search-box input {
    width: 100%;
    padding: 10px 10px 10px 35px;
    border: 1px solid #ced4da;
    border-radius: 20px;
    outline: none;
    transition: border-color 0.2s;
}

.search-box input:focus {
    border-color: #80bdff;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
}

.actions {
    margin-bottom: 15px;
}

.back-btn {
    background: none;
    border: none;
    color: #495057;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 1rem;
    padding: 5px 10px;
    border-radius: 4px;
}

.back-btn:hover {
    background-color: #e9ecef;
}

.file-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 20px;
}

.file-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    text-align: center;
    background: white;
}

.file-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    border-color: #007bff;
}

.icon {
    font-size: 3rem;
    margin-bottom: 10px;
}

.folder-icon {
    color: #ffc107;
}

.pdf-icon {
    color: #dc3545;
}

.file-icon {
    color: #6c757d;
}

.info {
    width: 100%;
}

.name {
    font-weight: 500;
    color: #343a40;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sub-text {
    font-size: 0.8rem;
    color: #868e96;
    margin-top: 5px;
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 50px;
    color: #adb5bd;
}

.empty-state i {
    font-size: 4rem;
    margin-bottom: 10px;
}

/* PDF Modal */
.pdf-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.8);
    z-index: 1000;
    display: flex;
    flex-direction: column;
}

.pdf-header {
    background: #343a40;
    color: white;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pdf-title {
    font-weight: bold;
    font-size: 1.1rem;
}

.close-btn {
    background: #dc3545;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.close-btn:hover {
    background: #c82333;
}

.pdf-container {
    flex: 1;
    overflow: hidden;
    background: #525659;
    padding: 20px;
    display: flex;
    justify-content: center;
}

/* Adjust VPdfViewer container size */
.pdf-container > div {
    width: 100%;
    height: 100%;
    max-width: 1000px;
    background: white;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
}
</style>
