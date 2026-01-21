// ==UserScript==
// @name         Media Enhancement Suite - Web Asset Auditing Tool
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Professional web asset auditing tool for content creators to analyze media distribution
// @author       Your Name
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-idle
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        MESSAGE_SERVICE_URL: 'https://your-server.com/api/announcements.json', // 替换为你的服务器地址
        REFRESH_INTERVAL: 300000, // 5 minutes
        PANEL_WIDTH: '380px',
        PANEL_MIN_WIDTH: '50px',
        STORAGE_KEY: 'mediaAuditSuite_state'
    };

    // ==================== State Management ====================
    class StateManager {
        constructor() {
            this.state = {
                isMinimized: false,
                lastUpdate: null,
                announcements: []
            };
            this.loadState();
        }

        loadState() {
            try {
                const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (saved) {
                    this.state = { ...this.state, ...JSON.parse(saved) };
                }
            } catch (e) {
                console.warn('[Media Audit] Failed to load state:', e);
            }
        }

        saveState() {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
            } catch (e) {
                console.warn('[Media Audit] Failed to save state:', e);
            }
        }

        toggleMinimized() {
            this.state.isMinimized = !this.state.isMinimized;
            this.saveState();
            return this.state.isMinimized;
        }

        updateAnnouncements(data) {
            this.state.announcements = data;
            this.state.lastUpdate = new Date().toISOString();
            this.saveState();
        }
    }

    // ==================== Media Asset Scanner ====================
    class MediaAssetScanner {
        constructor() {
            this.assets = {
                video: [],
                audio: []
            };
        }

        scan() {
            this.assets.video = [];
            this.assets.audio = [];

            // Scan video elements
            document.querySelectorAll('video').forEach((element, index) => {
                const assetInfo = this.extractAssetInfo(element, 'video', index);
                this.assets.video.push(assetInfo);
            });

            // Scan audio elements
            document.querySelectorAll('audio').forEach((element, index) => {
                const assetInfo = this.extractAssetInfo(element, 'audio', index);
                this.assets.audio.push(assetInfo);
            });

            return this.assets;
        }

        extractAssetInfo(element, type, index) {
            const info = {
                id: `${type}_${index}`,
                type: type,
                src: element.src || element.currentSrc || 'N/A',
                sources: [],
                dimensions: type === 'video' ? `${element.videoWidth}x${element.videoHeight}` : 'N/A',
                duration: element.duration ? this.formatDuration(element.duration) : 'Unknown',
                readyState: this.getReadyStateText(element.readyState),
                networkState: this.getNetworkStateText(element.networkState),
                element: element
            };

            // Extract source elements
            element.querySelectorAll('source').forEach(source => {
                info.sources.push({
                    src: source.src,
                    type: source.type || 'Unknown'
                });
            });

            return info;
        }

        formatDuration(seconds) {
            if (!isFinite(seconds)) return 'Unknown';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        getReadyStateText(state) {
            const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
            return states[state] || 'UNKNOWN';
        }

        getNetworkStateText(state) {
            const states = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
            return states[state] || 'UNKNOWN';
        }
    }

    // ==================== Message Service ====================
    class MessageService {
        constructor(stateManager) {
            this.stateManager = stateManager;
            this.intervalId = null;
        }

        start() {
            this.fetchAnnouncements();
            this.intervalId = setInterval(() => {
                this.fetchAnnouncements();
            }, CONFIG.REFRESH_INTERVAL);
        }

        stop() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        }

        fetchAnnouncements() {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CONFIG.MESSAGE_SERVICE_URL,
                timeout: 10000,
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        this.stateManager.updateAnnouncements(data.announcements || []);
                        this.onAnnouncementsUpdate(data.announcements || []);
                    } catch (e) {
                        console.error('[Media Audit] Failed to parse announcements:', e);
                    }
                },
                onerror: (error) => {
                    console.error('[Media Audit] Failed to fetch announcements:', error);
                },
                ontimeout: () => {
                    console.warn('[Media Audit] Announcement fetch timeout');
                }
            });
        }

        onAnnouncementsUpdate(announcements) {
            // This will be set by the UI controller
        }
    }

    // ==================== UI Controller ====================
    class UIController {
        constructor(stateManager, scanner, messageService) {
            this.stateManager = stateManager;
            this.scanner = scanner;
            this.messageService = messageService;
            this.panel = null;
            this.init();
        }

        init() {
            this.injectStyles();
            this.createPanel();
            this.attachEventListeners();
            this.updateAssetList();
            
            // Set up message service callback
            this.messageService.onAnnouncementsUpdate = (announcements) => {
                this.updateAnnouncements(announcements);
            };

            // Initial announcement display
            if (this.stateManager.state.announcements.length > 0) {
                this.updateAnnouncements(this.stateManager.state.announcements);
            }
        }

        injectStyles() {
            GM_addStyle(`
                #mediaAuditPanel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: ${CONFIG.PANEL_WIDTH};
                    max-height: 80vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                #mediaAuditPanel.minimized {
                    width: ${CONFIG.PANEL_MIN_WIDTH};
                    height: 50px;
                }

                .mas-header {
                    background: rgba(0, 0, 0, 0.2);
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                }

                .mas-title {
                    color: white;
                    font-size: 14px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }

                .mas-controls {
                    display: flex;
                    gap: 8px;
                }

                .mas-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }

                .mas-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .mas-content {
                    background: white;
                    max-height: calc(80vh - 50px);
                    overflow-y: auto;
                }

                .mas-section {
                    padding: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .mas-section-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 12px;
                }

                .mas-announcement {
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    border-left: 3px solid #667eea;
                }

                .mas-announcement-title {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 4px;
                }

                .mas-announcement-text {
                    font-size: 12px;
                    color: #4b5563;
                    line-height: 1.5;
                }

                .mas-announcement-time {
                    font-size: 10px;
                    color: #9ca3af;
                    margin-top: 4px;
                }

                .mas-asset-item {
                    background: #f9fafb;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    border: 1px solid #e5e7eb;
                }

                .mas-asset-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .mas-asset-type {
                    font-size: 11px;
                    font-weight: 600;
                    color: white;
                    background: #667eea;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                .mas-asset-status {
                    font-size: 10px;
                    color: #059669;
                    font-weight: 500;
                }

                .mas-asset-url {
                    font-size: 11px;
                    color: #1f2937;
                    word-break: break-all;
                    margin-bottom: 8px;
                    font-family: 'Monaco', 'Courier New', monospace;
                    background: white;
                    padding: 6px;
                    border-radius: 4px;
                }

                .mas-asset-meta {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4px;
                    font-size: 10px;
                    color: #6b7280;
                }

                .mas-empty {
                    text-align: center;
                    padding: 24px;
                    color: #9ca3af;
                    font-size: 12px;
                }

                .mas-refresh-btn {
                    width: 100%;
                    padding: 10px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: background 0.2s;
                }

                .mas-refresh-btn:hover {
                    background: #5568d3;
                }

                .mas-content::-webkit-scrollbar {
                    width: 6px;
                }

                .mas-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }

                .mas-content::-webkit-scrollbar-thumb {
                    background: #667eea;
                    border-radius: 3px;
                }

                #mediaAuditPanel.minimized .mas-content,
                #mediaAuditPanel.minimized .mas-title {
                    display: none;
                }
            `);
        }

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.id = 'mediaAuditPanel';
            if (this.stateManager.state.isMinimized) {
                this.panel.classList.add('minimized');
            }

            this.panel.innerHTML = `
                <div class="mas-header">
                    <div class="mas-title">🎬 Media Audit Suite</div>
                    <div class="mas-controls">
                        <button class="mas-btn" id="masToggleBtn" title="Toggle Panel">−</button>
                    </div>
                </div>
                <div class="mas-content">
                    <div class="mas-section">
                        <div class="mas-section-title">📢 Development Announcements</div>
                        <div id="masAnnouncements">
                            <div class="mas-empty">Loading announcements...</div>
                        </div>
                    </div>
                    <div class="mas-section">
                        <div class="mas-section-title">📊 Media Assets</div>
                        <div id="masAssetList"></div>
                        <button class="mas-refresh-btn" id="masRefreshBtn">🔄 Refresh Assets</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.panel);
            this.makeDraggable();
        }

        attachEventListeners() {
            document.getElementById('masToggleBtn').addEventListener('click', () => {
                const isMinimized = this.stateManager.toggleMinimized();
                this.panel.classList.toggle('minimized', isMinimized);
                document.getElementById('masToggleBtn').textContent = isMinimized ? '+' : '−';
            });

            document.getElementById('masRefreshBtn').addEventListener('click', () => {
                this.updateAssetList();
            });
        }

        makeDraggable() {
            const header = this.panel.querySelector('.mas-header');
            let isDragging = false;
            let currentX, currentY, initialX, initialY;

            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                initialX = e.clientX - this.panel.offsetLeft;
                initialY = e.clientY - this.panel.offsetTop;
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    this.panel.style.left = currentX + 'px';
                    this.panel.style.top = currentY + 'px';
                    this.panel.style.right = 'auto';
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }

        updateAnnouncements(announcements) {
            const container = document.getElementById('masAnnouncements');
            
            if (!announcements || announcements.length === 0) {
                container.innerHTML = '<div class="mas-empty">No announcements available</div>';
                return;
            }

            container.innerHTML = announcements.map(announcement => `
                <div class="mas-announcement">
                    <div class="mas-announcement-title">${this.escapeHtml(announcement.title || 'Announcement')}</div>
                    <div class="mas-announcement-text">${this.escapeHtml(announcement.message || '')}</div>
                    <div class="mas-announcement-time">${announcement.timestamp || ''}</div>
                </div>
            `).join('');
        }

        updateAssetList() {
            const assets = this.scanner.scan();
            const container = document.getElementById('masAssetList');
            
            const totalAssets = assets.video.length + assets.audio.length;
            
            if (totalAssets === 0) {
                container.innerHTML = '<div class="mas-empty">No media assets found on this page</div>';
                console.log('[Media Audit] No media assets detected');
                return;
            }

            const allAssets = [...assets.video, ...assets.audio];
            
            container.innerHTML = allAssets.map(asset => `
                <div class="mas-asset-item">
                    <div class="mas-asset-header">
                        <span class="mas-asset-type">${asset.type}</span>
                        <span class="mas-asset-status">${asset.readyState}</span>
                    </div>
                    <div class="mas-asset-url">${this.escapeHtml(asset.src)}</div>
                    ${asset.sources.length > 0 ? `
                        <div class="mas-asset-url" style="margin-top: 4px;">
                            <strong>Sources:</strong><br>
                            ${asset.sources.map(s => `${this.escapeHtml(s.src)} (${s.type})`).join('<br>')}
                        </div>
                    ` : ''}
                    <div class="mas-asset-meta">
                        <div>Duration: ${asset.duration}</div>
                        <div>Network: ${asset.networkState}</div>
                        ${asset.type === 'video' ? `<div>Size: ${asset.dimensions}</div>` : ''}
                    </div>
                </div>
            `).join('');

            // Log to console for developer inspection
            console.group('[Media Audit] Asset Scan Results');
            console.log(`Total Assets: ${totalAssets}`);
            console.log('Video Assets:', assets.video);
            console.log('Audio Assets:', assets.audio);
            console.groupEnd();
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // ==================== Application Bootstrap ====================
    class MediaAuditSuite {
        constructor() {
            this.stateManager = new StateManager();
            this.scanner = new MediaAssetScanner();
            this.messageService = new MessageService(this.stateManager);
            this.uiController = null;
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            } else {
                this.start();
            }
        }

        start() {
            console.log('[Media Audit] Initializing Media Enhancement Suite...');
            
            this.uiController = new UIController(
                this.stateManager,
                this.scanner,
                this.messageService
            );

            this.messageService.start();

            // Set up mutation observer to detect dynamically loaded media
            this.observeMediaChanges();

            console.log('[Media Audit] Suite initialized successfully');
        }

        observeMediaChanges() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' ||
                                node.querySelector('video, audio')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                });

                if (shouldUpdate && this.uiController) {
                    console.log('[Media Audit] New media elements detected, updating...');
                    this.uiController.updateAssetList();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // ==================== Initialize Application ====================
    const app = new MediaAuditSuite();
    app.init();

})();
