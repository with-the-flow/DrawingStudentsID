// ============================================
// 配置常量模块（Configuration Constants）
// ============================================
const CONFIG = Object.freeze({
    DEFAULTS: {
        MIN_STUDENT: 1,
        MAX_STUDENT: 52,
        FLICKER_SPEED: 50
    },
    LIMITS: {
        MAX_STUDENT_ID: 1000000000,
        MIN_SPEED: 1,
        MAX_SPEED: 10000
    },
    URLS: {
        SOURCE_CODE: 'https://github.com/WuiQeFan/DrawingStudentsID/archive/refs/heads/master.zip'
    },
    SELECTORS: {
        MODE_DROPDOWN: '#mode',
        INTERFACES: '.interface',
        SETTINGS_MODAL: '#settingsModal',
        MASK_LAYER: '#mask',
        FLICKER_RESULT: '#FlickerResult',
        MIN_INPUT: '#MinTotalStudents',
        MAX_INPUT: '#MaxTotalStudents',
        SPEED_INPUT: '#fast'
    }
});

// ============================================
// 领域模型（Domain Models）
// ============================================

/**
 * 学生ID范围值对象
 */
class StudentIdRange {
    constructor(min, max) {
        this._validate(min, max);
        this.min = min;
        this.max = max;
    }

    _validate(min, max) {
        if (!Number.isInteger(min) || !Number.isInteger(max)) {
            throw new ValidationError('学号必须是整数');
        }
        if (min < 1 || max < 1) {
            throw new ValidationError('学号必须大于0');
        }
        if (min >= max) {
            throw new ValidationError('最小值必须小于最大值');
        }
        if (min > CONFIG.LIMITS.MAX_STUDENT_ID || max > CONFIG.LIMITS.MAX_STUDENT_ID) {
            throw new ValidationError(`学号不能超过${CONFIG.LIMITS.MAX_STUDENT_ID}`);
        }
    }

    generateRandom() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
    }

    toJSON() {
        return { min: this.min, max: this.max };
    }
}

/**
 * 闪烁速度值对象
 */
class FlickerSpeed {
    constructor(milliseconds) {
        this._validate(milliseconds);
        this.value = milliseconds;
    }

    _validate(ms) {
        if (!Number.isInteger(ms) || ms < CONFIG.LIMITS.MIN_SPEED || ms > CONFIG.LIMITS.MAX_SPEED) {
            throw new ValidationError(`速度必须在${CONFIG.LIMITS.MIN_SPEED}-${CONFIG.LIMITS.MAX_SPEED}之间`);
        }
    }
}

/**
 * 自定义验证错误
 */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ============================================
// 存储库接口（Repository Interface）
// ============================================

/**
 * 应用状态存储接口
 */
class IAppStateRepository {
    getMinStudent() { throw new Error('Abstract method'); }
    getMaxStudent() { throw new Error('Abstract method'); }
    getFlickerSpeed() { throw new Error('Abstract method'); }
    isFlickering() { throw new Error('Abstract method'); }
    getIntervalId() { throw new Error('Abstract method'); }
    
    updateRange(range) { throw new Error('Abstract method'); }
    updateSpeed(speed) { throw new Error('Abstract method'); }
    setFlickering(isFlickering) { throw new Error('Abstract method'); }
    setIntervalId(id) { throw new Error('Abstract method'); }
    clearIntervalId() { throw new Error('Abstract method'); }
}

/**
 * 内存状态存储实现（可替换为LocalStorage等）
 */
class InMemoryAppStateRepository extends IAppStateRepository {
    constructor(initialState = {}) {
        super();
        this._state = {
            range: new StudentIdRange(
                initialState.min ?? CONFIG.DEFAULTS.MIN_STUDENT,
                initialState.max ?? CONFIG.DEFAULTS.MAX_STUDENT
            ),
            speed: new FlickerSpeed(initialState.fast ?? CONFIG.DEFAULTS.FLICKER_SPEED),
            isFlickering: false,
            intervalId: null
        };
    }

    getMinStudent() { return this._state.range.min; }
    getMaxStudent() { return this._state.range.max; }
    getFlickerSpeed() { return this._state.speed.value; }
    isFlickering() { return this._state.isFlickering; }
    getIntervalId() { return this._state.intervalId; }

    updateRange(range) {
        this._state.range = range;
    }

    updateSpeed(speed) {
        this._state.speed = speed;
    }

    setFlickering(isFlickering) {
        this._state.isFlickering = isFlickering;
    }

    setIntervalId(id) {
        this._state.intervalId = id;
    }

    clearIntervalId() {
        if (this._state.intervalId) {
            clearInterval(this._state.intervalId);
            this._state.intervalId = null;
        }
    }
}

// ============================================
// 服务层（Services）
// ============================================

/**
 * 文件下载服务
 */
class FileDownloadService {
    constructor(url) {
        this.url = url;
    }

    async download(filename) {
        try {
            const blob = await this._fetchBlob();
            this._triggerDownload(blob, filename);
        } catch (error) {
            throw new DownloadError(`下载失败: ${error.message}`);
        }
    }

    async _fetchBlob() {
        const response = await fetch(this.url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
    }

    _triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        try {
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
        } finally {
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }
    }
}

/**
 * 下载错误
 */
class DownloadError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DownloadError';
    }
}

/**
 * 学生ID闪烁服务
 */
class StudentIdFlickerService {
    constructor(repository, displayRenderer) {
        this.repository = repository;
        this.displayRenderer = displayRenderer;
    }

    start() {
        if (this.repository.isFlickering()) return;
        
        this.repository.setFlickering(true);
        const intervalId = setInterval(() => this._tick(), this.repository.getFlickerSpeed());
        this.repository.setIntervalId(intervalId);
    }

    stop() {
        this.repository.clearIntervalId();
        this.repository.setFlickering(false);
    }

    restart() {
        if (this.repository.isFlickering()) {
            this.stop();
            this.start();
        }
    }

    _tick() {
        const range = new StudentIdRange(
            this.repository.getMinStudent(),
            this.repository.getMaxStudent()
        );
        const randomId = range.generateRandom();
        this.displayRenderer.renderFlickering(randomId);
    }
}

// ============================================
// UI渲染器（UI Renderers）
// ============================================

/**
 * DOM操作抽象接口
 */
class IDOMRenderer {
    showElement(selector) { throw new Error('Abstract method'); }
    hideElement(selector) { throw new Error('Abstract method'); }
    setValue(selector, value) { throw new Error('Abstract method'); }
    getValue(selector) { throw new Error('Abstract method'); }
}

/**
 * 具体DOM渲染实现
 */
class DOMRenderer extends IDOMRenderer {
    constructor() {
        super();
        this.elements = new Map();
    }

    _getElement(selector) {
        if (!this.elements.has(selector)) {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Element not found: ${selector}`);
            this.elements.set(selector, element);
        }
        return this.elements.get(selector);
    }

    showElement(selector) {
        this._getElement(selector).style.display = 'block';
    }

    hideElement(selector) {
        this._getElement(selector).style.display = 'none';
    }

    setValue(selector, value) {
        this._getElement(selector).value = value;
    }

    getValue(selector) {
        return this._getElement(selector).value;
    }

    setHTML(selector, html) {
        this._getElement(selector).innerHTML = html;
    }

    showInterface(interfaceId) {
        document.querySelectorAll(CONFIG.SELECTORS.INTERFACES).forEach(el => {
            el.style.display = 'none';
        });
        document.getElementById(interfaceId).style.display = 'block';
    }
}

/**
 * 闪烁结果显示器
 */
class FlickerDisplayRenderer {
    constructor(domRenderer) {
        this.domRenderer = domRenderer;
    }

    renderFlickering(studentId) {
        const html = `✨ 闪烁中：<span class="blink">${studentId}</span>`;
        this.domRenderer.setHTML(CONFIG.SELECTORS.FLICKER_RESULT, html);
    }

    renderResult(studentId) {
        // 可扩展：显示最终结果
    }
}

// ============================================
// 用例/交互器（Use Cases / Interactors）
// ============================================

/**
 * 打开设置用例
 */
class OpenSettingsUseCase {
    constructor(repository, domRenderer) {
        this.repository = repository;
        this.domRenderer = domRenderer;
    }

    execute() {
        this.domRenderer.showElement(CONFIG.SELECTORS.MASK_LAYER);
        this.domRenderer.showElement(CONFIG.SELECTORS.SETTINGS_MODAL);
        
        this.domRenderer.setValue(CONFIG.SELECTORS.MIN_INPUT, this.repository.getMinStudent());
        this.domRenderer.setValue(CONFIG.SELECTORS.MAX_INPUT, this.repository.getMaxStudent());
        this.domRenderer.setValue(CONFIG.SELECTORS.SPEED_INPUT, this.repository.getFlickerSpeed());
    }
}

/**
 * 保存设置用例
 */
class SaveSettingsUseCase {
    constructor(repository, domRenderer, flickerService, studentCounterUpdater) {
        this.repository = repository;
        this.domRenderer = domRenderer;
        this.flickerService = flickerService;
        this.studentCounterUpdater = studentCounterUpdater;
    }

    execute() {
        try {
            const range = this._extractRange();
            const speed = this._extractSpeed();

            this.repository.updateRange(range);
            this.repository.updateSpeed(speed);
            
            this.studentCounterUpdater.update();
            this.flickerService.restart();
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof ValidationError ? error.message : '未知错误' 
            };
        }
    }

    _extractRange() {
        const min = parseInt(this.domRenderer.getValue(CONFIG.SELECTORS.MIN_INPUT));
        const max = parseInt(this.domRenderer.getValue(CONFIG.SELECTORS.MAX_INPUT));
        return new StudentIdRange(min, max);
    }

    _extractSpeed() {
        const speed = parseInt(this.domRenderer.getValue(CONFIG.SELECTORS.SPEED_INPUT));
        return new FlickerSpeed(speed);
    }
}

/**
 * 模式切换用例
 */
class SwitchModeUseCase {
    constructor(openSettingsUseCase) {
        this.openSettingsUseCase = openSettingsUseCase;
        this.specialModes = {
            'settings': () => {
                this.openSettingsUseCase.execute();
                return true;
            }
        };
    }

    execute(mode) {
        if (this.specialModes[mode]) {
            return this.specialModes[mode]();
        }
        return false;
    }
}

// ============================================
// 控制器/外观（Controller / Facade）
// ============================================

/**
 * 应用控制器（简化全局暴露）
 */
class ApplicationController {
    constructor() {
        this._initializeDependencies();
        this._bindEvents();
    }

    _initializeDependencies() {
        // 依赖注入
        this.domRenderer = new DOMRenderer();
        this.repository = new InMemoryAppStateRepository();
        this.displayRenderer = new FlickerDisplayRenderer(this.domRenderer);
        this.flickerService = new StudentIdFlickerService(this.repository, this.displayRenderer);
        this.downloadService = new FileDownloadService(CONFIG.URLS.SOURCE_CODE);
        
        // 用例
        this.openSettingsUseCase = new OpenSettingsUseCase(this.repository, this.domRenderer);
        this.saveSettingsUseCase = new SaveSettingsUseCase(
            this.repository, 
            this.domRenderer, 
            this.flickerService,
            { update: () => window.updateStudentCounters?.() }
        );
        this.switchModeUseCase = new SwitchModeUseCase(this.openSettingsUseCase);
    }

    _bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this._setupModeSwitching();
        });
    }

    _setupModeSwitching() {
        const modeDropdown = document.querySelector(CONFIG.SELECTORS.MODE_DROPDOWN);
        if (!modeDropdown) return;

        modeDropdown.addEventListener('change', (e) => {
            const mode = e.target.value;
            const isSpecialMode = this.switchModeUseCase.execute(mode);
            
            if (isSpecialMode) {
                e.target.value = 'default';
            } else {
                this.domRenderer.showInterface(mode);
            }
        });
    }

    // 全局暴露的精简API
    openSettings() {
        this.openSettingsUseCase.execute();
    }

    closeSettings() {
        this.domRenderer.hideElement(CONFIG.SELECTORS.MASK_LAYER);
        this.domRenderer.hideElement(CONFIG.SELECTORS.SETTINGS_MODAL);
    }

    saveSettings() {
        const result = this.saveSettingsUseCase.execute();
        if (result.success) {
            this.closeSettings();
        } else {
            alert(result.error);
        }
    }

    async downloadSourceCode() {
        try {
            await this.downloadService.download('DrawingStudentsID-source.zip');
        } catch (error) {
            console.error(error);
            alert(error.message);
            alert(`备用链接: ${CONFIG.URLS.SOURCE_CODE}`);
        }
    }
}

// ============================================
// 启动应用（Composition Root）
// ============================================

const app = new ApplicationController();

// 最小化全局暴露（仅暴露必要接口）
window.appController = app;
window.openSettings = () => app.openSettings();
window.closeSettings = () => app.closeSettings();
window.saveSettings = () => app.saveSettings();
window.downloadSourceCode = () => app.downloadSourceCode();
