const display = document.getElementById("display");
const historyDisplay = document.getElementById("history");
const keypad = document.querySelector(".keypad");

let expression = "";
let justCalculated = false;
let hasError = false;

const operators = ["+", "-", "×", "÷"];

function updateDisplay() {
    display.value = expression || "0";
    display.classList.remove("error");
    hasError = false;
}

function clearCalculator() {
    expression = "";
    historyDisplay.textContent = "";
    justCalculated = false;
    hasError = false;
    updateDisplay();
}

function deleteLastCharacter() {
    if (hasError) {
        clearCalculator();
        return;
    }

    if (justCalculated) {
        expression = "";
        justCalculated = false;
    } else {
        expression = expression.slice(0, -1);
    }

    updateDisplay();
}

function appendValue(value) {
    if (hasError) {
        clearCalculator();
    }

    if (justCalculated) {
        if (!operators.includes(value) && value !== ")") {
            expression = "";
        }

        justCalculated = false;
    }

    if (/^\d$/.test(value)) {
        // Avoid inputs such as 0005.
        if (expression === "0") {
            expression = value;
        } else {
            expression += value;
        }
    } else if (value === ".") {
        const currentNumber = expression.split(/[+\-×÷()]/).pop();

        if (!currentNumber.includes(".")) {
            if (
                currentNumber === "" &&
                (expression === "" || expression.endsWith("("))
            ) {
                expression += "0.";
            } else if (expression === "" || operators.includes(expression.slice(-1))) {
                expression += "0.";
            } else {
                expression += ".";
            }
        }
    } else if (operators.includes(value)) {
        if (expression === "") {
            if (value === "-") {
                expression = "-";
            } else {
                return;
            }
        } else {
            const last = expression.slice(-1);

            if (operators.includes(last)) {
                // Allow unary minus after another operator:
                // 5 × -2, 5 + -2, etc.
                if (value === "-" && last !== "-") {
                    expression += value;
                } else if (
                    last === "-" &&
                    expression.length >= 2 &&
                    operators.includes(expression[expression.length - 2])
                ) {
                    expression = expression.slice(0, -2) + value;
                } else if (last === "-") {
                    expression = expression.slice(0, -1) + value;
                } else {
                    expression = expression.slice(0, -1) + value;
                }
            } else {
                expression += value;
            }
        }
    } else if (value === "(") {
        const last = expression.slice(-1);

        if (/\d|\)/.test(last)) {
            expression += "×(";
        } else {
            expression += "(";
        }
    } else if (value === ")") {
        const openCount = (expression.match(/\(/g) || []).length;
        const closeCount = (expression.match(/\)/g) || []).length;
        const last = expression.slice(-1);

        if (
            openCount > closeCount &&
            expression !== "" &&
            !operators.includes(last) &&
            last !== "("
        ) {
            expression += ")";
        }
    }

    updateDisplay();
}

// Tokenize the expression into numbers and operators.
function tokenize(input) {
    const tokens = [];
    let index = 0;

    while (index < input.length) {
        const char = input[index];

        if (char === " ") {
            index++;
            continue;
        }

        if (/[0-9.]/.test(char)) {
            let number = "";
            let decimalCount = 0;

            while (
                index < input.length &&
                /[0-9.]/.test(input[index])
            ) {
                if (input[index] === ".") {
                    decimalCount++;
                }

                number += input[index];
                index++;
            }

            if (decimalCount > 1 || number === ".") {
                throw new Error("Invalid number");
            }

            const parsedNumber = Number(number);

            if (!Number.isFinite(parsedNumber)) {
                throw new Error("Invalid number");
            }

            tokens.push(parsedNumber);
            continue;
        }

        if ("+-×÷()".includes(char)) {
            tokens.push(char);
            index++;
            continue;
        }

        throw new Error("Invalid character");
    }

    return tokens;
}

// Grammar:
// expression -> term (("+" | "-") term)*
// term       -> unary (("×" | "÷") unary)*
// unary      -> ("+" | "-") unary | primary
// primary    -> NUMBER | "(" expression ")"

function evaluateExpression(input) {
    const tokens = tokenize(input);
    let position = 0;

    function parseExpression() {
        let value = parseTerm();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {
            const operator = tokens[position++];
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (
            tokens[position] === "×" ||
            tokens[position] === "÷"
        ) {
            const operator = tokens[position++];
            const right = parseUnary();

            if (operator === "×") {
                value *= right;
            } else {
                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value /= right;
            }
        }

        return value;
    }

    function parseUnary() {
        if (tokens[position] === "+") {
            position++;
            return parseUnary();
        }

        if (tokens[position] === "-") {
            position++;
            return -parseUnary();
        }

        return parsePrimary();
    }

    function parsePrimary() {
        const token = tokens[position++];

        if (typeof token === "number") {
            return token;
        }

        if (token === "(") {
            const value = parseExpression();

            if (tokens[position] !== ")") {
                throw new Error("Missing closing parenthesis");
            }

            position++;
            return value;
        }

        throw new Error("Invalid expression");
    }

    if (tokens.length === 0) {
        throw new Error("Empty expression");
    }

    const result = parseExpression();

    if (position !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Result out of range");
    }

    return result;
}

function formatResult(number) {
    // Prevent floating-point display artifacts such as 0.30000000000000004.
    if (Object.is(number, -0)) {
        return "0";
    }

    return Number(number.toPrecision(12)).toString();
}

function calculate() {
    if (hasError || !expression.trim()) {
        return;
    }

    const originalExpression = expression;

    try {
        const result = evaluateExpression(originalExpression);
        const formattedResult = formatResult(result);

        historyDisplay.textContent =
            `${originalExpression} =`;

        expression = formattedResult;
        display.value = formattedResult;
        display.classList.remove("error");
        justCalculated = true;
    } catch (error) {
        display.value =
            error.message === "Cannot divide by zero"
                ? "Cannot divide by zero"
                : "Invalid expression";

        display.classList.add("error");
        historyDisplay.textContent = "";
        hasError = true;
        justCalculated = false;
    }
}

// Mouse and touch interactions.
keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const { action, value } = button.dataset;

    if (action === "clear") {
        clearCalculator();
    } else if (action === "delete") {
        deleteLastCharacter();
    } else if (action === "calculate") {
        calculate();
    } else if (value !== undefined) {
        appendValue(value);
    }
});

// Keyboard interactions.
document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/^\d$/.test(key)) {
        appendValue(key);
    } else if (key === ".") {
        appendValue(".");
    } else if (key === "+") {
        appendValue("+");
    } else if (key === "-") {
        appendValue("-");
    } else if (key === "*") {
        appendValue("×");
    } else if (key === "/") {
        event.preventDefault();
        appendValue("÷");
    } else if (key === "(" || key === ")") {
        appendValue(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculate();
    } else if (key === "Backspace") {
        event.preventDefault();
        deleteLastCharacter();
    } else if (key === "Escape" || key === "Delete") {
        clearCalculator();
    }
});

// Initialize the calculator.
updateDisplay();