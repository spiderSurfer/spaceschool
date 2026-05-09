/**
 * @fileoverview Solar School Games Engine
 * Features: Particle System, Web Audio Synth, Firestore Integration.
 */

import { updateGameStats } from './auth.js';

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.alpha = 1;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.alpha -= 0.02;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class SpaceAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    play(type) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'score') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
            osc.start(); osc.stop(this.ctx.currentTime + 0.2);
        } else if (type === 'boom') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            osc.start(); osc.stop(this.ctx.currentTime + 0.5);
        }
    }
}

export class SpaceGame2D {
    constructor(canvasId, mode = 'rocket') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.mode = mode;
        this.audio = new SpaceAudio();
        this.particles = [];
        this.score = 0;
        this.gameOver = false;
        this.entities = []; // Asteroids or Stars
        this.magnetActive = 0; // Timer for magnet
        this.level = 1;
        this.missionTime = 0;
        this.startTime = Date.now();
        this.player = { x: 100, y: 200, size: 20, color: '#6dd3ff' };
        this.player.hasShield = false;
        this.highScore = localStorage.getItem(`highScore_${mode}`) || 0;
        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        // 3D Trick: Perspective shift
        this.canvas.style.transition = 'transform 0.1s ease-out';
        this.canvas.style.perspective = '1000px';
        this.resize();
        
        const input = (e) => {
            if (this.gameOver) { this.reset(); return; }
            const rect = this.canvas.getBoundingClientRect();
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            // Calculate scale factor between CSS pixels and internal canvas resolution
            const scaleY = this.canvas.height / rect.height;
            
            // Map viewport coordinates to canvas internal coordinates
            this.player.y = (clientY - rect.top) * scaleY;

            // 3D Tilt effect
            const tilt = (this.player.y / this.canvas.height - 0.5) * 10;
            this.canvas.style.transform = `rotateX(${-tilt}deg)`;
        };

        this.canvas.addEventListener('mousemove', input);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); input(e); }, {passive: false});
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); input(e); }, {passive: false});

        this.loop();
    }

    /**
     * Applies custom mission JSON configuration to the engine
     * @param {Object} config 
     */
    applyConfig(config) {
        if (!config) return;
        this.customSpeed = config.speed || 5;
        this.customDifficulty = config.difficulty || 'normal';
        this.allowedEntities = config.entities || ['asteroid', 'star'];
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.entities = [];
        this.particles = [];
        this.player.hasShield = false;
        this.magnetActive = 0;
        this.startTime = Date.now();
    }

    resize() { 
        this.canvas.width = this.canvas.parentElement.clientWidth; 
        this.canvas.height = 400; 
    }

    createExplosion(x, y, color) {
        for(let i=0; i<15; i++) this.particles.push(new Particle(x, y, color));
        this.audio.play('boom');
    }

    spawn() {
        const spawnChance = this.customDifficulty === 'expert' ? 0.94 : 0.97;
        
        if (Math.random() > spawnChance) {
            const baseSpeed = this.customSpeed || 5;
            const levelFactor = 1 + (this.level - 1) * 0.2; 
            const size = this.mode === 'rocket' ? (15 + Math.random() * 20) : 10;

            const vertices = [];
            if (this.mode === 'rocket') {
                for (let i = 0; i < 8; i++) {
                    vertices.push(0.8 + Math.random() * 0.4);
                }
            }

            // Filter entities based on config if provided
            let type = this.mode === 'rocket' ? 'asteroid' : 'star';
            if (this.allowedEntities && !this.allowedEntities.includes(type)) {
                type = this.allowedEntities[0]; // Fallback to first allowed type
            }

            this.entities.push({
                x: this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: size,
                speed: (baseSpeed * (0.6 + Math.random() * 0.8)) * levelFactor,
                type: type,
                vertices: vertices
            });
        }

        // Occasional Shield power-up spawn
        if (Math.random() > 0.997) {
            this.entities.push({
                x: this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 15,
                speed: 4,
                type: 'shield'
            });
        }

        // Magnet power-up spawn for Catcher mode
        if (this.mode === 'catcher' && Math.random() > 0.998) {
            this.entities.push({
                x: this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 12,
                speed: 3,
                type: 'magnet'
            });
        }
    }

    update() {
        if (this.gameOver) return;
        this.spawn();
        if (this.magnetActive > 0) this.magnetActive--;

        // Calculate current sector (level) based on score
        const threshold = this.mode === 'rocket' ? 200 : 500;
        this.level = Math.floor(this.score / threshold) + 1;

        this.missionTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

        this.particles.forEach((p, i) => {
            p.update();
            if (p.alpha <= 0) this.particles.splice(i, 1);
        });

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            e.x -= e.speed;

            // Magnet Logic
            if (this.magnetActive > 0 && e.type === 'star') {
                const magDx = this.player.x - e.x;
                const magDy = this.player.y - e.y;
                const magDist = Math.sqrt(magDx*magDx + magDy*magDy);
                if (magDist < 300) {
                    e.x += magDx * 0.15;
                    e.y += magDy * 0.15;
                }
            }

            // Collision detection
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < this.player.size + e.size) {
                if (e.type === 'asteroid') {
                    if (this.player.hasShield) {
                        this.player.hasShield = false;
                        this.createExplosion(e.x, e.y, '#6dd3ff');
                        this.entities.splice(i, 1);
                    } else {
                        this.gameOver = true;
                        this.createExplosion(this.player.x, this.player.y, '#ff4444');
                        this.saveResult();
                    }
                } else if (e.type === 'star') {
                    this.score += 50;
                    this.audio.play('score');
                    this.createExplosion(e.x, e.y, '#ffd700');
                    this.entities.splice(i, 1);
                } else if (e.type === 'shield') {
                    this.player.hasShield = true;
                    this.audio.play('score');
                    this.createExplosion(e.x, e.y, '#6dd3ff');
                    this.entities.splice(i, 1);
                } else if (e.type === 'magnet') {
                    this.magnetActive = 300; // ~5 seconds
                    this.audio.play('score');
                    this.entities.splice(i, 1);
                }
            }

            if (e.x + e.size < 0) {
                this.entities.splice(i, 1);
                if (this.mode === 'rocket') this.score += 10;
            }
        }
    }

    async saveResult() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(`highScore_${this.mode}`, this.score);
        }
        // Schema sync: Map score to coins (10% conversion)
        await updateGameStats({ 
            score: this.score, 
            coins: Math.floor(this.score / 10),
            correct: this.mode === 'catcher' ? Math.floor(this.score / 50) : 0
        });
    }

    drawBackground() {
        const themes = {
            rocket: [
                { top: '#071026', bottom: '#000000' }, // Level 1: Deep Void
                { top: '#1a0726', bottom: '#071026' }, // Level 2: Purple Nebula
                { top: '#260707', bottom: '#000000' }  // Level 3: Red Alert Sector
            ],
            catcher: [
                { top: '#0d1b2a', bottom: '#1b263b' }, // Level 1: Night Sky
                { top: '#3c096c', bottom: '#240046' }, // Level 2: Celestial Magenta
                { top: '#003566', bottom: '#001d3d' }  // Level 3: Deep Teal
            ]
        };
        
        const modeThemes = themes[this.mode === 'rocket' ? 'rocket' : 'catcher'];
        const colors = modeThemes[Math.min(this.level - 1, modeThemes.length - 1)];

        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, colors.top);
        grad.addColorStop(1, colors.bottom);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Parallax stars for depth
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 40; i++) {
            const parallaxSpeed = (i % 3 + 1) * 0.05;
            const x = (i * 157 - (Date.now() * parallaxSpeed)) % (this.canvas.width + 100);
            const y = (i * 243) % this.canvas.height;
            this.ctx.fillRect(x - 50, y, 1.5, 1.5);
        }
    }

    draw() {
        this.drawBackground();

        this.particles.forEach(p => p.draw(this.ctx));

        if (!this.gameOver) {
            // Draw Detailed Rocket
            this.ctx.fillStyle = this.player.color;
            
            // Flame
            if (Math.random() > 0.5) {
                this.ctx.fillStyle = '#ff6600';
                this.ctx.beginPath();
                this.ctx.arc(this.player.x - 25, this.player.y, 10, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Body
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + 25, this.player.y);
            this.ctx.lineTo(this.player.x - 15, this.player.y - 15);
            this.ctx.lineTo(this.player.x - 15, this.player.y + 15);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Cockpit
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x + 5, this.player.y, 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw Shield Bubble if active
            if (this.player.hasShield) {
                this.ctx.strokeStyle = `rgba(109, 211, 255, ${0.4 + Math.sin(Date.now() / 200) * 0.2})`;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, this.player.size + 12, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.fillStyle = 'rgba(109, 211, 255, 0.1)';
                this.ctx.fill();
            }

            // Draw Magnet Aura
            if (this.magnetActive > 0) {
                this.ctx.strokeStyle = '#ff3366';
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, 80 + Math.sin(Date.now()/100)*10, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.entities.forEach(e => {
            if (e.type === 'star') {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
                this.ctx.fill();
            } else if (e.type === 'shield') {
                this.ctx.fillStyle = '#6dd3ff';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#fff';
                this.ctx.stroke();
            } else if (e.type === 'magnet') {
                this.ctx.fillStyle = '#ff3366';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.fillText('🧲', e.x-10, e.y+5);
            } else if (e.type === 'asteroid') {
                // Draw Jagged Asteroid
                this.ctx.fillStyle = '#4e5d6c';
                this.ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const r = e.size * e.vertices[i];
                    const vx = e.x + Math.cos(angle) * r;
                    const vy = e.y + Math.sin(angle) * r;
                    if (i === 0) this.ctx.moveTo(vx, vy); else this.ctx.lineTo(vx, vy);
                }
                this.ctx.closePath();
                this.ctx.fill();
            }
        });

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Inter';
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        this.ctx.fillText(`Best: ${this.highScore}`, 20, 70);
        this.ctx.fillText(`Mission Clock: ${this.missionTime}s`, 20, 100);
        this.ctx.fillText(`Sector: ${this.level}`, 20, 130);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#6dd3ff';
            this.ctx.font = 'bold 40px Inter';
            this.ctx.fillText('MISSION OVER', this.canvas.width/2, 180);
            this.ctx.font = '20px Inter';
            this.ctx.fillText('Tap to Restart', this.canvas.width/2, 230);
            this.ctx.textAlign = 'left';
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}