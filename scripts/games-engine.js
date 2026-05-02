/**
 * @fileoverview Space School Games Engine
 * Handles 2D Canvas games and 3D model interaction.
 */

export class SpaceGame2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.player = { x: 50, y: 50, size: 20, color: '#6dd3ff' };
        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.loop();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 400;
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        // Simple floating animation for "Every Device" demo
        const time = Date.now() * 0.002;
        this.player.y = (this.canvas.height / 2) + Math.sin(time) * 50;
        this.player.x = (this.canvas.width / 2) + Math.cos(time) * 100;
    }

    draw() {
        this.ctx.fillStyle = '#071026';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Starfield
        this.ctx.fillStyle = '#fff';
        for(let i=0; i<50; i++) {
            const x = (Math.sin(i) * 0.5 + 0.5) * this.canvas.width;
            const y = (Math.cos(i) * 0.5 + 0.5) * this.canvas.height;
            this.ctx.fillRect(x, y, 2, 2);
        }

        // Player Rocket
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI * 2);
        this.ctx.fill();
    }
}