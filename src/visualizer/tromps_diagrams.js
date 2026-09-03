import { Variable } from "../term/variable.js";
import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";

const UNIT = 20;

export function createTrompDiagram(term) {
    resolveScopes(term, []);

    const lines = [];

    function addLine(x1, y1, x2, y2, kind = "structure") {
        const line = {
            x1,
            y1,
            x2,
            y2,
            kind,

            orientation:
                x1 === x2
                    ? "vertical"
                    : y1 === y2
                        ? "horizontal"
                        : "diagonal",

            length: Math.hypot(x2 - x1, y2 - y1),

            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2
        };

        lines.push(line);

        return line;
    }

    function draw(term, x, y) {
        if (term instanceof Variable) {
            const rootX = x + UNIT / 2;
            const key = term.binder || `free:${term.name}`;

            return {
                x,
                y,
                width: UNIT,
                height: 0,
                rootX,

                freeVars: new Map([
                    [
                        key,
                        [
                            {
                                x: rootX,
                                y
                            }
                        ]
                    ]
                ])
            };
        }

        if (term instanceof Abstraction) {
            const body = draw(term.body, x, y + UNIT);

            const occurrences = body.freeVars.get(term) || [];

            body.freeVars.delete(term);

            const leftX = x;
            const rightX = x + body.width;

            addLine(leftX, y, rightX, y, "abstraction");

            for (const point of occurrences) {
                addLine(point.x, y, point.x, point.y, "binding");
            }

            return {
                x,
                y,
                width: body.width,
                height: body.height + UNIT,
                rootX: body.rootX,
                freeVars: body.freeVars
            };
        }

        if (term instanceof Application) {
            const fn = draw(term.fn, x, y);

            const argument = draw(term.argument, x + fn.width + UNIT, y);

            const bottomY = y + Math.max(fn.height, argument.height);

            if (y + fn.height < bottomY) {
                addLine(fn.rootX, y + fn.height, fn.rootX, bottomY, "application-stem");
            }

            if (y + argument.height < bottomY) {
                addLine(argument.rootX, y + argument.height, argument.rootX, bottomY, "application-stem");
            }

            addLine(fn.rootX, bottomY, argument.rootX, bottomY, "application");

            const rootX = fn.rootX;
            const newBottom = bottomY + UNIT;

            addLine(
                rootX,
                bottomY,
                rootX,
                newBottom,
                "application-root"
            );

            const freeVars = new Map(fn.freeVars);

            for (const [key, points] of argument.freeVars) {
                freeVars.set(
                    key,
                    [
                        ...(freeVars.get(key) || []),
                        ...points
                    ]
                );
            }

            return {
                x,
                y,
                width: argument.x + argument.width - x,
                height: newBottom - y,
                rootX,
                freeVars
            };
        }

        throw new Error("Unknown term");
    }

    const bounds = draw(term, 0, 0);

    for (const points of bounds.freeVars.values()) {
        for (const point of points) {
            addLine(point.x, Math.max(0, point.y - UNIT), point.x, point.y, "free-variable");
        }
    }

    return {
        width: bounds.width,
        height: bounds.height,
        lines
    };
}

function resolveScopes(term, scope) {
    if (term instanceof Variable) {
        for (let i = scope.length - 1; i >= 0; i--) {
            if (scope[i].name === term.name) {
                term.binder = scope[i].node;
                return;
            }
        }

        term.binder = null;
        return;
    }

    if (term instanceof Abstraction) {
        resolveScopes(
            term.body,
            [
                ...scope,
                {
                    name: term.parameter.name,
                    node: term
                }
            ]
        );

        return;
    }

    if (term instanceof Application) {
        resolveScopes(term.fn, scope);
        resolveScopes(term.argument, scope);
        return;
    }

    throw new Error("Unknown term");
}