// https://github.com/analyzer2004/clusteredchart
// Copyright 2021 Eric Lo
class ClusteredChart {
    constructor(container) {
        this._container = container;

        this._width = 0;
        this._height = 0;
        this._dims = { width: 5, height: 2, depth: 5 };        
        this._tickPadding = 0.1;

        this._options = {
            animation: true,
            font: null,
            backgroundColor: 0xffffff,
            textColor: 0x666666,
            lineColor: 0xcccccc
        };

        this._column = { x: "", y: "", z: "" };

        this._bar = {
            scale: { x: 0.65, z: 0.65 },
            opacity: 0.85,
            isOrdinal: true,
            palette: d3.schemeTableau10
        };

        this._wall = {
            visible: true,
            color: 0xeeeeee,
            opacity: 0.9,
            showTicks: true,
            tickFormat: "~s"
        };

        this._floor = {
            visible: true,
            color: 0xeeeeee,
            opacity: 0.9,
            showTicks: true
        };

        this._tooltip = {
            textColor: "black",
            fillColor: "rgba(255,255,255,0.75)",
            scale: 0.4
        },

        // three.js objects
        this._raycaster = null;
        this._scene = null;
        this._sceneOrtho = null;
        this._camera = null;
        this._cameraOrtho = null;
        this._renderer = null;
        this._controls = null;
        this._font = null;
        this._pool = null;

        // interaction
        this._mouseScene = null;
        this._mouseScreen = null;
        this._hint = null;
        this._focus = null;        
        this._request = null;
        this._bars = null;

        // data
        this._data = null;
        this._chartData = null;
        this._keysX = null;
        this._keysZ = null;

        // scales
        this._x = null;
        this._y = null;
        this._z = null;
        this._color = null        

        // delegates
        this._docmousemove = e => this._mousemove(e);  
        this._controlschange = () => this._render();

        // events
        this._onhover = null;
        this._onclick = null;
        this._oncancel = null;
    }

    size(_) {
        return arguments.length ? (this._width = _[0], this._height = _[1], this) : [this._width, this._height];
    }

    dimensions(_) {
        return arguments.length ? (this._dims = Object.assign(this._dims, _), this) : this._dims;
    }

    options(_) {
        return arguments.length ? (this._options = Object.assign(this._options, _), this) : this._options;
    }

    bar(_) {
        return arguments.length ? (this._bar = Object.assign(this._bar, _), this) : this._bar;
    }

    wall(_) {
        return arguments.length ? (this._wall = Object.assign(this._wall, _), this) : this._wall;
    }

    floor(_) {
        return arguments.length ? (this._floor = Object.assign(this._floor, _), this) : this._floor;
    }

    tooltip(_) {
        return arguments.length ? (this._tooltip = Object.assign(this._tooltip, _), this) : this._tooltip;
    }

    column(_) {
        return arguments.length ? (this._column = Object.assign(this._column, _), this) : this._column;
    }

    data(_) {
        return arguments.length ? (this._data = _, this) : this._data;
    }

    onhover(_) {
        return arguments.length ? (this._onhover = _, this) : this._onhover;
    }

    onclick(_) {
        return arguments.length ? (this._onclick = _, this) : this._onclick;
    }

    oncancel(_) {
        return arguments.length ? (this._oncancel = _, this) : this._oncancel;
    }

    render() {
        this._init();
        this._process(); 

        const values = this._chartData.flatMap(d => this._keysZ.map(key => +d[key]))
        this._initScales(values);
        this._initPool(values);

        this._renderChart();        
        return this;
    }

    dispose() {
        const that = this;

        if (this._request) cancelAnimationFrame(this._request);

        cleanScene();
        this._hint.dispose();
        this._detachEvents();        

        checkMemory();
        this._renderer.dispose();
        this._controls.dispose();

        return this;
        
        function cleanScene() {
            const scene = that._scene;
            for (let i = scene.children.length - 1; i >= 0; i--) {
                let obj = scene.children[i];
                scene.remove(obj);
                if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
                    obj.geometry.dispose();
                    obj.material.dispose();
                    if (obj.frame) {
                        obj.frame.geometry.dispose();
                        obj.frame.material.dispose();
                    }
                }
            }
        }
        
        function checkMemory() {
            const memory = that._renderer.info.memory;
            if (memory.geometries > 0 || memory.textures > 0) console.log(memory);
        }
    }

    get renderer() { return this._renderer; }

    _init() {
        this._raycaster = new THREE.Raycaster();
        this._scene = new THREE.Scene();
        this._sceneOrtho = new THREE.Scene();
        this._renderer = new THREE.WebGLRenderer({ antialias: true });

        this._mouseScene = new THREE.Vector2();
        this._mouseScreen = new THREE.Vector2();

        this._camera = new THREE.PerspectiveCamera(75, this._width / this._height, 0.5, 500);
        this._cameraOrtho = new THREE.OrthographicCamera(-this._width / 2, this._width / 2, this._height / 2, -this._height / 2, 1, 10);
        this._cameraOrtho.position.z = 10;

        if (this._container) this._container.appendChild(this._renderer.domElement);
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(this._width, this._height);
        this._renderer.autoClear = false;

        this._camera.aspect = this._width / this._height;
        this._camera.updateProjectionMatrix();
        this._camera.position.x = -2.5;
        this._camera.position.y = 5;
        this._camera.position.z = 5;        

        this._scene.position.x = -this._dims.width / 2;
        this._scene.position.y = this._dims.height / 2;
        this._scene.position.z = -this._dims.depth / 2;
        this._scene.background = new THREE.Color(this._options.backgroundColor);

        this._hint = this._createHint();
    }

    _process() {
        const column = this._column;

        if (this._data === null || this._data.length === 0) throw "No data to display.";
        if (column.x === "" && column.y === "" && column.z === "") throw "Please specify the column names.";        

        const keys = Object.keys(this._data[0]);
        if (column.x !== "" && column.z !== "") {            
            if (!keys.includes(column.x) || !keys.includes(column.y) || !keys.includes(column.z))
                throw "Please verify if the specified column names are correct."

            const xmap = new Map();
            this._data.forEach(d => {
                const key = d[column.x];
                let x = xmap.get(key);
                if (!x) {
                    x = new Object();
                    x[column.x] = key;
                    xmap.set(key, x);
                }
                if (x) x[d[column.z]] = +d[column.y];
            });

            this._chartData = [...xmap.values()];
            console.log(this._chartData);
        }
        else {
            if (!keys.includes(column.x))
                throw "Please verify if the specified column.x is correct."
            this._chartData = this._data;
        }

        this._keysX = this._chartData.map(d => d[column.x]);
        
        let max = 0, mindex = 0;
        this._chartData.forEach((d, i) => {
            const len = Object.keys(d).length;
            if (len > max) {
                max = len;
                mindex = i;
            }
        })
        this._keysZ = Object.keys(this._chartData[mindex]).filter(d => d !== column.x);
    }

    _initPool(values) {        
        const that = this;
        this._pool = {
            boxGeometry: new THREE.BoxBufferGeometry(1, 1, 1),
            boxMaterials: this._bar.isOrdinal ? generateByKeys() : generateByValues(),
            textMaterial: new THREE.MeshBasicMaterial({ color: this._options.textColor }),
            lineMaterial: new THREE.LineBasicMaterial({ color: this._options.lineColor }),
            dispose: function () {
                this.boxGeometry.dispose();
                this.boxMaterials.forEach(m => m.dispose());                
                this.textMaterial.dispose();
                this.lineMaterial.dispose();
            }
        }

        function generateByKeys() {
            return new Map(that._keysX.map(d => [
                d,
                new THREE.MeshBasicMaterial({
                    color: that._color(d),
                    opacity: that._bar.opacity,
                    transparent: true
                })
            ]));
        }

        function generateByValues() {
            return new Map(
                values
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .map(v => [
                        v,
                        new THREE.MeshBasicMaterial({
                            color: that._color(v),
                            opacity: that._bar.opacity,
                            transparent: true
                        })
                    ]));
        }
    }

    _initScales(values) {
        const ext = d3.extent(values);
        this._x = d3.scaleBand().domain(this._keysX).range([0, this._dims.width]);
        this._y = d3.scaleLinear().domain(ext).range([0, this._dims.height]);
        this._z = d3.scaleBand().domain(this._keysZ).range([this._dims.depth, 0]);
        this._color = this._bar.isOrdinal ?
            d3.scaleOrdinal().domain(this._keysX).range(this._bar.palette) :
            d3.scaleSequential(this._bar.palette).domain(ext);
    }

    _renderChart() {
        const f = this._options.font;
        if (typeof f === "string")
            this._loadThenDraw();
        else if (typeof f === "object") {            
            if (f.type && f.type === "Font" && f.data) this._font = f;
            else if (f.glyphs) this._font = new THREE.FontLoader().parse(f);            

            this._drawChart();
        }
    }

    _loadThenDraw() {
        const manager = new THREE.LoadingManager();
        manager.onLoad = () => {
            this._drawChart();
        }
        new THREE.FontLoader(manager).load(this._options.font, f => this._font = f);
    }

    _drawChart() {
        const that = this;
        
        this._drawElements();        
        this._initControls();        
        if (this._options.animation) animate();
        this._attachEvents();
        that._render();

        function animate() {            
            that._request = requestAnimationFrame(animate);

            if (that._bars.length > 0)
                that._growBars();
            else {
                // exit the animation loop after finished
                cancelAnimationFrame(that._request);
                that._request = null;
                return;
            }

            that._render();
        }
    }

    _render() {        
        this._renderer.clear();
        this._renderer.render(this._scene, this._camera);
        this._renderer.clearDepth();
        this._renderer.render(this._sceneOrtho, this._cameraOrtho);
    }

    _growBars() {
        for (let i = this._bars.length - 1; i >= 0; i--) {
            const bar = this._bars[i];
            if (bar.scale.y <= bar.targetHeight) {
                bar.scale.y += 0.05;
                bar.position.y = bar.scale.y / 2;
                if (bar.scale.y >= bar.targetHeight) {
                    bar.scale.y = bar.targetHeight;
                    bar.position.y = bar.targetHeight / 2;
                    this._bars.splice(i, 1);
                }
            }
        }
    }

    _drawElements() {
        // floor margin            
        const margin = this._floor.visible ?
            { x: this._dims.width / 20, z: this._dims.depth / 20 } :
            { x: 0, z: 0 };

        this._drawBars(margin);        
        this._drawFloorAndWalls(margin);
    }

    _drawBars(margin) {
        const
            sx = this._x.bandwidth() * this._bar.scale.x,
            sz = this._z.bandwidth() * this._bar.scale.z,
            hsx = sx / 2, hsz = sz / 2,
            qsx = sx / 4, qsz = sz / 4,
            halfPI = Math.PI / 2;

        this._bars = [];
        this._chartData.forEach((row, i) => {            
            const
                tx = row[this._column.x],
                x = this._x(tx) + margin.x / 2;

            if (this._floor.showTicks)
                this._addText(tx, hsx, 0, x + hsx + qsx, 0, this._dims.depth + margin.z + this._tickPadding, halfPI, 0, halfPI);
            
            this._keysZ.forEach(key => {
                const
                    value = row[key],
                    h = this._y(value),
                    z = this._z(key) + margin.z / 2;

                if (i === 0 && this._floor.showTicks)
                    this._addText(key, hsz, 0, -this._tickPadding, 0, z + qsz, halfPI, Math.PI, 0);

                const bar = this._addBar(sx, h, sz, x, 0, z, this._bar.isOrdinal ? tx : value);
                bar.info = { keyX: tx, keyZ: key, value };                
            });
        });
    }

    _drawFloorAndWalls(margin) {
        const thickness = 0.025;
        const floor = {
            width: this._dims.width + margin.x,
            depth: this._dims.depth + margin.z,
            x: 0,
            z: 0
        };

        const
            backWall = { x: floor.x, y: 0, z: 0 },
            sideWall = { x: floor.x + floor.width, y: 0, z: floor.z };

        if (this._floor.visible)
            this._addWall(floor.width, thickness, floor.depth, floor.x, 0, floor.z, this._floor.color, this._floor.opacity);

        if (this._wall.visible) {
            // backwall
            this._addWall(floor.width, this._dims.height, thickness, backWall.x, backWall.y, backWall.z, this._wall.color, this._wall.opacity);
            // sidewall
            this._addWall(thickness, this._dims.height, floor.depth, sideWall.x, sideWall.y, sideWall.z, this._wall.color, this._wall.opacity);
        }

        if (this._wall.showTicks) {

            let ticks, th, fmtr;
            if (this._wall.showTicks) {
                ticks = this._y.ticks();
                th = this._dims.height / ticks.length * 0.5;
                fmtr = d3.format(this._wall.tickFormat);
            }

            // backwall ticks (x wall)
            ticks.forEach(tick => {
                const y = this._y(tick);
                const text = this._addText(fmtr(tick), th, 0, 0, y, backWall.z, 0, 0, 0);
                if (!text.geometry.boundingBox) text.geometry.computeBoundingBox();
                text.position.x = -text.geometry.boundingBox.max.x - this._tickPadding;
                this._addLine(
                    new THREE.Vector3(backWall.x, y, backWall.z + thickness),
                    new THREE.Vector3(sideWall.x - thickness, y, backWall.z + thickness)
                );
            });
            // sidewall ticks (z wall)
            ticks.forEach(tick => {
                const y = this._y(tick);
                const text = this._addText(fmtr(tick), th, 0, sideWall.x, y, 0, 0, Math.PI / 2, 0);
                if (!text.geometry.boundingBox) text.geometry.computeBoundingBox();
                text.position.z = floor.depth + text.geometry.boundingBox.max.x + this._tickPadding;
                this._addLine(
                    new THREE.Vector3(sideWall.x - thickness, y, backWall.z + thickness),
                    new THREE.Vector3(sideWall.x - thickness, y, floor.depth)
                );
            });
        }
    }

    _createHint() {
        const
            that = this,
            size = 36,
            canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");

        ctx.font = `${size}px tahoma`;

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        this._sceneOrtho.add(sprite);

        return {
            sprite,
            update: function (target) {
                const 
                    texts = [target.info.keyX, target.info.keyZ, target.info.value],
                    w = Math.max(...texts.map(d => ctx.measureText(d).width)),
                    dim = { w: w + 40, h: size * 3 + 10 };

                ctx.clearRect(0, 0, 1000, 1000);
                ctx.fillStyle = that._tooltip.fillColor;
                ctx.fillRect(0, 0, dim.w, dim.h);
                ctx.fillStyle = that._tooltip.textColor;
                texts.forEach((t, i) => ctx.fillText(t, 10, size * (i + 1)));
                texture.needsUpdate = true;

                sprite.center.set(0.5, 0.5);
                sprite.scale.set(300 * that._tooltip.scale, 200 * that._tooltip.scale, 1); // 3:2 scale
                sprite.position.set(that._mouseScreen.x - that._width / 2, -that._mouseScreen.y + that._height / 2, 1);
            },
            clear: function () {
                ctx.clearRect(0, 0, 1000, 1000);
                texture.needsUpdate = true;
            },
            dispose: function () {
                that._sceneOrtho.remove(this.sprite);
                this.sprite.geometry.dispose();
                this.sprite.material.map.dispose();                
                this.sprite.material.dispose();
            }
        }
    }

    _addFrame(target) {
        const geometry = new THREE.EdgesGeometry(target.geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x0, linewidth: 1 });
        const frame = new THREE.LineSegments(geometry, material);
        frame.renderOrder = 1;
        target.frame = frame;
        target.add(frame);
    }

    _addText(text, size, h, x, y, z, rx, ry, rz) {        
        const geometry = new THREE.TextBufferGeometry(
            text,
            {font: this._font, size: size, height: h}
        );
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, this._pool.textMaterial);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        this._scene.add(mesh);
        return mesh;
    }

    _addBar(w, h, d, x, y, z, key) {        
        const mesh = this._createMesh(
            this._pool.boxGeometry,
            this._pool.boxMaterials.get(key),
            w, h, d, x, y, z
        );

        if (this._options.animation) {
            mesh.scale.set(w, 0, d);
            mesh.targetHeight = h;
            this._bars.push(mesh);
        }
        else mesh.scale.set(w, h, d);
        return mesh;
    }

    _addWall(w, h, d, x, y, z, color, opacity) {        
        const geometry = new THREE.BoxBufferGeometry(w, h, d);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            opacity: opacity,
            transparent: true
        });
        return this._createMesh(geometry, material, w, h, d, x, y, z);
    }

    _createMesh(geometry, material, w, h, d, x, y, z) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
        this._scene.add(mesh);
        return mesh;
    }

    _addLine(f, t) {        
        const geometry = new THREE.BufferGeometry().setFromPoints([f, t]);
        const line = new THREE.Line(geometry, this._pool.lineMaterial);
        this._scene.add(line);
        return line;
    }

    _attachEvents() {
        document.addEventListener("mousemove", this._docmousemove, false);
        this._controls.addEventListener("change", this._controlschange);
    }

    _detachEvents() {
        document.removeEventListener("mousemove", this._docmousemove);
        this._controls.removeEventListener("change", this._controlschange);
    }

    _mousemove(e) {
        e.preventDefault();

        this._mouseScreen.x = e.layerX;
        this._mouseScreen.y = e.layerY;
        this._mouseScene.x = (e.layerX / this._width) * 2 - 1;
        this._mouseScene.y = -(e.layerY / this._height) * 2 + 1;

        this._intersect();
    }

    _intersect() {
        const that = this;

        this._camera.updateMatrixWorld();
        this._cameraOrtho.updateMatrixWorld();
        this._raycaster.setFromCamera(this._mouseScene, this._camera);

        const intersects = this._raycaster.intersectObjects(this._scene.children);
        if (intersects.length > 0) {
            let target;
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object.info) {
                    target = intersects[i].object;
                    break;
                }
            }

            if (target) {
                if (this._focus !== target) {
                    cancelFocus();
                    this._focus = target;
                    this._addFrame(this._focus);
                    this._hint.update(this._focus);
                    this._render();
                }
            }
            else cancelFocus();
        }
        else cancelFocus();

        function cancelFocus() {
            const f = that._focus;
            if (f) {
                if (f.frame) {
                    f.remove(f.frame);
                    f.frame.geometry.dispose();
                    f.frame.material.dispose();
                    f.frame = null;
                }
                that._focus = null;
                that._hint.clear();
                that._render();
            }
        }
    }

    _initControls() {
        this._controls = new OrbitControls(this._camera, this._renderer.domElement);

        this._controls.screenSpacePanning = false;

        this._controls.maxPolarAngle = Math.PI / 2.5;
        this._controls.minDistance = 1.12;
        this._controls.maxDistance = 10;
    }
}