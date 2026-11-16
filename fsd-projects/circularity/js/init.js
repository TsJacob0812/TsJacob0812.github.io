var init = function (window) {
    'use strict';
    var 
        draw = window.opspark.draw,
        physikz = window.opspark.racket.physikz,
        
        app = window.opspark.makeApp(),
        canvas = app.canvas, 
        view = app.view,
        fps = draw.fps('#000');
        
    
    window.opspark.makeGame = function() {
        
        window.opspark.game = {};
        var game = window.opspark.game;
        
        ///////////////////
        // PROGRAM SETUP //
        ///////////////////
        
        // TODO 1 : Declare and initialize our variables
        var circles = [];
        var trailGlowLevel = 0;
        var circleColors = ["#FF1744", "#F44336", "#D50000", "#FF5252", "#B71C1C", "#FF8A80"];

        function addCircleTrail(circle, color) {
            var trail = new window.createjs.Shape();
            var points = [{ x: circle.x, y: circle.y }];
            var red = parseInt(color.slice(1, 3), 16);
            var green = parseInt(color.slice(3, 5), 16);
            var blue = parseInt(color.slice(5, 7), 16);

            circle.updateTrail = function() {
                var previous = points[points.length - 1];
                if (Math.abs(circle.x - previous.x) > canvas.width / 2 ||
                    Math.abs(circle.y - previous.y) > canvas.height / 2) {
                    points = [];
                }

                points.push({ x: circle.x, y: circle.y });
                if (points.length > 30) {
                    points.shift();
                }

                var graphics = trail.graphics;
                graphics.clear();
                for (var i = 1; i < points.length; i++) {
                    var alpha = Math.min(1, (i / (points.length - 1)) * (0.75 + trailGlowLevel * 0.12));
                    graphics.setStrokeStyle(6 + trailGlowLevel * 4)
                        .beginStroke("rgba(" + red + "," + green + "," + blue + "," + alpha + ")")
                        .moveTo(points[i - 1].x, points[i - 1].y)
                        .lineTo(points[i].x, points[i].y);
                }
            };

            circle.updateTrailGlow = function(level) {
                trail.shadow = new window.createjs.Shadow(
                    "rgba(" + red + "," + green + "," + blue + ",0.95)",
                    0,
                    0,
                    18 + level * 12
                );
            };
            circle.updateTrailGlow(trailGlowLevel);
            view.addChild(trail);
            circle.updateTrail();
        }

        // TODO 2 : Create a function that draws a circle 
        function drawCircle() {
            var color = circleColors[circles.length % circleColors.length];
            var radialProps = draw.randomRadialProps(canvas);
            radialProps.color = color;
            var circle = draw.randomCircleInArea(canvas, false, false, color, 2, radialProps);
            physikz.addRandomVelocity(circle, canvas, 5, 5);
            circle.on("click", function() {
                circle.velocityX *= 3;
                circle.velocityY *= 3;
            });
            addCircleTrail(circle, color);
            view.addChild(circle);
            circles.push(circle);
        }


        // TODO 3 : Call the drawCircle() function
        // TODO 7 : Use a loop to create multiple circles
        for (var i = 0; i < 100; i++) {
            drawCircle();
        }


        ///////////////////
        // PROGRAM LOGIC //
        ///////////////////
        
        /* 
        This Function is called 60 times/second, producing 60 frames/second.
        In each frame, for every circle, it should redraw that circle
        and check to see if it has drifted off the screen.         
        */
        function update() {
            // TODO 4 : Update the position of each circle using physikz.updatePosition()
            // TODO 5 : Call game.checkCirclePosition() on your circles
            // TODO 8 / TODO 9 : Iterate over the array
            for (var i = 0; i < circles.length; i++) {
                var circle = circles[i];
                physikz.updatePosition(circle);
                game.checkCirclePosition(circle);
                circle.updateTrail();
            }
        }
    
        /* 
        This Function should check the position of a circle that is passed to the 
        Function. If that circle drifts off the screen, this Function should move
        it to the opposite side of the screen.
        */
        game.checkCirclePosition = function(circle) {

            if (circle.x - circle.radius > canvas.width) {
                circle.x = -circle.radius;
            }
            
            // TODO 6 : YOUR CODE STARTS HERE //////////////////////
            if (circle.x + circle.radius < 0) {
                circle.x = canvas.width + circle.radius;
            }
            if (circle.y - circle.radius > canvas.height) {
                circle.y = -circle.radius;
            }
            if (circle.y + circle.radius < 0) {
                circle.y = canvas.height + circle.radius;
            }

            // YOUR TODO 6 CODE ENDS HERE //////////////////////////
        }

        game.activateGodSpeed = function() {
            trailGlowLevel++;
            for (var i = 0; i < circles.length; i++) {
                circles[i].velocityX *= 10;
                circles[i].velocityY *= 10;
                circles[i].updateTrailGlow(trailGlowLevel);
            }
        };

        window.document.getElementById("godSpeedBtn").addEventListener("click", game.activateGodSpeed);
        
        /////////////////////////////////////////////////////////////
        // --- NO CODE BELOW HERE  --- DO NOT REMOVE THIS CODE --- //
        /////////////////////////////////////////////////////////////
        
        view.addChild(fps);
        app.addUpdateable(fps);
        
        game.circles = circles;
        game.drawCircle = drawCircle;
        game.addCircleTrail = addCircleTrail;
        game.update = update;
        
        app.addUpdateable(window.opspark.game);
    }
};

// DO NOT REMOVE THIS CODE //////////////////////////////////////////////////////
if((typeof process !== 'undefined') &&
    (typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports = init;
}
