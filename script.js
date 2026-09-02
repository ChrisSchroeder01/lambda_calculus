import { DiagramAnimator } from "./src/visualizer/diagram_animator.js";
import { betaReduce } from "./src/evaluator/beta_reduction.js";
import { LambdaExpressionParser } from "./src/parser/lambda_expression_parser.js";
import { LambdaExpressionAnalyzer } from "./src/analyzer/lambda_expression_analyzer.js";

const canvas = document.getElementById("diagram");
const input = document.getElementById("expression");
const reduceButton = document.getElementById("reduce");
const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");
const stepDisplay = document.getElementById("step");
const analysisDisplay = document.getElementById("analysis");

let expression = null;
let animator = null;

function tryParse() {
    try {
        expression = LambdaExpressionParser.parse(input.value);
        input.style.borderColor = "white";

        animator?.destroy();
        animator = null;

        drawExpression(expression);
        analysisDisplay.textContent = LambdaExpressionAnalyzer.analyze(expression);
        hideControls();
    } catch {
        expression = null;
        input.style.borderColor = "";
        analysisDisplay.textContent = "";
    }
}

function drawExpression(expression) {
    const preview = new DiagramAnimator(canvas, [expression], {
        duration: 0,
        lineWidth: 8
    });

    preview.drawStep(0);
    preview.destroy();
}

function reduceExpression() {
    if (!expression) tryParse();
    if (!expression) return;

    animator?.destroy();

    const steps = betaReduce(expression);

    animator = new DiagramAnimator(canvas, steps, {
        duration: 500,
        lineWidth: 8,
        onStepChange: updateControls
    });

    updateControls();
}

function updateControls() {
    if (!animator) return;

    const first = animator.step === 0;
    const last = animator.step === animator.diagrams.length - 1;

    previousButton.style.opacity = first ? "0" : "1";
    previousButton.style.pointerEvents = first ? "none" : "auto";

    nextButton.style.opacity = last ? "0" : "1";
    nextButton.style.pointerEvents = last ? "none" : "auto";

    stepDisplay.textContent = `${animator.step + 1} / ${animator.diagrams.length}`;
    analysisDisplay.textContent = LambdaExpressionAnalyzer.analyze(animator.expressions[animator.step]);
}

function hideControls() {
    previousButton.style.opacity = "0";
    previousButton.style.pointerEvents = "none";
    nextButton.style.opacity = "0";
    nextButton.style.pointerEvents = "none";
    stepDisplay.textContent = "";
}

input.addEventListener("input", tryParse);
reduceButton.addEventListener("click", reduceExpression);
previousButton.addEventListener("click", () => animator?.previous());
nextButton.addEventListener("click", () => animator?.next());

hideControls();
tryParse();