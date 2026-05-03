/**
 * @fileoverview Space School Games Engine
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
        this.player = { x: 100, y: 200, size: 20, color: '#6dd3ff' };
        this.highScore = localStorage.getItem(`highScore_${mode}`) || 0;
        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        const input = (e) => {
            if (this.gameOver) { this.reset(); return; }
            const rect = this.canvas.getBoundingClientRect();
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.player.y = clientY - rect.top;
        };

        this.canvas.addEventListener('mousemove', input);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); input(e); }, {passive: false});
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); input(e); }, {passive: false});

        this.loop();
    }

    reset() {
        this.score = 0;
        this.gameOver = false;
        this.entities = [];
        this.particles = [];
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
        if (Math.random() > 0.97) {
            this.entities.push({
                x: this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: this.mode === 'rocket' ? 15 + Math.random() * 20 : 10,
                speed: 3 + Math.random() * 5,
                type: this.mode === 'rocket' ? 'asteroid' : 'star'
            });
        }
    }

    update() {
        if (this.gameOver) return;
        this.spawn();

        this.particles.forEach((p, i) => {
            p.update();
            if (p.alpha <= 0) this.particles.splice(i, 1);
        });

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            e.x -= e.speed;

            // Collision detection
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < this.player.size + e.size) {
                if (e.type === 'asteroid') {
                    this.gameOver = true;
                    this.createExplosion(this.player.x, this.player.y, '#ff4444');
                    this.saveResult();
                } else {
                    this.score += 50;
                    this.audio.play('score');
                    this.createExplosion(e.x, e.y, '#ffd700');
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

    draw() {
        this.ctx.fillStyle = '#071026';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Background stars
        this.ctx.fillStyle = '#fff';
        for(let i=0; i<30; i++) this.ctx.fillRect((i*137)%this.canvas.width, (i*244)%this.canvas.height, 2, 2);

        this.particles.forEach(p => p.draw(this.ctx));

        if (!this.gameOver) {
            this.ctx.fillStyle = this.player.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        this.entities.forEach(e => {
            this.ctx.fillStyle = e.type === 'asteroid' ? '#4e5d6c' : '#ffd700';
            this.ctx.beginPath();
            if (e.type === 'star') {
                this.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
            } else {
                this.ctx.rect(e.x - e.size, e.y - e.size, e.size*2, e.size*2);
            }
            this.ctx.fill();
        });

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Inter';
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        this.ctx.fillText(`Best: ${this.highScore}`, 20, 70);

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