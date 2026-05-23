// ==================== Setting.js (Clean Code Edition) ====================

// ============================================
// Constants
// ============================================
const CONFIG = Object.freeze({
    DEFAULTS: {
        MIN_STUDENT: 1,
        MAX_STUDENT: 52,
        FLICKER_SPEED: 50,
        JITTER_RANGE: 5
    },
    LIMITS: {
        MAX_STUDENT_ID: 1000000000,
        MIN_SPEED: 1,
        MAX_SPEED: 10000,
        MAX_JITTER: 20
    },
    URLS: {
        SOURCE_CODE: 'https://github.com/with-the-flow/DrawingStudentsID/archive/refs/heads/master.zip'
    },
    SELECTORS: {
        MODE_DROPDOWN: '#mode',
        INTERFACES: '.interface',
        SETTINGS_MODAL: '#settingsModal',
        MASK_LAYER: '#mask',
        FLICKER_RESULT: '#FlickerResult',
        DEFAULT_RESULT: '#DefaultResult',
        DEFAULT_DRAW_BUTTON: '#defaultDrawBtn',
        AUTO_CHECKBOX: '#autoMode',
        DISTRIBUTION_RESULT: '#DistributionResult',
        MIN_INPUT: '#MinTotalStudents',
        MAX_INPUT: '#MaxTotalStudents',
        SPEED_INPUT: '#fast',
        JITTER_INPUT: '#jitterRange',
        DIST_MENU: '#distributionMenu',
        FORMULA_BOX: '#formulaBox',
        CURRENT_DIST_NAME: '#currentDistName',
        DIST_DETAIL_MASK: '#distDetailMask',
        DIST_DETAIL_MODAL: '#distDetailModal',
        DETAIL_TITLE: '#detailTitle',
        DETAIL_BODY: '#detailBody'
    },
    MESSAGES: {
        DISTRIBUTION_DISABLED: '开发者认为此功能不合理，违背了公平原则，已经禁用。请联系开发者：WQF_hello_world@163.com'
    }
});

// ============================================
// Domain Errors
// ============================================
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ============================================
// Value Objects
// ============================================
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
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return this.min + (buf[0] % (this.max - this.min + 1));
    }
}

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

// ============================================
// Cryptographically Secure Random
// ============================================
class CryptoRandomGenerator {
    next() {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] / 0xFFFFFFFF;
    }

    nextInt(min, max) {
        const range = max - min + 1;
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return min + (buf[0] % range);
    }
}

// ============================================
// Jittered Random with History Deduplication
// ============================================
class JitteredRandomGenerator {
    constructor(randomGenerator) {
        this.rng = randomGenerator || new CryptoRandomGenerator();
        this.jitterRange = CONFIG.DEFAULTS.JITTER_RANGE;
        this.history = new Set();
        this.maxHistory = 50;
    }

    setJitterRange(range) {
        this.jitterRange = Math.max(0, Math.min(range, CONFIG.LIMITS.MAX_JITTER));
    }

    generate(globalMin, globalMax) {
        const baseValue = this._generateBaseValue(globalMin, globalMax);
        const jittered = this._applyJitter(baseValue, globalMin, globalMax);
        const final = this._ensureNoRepeat(jittered, globalMin, globalMax);
        this._updateHistory(final);
        return final;
    }

    _generateBaseValue(min, max) {
        return this.rng.nextInt(min, max);
    }

    _applyJitter(baseValue, globalMin, globalMax) {
        if (this.jitterRange <= 0) return baseValue;
        const jitterMin = Math.max(globalMin, baseValue - this.jitterRange);
        const jitterMax = Math.min(globalMax, baseValue + this.jitterRange);
        return this.rng.nextInt(jitterMin, jitterMax);
    }

    _ensureNoRepeat(value, min, max) {
        if (!this.history.has(value)) return value;
        if (max - min < this.history.size) return value;
        let attempts = 0;
        let result = value;
        while (this.history.has(result) && attempts < 3) {
            result = this.rng.nextInt(min, max);
            attempts++;
        }
        return result;
    }

    _updateHistory(value) {
        this.history.add(value);
        if (this.history.size > this.maxHistory) {
            const first = this.history.values().next().value;
            this.history.delete(first);
        }
    }
}

// ============================================
// Distribution Data (Disabled)
// ============================================
const DISTRIBUTION_DATA = {
    uniform: {
        name: '均匀分布',
        icon: '⚖️',
        latex: '$$P(X=x) = \\frac{1}{b-a+1}, \\quad x \\in [a,b]$$',
        detail: {
            title: '离散均匀分布（Discrete Uniform Distribution）',
            description: '在概率论和统计学中，离散均匀分布是一个离散型概率分布，其中有限个数值具有相同的概率。',
            parameters: [
                { name: 'a', desc: '下界（最小值）', constraint: 'a ∈ ℤ' },
                { name: 'b', desc: '上界（最大值）', constraint: 'b ∈ ℤ, b > a' }
            ],
            properties: [
                '期望值：E[X] = (a + b) / 2',
                '方差：Var(X) = [(b - a + 1)² - 1] / 12',
                '概率质量函数（PMF）：所有可能取值概率相等'
            ],
            applications: [
                '公平骰子的投掷结果',
                '随机抽样中的等概率选择',
                '蒙特卡洛模拟中的随机数生成',
                '密码学中的安全随机数生成'
            ],
            characteristics: '该分布具有最大熵特性，即在所有定义在[a,b]上的离散分布中，均匀分布的不确定性最大。'
        }
    },

    normal: {
        name: '正态分布',
        icon: '📊',
        latex: '$$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$',
        detail: {
            title: '正态分布/高斯分布（Normal/Gaussian Distribution）',
            description: '正态分布是连续概率分布的一种，因其概率密度函数呈钟形曲线，故又称钟形曲线。中心极限定理表明，大量独立随机变量之和趋于正态分布。',
            parameters: [
                { name: 'μ (mu)', desc: '均值/期望', constraint: 'μ ∈ ℝ，决定分布中心位置' },
                { name: 'σ (sigma)', desc: '标准差', constraint: 'σ > 0，决定分布离散程度' }
            ],
            properties: [
                '期望值：E[X] = μ',
                '方差：Var(X) = σ²',
                '偏度：0（对称分布）',
                '峰度：3（常态峰）',
                '68-95-99.7法则：约68%数据落在μ±σ内，95%在μ±2σ内，99.7%在μ±3σ内'
            ],
            applications: [
                '测量误差的建模',
                '考试成绩的统计分析',
                '质量控制中的产品尺寸分布',
                '金融资产的收益率建模（对数正态）',
                '自然现象如身高、体重的分布'
            ],
            characteristics: '正态分布是自然界最常见的分布，具有优良的数学性质，许多统计方法都基于正态假设。'
        }
    },

    poisson: {
        name: '泊松分布',
        icon: '☎️',
        latex: '$$P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad k = 0,1,2,...$$',
        detail: {
            title: '泊松分布（Poisson Distribution）',
            description: '泊松分布描述单位时间或单位空间内随机事件发生次数的概率分布。适用于描述稀有事件的发生规律，以法国数学家西莫恩·德尼·泊松命名。',
            parameters: [
                { name: 'λ (lambda)', desc: '发生率参数', constraint: 'λ > 0，表示单位时间（或空间）内事件的平均发生次数' }
            ],
            properties: [
                '期望值：E[X] = λ',
                '方差：Var(X) = λ（期望与方差相等，称为等分散性）',
                '众数：⌊λ⌋ 或 ⌊λ⌋ - 1',
                '矩母函数：M(t) = exp(λ(e^t - 1))',
                '特征函数：φ(t) = exp(λ(e^(it) - 1))'
            ],
            applications: [
                '呼叫中心每小时接到的电话数量',
                '放射性物质单位时间内的衰变次数',
                '某路口每分钟通过的车辆数',
                '网络服务器每秒接收的请求数',
                '印刷品每页的错字数'
            ],
            characteristics: '当n很大且p很小时，二项分布B(n,p)可近似为泊松分布P(λ=np)。该分布具有可加性：独立泊松变量之和仍为泊松分布。'
        }
    },

    exponential: {
        name: '指数分布',
        icon: '⏱️',
        latex: '$$f(x) = \\lambda e^{-\\lambda x}, \\quad x \\geq 0$$',
        detail: {
            title: '指数分布（Exponential Distribution）',
            description: '指数分布是描述泊松过程中事件间隔时间的连续概率分布。它是几何分布的连续类比，具有独特的无记忆性（Memoryless Property）。',
            parameters: [
                { name: 'λ (lambda)', desc: '率参数', constraint: 'λ > 0，表示单位时间内事件发生的平均次数' }
            ],
            properties: [
                '期望值：E[X] = 1/λ',
                '方差：Var(X) = 1/λ²',
                '中位数：ln(2)/λ ≈ 0.693/λ',
                '无记忆性：P(X>s+t|X>s) = P(X>t)',
                '累积分布函数：F(x) = 1 - e^(-λx)'
            ],
            applications: [
                '电子元件的寿命建模',
                '顾客到达服务台的时间间隔',
                '放射性衰变的等待时间',
                '地震发生的时间间隔',
                '电话通话时长的建模'
            ],
            characteristics: '无记忆性意味着"未来不依赖过去"，即已经等待的时间不影响剩余等待时间的分布。这使得指数分布在可靠性工程和排队论中非常重要。'
        }
    },

    binomial: {
        name: '二项分布',
        icon: '🪙',
        latex: '$$P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}, \\quad k=0,1,...,n$$',
        detail: {
            title: '二项分布（Binomial Distribution）',
            description: '二项分布描述n次独立伯努利试验中成功次数的离散概率分布。每次试验只有两种可能结果（成功/失败），且成功概率p保持不变。',
            parameters: [
                { name: 'n', desc: '试验次数', constraint: 'n ∈ ℕ⁺，正整数' },
                { name: 'p', desc: '成功概率', constraint: '0 ≤ p ≤ 1' }
            ],
            properties: [
                '期望值：E[X] = np',
                '方差：Var(X) = np(1-p)',
                '众数：⌊(n+1)p⌋ 或 ⌊(n+1)p⌋ - 1',
                '矩母函数：M(t) = (1-p + pe^t)^n',
                '特征函数：φ(t) = (1-p + pe^(it))^n'
            ],
            applications: [
                'n次抛硬币中正面的次数',
                '质量检验中的次品数量',
                '民意调查中支持某候选人的比例',
                '医学试验中的治愈人数',
                'A/B测试中的转化率分析'
            ],
            characteristics: '当n→∞且p→0使得np=λ保持常数时，二项分布收敛于泊松分布。当n很大时，根据中心极限定理，可用正态分布近似。'
        }
    },

    geometric: {
        name: '几何分布',
        icon: '🎯',
        latex: '$$P(X=k) = (1-p)^{k-1} p, \\quad k = 1,2,3,...$$',
        detail: {
            title: '几何分布（Geometric Distribution）',
            description: '几何分布描述在独立伯努利试验中，首次成功所需试验次数的离散概率分布。与指数分布类似，几何分布也具有无记忆性。',
            parameters: [
                { name: 'p', desc: '每次试验的成功概率', constraint: '0 < p ≤ 1' }
            ],
            properties: [
                '期望值：E[X] = 1/p',
                '方差：Var(X) = (1-p)/p²',
                '众数：1',
                '无记忆性：P(X>m+n|X>m) = P(X>n)',
                '累积分布函数：F(k) = 1 - (1-p)^k'
            ],
            applications: [
                '首次命中目标所需的射击次数',
                '首次出现正面所需的抛硬币次数',
                '首次中奖所需的抽奖次数',
                '首次故障前的设备使用次数',
                '首次成功前的尝试次数建模'
            ],
            characteristics: '几何分布是负二项分布的特例（r=1）。其无记忆性使其成为离散时间马尔可夫链建模的重要工具。'
        }
    },

    powerlaw: {
        name: '幂律分布',
        icon: '📈',
        latex: '$$f(x) \\propto x^{-\\alpha}, \\quad x \\geq x_{min}, \\quad \\alpha > 1$$',
        detail: {
            title: '幂律分布/帕累托分布（Power Law/Pareto Distribution）',
            description: '幂律分布描述"富者愈富"现象的概率分布，具有重尾（Heavy Tail）特性。许多自然和社会现象遵循幂律，如地震频率、城市人口、财富分布等。',
            parameters: [
                { name: 'α (alpha)', desc: '幂指数/形状参数', constraint: 'α > 1，决定尾部厚度' },
                { name: 'x_min', desc: '尺度参数', constraint: 'x_min > 0，分布的起始点' }
            ],
            properties: [
                '期望值（α>2时）：E[X] = αx_min/(α-1)',
                '方差（α>3时）：Var(X) = αx_min²/[(α-1)²(α-2)]',
                '无有限方差（2<α≤3）',
                '无有限期望（1<α≤2）',
                '尺度不变性：f(cx) ∝ c^(-α)f(x)'
            ],
            applications: [
                '财富和收入的分布（帕累托法则/80-20法则）',
                '城市人口规模（齐夫定律）',
                '网页链接的入度分布',
                '地震频率（古腾堡-里希特定律）',
                '学术论文被引次数的分布'
            ],
            characteristics: '幂律分布没有特征尺度，呈现"无标度"（Scale-Free）特性。与正态分布相比，极端事件发生的概率更高，这在风险管理和网络科学中尤为重要。'
        }
    },

    bimodal: {
        name: '双峰分布',
        icon: '👥',
        latex: '$$f(x) = 0.5\\cdot\\mathcal{N}(\\mu_1,\\sigma^2) + 0.5\\cdot\\mathcal{N}(\\mu_2,\\sigma^2)$$',
        detail: {
            title: '双峰正态分布（Bimodal Distribution）',
            description: '双峰分布是具有两个不同峰值的概率分布，通常由两个不同群体的混合产生。本实现采用两个等权正态分布的混合模型。',
            parameters: [
                { name: 'μ₁, μ₂', desc: '两个子分布的均值', constraint: 'μ₁ < μ₂，决定两个峰的位置' },
                { name: 'σ', desc: '共同的标准差', constraint: 'σ > 0，控制峰的宽度' },
                { name: 'w₁, w₂', desc: '混合权重', constraint: 'w₁ = w₂ = 0.5（等权混合）' }
            ],
            properties: [
                '期望值：E[X] = 0.5(μ₁ + μ₂)',
                '方差：Var(X) = σ² + 0.25(μ₂ - μ₁)²',
                '两个众数：分别位于μ₁和μ₂附近',
                '当|μ₂-μ₁| > 2σ时呈现明显双峰',
                '属于高斯混合模型（GMM）的特例'
            ],
            applications: [
                '两个不同班级合并后的成绩分布',
                '男女混合群体的身高分布',
                '产品评价中的两极分化现象',
                '不同季节的温度分布',
                '疾病筛查中的健康与患病人群'
            ],
            characteristics: '双峰分布暗示数据可能存在潜在的子群体结构。在机器学习中，高斯混合模型（GMM）可用于自动发现数据中的聚类结构，期望最大化（EM）算法常用于参数估计。'
        }
    }
};

// ============================================
// State Repository
// ============================================
class InMemoryAppStateRepository {
    constructor(initialState = {}) {
        this._state = {
            range: new StudentIdRange(
                initialState.min ?? CONFIG.DEFAULTS.MIN_STUDENT,
                initialState.max ?? CONFIG.DEFAULTS.MAX_STUDENT
            ),
            speed: new FlickerSpeed(initialState.fast ?? CONFIG.DEFAULTS.FLICKER_SPEED),
            jitterRange: initialState.jitter ?? CONFIG.DEFAULTS.JITTER_RANGE,
            autoMode: initialState.autoMode ?? true,
            isFlickering: false,
            intervalId: null,
            currentDistribution: 'uniform'
        };
    }

    getMinStudent() { return this._state.range.min; }
    getMaxStudent() { return this._state.range.max; }
    getFlickerSpeed() { return this._state.speed.value; }
    getJitterRange() { return this._state.jitterRange; }
    getAutoMode() { return this._state.autoMode; }
    isFlickering() { return this._state.isFlickering; }
    getIntervalId() { return this._state.intervalId; }
    getCurrentDistribution() { return this._state.currentDistribution; }

    updateRange(range) { this._state.range = range; }
    updateSpeed(speed) { this._state.speed = speed; }
    updateJitter(range) { this._state.jitterRange = range; }
    updateAutoMode(flag) { this._state.autoMode = !!flag; }
    setFlickering(flag) { this._state.isFlickering = flag; }
    setIntervalId(id) { this._state.intervalId = id; }
    setDistribution(key) { this._state.currentDistribution = key; }

    clearIntervalId() {
        if (this._state.intervalId) {
            clearTimeout(this._state.intervalId);
            this._state.intervalId = null;
        }
    }
}

// ============================================
// DOM Renderer
// ============================================
class DOMRenderer {
    constructor() {
        this.elements = new Map();
    }

    _getElement(selector) {
        if (!this.elements.has(selector)) {
            const element = document.querySelector(selector);
            if (!element) return null;
            this.elements.set(selector, element);
        }
        return this.elements.get(selector);
    }

    showElement(selector) {
        const el = this._getElement(selector);
        if (el) el.style.display = 'block';
    }

    hideElement(selector) {
        const el = this._getElement(selector);
        if (el) el.style.display = 'none';
    }

    setValue(selector, value) {
        const el = this._getElement(selector);
        if (el) el.value = value;
    }

    getValue(selector) {
        const el = this._getElement(selector);
        return el ? el.value : '';
    }

    setChecked(selector, checked) {
        const el = this._getElement(selector);
        if (el) el.checked = !!checked;
    }

    getChecked(selector) {
        const el = this._getElement(selector);
        return el ? !!el.checked : false;
    }

    setHTML(selector, html) {
        const el = this._getElement(selector);
        if (el) el.innerHTML = html;
    }

    setText(selector, text) {
        const el = this._getElement(selector);
        if (el) el.textContent = text;
    }

    showInterface(interfaceId) {
        document.querySelectorAll(CONFIG.SELECTORS.INTERFACES).forEach(el => {
            el.style.display = 'none';
        });
        const target = document.getElementById(interfaceId);
        if (target) target.style.display = 'block';
    }
}

// ============================================
// Distribution Manager (Disabled)
// ============================================
class DistributionManager {
    constructor() {
        this.currentKey = 'uniform';
        this.data = DISTRIBUTION_DATA;
        this.rng = new CryptoRandomGenerator();
    }

    select(key) {
        if (this.data[key]) {
            this.currentKey = key;
            return true;
        }
        return false;
    }

    getCurrent() {
        return this.data[this.currentKey];
    }

    getCurrentKey() {
        return this.currentKey;
    }

    getAll() {
        return Object.entries(this.data).map(([key, value]) => ({
            key,
            name: value.name,
            icon: value.icon
        }));
    }

    sample(min, max) {
        return this.rng.nextInt(min, max);
    }
}

// ============================================
// Services
// ============================================
class FileDownloadService {
    constructor(url) {
        this.url = url;
    }

    async download(filename) {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

class FlickerService {
    constructor(repository, renderer, randomGenerator) {
        this.repo = repository;
        this.renderer = renderer;
        this.randomGen = randomGenerator;
    }

    start() {
        if (this.repo.isFlickering()) return;

        this.repo.setFlickering(true);
        const btn = document.getElementById('flickerBtn');
        if (btn) btn.innerHTML = '⏸️ 暂停闪烁';

        const tick = () => {
            if (!this.repo.isFlickering()) return;

            const result = this.randomGen.generate(
                this.repo.getMinStudent(),
                this.repo.getMaxStudent()
            );

            this.renderer.setHTML(CONFIG.SELECTORS.FLICKER_RESULT, 
                `✨ 闪烁中：<span class="blink">${result}</span>`);

            const baseSpeed = this.repo.getFlickerSpeed();
            const jitter = (Math.random() - 0.5) * 0.6 * baseSpeed;
            const nextTick = Math.max(10, Math.floor(baseSpeed + jitter));

            this.repo.setIntervalId(setTimeout(tick, nextTick));
        };

        tick();
    }

    stop() {
        this.repo.clearIntervalId();
        this.repo.setFlickering(false);

        // 清除结果框的 blink 类，显示最终结果
        const resultEl = document.querySelector(CONFIG.SELECTORS.FLICKER_RESULT);
        if (resultEl) {
            const blinkSpan = resultEl.querySelector('.blink');
            if (blinkSpan) {
                blinkSpan.classList.remove('blink');
                blinkSpan.classList.add('result-static');
            }
            // 更新文本为静态结果
            const finalNum = this.randomGen.generate(
                this.repo.getMinStudent(),
                this.repo.getMaxStudent()
            );
            this.renderer.setHTML(CONFIG.SELECTORS.FLICKER_RESULT,
                `🎉 抽中学号：<span class="result-static">${finalNum}</span>`
            );
        }

        const btn = document.getElementById('flickerBtn');
        if (btn) btn.innerHTML = '▶️ 开始闪烁';
    }

    toggle() {
        this.repo.isFlickering() ? this.stop() : this.start();
    }
}

// ============================================
// Use Cases
// ============================================
class OpenSettingsUseCase {
    constructor(repo, renderer) {
        this.repo = repo;
        this.renderer = renderer;
    }

    execute() {
        this.renderer.showElement(CONFIG.SELECTORS.MASK_LAYER);
        this.renderer.showElement(CONFIG.SELECTORS.SETTINGS_MODAL);
        this.renderer.setValue(CONFIG.SELECTORS.MIN_INPUT, this.repo.getMinStudent());
        this.renderer.setValue(CONFIG.SELECTORS.MAX_INPUT, this.repo.getMaxStudent());
        this.renderer.setValue(CONFIG.SELECTORS.SPEED_INPUT, this.repo.getFlickerSpeed());
        this.renderer.setValue(CONFIG.SELECTORS.JITTER_INPUT, this.repo.getJitterRange());
        this.renderer.setChecked(CONFIG.SELECTORS.AUTO_CHECKBOX, this.repo.getAutoMode());
    }
}

class SaveSettingsUseCase {
    constructor(repo, renderer, flickerService, randomGen) {
        this.repo = repo;
        this.renderer = renderer;
        this.flickerService = flickerService;
        this.randomGen = randomGen;
    }

    execute() {
        try {
            const min = parseInt(this.renderer.getValue(CONFIG.SELECTORS.MIN_INPUT));
            const max = parseInt(this.renderer.getValue(CONFIG.SELECTORS.MAX_INPUT));
            const speed = parseInt(this.renderer.getValue(CONFIG.SELECTORS.SPEED_INPUT));
            const jitter = parseInt(this.renderer.getValue(CONFIG.SELECTORS.JITTER_INPUT));
            const autoMode = this.renderer.getChecked(CONFIG.SELECTORS.AUTO_CHECKBOX);

            this.repo.updateRange(new StudentIdRange(min, max));
            this.repo.updateSpeed(new FlickerSpeed(speed));
            this.repo.updateJitter(jitter);
            this.repo.updateAutoMode(autoMode);
            this.randomGen.setJitterRange(jitter);

            document.querySelectorAll('#currentTotal, #flickerTotal').forEach(el => {
                el.textContent = `${min} - ${max}`;
            });

            this.flickerService.stop();
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof ValidationError ? error.message : '未知错误' 
            };
        }
    }
}

// ============================================
// Distribution UI Controller
// ============================================
class DistributionUIController {
    constructor(manager, renderer, repository) {
        this.manager = manager;
        this.renderer = renderer;
        this.repository = repository;
    }

    initialize() {
        const savedDist = this.repository.getCurrentDistribution();
        if (savedDist) {
            this.manager.select(savedDist);
        }

        this._renderMenu();
        this._bindEvents();
        this._updateFormulaDisplay();
    }

    _renderMenu() {
        const menuContainer = this.renderer._getElement(CONFIG.SELECTORS.DIST_MENU);
        if (!menuContainer) return;

        const distributions = this.manager.getAll();
        menuContainer.innerHTML = distributions
            .map(({ key, name, icon }) => `
                <div class="dist-menu-item ${key === this.manager.getCurrentKey() ? 'active' : ''}"
                     data-key="${key}">
                    <span class="dist-icon">${icon}</span>
                    <span class="dist-name">${name}</span>
                </div>
            `)
            .join('');
    }

    _bindEvents() {
        const menuContainer = this.renderer._getElement(CONFIG.SELECTORS.DIST_MENU);
        if (!menuContainer) return;

        menuContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.dist-menu-item');
            if (!item) return;
            this.selectDistribution(item.dataset.key);
        });
    }

    selectDistribution(key) {
        if (!this.manager.select(key)) return;
        this.repository.setDistribution(key);

        document.querySelectorAll('.dist-menu-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.key === key);
        });

        this._updateFormulaDisplay();
    }

    _updateFormulaDisplay() {
        const current = this.manager.getCurrent();
        this.renderer.setText(CONFIG.SELECTORS.CURRENT_DIST_NAME, current.name);
        this.renderer.setHTML(CONFIG.SELECTORS.FORMULA_BOX, current.latex);

        if (window.MathJax) {
            MathJax.typesetPromise([document.getElementById('formulaBox')]).catch(err => {
                console.error('MathJax渲染失败:', err);
            });
        }
    }

    openDetailModal() {
        const current = this.manager.getCurrent();
        const detail = current.detail;

        this.renderer.setText(CONFIG.SELECTORS.DETAIL_TITLE, `📐 ${detail.title}`);

        const paramsHtml = detail.parameters.map(p => `
            <li><strong>${p.name}</strong>：${p.desc}<br>
            <small style="color:#667eea">${p.constraint}</small></li>
        `).join('');

        const propertiesHtml = detail.properties.map(p => `<li>${p}</li>`).join('');
        const applicationsHtml = detail.applications.map(a => `<li>${a}</li>`).join('');

        this.renderer.setHTML(CONFIG.SELECTORS.DETAIL_BODY, `
            <div class="detail-section">
                <h4>📖 定义</h4>
                <p>${detail.description}</p>
            </div>

            <div class="detail-section">
                <h4>📊 数学表达</h4>
                <div class="detail-formula">${current.latex}</div>
            </div>

            <div class="detail-section">
                <h4>⚙️ 参数说明</h4>
                <ul>${paramsHtml}</ul>
            </div>

            <div class="detail-section">
                <h4>📈 统计特性</h4>
                <ul>${propertiesHtml}</ul>
            </div>

            <div class="detail-section">
                <h4>💡 应用场景</h4>
                <ul>${applicationsHtml}</ul>
            </div>

            <div class="detail-section">
                <h4>🔍 关键特性</h4>
                <p>${detail.characteristics}</p>
            </div>
        `);

        setTimeout(() => {
            if (window.MathJax) {
                MathJax.typesetPromise([document.getElementById('detailBody')]).catch(err => {
                    console.error('MathJax渲染失败:', err);
                });
            }
        }, 10);

        this.renderer.showElement(CONFIG.SELECTORS.DIST_DETAIL_MASK);
        this.renderer.showElement(CONFIG.SELECTORS.DIST_DETAIL_MODAL);
    }

    closeDetailModal() {
        this.renderer.hideElement(CONFIG.SELECTORS.DIST_DETAIL_MASK);
        this.renderer.hideElement(CONFIG.SELECTORS.DIST_DETAIL_MODAL);
    }
}

// ============================================
// Application Controller
// ============================================
class ApplicationController {
    constructor() {
        this._initDependencies();
        this._bindEvents();
    }

    _initDependencies() {
        this.renderer = new DOMRenderer();
        this.repository = new InMemoryAppStateRepository();
        this.randomGen = new JitteredRandomGenerator();
        this.randomGen.setJitterRange(this.repository.getJitterRange());
        this.distManager = new DistributionManager();

        this.distUI = new DistributionUIController(this.distManager, this.renderer, this.repository);

        this.flickerService = new FlickerService(this.repository, this.renderer, this.randomGen);
        this.downloadService = new FileDownloadService(CONFIG.URLS.SOURCE_CODE);

        this.openSettingsUC = new OpenSettingsUseCase(this.repository, this.renderer);
        this.saveSettingsUC = new SaveSettingsUseCase(
            this.repository,
            this.renderer,
            this.flickerService,
            this.randomGen
        );

        this._autoRolling = false;
        this._autoRollFrameId = null;
    }

    _bindEvents() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._init());
        } else {
            this._init();
        }
    }

    _init() {
        this.distUI.initialize();
        this.renderer.showInterface('default');

        const text = `${this.repository.getMinStudent()} - ${this.repository.getMaxStudent()}`;
        document.querySelectorAll('#currentTotal, #flickerTotal').forEach(el => {
            el.textContent = text;
        });

        this._setupModeSwitching();
    }

    _setupModeSwitching() {
        const dropdown = this.renderer._getElement(CONFIG.SELECTORS.MODE_DROPDOWN);
        if (!dropdown) return;

        dropdown.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === 'settings') {
                this.openSettings();
                e.target.value = 'default';
                return;
            }
            this.renderer.showInterface(mode);
        });
    }

    openSettings() { this.openSettingsUC.execute(); }

    closeSettings() {
        this.renderer.hideElement(CONFIG.SELECTORS.MASK_LAYER);
        this.renderer.hideElement(CONFIG.SELECTORS.SETTINGS_MODAL);
    }

    saveSettings() {
        const result = this.saveSettingsUC.execute();
        result.success ? this.closeSettings() : alert(result.error);
    }

    async downloadSourceCode() {
        try {
            await this.downloadService.download('DrawingStudentsID-source.zip');
        } catch (error) {
            alert('下载失败: ' + error.message);
        }
    }

    handleDefaultDraw() {
        if (this.repository.getAutoMode()) {
            this._startAutoRoll();
            return;
        }

        const result = this.randomGen.generate(
            this.repository.getMinStudent(),
            this.repository.getMaxStudent()
        );
        this.renderer.setHTML(CONFIG.SELECTORS.DEFAULT_RESULT,
            `🎉 抽中学号：<span class="highlight">${result}</span>`
        );
    }

    handleFlickerDraw() {
        this.flickerService.toggle();
    }

    _startAutoRoll() {
        if (this._autoRolling) return;
        this._autoRolling = true;

        const min = this.repository.getMinStudent();
        const max = this.repository.getMaxStudent();
        const duration = 5000;
        const startTime = performance.now();

        this._cancelAutoRoll();

        const defaultBtn = this.renderer._getElement(CONFIG.SELECTORS.DEFAULT_DRAW_BUTTON);
        if (defaultBtn) defaultBtn.disabled = true;

        let acc = 0;
        let lastTime = startTime;

        const frame = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const targetDelay = 1 + 999 * Math.sin((Math.PI / 2) * t);

            acc += now - lastTime;
            lastTime = now;

            if (acc >= targetDelay || t >= 1) {
                const value = this.randomGen.generate(min, max);

                if (t >= 1) {
                    this.renderer.setHTML(CONFIG.SELECTORS.DEFAULT_RESULT, 
                        `🎉 抽中学号：<span class="highlight">${value}</span>`);
                    this._autoRolling = false;
                    if (defaultBtn) defaultBtn.disabled = false;
                    return;
                }

                this.renderer.setHTML(CONFIG.SELECTORS.DEFAULT_RESULT, 
                    `✨ 抽取中：<span class="blink">${value}</span>`);
                acc = 0;
            }

            this._autoRollFrameId = requestAnimationFrame(frame);
        };

        this._autoRollFrameId = requestAnimationFrame(frame);
    }

    _cancelAutoRoll() {
        if (this._autoRollFrameId) {
            cancelAnimationFrame(this._autoRollFrameId);
            this._autoRollFrameId = null;
        }
        this._autoRolling = false;
        const defaultBtn = this.renderer._getElement(CONFIG.SELECTORS.DEFAULT_DRAW_BUTTON);
        if (defaultBtn) defaultBtn.disabled = false;
    }

    handleDistributionDraw() {
        this.renderer.setHTML(CONFIG.SELECTORS.DISTRIBUTION_RESULT,
            `<span class="highlight" style="color:#e74c3c;font-size:24px">${CONFIG.MESSAGES.DISTRIBUTION_DISABLED}</span>`
        );
    }

    openDistDetail() {
        this.distUI.openDetailModal();
    }

    closeDistDetail() {
        this.distUI.closeDetailModal();
    }
}

// ============================================
// Bootstrap
// ============================================
const app = new ApplicationController();

window.appController = app;
window.openSettings = () => app.openSettings();
window.closeSettings = () => app.closeSettings();
window.saveSettings = () => app.saveSettings();
window.downloadSourceCode = () => app.downloadSourceCode();
window.handleDefaultDraw = () => app.handleDefaultDraw();
window.handleFlickerDraw = () => app.handleFlickerDraw();
window.handleDistributionDraw = () => app.handleDistributionDraw();
window.openDistDetail = () => app.openDistDetail();
window.closeDistDetail = () => app.closeDistDetail();

// ============================================
// Fairness Audit
// ============================================
window.runDistributionTest = function(samples = 10000) {
    const min = app.repository.getMinStudent();
    const max = app.repository.getMaxStudent();
    const hist = {};

    for (let i = 0; i < samples; i++) {
        const v = app.randomGen.generate(min, max);
        hist[v] = (hist[v] || 0) + 1;
    }

    const expected = samples / (max - min + 1);
    let chiSquare = 0;

    for (let v = min; v <= max; v++) {
        const obs = hist[v] || 0;
        chiSquare += Math.pow(obs - expected, 2) / expected;
    }

    console.table(hist);
    console.log(`样本数: ${samples}, 期望值: ${expected.toFixed(1)}, 卡方值: ${chiSquare.toFixed(2)}`);
    console.log('卡方值 < 100 表示分布较均匀，> 200 可能有偏');
    return { histogram: hist, chiSquare, expected };
};

window.appState = {
    get minStudent() { return app.repository?.getMinStudent() || CONFIG.DEFAULTS.MIN_STUDENT; },
    get maxStudent() { return app.repository?.getMaxStudent() || CONFIG.DEFAULTS.MAX_STUDENT; },
    get isFlickering() { return app.repository?.isFlickering() || false; },
    get fast() { return app.repository?.getFlickerSpeed() || CONFIG.DEFAULTS.FLICKER_SPEED; },
    set minStudent(v) {},
    set maxStudent(v) {},
    set isFlickering(v) {},
    set fast(v) {}
};

window.updateStudentCounters = function() {
    const text = `${window.appState.minStudent} - ${window.appState.maxStudent}`;
    document.querySelectorAll('#currentTotal, #flickerTotal').forEach(el => {
        el.textContent = text;
    });
};