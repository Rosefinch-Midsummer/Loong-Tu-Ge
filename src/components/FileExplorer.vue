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
    <!-- Fixed Header with Search -->
    <div class="fixed-header">
      <div class="header-content">
        <div class="search-box-wrapper">
             <div class="search-box">
                <i class="fa-solid fa-search search-icon"></i>
                <input v-model="searchQuery" placeholder="Search files..." />
            </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
        <!-- Navigation / Breadcrumbs -->
        <div class="navigation-bar">
             <div class="breadcrumbs">
                <span class="crumb root" @click="navigateTo(-1)">
                    <i class="fa-solid fa-home"></i> Home
                </span>
                <template v-for="(folder, index) in currentPath" :key="index">
                    <span class="separator">/</span>
                    <span class="crumb" @click="navigateTo(index)">{{ folder }}</span>
                </template>
            </div>
             <button v-if="currentPath.length > 0 && !searchQuery" @click="goBack" class="back-btn">
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
    min-height: 100vh;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
}

.fixed-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.header-content {
    width: 100%;
    max-width: 1600px;
    padding: 0 20px;
    display: flex;
    justify-content: center;
}

.search-box-wrapper {
    width: 100%;
    max-width: 600px; /* Limit width for aesthetics */
}

.search-box {
    position: relative;
    width: 100%;
}

.search-box input {
    width: 100%;
    padding: 12px 20px 12px 45px;
    border: 1px solid #e0e0e0;
    border-radius: 25px;
    font-size: 16px;
    background: #f8f9fa;
    transition: all 0.3s ease;
}

.search-box input:focus {
    outline: none;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    border-color: #80bdff;
}

.search-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
}

.main-content {
    padding-top: 90px; /* Space for fixed header */
    padding-bottom: 40px;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding-left: 20px;
    padding-right: 20px;
    box-sizing: border-box;
}

.navigation-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    background: white;
    padding: 15px 20px;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    flex-wrap: wrap;
    gap: 10px;
}

.breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    font-size: 16px;
}

.crumb {
    cursor: pointer;
    color: #495057;
    font-weight: 500;
    transition: color 0.2s;
    padding: 4px 8px;
    border-radius: 4px;
}

.crumb:hover {
    color: #007bff;
    background: #e9ecef;
}

.crumb.root {
    font-weight: 600;
}

.separator {
    color: #adb5bd;
    margin: 0 4px;
}

.back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    background-color: #e9ecef;
    color: #495057;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.back-btn:hover {
    background-color: #dde2e6;
    transform: translateY(-1px);
}

.file-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
}

.file-item {
    background: white;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    border: 1px solid transparent;
}

.file-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
    border-color: #007bff;
}

.icon {
    font-size: 48px;
    margin-bottom: 15px;
}

.folder-icon { color: #ffd700; }
.pdf-icon { color: #dc3545; }
.file-icon { color: #6c757d; }

.info .name {
    font-weight: 500;
    color: #343a40;
    word-break: break-word;
    line-height: 1.4;
}

.info .sub-text {
    font-size: 12px;
    color: #868e96;
    margin-top: 4px;
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px;
    color: #adb5bd;
}

.empty-state i {
    font-size: 64px;
    margin-bottom: 16px;
}

.pdf-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 2000;
    display: flex;
    flex-direction: column;
}

.pdf-header {
    height: 60px;
    background: #343a40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    color: white;
}

.pdf-title {
    font-weight: 500;
    font-size: 18px;
}

.close-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.close-btn:hover {
    background: rgba(255,255,255,0.1);
}

.pdf-container {
    flex: 1;
    overflow: hidden;
    background: #525659;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .fixed-header {
        height: 60px;
    }
    
    .main-content {
        padding-top: 75px;
    }

    .file-list {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 15px;
    }

    .icon {
        font-size: 36px;
    }
    
    .file-item {
        padding: 15px;
    }
    
    .navigation-bar {
        padding: 10px 15px;
        flex-direction: column;
        align-items: flex-start;
    }
    
    .back-btn {
        width: 100%;
        justify-content: center;
    }
}
</style>
