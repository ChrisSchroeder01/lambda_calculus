import { createTrompDiagram } from "./tromps_diagrams.js";

const UNIT = 20;

export class DiagramAnimator {
    constructor(canvas, expressions, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.expressions = expressions;
        this.diagrams = expressions.map(createDiagram);

        this.step = 0;
        this.targetStep = 0;

        this.duration = options.duration ?? 500;
        this.jumpDuration = options.jumpDuration ?? 220;

        this.lineWidth = options.lineWidth ?? 8;
        this.color = options.color ?? "white";

        this.onStepChange =
            options.onStepChange ?? (() => {});

        this.animationFrame = null;

        this.animation = null;

        this.resizeHandler = () => {
            this.resize();

            /*
             * During an animation redraw the current animation state.
             */
            if (this.animation) {
                const now = performance.now();

                const progress = Math.min(
                    (now - this.animation.start) /
                        this.animation.duration,
                    1
                );

                this.drawTransition(
                    this.animation.from,
                    this.animation.to,
                    this.ease(progress)
                );
            } else {
                this.drawStep(this.step);
            }
        };

        this.resize();

        window.addEventListener(
            "resize",
            this.resizeHandler
        );

        this.drawStep(0);
        this.onStepChange(this.step);
    }

    destroy() {
        cancelAnimationFrame(
            this.animationFrame
        );

        this.animationFrame = null;
        this.animation = null;

        window.removeEventListener(
            "resize",
            this.resizeHandler
        );
    }

    resize() {
        const dpr =
            window.devicePixelRatio || 1;

        const width = Math.min(
            window.innerWidth * 0.9,
            1100
        );

        const height = Math.min(
            window.innerHeight * 0.75,
            700
        );

        this.canvas.style.width =
            `${width}px`;

        this.canvas.style.height =
            `${height}px`;

        this.canvas.width =
            width * dpr;

        this.canvas.height =
            height * dpr;

        this.ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        this.ctx.strokeStyle =
            this.color;

        this.ctx.lineWidth =
            this.lineWidth;

        this.ctx.lineCap = "butt";
        this.ctx.lineJoin = "miter";

        this.width = width;
        this.height = height;
    }

    next() {
        if (
            this.targetStep >=
            this.diagrams.length - 1
        ) {
            return;
        }

        this.targetStep++;

        this.startNavigation();
    }

    previous() {
        if (this.targetStep <= 0) {
            return;
        }

        this.targetStep--;

        this.startNavigation();
    }

    /*
     * First and Last are direct jumps.
     *
     * We do NOT animate:
     *
     * 1 → 2 → 3 → ... → 50
     *
     * Instead:
     *
     * 1 ───────────────→ 50
     */
    first() {
        if (this.diagrams.length === 0) {
            return;
        }

        this.targetStep = 0;

        this.jumpToTarget();
    }

    last() {
        if (this.diagrams.length === 0) {
            return;
        }

        this.targetStep =
            this.diagrams.length - 1;

        this.jumpToTarget();
    }

    goTo(step, fast = false) {
        if (this.diagrams.length === 0) {
            return;
        }

        step = Math.max(
            0,
            Math.min(
                step,
                this.diagrams.length - 1
            )
        );

        this.targetStep = step;

        if (fast) {
            this.jumpToTarget();
        } else {
            this.startNavigation();
        }
    }

    /*
     * Normal Next / Previous navigation.
     */
    startNavigation() {
        /*
         * If already animating, DON'T restart.
         *
         * targetStep has changed and the current animation
         * will continue from where it is.
         */
        if (this.animationFrame) {
            return;
        }

        this.animateNextSegment();
    }

    animateNextSegment() {
        if (
            this.step ===
            this.targetStep
        ) {
            this.animationFrame = null;
            this.animation = null;

            this.onStepChange(this.step);

            return;
        }

        const fromStep = this.step;

        const direction =
            this.targetStep > this.step
                ? 1
                : -1;

        const toStep =
            this.step + direction;

        this.beginAnimation(
            this.diagrams[fromStep],
            this.diagrams[toStep],
            this.duration,
            () => {
                this.step = toStep;

                this.drawStep(this.step);

                this.onStepChange(
                    this.step
                );

                /*
                 * If the user has requested more steps,
                 * continue immediately.
                 */
                if (
                    this.step !==
                    this.targetStep
                ) {
                    this.animateNextSegment();
                } else {
                    this.animationFrame = null;
                    this.animation = null;
                }
            }
        );
    }

    /*
     * Direct First / Last transition.
     */
    jumpToTarget() {
        if (
            this.step ===
            this.targetStep
        ) {
            return;
        }

        /*
         * If a normal step animation is currently running,
         * cancel it and capture the visual position currently
         * displayed on screen.
         */
        if (this.animationFrame) {
            cancelAnimationFrame(
                this.animationFrame
            );

            this.animationFrame = null;
        }

        const destination =
            this.diagrams[
                this.targetStep
            ];

        /*
         * Use the current step as the source.
         *
         * This is intentionally a direct visual jump.
         */
        const source =
            this.animation?.to ||
            this.diagrams[this.step];

        this.animation = null;

        this.beginAnimation(
            source,
            destination,
            this.jumpDuration,
            () => {
                this.step =
                    this.targetStep;

                this.drawStep(
                    this.step
                );

                this.onStepChange(
                    this.step
                );

                this.animationFrame = null;
                this.animation = null;
            }
        );
    }

    beginAnimation(
        from,
        to,
        duration,
        onComplete
    ) {
        this.animation = {
            from,
            to,
            duration,
            start: performance.now()
        };

        const frame = (time) => {
            /*
             * The animation may have been cancelled.
             */
            if (!this.animation) {
                return;
            }

            const progress =
                Math.min(
                    (time -
                        this.animation.start) /
                        this.animation.duration,
                    1
                );

            const eased =
                this.ease(progress);

            this.drawTransition(
                this.animation.from,
                this.animation.to,
                eased
            );

            if (progress < 1) {
                this.animationFrame =
                    requestAnimationFrame(
                        frame
                    );

                return;
            }

            this.animationFrame = null;

            const callback =
                onComplete;

            this.animation = null;

            callback();
        };

        this.animationFrame =
            requestAnimationFrame(frame);
    }

    drawStep(step) {
        this.clear();

        const diagram =
            this.diagrams[step];

        if (!diagram) {
            return;
        }

        this.drawDiagram(
            diagram,
            1
        );
    }

    /*
     * Main transition.
     */
    drawTransition(
        fromDiagram,
        toDiagram,
        progress
    ) {
        this.clear();

        const matches =
            this.matchLines(
                fromDiagram,
                toDiagram
            );

        for (const match of matches) {
            /*
             * Source only:
             * line disappears toward its center.
             */
            if (
                match.sources.length > 0 &&
                match.targets.length === 0
            ) {
                this.drawDisappearingLine(
                    match.sources[0],
                    progress,
                    fromDiagram
                );

                continue;
            }

            /*
             * Target only:
             * line grows from its center.
             */
            if (
                match.sources.length === 0 &&
                match.targets.length > 0
            ) {
                this.drawAppearingLine(
                    match.targets[0],
                    progress,
                    toDiagram
                );

                continue;
            }

            /*
             * Existing line → existing line.
             *
             * This is the important case.
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
     * Handles:
     *
     * 1 → 1
     * 1 → many
     * many → 1
     *
     * without double-transforming the coordinates.
     */
    drawMappedLines(
        sources,
        targets,
        progress,
        fromDiagram,
        toDiagram
    ) {
        /*
         * Use the nearest source as the origin.
         */
        const source =
            sources[0];

        for (
            let i = 0;
            i < targets.length;
            i++
        ) {
            const target =
                targets[i];

            /*
             * Source coordinates are transformed using
             * ONLY the source diagram.
             */
            const sourceStart =
                this.transformPoint(
                    source.x1,
                    source.y1,
                    fromDiagram
                );

            const sourceEnd =
                this.transformPoint(
                    source.x2,
                    source.y2,
                    fromDiagram
                );

            /*
             * Target coordinates are transformed using
             * ONLY the target diagram.
             */
            const targetStart =
                this.transformPoint(
                    target.x1,
                    target.y1,
                    toDiagram
                );

            const targetEnd =
                this.transformPoint(
                    target.x2,
                    target.y2,
                    toDiagram
                );

            /*
             * Correct interpolation:
             *
             * source screen position
             *            ↓
             *            ↓
             * target screen position
             */
            const x1 = this.lerp(
                sourceStart.x,
                targetStart.x,
                progress
            );

            const y1 = this.lerp(
                sourceStart.y,
                targetStart.y,
                progress
            );

            const x2 = this.lerp(
                sourceEnd.x,
                targetEnd.x,
                progress
            );

            const y2 = this.lerp(
                sourceEnd.y,
                targetEnd.y,
                progress
            );

            /*
             * For a split, the second/third destination
             * starts with lower opacity and grows in.
             */
            const alpha =
                targets.length === 1
                    ? 1
                    : 0.2 +
                      0.8 * progress;

            this.drawLine(
                x1,
                y1,
                x2,
                y2,
                alpha
            );
        }
    }

    drawAppearingLine(
        line,
        progress,
        diagram
    ) {
        const centerX =
            (line.x1 + line.x2) / 2;

        const centerY =
            (line.y1 + line.y2) / 2;

        const x1 =
            this.lerp(
                centerX,
                line.x1,
                progress
            );

        const y1 =
            this.lerp(
                centerY,
                line.y1,
                progress
            );

        const x2 =
            this.lerp(
                centerX,
                line.x2,
                progress
            );

        const y2 =
            this.lerp(
                centerY,
                line.y2,
                progress
            );

        const p1 =
            this.transformPoint(
                x1,
                y1,
                diagram
            );

        const p2 =
            this.transformPoint(
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

    drawDisappearingLine(
        line,
        progress,
        diagram
    ) {
        const centerX =
            (line.x1 + line.x2) / 2;

        const centerY =
            (line.y1 + line.y2) / 2;

        const remaining =
            1 - progress;

        const x1 =
            this.lerp(
                centerX,
                line.x1,
                remaining
            );

        const y1 =
            this.lerp(
                centerY,
                line.y1,
                remaining
            );

        const x2 =
            this.lerp(
                centerX,
                line.x2,
                remaining
            );

        const y2 =
            this.lerp(
                centerY,
                line.y2,
                remaining
            );

        const p1 =
            this.transformPoint(
                x1,
                y1,
                diagram
            );

        const p2 =
            this.transformPoint(
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
     * Match lines intelligently.
     *
     * Unlike the previous implementation, a destination line
     * is NOT automatically matched to the nearest source.
     *
     * There is a maximum distance threshold.
     */
    matchLines(
        fromDiagram,
        toDiagram
    ) {
        const sources =
            fromDiagram.lines;

        const targets =
            toDiagram.lines;

        const matches = [];

        const sourceUsed =
            new Set();

        const targetUsed =
            new Set();

        /*
         * Calculate every possible pair.
         */
        const candidates = [];

        for (
            let sourceIndex = 0;
            sourceIndex < sources.length;
            sourceIndex++
        ) {
            for (
                let targetIndex = 0;
                targetIndex < targets.length;
                targetIndex++
            ) {
                const distance =
                    this.lineDistance(
                        sources[sourceIndex],
                        targets[targetIndex]
                    );

                candidates.push({
                    sourceIndex,
                    targetIndex,
                    distance
                });
            }
        }

        /*
         * Closest matches first.
         */
        candidates.sort(
            (a, b) =>
                a.distance -
                b.distance
        );

        /*
         * Establish sensible matches.
         *
         * A source can be reused for a split.
         * A target can be used only once.
         */
        for (const candidate of candidates) {
            if (
                targetUsed.has(
                    candidate.targetIndex
                )
            ) {
                continue;
            }

            /*
             * Don't match completely unrelated lines.
             */
            if (
                candidate.distance >
                this.getMatchThreshold(
                    sources[
                        candidate.sourceIndex
                    ],
                    targets[
                        candidate.targetIndex
                    ]
                )
            ) {
                continue;
            }

            targetUsed.add(
                candidate.targetIndex
            );

            const sourceIndex =
                candidate.sourceIndex;

            let match =
                matches.find(
                    item =>
                        item.sourceIndex ===
                        sourceIndex
                );

            if (!match) {
                match = {
                    sourceIndex,
                    sources: [
                        sources[sourceIndex]
                    ],
                    targets: []
                };

                matches.push(match);
                sourceUsed.add(
                    sourceIndex
                );
            }

            match.targets.push(
                targets[
                    candidate.targetIndex
                ]
            );
        }

        /*
         * Source lines which disappeared.
         */
        for (
            let i = 0;
            i < sources.length;
            i++
        ) {
            if (!sourceUsed.has(i)) {
                matches.push({
                    sourceIndex: i,
                    sources: [sources[i]],
                    targets: []
                });
            }
        }

        /*
         * Target lines which appeared.
         */
        for (
            let i = 0;
            i < targets.length;
            i++
        ) {
            if (!targetUsed.has(i)) {
                matches.push({
                    sourceIndex: null,
                    sources: [],
                    targets: [targets[i]]
                });
            }
        }

        return matches;
    }

    getMatchThreshold(a, b) {
        /*
         * Lines within roughly a few structural units of one
         * another can be considered the same moving line.
         */
        return (
            UNIT * 5 +
            Math.abs(a.length - b.length) * 0.5
        );
    }

    lineDistance(a, b) {
        /*
         * Strongly prefer the same orientation.
         */
        const orientationPenalty =
            a.orientation === b.orientation
                ? 0
                : UNIT * 4;

        const midpointDistance =
            Math.hypot(
                a.cx - b.cx,
                a.cy - b.cy
            );

        const endpointDistance =
            Math.min(
                Math.hypot(
                    a.x1 - b.x1,
                    a.y1 - b.y1
                ) +
                    Math.hypot(
                        a.x2 - b.x2,
                        a.y2 - b.y2
                    ),

                Math.hypot(
                    a.x1 - b.x2,
                    a.y1 - b.y2
                ) +
                    Math.hypot(
                        a.x2 - b.x1,
                        a.y2 - b.y1
                    )
            );

        const lengthDifference =
            Math.abs(
                a.length -
                b.length
            );

        /*
         * Structural kind also matters.
         *
         * A binding line should preferentially remain a binding line,
         * an application bar should preferentially remain an application
         * bar, etc.
         */
        const kindPenalty =
            a.kind === b.kind
                ? 0
                : UNIT * 3;

        return (
            midpointDistance +
            endpointDistance * 0.5 +
            lengthDifference * 0.25 +
            orientationPenalty +
            kindPenalty
        );
    }

    drawDiagram(
        diagram,
        alpha
    ) {
        for (const line of diagram.lines) {
            const start =
                this.transformPoint(
                    line.x1,
                    line.y1,
                    diagram
                );

            const end =
                this.transformPoint(
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
        diagram
    ) {
        const scale =
            this.getScale(diagram);

        const offset =
            this.getOffset(
                diagram,
                scale
            );

        return {
            x:
                offset.x +
                x * scale,

            y:
                offset.y +
                y * scale
        };
    }

    getScale(diagram) {
        return Math.min(
            (this.width - 80) /
                Math.max(
                    diagram.width,
                    1
                ),

            (this.height - 80) /
                Math.max(
                    diagram.height,
                    1
                ),

            1
        );
    }

    getOffset(
        diagram,
        scale
    ) {
        return {
            x:
                (this.width -
                    diagram.width *
                        scale) /
                2,

            y:
                (this.height -
                    diagram.height *
                        scale) /
                2
        };
    }

    drawLine(
        x1,
        y1,
        x2,
        y2,
        alpha
    ) {
        const half =
            this.lineWidth / 2;

        this.ctx.globalAlpha =
            Math.max(
                0,
                Math.min(1, alpha)
            );

        this.ctx.lineWidth =
            this.lineWidth;

        this.ctx.strokeStyle =
            this.color;

        this.ctx.beginPath();

        /*
         * During animation lines can temporarily be diagonal,
         * so don't throw those away.
         */
        this.ctx.moveTo(
            x1,
            y1
        );

        this.ctx.lineTo(
            x2,
            y2
        );

        /*
         * Extend horizontal/vertical lines by half their width
         * to preserve the old visual appearance.
         */
        if (
            Math.abs(y1 - y2) <
            0.01
        ) {
            this.ctx.moveTo(
                x1 - half,
                y1
            );

            this.ctx.lineTo(
                x2 + half,
                y2
            );
        } else if (
            Math.abs(x1 - x2) <
            0.01
        ) {
            this.ctx.moveTo(
                x1,
                y1 - half
            );

            this.ctx.lineTo(
                x2,
                y2 + half
            );
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
        return (
            a +
            (b - a) * t
        );
    }

    ease(t) {
        /*
         * Smoothstep.
         */
        return (
            t *
            t *
            (3 - 2 * t)
        );
    }
}

function createDiagram(expression) {
    return createTrompDiagram(
        expression
    );
}