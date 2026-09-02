import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { Variable } from "../term/variable.js";

export function NUMBER(number) {
    const f = new Variable("f");
    const x = new Variable("x");

    let body = x;

    for (let i = 0; i < number; i++) {
        body = new Application(f, body);
    }

    return new Abstraction(
        f,
        new Abstraction(
            x,
            body
        )
    );
}

export const SUCC = new Abstraction(
    new Variable("n"),
    new Abstraction(
        new Variable("f"),
        new Abstraction(
            new Variable("x"),
            new Application(
                new Variable("f"),
                new Application(
                    new Application(
                        new Variable("n"),
                        new Variable("f")
                    ),
                    new Variable("x")
                )
            )
        )
    )
);

export const ADD = new Abstraction(
    new Variable("m"),
    new Abstraction(
        new Variable("n"),
        new Abstraction(
            new Variable("f"),
            new Abstraction(
                new Variable("x"),
                new Application(
                    new Application(
                        new Variable("m"),
                        new Variable("f")
                    ),
                    new Application(
                        new Application(
                            new Variable("n"),
                            new Variable("f")
                        ),
                        new Variable("x")
                    )
                )
            )
        )
    )
);

export const MUL = new Abstraction(
    new Variable("m"),
    new Abstraction(
        new Variable("n"),
        new Abstraction(
            new Variable("f"),
            new Application(
                new Variable("m"),
                new Application(
                    new Variable("n"),
                    new Variable("f")
                )
            )
        )
    )
);

export const EXP = new Abstraction(
    new Variable("m"),
    new Abstraction(
        new Variable("n"),
        new Application(
            new Variable("n"),
            new Variable("m")
        )
    )
);

export const PRED = new Abstraction(
    new Variable("n"),
    new Abstraction(
        new Variable("f"),
        new Abstraction(
            new Variable("x"),
            new Application(
                new Application(
                    new Application(
                        new Variable("n"),
                        new Abstraction(
                            new Variable("g"),
                            new Abstraction(
                                new Variable("h"),
                                new Application(
                                    new Variable("h"),
                                    new Application(
                                        new Variable("g"),
                                        new Variable("f")
                                    )
                                )
                            )
                        )
                    ),
                    new Abstraction(
                        new Variable("u"),
                        new Variable("x")
                    )
                ),
                new Abstraction(
                    new Variable("u"),
                    new Variable("u")
                )
            )
        )
    )
);

export const SUB = new Abstraction(
    new Variable("m"),
    new Abstraction(
        new Variable("n"),
        new Application(
            new Application(
                new Variable("n"),
                PRED
            ),
            new Variable("m")
        )
    )
);