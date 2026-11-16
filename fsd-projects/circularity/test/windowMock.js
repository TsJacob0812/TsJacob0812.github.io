var circleID = 0;
const canvas = {
    name: "canvas",
    width: 100,
    height: 100
};
const view = {
    name: "view",
    addChild: function(child) {
        this.children.push(child);
    },
    children: []
}
const godSpeedButton = {
    addEventListener: function(event, handler) {
        this.clickHandler = handler;
    }
};

const windowMock = {
    document: {
        getElementById: function(id) {
            return id === "godSpeedBtn" ? godSpeedButton : null;
        }
    },
    godSpeedButton: godSpeedButton,
    getCircleID: function() {
        return circleID;
    },
    setCircleID: function(x) {
        circleID = x;
    },
    createjs: {
        Shape: function() {
            this.graphics = {
                clear: function() { return this; },
                setStrokeStyle: function(width) {
                    this.strokeWidth = width;
                    return this;
                },
                beginStroke: function(color) {
                    this.stroke = color;
                    return this;
                },
                moveTo: function() { return this; },
                lineTo: function() { return this; }
            };
        },
        Shadow: function(color, offsetX, offsetY, blur) {
            this.color = color;
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            this.blur = blur;
        }
    },
    opspark: {
        draw: {
            randomRadialProps: function(area) {
                return {
                    radius: 10,
                    color: "#999",
                    x: 0,
                    y: 0
                };
            },
            randomCircleInArea: function(area, randomizeAlpha, addCross, borderColor, borderThickness) {
                return {
                    name: "circle",
                    id: circleID++,
                    x: 0,
                    y: 0,
                    radius: 10,
                    on: function(event, handler) {
                        this.clickHandler = handler;
                    }
                }
            },
            fps: function() {return {}}
        }, 
        racket: {
            physikz: {
                addRandomVelocity: function(circle, canvas) {
                    circle.velocityX = 1;
                    circle.velocityY = 1;
                }, 
                updatePosition: function(circle) {
                    circle.x += circle.velocityX;
                    circle.y += circle.velocityY;
                }
            }
        }, 
        canvas: canvas,
        view: view,
        makeApp: function() {
            return {
                canvas: canvas,
                view: view,
                addUpdateable: function(){}
            }
        }
    }
};  

// DON'T REMOVE THIS CODE //////////////////////////////////////////////////////
if((typeof process !== 'undefined') &&
    (typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports = windowMock;
}