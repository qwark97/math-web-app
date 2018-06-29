/*regression.js license

The MIT License (MIT)

Copyright (c) Tom Alexander <me@tomalexander.co.nz>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.*/

const addPoint = () => {
    ["X", "Y"].forEach(coord => {
        document.getElementById(coord).insertAdjacentHTML("beforeend",
         `<input class='form-control' type='text' placeholder=${coord}></input><br />`)
    })
}

const removeLast = () => {
    ["X", "Y"].forEach(coord => {
        let myNode = document.getElementById(coord)
        for(let i = 0; i < 2; i++) if(myNode.childElementCount > 2) myNode.removeChild(myNode.lastChild)
    })
}

const resetBtn = () => {
    ["X", "Y"].forEach(coord => {
        let myNode = document.getElementById(coord)
        while(myNode.childElementCount > 2) myNode.removeChild(myNode.lastChild)
        myNode.elements[0].value = ''
    })
    document.getElementById("selectFunc").selectedIndex = 0
    document.getElementById("selectPrec").selectedIndex = 0
    document.getElementById("output").style.visibility = "hidden"
}

const collectValues = () => {
        const getValues = id => {
            let vals = document.getElementById(id).elements
            let temp = []
            for(let i = 0; i < vals.length; i++) {
                let pattern = /^(-)?[0-9]*(\.)?[0-9]*$/
                if(vals[i].value) {
                    if(pattern.test(vals[i].value)) {
                        temp.push(Number(vals[i].value))
                    }
                    else {
                        alert("Niepoprawne współrzędne")
                        throw new Error("Invalid input")
                    }
                }
            }
            if(id == "X") {
                if(temp.some((c, idx) => temp.indexOf(c) != idx)) {
                    alert("Wartości X muszą być unikatowe")
                    throw new Error("Non-unique X values")
                }
            }
            return temp
        }

    let [valuesX, valuesY] = [getValues("X"), getValues("Y")]
    let data = valuesX.map((x, i) => [x, valuesY[i]])
    return {data: data, X: valuesX, Y: valuesY}
}

const selectedOption = () => {
    let [sel, order] = document.getElementById("selectFunc").value.split(';')
    return {func: sel, order: +order, default: sel == "Wybierz..."}
}

const getPrec = () => {
    let choice = document.getElementById("selectPrec").value
    return {choice: +choice, default: choice == "Wybierz..."}
}
const round = (number, precision) => {
    let factor = 10 ** precision
    return Math.round(number * factor) / factor
}

const determinationCoefficient = (data, results) => {
    const predictions = []
    const observations = []
  
    data.forEach((d, i) => {
        if (d[1] !== null) {
            observations.push(d)
            predictions.push(results[i])
        }
    })
  
    const sum = observations.reduce((a, observation) => a + observation[1], 0)
    const mean = sum / observations.length
  
    const ssyy = observations.reduce((a, observation) => {
        const difference = observation[1] - mean
        return a + (difference * difference)
    }, 0)
  
    const sse = observations.reduce((accum, observation, index) => {
        const prediction = predictions[index]
        const residual = observation[1] - prediction[1]
        return accum + (residual * residual)
    }, 0)
  
    return 1 - (sse / ssyy)
}

const gaussianElimination = (input, order) => {
    const matrix = input;
    const n = input.length - 1
    const coefficients = [order]
    for (let i = 0; i < n; i++) {
        let maxrow = i
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(matrix[i][j]) > Math.abs(matrix[i][maxrow])) {
                maxrow = j
            }
        }
  
        for (let k = i; k < n + 1; k++) {
            const tmp = matrix[k][i]
            matrix[k][i] = matrix[k][maxrow]
            matrix[k][maxrow] = tmp
        }
  
        for (let j = i + 1; j < n; j++) {
            for (let k = n; k >= i; k--) {
                matrix[k][j] -= (matrix[k][i] * matrix[i][j]) / matrix[i][i]
            }
        }
    }
  
    for (let j = n - 1; j >= 0; j--) {
        let total = 0
        for (let k = j + 1; k < n; k++) {
            total += matrix[k][j] * coefficients[k]
        }
        coefficients[j] = (matrix[n][j] - total) / matrix[j][j]
    }

    return coefficients
  }

const getResult = (data, fType, p, o) => {
    const fTypes = {
        linear: (data, options) => {
            const sum = [0, 0, 0, 0, 0]
            let len = 0
        
            for (let n = 0; n < data.length; n++) {
                if (data[n][1] !== null) {
                    len++
                    sum[0] += data[n][0]
                    sum[1] += data[n][1]
                    sum[2] += data[n][0] * data[n][0]
                    sum[3] += data[n][0] * data[n][1]
                    sum[4] += data[n][1] * data[n][1]
                }
            }
        
            const run = ((len * sum[2]) - (sum[0] * sum[0]))
            const rise = ((len * sum[3]) - (sum[0] * sum[1]))
            const gradient = run === 0 ? 0 : round(rise / run, options.precision)
            const intercept = round((sum[1] / len) - ((gradient * sum[0]) / len), options.precision)
        
            const predict = x => ([
                round(x, options.precision),
                round((gradient * x) + intercept, options.precision)]
            )
        
            const points = data.map(point => predict(point[0]))



            return {
                points,
                predict,
                equation: [gradient, intercept],
                r2: round(determinationCoefficient(data, points), options.precision),
                string: intercept === 0 ? `y = ${gradient}x` : `y = ${gradient}x + ${intercept}`,
            }
          },
        
        exponential: (data, options, order) => {
            if(data.some(point => point[1] <= 0)) {
                alert("Funkcja eksponencjalna nie działa dla niedodatnich wartości Y")
                throw new Error("Invalid input")
            }

            const sum = [0, 0, 0, 0, 0, 0]

            for (let n = 0; n < data.length; n++) {
                if (data[n][1] !== null) {
                    sum[0] += data[n][0]
                    sum[1] += data[n][1]
                    sum[2] += data[n][0] * data[n][0] * data[n][1]
                    sum[3] += data[n][1] * Math.log(data[n][1])
                    sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1])
                    sum[5] += data[n][0] * data[n][1]
                }
            }

            const denominator = ((sum[1] * sum[2]) - (sum[5] * sum[5]))
            const a = Math.exp(((sum[2] * sum[3]) - (sum[5] * sum[4])) / denominator)
            const b = ((sum[1] * sum[4]) - (sum[5] * sum[3])) / denominator
            const coeffA = round(a, options.precision)
            const coeffB = round(b, options.precision)
            const predict = x => ([
                round(x, options.precision),
                round(coeffA * Math.exp(coeffB * x), options.precision),
            ])

            const points = data.map(point => predict(point[0]))

            return {
                points,
                predict,
                equation: [coeffA, coeffB],
                string: `y = ${coeffA}e^(${coeffB}x)`,
                r2: round(determinationCoefficient(data, points), options.precision),
            }
        },

        logarithmic: (data, options) => {
            if(data.some(point => point[0] <= 0)) {
                alert("Funkcja logarytmiczna nie działa dla niedodatnich wartości X")
                throw new Error("Invalid input")
            }

            const sum = [0, 0, 0, 0]
            const len = data.length
        
            for (let n = 0; n < len; n++) {
                if (data[n][1] !== null) {
                    sum[0] += Math.log(data[n][0])
                    sum[1] += data[n][1] * Math.log(data[n][0])
                    sum[2] += data[n][1]
                    sum[3] += (Math.log(data[n][0]) ** 2)
                }
            }
        
            const a = ((len * sum[1]) - (sum[2] * sum[0])) / ((len * sum[3]) - (sum[0] * sum[0]))
            const coeffB = round(a, options.precision)
            const coeffA = round((sum[2] - (coeffB * sum[0])) / len, options.precision)
        
            const predict = x => ([
              round(x, options.precision),
              round(round(coeffA + (coeffB * Math.log(x)), options.precision), options.precision),
            ])
        
            const points = data.map(point => predict(point[0]))
        
            return {
              points,
              predict,
              equation: [coeffA, coeffB],
              string: `y = ${coeffA} + ${coeffB} log(x)`,
              r2: round(determinationCoefficient(data, points), options.precision),
            }
        },
        
        power: (data, options) => {
            if(data.some(point => point[1] <= 0 && point[0] <= 0)) {
                alert("Funkcja wykładnicza nie działa dla niedodatnich współrzędnych")
                throw new Error("Invalid input")
            }
            else if(data.some(point => point[1] <= 0)) {
                alert("Funkcja wykładnicza nie działa dla niedodatnich wartości Y")
                throw new Error("Invalid input")
            }
            else if(data.some(point => point[0] <= 0)) {
                alert("Funkcja wykładnicza nie działa dla niedodatnich wartości X")
                throw new Error("Invalid input")
            }
            const sum = [0, 0, 0, 0, 0]
            const len = data.length
        
            for (let n = 0; n < len; n++) {
                if (data[n][1] !== null) {
                    sum[0] += Math.log(data[n][0])
                    sum[1] += Math.log(data[n][1]) * Math.log(data[n][0])
                    sum[2] += Math.log(data[n][1])
                    sum[3] += (Math.log(data[n][0]) ** 2)
                    }
                console.log(sum)
            }
        
            const b = ((len * sum[1]) - (sum[0] * sum[2])) / ((len * sum[3]) - (sum[0] ** 2))
            const a = ((sum[2] - (b * sum[0])) / len)
            const coeffA = round(Math.exp(a), options.precision)
            const coeffB = round(b, options.precision)
        
            const predict = x => ([
                round(x, options.precision),
                round(round(coeffA * (x ** coeffB), options.precision), options.precision),
            ])
        
            const points = data.map(point => predict(point[0]))
        
            return {
                points,
                predict,
                equation: [coeffA, coeffB],
                string: `y = ${coeffA}x^(${coeffB})`,
                r2: round(determinationCoefficient(data, points), options.precision),
            }
        },
        
        polynomial: (data, options) => {
            const lhs = []
            const rhs = []
            let a = 0
            let b = 0
            const len = data.length
            const k = options.order + 1
        
            for (let i = 0; i < k; i++) {
                for (let l = 0; l < len; l++) {
                    if (data[l][1] !== null) {
                        a += (data[l][0] ** i) * data[l][1]
                    }
                }
                lhs.push(a)
                a = 0
                const c = []
                for (let j = 0; j < k; j++) {
                    for (let l = 0; l < len; l++) {
                        if (data[l][1] !== null) {
                            b += data[l][0] ** (i + j)
                        }
                    }
                    c.push(b)
                    b = 0
                }
                rhs.push(c)
            }
            rhs.push(lhs)
        
            const coefficients = gaussianElimination(rhs, k).map(v => round(v, options.precision))
        
            const predict = x => ([
              round(x, options.precision),
              round(
                coefficients.reduce((sum, coeff, power) => sum + (coeff * (x ** power)), 0),
                options.precision,
              ),
            ])
        
            const points = data.map(point => predict(point[0]))
        
            let string = 'y = '
            for (let i = coefficients.length - 1; i >= 0; i--) {
                if (i > 1) {
                    string += `${coefficients[i]}x^${i} + `
                } else if (i === 1) {
                    string += 'x + '
                } else {
                    string += coefficients[i]
                }
            }
        
            return {
                string,
                points,
                predict,
                equation: [...coefficients].reverse(),
                r2: round(determinationCoefficient(data, points), options.precision),
            }
        }
    }
    return fTypes[fType](data, {precision: p, order: o}).string
                                                        .replace(/\+\s\-/g, '- ')
                                                        .replace(/0x(\^\d+ )?(\+|-)?( )?/g, '')
                                                        //.replace(/(?<=-| )1(?=x)/, '')
}

const getEq = (data, f, p, o) => {
    let myNode = document.getElementById("eq")
    myNode.value = getResult(data, f, p, o)
    myNode.innerHTML = myNode.value
}

const output = () => {
    let VALUES = collectValues()
    let SELECTED = selectedOption()
    let PRECISION = getPrec()
    let Xs = VALUES.X
    let Ys = VALUES.Y
    
    if(PRECISION.default) {
        alert("Ustaw precyzję wyniku")
        throw new Error("Result precision not selected")
    }
    if(SELECTED.default) {
        alert("Wybierz rodzaj funkcji")
        throw new Error("Function type not selected")
    }
    if(Xs.length < 2 || Xs.length != Ys.length) {
        alert("Podaj co najmniej dwa punkty")
        throw new Error("Less than two points given")
    }
    document.getElementById("output").style.visibility = "visible"
    getEq(VALUES.data, SELECTED.func, PRECISION.choice, SELECTED.order)
    draw()
}