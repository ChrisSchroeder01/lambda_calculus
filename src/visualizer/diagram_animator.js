import { createTrompDiagram } from "./tromps_diagrams.js";

export class DiagramAnimator {
    constructor(canvas, expressions, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.expressions = expressions;
        this.diagrams = expressions.map(createDiagram);

        this.step = 0;
        this.duration = options.duration ?? 500;
        this.lineWidth = options.lineWidth ?? 8;
        this.color = options.color ?? "white";
        this.onStepChange = options.onStepChange ?? (() => {});

        this.animationFrame = null;

        this.resizeHandler = () => {
            this.resize();
            this.drawStep(this.step);
        };

        this.resize();
        window.addEventListener("resize", this.resizeHandler);

        this.drawStep(0);
        this.onStepChange(this.step);
    }

    destroy() {
        cancelAnimationFrame(this.animationFrame);
        window.removeEventListener("resize", this.resizeHandler);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.min(window.innerWidth * 0.9, 1100);
        const height = Math.min(window.innerHeight * 0.75, 700);

        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = "butt";
        this.ctx.lineJoin = "miter";

        this.width = width;
        this.height = height;
    }

    next() {
        if (this.step >= this.diagrams.length - 1) return;
        this.animate(this.step, this.step + 1);
    }

    previous() {
        if (this.step <= 0) return;
        this.animate(this.step, this.step - 1);
    }

    goTo(step) {
        if (step < 0 || step >= this.diagrams.length) return;
        this.animate(this.step, step);
    }

    animate(from, to) {
        cancelAnimationFrame(this.animationFrame);

        const start = performance.now();

        const frame = (time) => {
            const progress = Math.min((time - start) / this.duration, 1);
            const eased = this.ease(progress);

            this.drawTransition(this.diagrams[from], this.diagrams[to], eased);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(frame);
            } else {
                this.step = to;
                this.drawStep(to);
                this.onStepChange(this.step);
            }
        };

        this.animationFrame = requestAnimationFrame(frame);
    }

    drawStep(step) {
        this.clear();
        this.drawDiagram(this.diagrams[step], 1);
    }

    drawTransition(from, to, progress) {
        this.clear();

        const count = Math.max(from.lines.length, to.lines.length);

        for (let i = 0; i < count; i++) {
            const a = from.lines[i];
            const b = to.lines[i];

            if (a && b) {
                this.drawInterpolatedLine(a, b, progress, 1, from, to);
            } else if (a) {
                this.drawInterpolatedLine(a, a, 1, 1 - progress, from, from);
            } else if (b) {
                this.drawInterpolatedLine(b, b, 1, progress, to, to);
            }
        }
    }

    drawInterpolatedLine(a, b, progress, alpha, fromDiagram, toDiagram) {
        const x1 = this.lerp(a.x1, b.x1, progress);
        const y1 = this.lerp(a.y1, b.y1, progress);
        const x2 = this.lerp(a.x2, b.x2, progress);
        const y2 = this.lerp(a.y2, b.y2, progress);

        const from = this.transformPoint(x1, y1, fromDiagram, toDiagram, progress);
        const to = this.transformPoint(x2, y2, fromDiagram, toDiagram, progress);

        this.drawLine(from.x, from.y, to.x, to.y, alpha);
    }

    drawDiagram(diagram, alpha) {
        for (const line of diagram.lines) {
            const start = this.transformPoint(line.x1, line.y1, diagram);
            const end = this.transformPoint(line.x2, line.y2, diagram);

            this.drawLine(start.x, start.y, end.x, end.y, alpha);
        }
    }

    transformPoint(x, y, fromDiagram, toDiagram, progress) {
        if (!toDiagram) {
            const scale = this.getScale(fromDiagram);
            const offset = this.getOffset(fromDiagram, scale);

            return {
                x: offset.x + x * scale,
                y: offset.y + y * scale
            };
        }

        const fromScale = this.getScale(fromDiagram);
        const toScale = this.getScale(toDiagram);

        const fromOffset = this.getOffset(fromDiagram, fromScale);
        const toOffset = this.getOffset(toDiagram, toScale);

        return {
            x: this.lerp(fromOffset.x + x * fromScale, toOffset.x + x * toScale, progress),
            y: this.lerp(fromOffset.y + y * fromScale, toOffset.y + y * toScale, progress)
        };
    }

    getScale(diagram) {
        return Math.min(
            (this.width - 80) / diagram.width,
            (this.height - 80) / diagram.height,
            1
        );
    }

    getOffset(diagram, scale) {
        return {
            x: (this.width - diagram.width * scale) / 2,
            y: (this.height - diagram.height * scale) / 2
        };
    }

    drawLine(x1, y1, x2, y2, alpha) {
        const half = this.lineWidth / 2;

        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.strokeStyle = this.color;
        this.ctx.beginPath();

        if (y1 === y2) {
            this.ctx.moveTo(x1 - half, y1);
            this.ctx.lineTo(x2 + half, y2);
        } else if (x1 === x2) {
            this.ctx.moveTo(x1, y1 - half);
            this.ctx.lineTo(x2, y2 + half);
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    ease(t) {
        return t * t * (3 - 2 * t);
    }
}

function createDiagram(expression) {
    return createTrompDiagram(expression);
}