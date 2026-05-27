document.addEventListener("DOMContentLoaded", function () {
    var canvas = document.querySelector(".neural-bg");
    if (!canvas) {
        return;
    }

    var context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var rootStyle = getComputedStyle(document.documentElement);
    var pointer = { x: 0, y: 0, active: false, strength: 0 };
    var width = 0;
    var height = 0;
    var nodes = [];
    var animationFrameId = null;

    function cssValue(name, fallback) {
        var value = rootStyle.getPropertyValue(name).trim();
        return value || fallback;
    }

    var colors = {
        line: cssValue("--neural-line", "rgba(15, 118, 110, 0.16)"),
        lineStrong: cssValue("--neural-line-strong", "rgba(59, 130, 246, 0.22)"),
        node: cssValue("--neural-node", "rgba(15, 118, 110, 0.58)"),
        nodeSoft: cssValue("--neural-node-soft", "rgba(59, 130, 246, 0.34)"),
        glow: cssValue("--neural-glow", "rgba(14, 165, 233, 0.08)")
    };

    function resizeCanvas() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        seedNodes();
        drawFrame();
    }

    function nodeCount() {
        var area = width * height;
        return Math.max(24, Math.min(64, Math.round(area / 26000)));
    }

    function seedNodes() {
        nodes = [];
        var count = nodeCount();
        for (var i = 0; i < count; i += 1) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.22,
                vy: (Math.random() - 0.5) * 0.22,
                radius: 1 + Math.random() * 1.6,
                hueShift: Math.random(),
                drift: Math.random() * Math.PI * 2
            });
        }
    }

    function moveNode(node, delta) {
        node.drift += delta * 0.0015;
        node.vx += Math.sin(node.drift) * 0.0008;
        node.vy += Math.cos(node.drift * 0.9) * 0.0008;

        if (pointer.active) {
            var dx = pointer.x - node.x;
            var dy = pointer.y - node.y;
            var distance = Math.sqrt(dx * dx + dy * dy) || 1;
            var influenceRadius = 180;
            if (distance < influenceRadius) {
                var influence = (1 - distance / influenceRadius) * 0.018 * pointer.strength;
                node.vx += (dx / distance) * influence;
                node.vy += (dy / distance) * influence;
            }
        }

        node.vx *= 0.992;
        node.vy *= 0.992;
        node.x += node.vx * delta;
        node.y += node.vy * delta;

        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
    }

    function drawGlow() {
        if (!pointer.active) {
            return;
        }

        var gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 180);
        gradient.addColorStop(0, colors.glow);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(pointer.x, pointer.y, 180, 0, Math.PI * 2);
        context.fill();
    }

    function drawConnections() {
        var maxDistance = Math.min(160, Math.max(110, width * 0.1));

        for (var i = 0; i < nodes.length; i += 1) {
            var a = nodes[i];
            for (var j = i + 1; j < nodes.length; j += 1) {
                var b = nodes[j];
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > maxDistance) {
                    continue;
                }

                var alpha = (1 - distance / maxDistance) * 0.35;
                context.strokeStyle = a.hueShift > 0.5 ? colors.lineStrong : colors.line;
                context.globalAlpha = alpha;
                context.lineWidth = distance < maxDistance * 0.45 ? 1.1 : 0.7;
                context.beginPath();
                context.moveTo(a.x, a.y);
                context.lineTo(b.x, b.y);
                context.stroke();
            }
        }

        if (pointer.active) {
            for (var k = 0; k < nodes.length; k += 1) {
                var node = nodes[k];
                var px = pointer.x - node.x;
                var py = pointer.y - node.y;
                var pointerDistance = Math.sqrt(px * px + py * py);

                if (pointerDistance > 150) {
                    continue;
                }

                context.strokeStyle = colors.lineStrong;
                context.globalAlpha = (1 - pointerDistance / 150) * 0.28 * pointer.strength;
                context.lineWidth = 0.9;
                context.beginPath();
                context.moveTo(node.x, node.y);
                context.lineTo(pointer.x, pointer.y);
                context.stroke();
            }
        }

        context.globalAlpha = 1;
    }

    function drawNodes() {
        for (var i = 0; i < nodes.length; i += 1) {
            var node = nodes[i];
            context.fillStyle = node.hueShift > 0.5 ? colors.nodeSoft : colors.node;
            context.beginPath();
            context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            context.fill();
        }
    }

    function drawFrame() {
        context.clearRect(0, 0, width, height);
        drawGlow();
        drawConnections();
        drawNodes();
    }

    var previousTimestamp = 0;
    function animate(timestamp) {
        if (!previousTimestamp) {
            previousTimestamp = timestamp;
        }

        var delta = Math.min(24, timestamp - previousTimestamp);
        previousTimestamp = timestamp;

        for (var i = 0; i < nodes.length; i += 1) {
            moveNode(nodes[i], delta);
        }

        drawFrame();
        animationFrameId = window.requestAnimationFrame(animate);
    }

    function updatePointer(event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
        pointer.strength = 1;
    }

    function fadePointer() {
        pointer.active = false;
        pointer.strength = 0;
    }

    window.addEventListener("mousemove", updatePointer, { passive: true });
    window.addEventListener("touchstart", function (event) {
        if (event.touches[0]) {
            updatePointer(event.touches[0]);
        }
    }, { passive: true });
    window.addEventListener("touchmove", function (event) {
        if (event.touches[0]) {
            updatePointer(event.touches[0]);
        }
    }, { passive: true });
    window.addEventListener("touchend", fadePointer, { passive: true });
    window.addEventListener("mouseleave", fadePointer, { passive: true });
    window.addEventListener("resize", resizeCanvas, { passive: true });

    resizeCanvas();

    if (reducedMotion) {
        drawFrame();
        return;
    }

    animationFrameId = window.requestAnimationFrame(animate);

    window.addEventListener("beforeunload", function () {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
    });
});
