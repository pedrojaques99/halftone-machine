// UI Elements
const uploadArea = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const exportVideoBtn = document.getElementById('export-video');
const exportImageBtn = document.getElementById('export-image');
const videoControls = document.querySelector('.video-controls');
let currentFile = null;

// Handle drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});

// Add drag feedback
['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    uploadArea.classList.add('drag-over');
}

function unhighlight(e) {
    uploadArea.classList.remove('drag-over');
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// File handling
uploadArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    handleFiles(e.dataTransfer.files);
}

function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    if (!files.length) return;
    
    const file = files[0];
    currentFile = file;
    
    if (file.type.startsWith('video/')) {
        exportVideoBtn.classList.remove('disabled');
        exportImageBtn.classList.add('disabled');
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
            videoControls.classList.add('show');
        };
    } else if (file.type.startsWith('image/')) {
        exportImageBtn.classList.remove('disabled');
        exportVideoBtn.classList.add('disabled');
        videoControls.classList.remove('show');
    } else {
        alert('Please upload a valid image or video file.');
    }
}

// Dropdown handling
document.querySelectorAll('.video-controls .dropdown-label').forEach(dropdown => {
    dropdown.addEventListener('click', (e) => {
        const currentGroup = e.target.closest('.control-group');
        document.querySelectorAll('.video-controls .control-group').forEach(group => {
            if (group !== currentGroup) group.classList.remove('open');
        });
        currentGroup.classList.toggle('open');
        e.stopPropagation();
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.control-group')) {
        document.querySelectorAll('.control-group').forEach(group => {
            group.classList.remove('open');
        });
    }
});

// Panel toggle functionality
document.querySelectorAll('.toggle-panel').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        if (targetId === 'video-controls') {
            const panel = document.querySelector('.' + targetId);
            const isCollapsed = panel.classList.toggle('collapsed');
            button.querySelector('svg').style.transform = isCollapsed ? 'rotate(-90deg)' : '';
            localStorage.setItem(targetId + '-collapsed', isCollapsed);
        }
    });
});

// Restore panel states
const videoControlsBtn = document.querySelector('[data-target="video-controls"]');
if (videoControlsBtn) {
    const isCollapsed = localStorage.getItem('video-controls-collapsed') === 'true';
    if (isCollapsed) {
        const panel = document.querySelector('.video-controls');
        panel.classList.add('collapsed');
        videoControlsBtn.querySelector('svg').style.transform = 'rotate(-90deg)';
    }
}

// Remove effect controls toggle button
const effectToggleBtn = document.querySelector('[data-target="effect-controls"]');
if (effectToggleBtn) effectToggleBtn.remove(); 