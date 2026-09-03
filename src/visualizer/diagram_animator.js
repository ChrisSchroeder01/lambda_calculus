import { createTrompDiagram } from "./tromps_diagrams.js";

export class DiagramAnimator {
    constructor(canvas, expressions, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.expressions = expressions;
        this.diagrams = expressions.map(createDiagram);

        this.step = 0;
        this.targetStep = 0;

        this.duration = options.duration ?? 500;
        this.jumpDuration = options.jumpDuration ?? 180;

        this.lineWidth = options.lineWidth ?? 8;
        this.color = options.color ?? "white";

        this.onStepChange = options.onStepChange ?? (() => {});

        this.animationFrame = null;
        this.animationStart = 0;

        this.fromStep = 0;
        this.fromVisual = null;

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
        this.animationFrame = null;

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

    /*
     * Normal forward navigation.
     *
     * If the user presses next several times while an animation
     * is running, we don't restart the animation.
     *
     * Instead we change targetStep.
     */
    next() {
        if (this.targetStep >= this.diagrams.length - 1) return;

        this.targetStep++;

        this.animateToTarget();
    }

    previous() {
        if (this.targetStep <= 0) return;

        this.targetStep--;

        this.animateToTarget();
    }

    first() {
        if (this.diagrams.length === 0) return;

        this.targetStep = 0;

        this.animateToTarget(true);
    }

    last() {
        if (this.diagrams.length === 0) return;

        this.targetStep = this.diagrams.length - 1;

        this.animateToTarget(true);
    }

    goTo(step, fast = false) {
        step = Math.max(0, Math.min(step, this.diagrams.length - 1));

        this.targetStep = step;

        this.animateToTarget(fast);
    }

    /*
     * Animate toward targetStep.
     *
     * Importantly, this function does NOT restart an existing animation
     * if the target changes.
     */
    animateToTarget(fast = false) {
        if (this.step === this.targetStep && !this.animationFrame) {
            return;
        }

        /*
         * If we're already animating, don't restart it.
         *
         * The current animation will notice targetStep has changed
         * and continue toward the new destination.
         */
        if (this.animationFrame) {
            return;
        }

        this.startNextSegment(fast);
    }

    startNextSegment(fast = false) {
        if (this.step === this.targetStep) {
            this.animationFrame = null;
            this.onStepChange(this.step);
            return;
        }

        const from = this.step;
        const direction = this.targetStep > this.step ? 1 : -1;
        const to = this.step + direction;

        this.fromStep = from;
        this.toStep = to;

        this.animationStart = performance.now();

        /*
         * First/last use a shorter duration.
         */
        const duration = fast
            ? this.jumpDuration
            : this.duration;

        const frame = (time) => {
            const progress = Math.min(
                (time - this.animationStart) / duration,
                1
            );

            const eased = this.ease(progress);

            this.drawTransition(
                this.diagrams[from],
                this.diagrams[to],
                eased
            );

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(frame);
                return;
            }

            /*
             * We've reached the next step.
             */
            this.step = to;

            /*
             * Don't clear animationFrame yet if another segment
             * is needed.
             */
            this.drawStep(this.step);
            this.onStepChange(this.step);

            if (this.step !== this.targetStep) {
                /*
                 * Continue automatically toward targetStep.
                 */
                this.startNextSegment(fast);
            } else {
                this.animationFrame = null;
            }
        };

        this.animationFrame = requestAnimationFrame(frame);
    }

    drawStep(step) {
        this.clear();

        if (!this.diagrams[step]) return;

        this.drawDiagram(this.diagrams[step], 1);
    }

    /*
     * Animate lines according to correspondence rather than
     * simply matching line array indexes.
     */
    drawTransition(fromDiagram, toDiagram, progress) {
        this.clear();

        const matches = this.matchLines(fromDiagram, toDiagram);

        for (const match of matches) {
            if (match.sources.length === 0) {
                /*
                 * New line:
                 * grow it out of its nearest destination-related line
                 * rather than simply making it appear.
                 */
                this.drawAppearingLine(
                    match.targets[0],
                    progress,
                    toDiagram
                );

                continue;
            }

            if (match.targets.length === 0) {
                /*
                 * Removed line:
                 * shrink it toward its source.
                 */
                this.drawDisappearingLine(
                    match.sources[0],
                    progress,
                    fromDiagram
                );

                continue;
            }

            /*
             * One source -> one or many targets.
             */
            this.drawMappedLines(
                match.sources,
                match.targets,
                progress,
                fromDiagram,
                toDiagram
            );
        }
    }

    /*
     * Draw one source line toward multiple destination lines.
     *
     * This is what makes splits look like:
     *
     *             ─────
     *             /
     *     ───────
     *             \
     *             ─────
     *
     * rather than one bar disappearing and two bars appearing.
     */
    drawMappedLines(
        sources,
        targets,
        progress,
        fromDiagram,
        toDiagram
    ) {
        const source = sources[0];

        for (const target of targets) {
            const start = this.transformPoint(
                source.x1,
                source.y1,
                fromDiagram,
                toDiagram,
                progress
            );

            const start2 = this.transformPoint(
                source.x2,
                source.y2,
                fromDiagram,
                toDiagram,
                progress
            );

            const end = this.transformPoint(
                target.x1,
                target.y1,
                fromDiagram,
                toDiagram,
                progress
            );

            const end2 = this.transformPoint(
                target.x2,
                target.y2,
                fromDiagram,
                toDiagram,
                progress
            );

            /*
             * We interpolate the source geometry toward the target
             * geometry.
             */
            const x1 = this.lerp(start.x, end.x, progress);
            const y1 = this.lerp(start.y, end.y, progress);

            const x2 = this.lerp(start2.x, end2.x, progress);
            const y2 = this.lerp(start2.y, end2.y, progress);

            /*
             * For a split, don't show all destination lines at full
             * opacity immediately.
             */
            const alpha = Math.min(
                1,
                0.15 + progress * 0.85
            );

            this.drawLine(x1, y1, x2, y2, alpha);
        }
    }

    drawAppearingLine(line, progress, diagram) {
        const centerX = (line.x1 + line.x2) / 2;
        const centerY = (line.y1 + line.y2) / 2;

        const x1 = this.lerp(centerX, line.x1, progress);
        const y1 = this.lerp(centerY, line.y1, progress);

        const x2 = this.lerp(centerX, line.x2, progress);
        const y2 = this.lerp(centerY, line.y2, progress);

        const p1 = this.transformPoint(
            x1,
            y1,
            diagram
        );

        const p2 = this.transformPoint(
            x2,
            y2,
            diagram
        );

        this.drawLine(
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            progress
        );
    }

    drawDisappearingLine(line, progress, diagram) {
        const centerX = (line.x1 + line.x2) / 2;
        const centerY = (line.y1 + line.y2) / 2;

        const remaining = 1 - progress;

        const x1 = this.lerp(
            centerX,
            line.x1,
            remaining
        );

        const y1 = this.lerp(
            centerY,
            line.y1,
            remaining
        );

        const x2 = this.lerp(
            centerX,
            line.x2,
            remaining
        );

        const y2 = this.lerp(
            centerY,
            line.y2,
            remaining
        );

        const p1 = this.transformPoint(
            x1,
            y1,
            diagram
        );

        const p2 = this.transformPoint(
            x2,
            y2,
            diagram
        );

        this.drawLine(
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            remaining
        );
    }

    /*
     * Match lines between two diagrams.
     *
     * We intentionally don't use:
     *
     *     from.lines[i] -> to.lines[i]
     *
     * because reduction can reorder, add, remove, split or merge
     * lines.
     */
    matchLines(fromDiagram, toDiagram) {
        const sources = fromDiagram.lines;
        const targets = toDiagram.lines;

        const matches = [];

        const usedSources = new Set();
        const usedTargets = new Set();

        /*
         * First pass:
         * find the geometrically closest source for every target.
         */
        for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
            const target = targets[targetIndex];

            let bestSource = null;
            let bestDistance = Infinity;

            for (
                let sourceIndex = 0;
                sourceIndex < sources.length;
                sourceIndex++
            ) {
                const source = sources[sourceIndex];

                const distance = this.lineDistance(
                    source,
                    target
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestSource = sourceIndex;
                }
            }

            /*
             * Allow the same source to be used multiple times.
             *
             * This is important for one-to-many transitions.
             */
            if (bestSource !== null) {
                const source = sources[bestSource];

                let match = matches.find(
                    m => m.sourceIndex === bestSource
                );

                if (!match) {
                    match = {
                        sourceIndex: bestSource,
                        sources: [source],
                        targets: []
                    };

                    matches.push(match);
                }

                match.targets.push(target);

                usedTargets.add(targetIndex);
                usedSources.add(bestSource);
            }
        }

        /*
         * Lines that disappeared.
         */
        for (let i = 0; i < sources.length; i++) {
            if (!usedSources.has(i)) {
                matches.push({
                    sourceIndex: i,
                    sources: [sources[i]],
                    targets: []
                });
            }
        }

        /*
         * Lines that appeared.
         */
        for (let i = 0; i < targets.length; i++) {
            if (!usedTargets.has(i)) {
                matches.push({
                    sourceIndex: null,
                    sources: [],
                    targets: [targets[i]]
                });
            }
        }

        return matches;
    }

    lineDistance(a, b) {
        const ax = (a.x1 + a.x2) / 2;
        const ay = (a.y1 + a.y2) / 2;

        const bx = (b.x1 + b.x2) / 2;
        const by = (b.y1 + b.y2) / 2;

        const midpointDistance =
            Math.hypot(ax - bx, ay - by);

        const endpointDistance =
            Math.min(
                Math.hypot(a.x1 - b.x1, a.y1 - b.y1) +
                Math.hypot(a.x2 - b.x2, a.y2 - b.y2),

                Math.hypot(a.x1 - b.x2, a.y1 - b.y2) +
                Math.hypot(a.x2 - b.x1, a.y2 - b.y1)
            );

        return midpointDistance + endpointDistance * 0.5;
    }

    drawDiagram(diagram, alpha) {
        for (const line of diagram.lines) {
            const start = this.transformPoint(
                line.x1,
                line.y1,
                diagram
            );

            const end = this.transformPoint(
                line.x2,
                line.y2,
                diagram
            );

            this.drawLine(
                start.x,
                start.y,
                end.x,
                end.y,
                alpha
            );
        }
    }

    transformPoint(
        x,
        y,
        fromDiagram,
        toDiagram,
        progress
    ) {
        if (!toDiagram) {
            const scale = this.getScale(fromDiagram);
            const offset = this.getOffset(
                fromDiagram,
                scale
            );

            return {
                x: offset.x + x * scale,
                y: offset.y + y * scale
            };
        }

        const fromScale =
            this.getScale(fromDiagram);

        const toScale =
            this.getScale(toDiagram);

        const fromOffset =
            this.getOffset(
                fromDiagram,
                fromScale
            );

        const toOffset =
            this.getOffset(
                toDiagram,
                toScale
            );

        return {
            x: this.lerp(
                fromOffset.x + x * fromScale,
                toOffset.x + x * toScale,
                progress
            ),

            y: this.lerp(
                fromOffset.y + y * fromScale,
                toOffset.y + y * toScale,
                progress
            )
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
            x:
                (this.width -
                    diagram.width * scale) /
                2,

            y:
                (this.height -
                    diagram.height * scale) /
                2
        };
    }

    drawLine(x1, y1, x2, y2, alpha) {
        const half = this.lineWidth / 2;

        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.strokeStyle = this.color;

        this.ctx.beginPath();

        if (Math.abs(y1 - y2) < 0.01) {
            this.ctx.moveTo(x1 - half, y1);
            this.ctx.lineTo(x2 + half, y2);
        } else if (Math.abs(x1 - x2) < 0.01) {
            this.ctx.moveTo(x1, y1 - half);
            this.ctx.lineTo(x2, y2 + half);
        } else {
            /*
             * Support animated diagonal intermediate positions.
             *
             * At the final Tromp diagram the lines should normally
             * still be horizontal/vertical, but during interpolation
             * they can temporarily be diagonal.
             */
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
        }

        this.ctx.stroke();

        this.ctx.globalAlpha = 1;
    }

    clear() {
        this.ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );
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