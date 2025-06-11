class Game2048 {
    constructor() {
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gridElement = document.getElementById('grid');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.restartButton = document.getElementById('restart-button');
        this.soundButton = document.getElementById('sound-button');
        this.lastGrid = null;
        
        // 触摸相关变量
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30; // 最小滑动距离
        this.isTouchDevice = 'ontouchstart' in window; // 检测是否为触摸设备
        
        // 初始化音频上下文
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 从本地存储加载音效状态
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.updateSoundButton();
        
        this.init();
        this.setupEventListeners();
    }

    // 生成音效的方法
    playSound(type) {
        if (!this.soundEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.value = 0.1; // 设置音量

        switch(type) {
            case 'move':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
                break;
            case 'merge':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(440, this.audioContext.currentTime + 0.2);
                break;
            case 'new':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(660, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
                break;
            case 'gameOver':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(220, this.audioContext.currentTime + 0.5);
                break;
        }

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    init() {
        // 清空网格
        this.gridElement.innerHTML = '';
        
        // 重置游戏状态
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.lastGrid = null;

        // 创建网格单元格
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.gridElement.appendChild(cell);
        }

        // 添加两个初始数字
        this.addNewNumber();
        this.addNewNumber();
        this.updateDisplay();
    }

    setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleMove(e.key);
            }
        });

        // 触摸控制 - 改为监听整个文档
        if (this.isTouchDevice) {
            document.addEventListener('touchstart', (e) => {
                // 如果触摸开始于按钮上，不处理滑动
                if (e.target.closest('button')) {
                    return;
                }
                e.preventDefault();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                // 如果触摸开始于按钮上，不阻止默认行为
                if (e.target.closest('button')) {
                    return;
                }
                e.preventDefault();
            }, { passive: false });

            document.addEventListener('touchend', (e) => {
                // 如果触摸开始于按钮上，不处理滑动
                if (e.target.closest('button')) {
                    return;
                }
                e.preventDefault();
                this.touchEndX = e.changedTouches[0].clientX;
                this.touchEndY = e.changedTouches[0].clientY;
                this.handleSwipe();
            }, { passive: false });
        }

        this.restartButton.addEventListener('click', () => {
            this.init();
        });

        this.soundButton.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('soundEnabled', this.soundEnabled);
            this.updateSoundButton();
            if (this.soundEnabled) {
                this.playSound('new');
            }
        });
    }

    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // 确定主要滑动方向
        if (Math.max(absDeltaX, absDeltaY) < this.minSwipeDistance) {
            return; // 滑动距离太小，忽略
        }

        if (absDeltaX > absDeltaY) {
            // 水平滑动
            if (deltaX > 0) {
                this.handleMove('ArrowRight');
            } else {
                this.handleMove('ArrowLeft');
            }
        } else {
            // 垂直滑动
            if (deltaY > 0) {
                this.handleMove('ArrowDown');
            } else {
                this.handleMove('ArrowUp');
            }
        }
    }

    handleMove(direction) {
        this.lastGrid = JSON.stringify(this.grid);
        const moved = this.move(direction);
        if (moved) {
            this.playSound('move');
            
            setTimeout(() => {
                this.addNewNumber();
                this.updateDisplay();
                if (this.isGameOver()) {
                    this.gridElement.classList.add('game-over');
                    this.playSound('gameOver');
                    setTimeout(() => {
                        alert('游戏结束！');
                        this.gridElement.classList.remove('game-over');
                    }, 500);
                }
            }, 150);
        }
    }

    updateSoundButton() {
        this.soundButton.textContent = this.soundEnabled ? '🔊 音效' : '🔇 音效';
        this.soundButton.classList.toggle('muted', !this.soundEnabled);
    }

    addNewNumber() {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({x: i, y: j});
                }
            }
        }
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
            const cell = this.gridElement.children[randomCell.x * 4 + randomCell.y];
            cell.classList.add('new');
            // 播放新数字音效
            this.playSound('new');
            setTimeout(() => cell.classList.remove('new'), 200);
        }
    }

    move(direction) {
        let moved = false;
        const oldGrid = JSON.stringify(this.grid);

        switch(direction) {
            case 'ArrowLeft':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
                moved = this.moveRight();
                break;
            case 'ArrowUp':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
                moved = this.moveDown();
                break;
        }

        return moved;
    }

    moveLeft() {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            const row = this.grid[i].filter(cell => cell !== 0);
            for (let j = 0; j < row.length - 1; j++) {
                if (row[j] === row[j + 1]) {
                    row[j] *= 2;
                    this.score += row[j];
                    row.splice(j + 1, 1);
                    moved = true;
                }
            }
            const newRow = row.concat(Array(4 - row.length).fill(0));
            if (JSON.stringify(this.grid[i]) !== JSON.stringify(newRow)) {
                moved = true;
            }
            this.grid[i] = newRow;
        }
        return moved;
    }

    moveRight() {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            const row = this.grid[i].filter(cell => cell !== 0);
            for (let j = row.length - 1; j > 0; j--) {
                if (row[j] === row[j - 1]) {
                    row[j] *= 2;
                    this.score += row[j];
                    row.splice(j - 1, 1);
                    moved = true;
                }
            }
            const newRow = Array(4 - row.length).fill(0).concat(row);
            if (JSON.stringify(this.grid[i]) !== JSON.stringify(newRow)) {
                moved = true;
            }
            this.grid[i] = newRow;
        }
        return moved;
    }

    moveUp() {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let column = this.grid.map(row => row[j]).filter(cell => cell !== 0);
            for (let i = 0; i < column.length - 1; i++) {
                if (column[i] === column[i + 1]) {
                    column[i] *= 2;
                    this.score += column[i];
                    column.splice(i + 1, 1);
                    moved = true;
                }
            }
            const newColumn = column.concat(Array(4 - column.length).fill(0));
            for (let i = 0; i < 4; i++) {
                if (this.grid[i][j] !== newColumn[i]) {
                    moved = true;
                }
                this.grid[i][j] = newColumn[i];
            }
        }
        return moved;
    }

    moveDown() {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let column = this.grid.map(row => row[j]).filter(cell => cell !== 0);
            for (let i = column.length - 1; i > 0; i--) {
                if (column[i] === column[i - 1]) {
                    column[i] *= 2;
                    this.score += column[i];
                    column.splice(i - 1, 1);
                    moved = true;
                }
            }
            const newColumn = Array(4 - column.length).fill(0).concat(column);
            for (let i = 0; i < 4; i++) {
                if (this.grid[i][j] !== newColumn[i]) {
                    moved = true;
                }
                this.grid[i][j] = newColumn[i];
            }
        }
        return moved;
    }

    updateDisplay() {
        const cells = this.gridElement.children;
        const lastGrid = this.lastGrid ? JSON.parse(this.lastGrid) : null;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const value = this.grid[i][j];
                const cell = cells[i * 4 + j];
                const oldValue = lastGrid ? lastGrid[i][j] : 0;

                // 更新数值
                cell.textContent = value || '';
                cell.setAttribute('data-value', value);

                // 添加动画类
                if (value !== oldValue) {
                    if (value === 0) {
                        cell.classList.remove('new', 'merged');
                    } else if (value > oldValue && oldValue !== 0) {
                        cell.classList.add('merged');
                        // 播放合并音效
                        this.playSound('merge');
                        setTimeout(() => cell.classList.remove('merged'), 200);
                    }
                }
            }
        }

        // 更新分数
        this.scoreElement.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreElement.classList.add('new');
            setTimeout(() => this.bestScoreElement.classList.remove('new'), 200);
        }
        this.bestScoreElement.textContent = this.bestScore;
    }

    isGameOver() {
        // 检查是否有空格
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        // 检查是否有相邻的相同数字
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (j < 3 && this.grid[i][j] === this.grid[i][j + 1]) return false;
                if (i < 3 && this.grid[i][j] === this.grid[i + 1][j]) return false;
            }
        }

        return true;
    }
}

// 启动游戏
new Game2048(); 