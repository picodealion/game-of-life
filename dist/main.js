(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const STEPS = [
    [-1, -1],
    [-1,  0],
    [-1,  1],
    [ 0, -1],
    [ 0,  1],
    [ 1, -1],
    [ 1,  0],
    [ 1,  1]
];
const GENERATION_TIMEOUT = 25;

let tiles = new Map();
let stopped = false;
let timeout;
let onStopCallback;


module.exports = class {

    // TODO: Make entirely functional, move all DOM logic somewhere else
    constructor(element, width, height, imported) {
        this.element = element;

        this.width = width;
        this.height = height;

        this.elements = [];
        this.generation = [];
        this._previousGeneration = [];

        this.createGame(imported);
    }

    /*** Controls ***/
    start() {
        stopped = false;
        this.element.classList.add('active');

        // TODO: Work with checkpoints
        this.generation = this.firstGeneration = this.getFirstGeneration();
        this.generation.forEach((tile) => tile.alive = true);

        this.drawGeneration();

        timeout = setTimeout(this.live.bind(this), GENERATION_TIMEOUT);
    }

    reset() {
        let pattern = this.firstGeneration.map(this.toIndex.bind(this));

        tiles.forEach((tile) => {
            tile.alive = false;
        });

        this._previousGeneration = [];
        this.createGame(pattern);
    }

    stop() {
        clearTimeout(timeout);

        stopped = true;
        this.element.classList.remove('active');
    }

    onStopped(fn) {
        onStopCallback = fn;
    }

    /*** Game ***/
    live() {
        this._previousGeneration = this.generation;
        this.generation = this.nextGeneration();

        this._previousGeneration.forEach((tile) => tile.alive = false);
        this.generation.forEach((tile) => tile.alive = true);

        this.drawGeneration();

        if (stopped) {
            console.log('Game stopped by user');

        } else if (this.isUnchanged()) {
            console.log('Equilibrium reached, aborting');
            onStopCallback();

        } else {
            timeout = setTimeout(this.live.bind(this), GENERATION_TIMEOUT);
        }
    }

    nextGeneration() {
        const uniqueNeighbours = this.generation.reduce(this.getAllNeighbours.bind(this), new Set());

        return [...uniqueNeighbours].filter(this.getNextGeneration.bind(this));
    }

    isUnchanged() {
        const isVisible = (tile) => tile.visible;
        const hash = (list) => {
            let coords = list.filter(isVisible).map((item) => item.coordinates);
            return String(coords);
        };

        return hash(this._previousGeneration) === hash(this.generation);
    }

    /*** Tiles ***/
    createTile(x, y) {
        let index = String([x, y]);

        let tile = {
            alive: false,
            coordinates: [x, y],
            neighbours: [],
            visible: x > -1 && x < this.width && y > -1 && y < this.height
        };

        tiles.set(index, tile);

        return tile;
    }

    getTile(x, y) {
        return tiles.get( String([x,y]) );
    }

    getNextGeneration(currentTile) {
        let aliveNeighbours = this.getNeighbours(currentTile).filter(this.isAlive.bind(this));

        const survive = aliveNeighbours.length === 2 && this.isAlive(currentTile);
        const reproduce = aliveNeighbours.length === 3;

        return survive || reproduce;
    }

    getAllNeighbours(all, tile) {
        this.getNeighbours(tile).forEach((neighbour) => {
            all.add(neighbour);
        });

        return all;
    };


    getNeighbours(from) {
        let [fromX, fromY] = from.coordinates;

        const getOrCreateNeighbour = ([x, y]) => {
            let newX = fromX + x;
            let newY = fromY + y;

            return this.getTile(newX, newY) || this.createTile(newX, newY);
        };

        if (!from.neighbours.length) {
            from.neighbours = STEPS.map((step) => {
                return getOrCreateNeighbour(step);
            });
        }

        return from.neighbours;
    }

    isAlive(tile) {
        return tile.alive;
    }

    toIndex(tile) {
        let [x, y] = tile.coordinates;
        return x + y * this.width;
    }

    // TODO: Move to separate class
    /*** Render game ***/
    createGame(pattern = []) {
        this.element.innerHTML = '';
        this.elements = [];

        for(let i = 0; i < this.width * this.height; i++) {
            let checkbox = document.createElement('input');
            let label = document.createElement('label');

            checkbox.type = 'checkbox';
            checkbox.id = i;
            checkbox.checked = pattern.indexOf(i) > -1;

            label.setAttribute('for', i);

            this.element.appendChild(checkbox);
            this.element.appendChild(label);

            this.elements.push(checkbox);
        }
    }

    drawGeneration() {
        this._previousGeneration
            .filter((tile) => tile.visible)
            .forEach((tile) => this.setState(tile, 'visited'));

        this.generation
            .filter((tile) => tile.visible)
            .forEach((tile) => this.setState(tile, 'alive'));
    }

    exportTiles() {
        return this.elements
            .filter((tile) => tile.checked)
            .map((tile) => Number(tile.id))
            .join(',');
    }

    getFirstGeneration() {
        const isChecked = (element) => {
            return element.checked;
        };
        const createTile = (coordinates) => {
            return tiles.get(String(coordinates)) || this.createTile(...coordinates);
        };
        const getCoordinates = (element) => {
            let id = Number(element.id);
            return [id % this.width, Math.floor(id / this.width)];
        };

        return this.elements
            .filter(isChecked)
            .map(getCoordinates)
            .map(createTile);
    }

    setState(tile, state) {
        const index = this.toIndex(tile);
        const element = this.elements[index];

        if (!element) {
            return;
        }

        switch(state) {
            case 'alive':
                element.checked = true;
                element.indeterminate = false;
                break;
            case 'visited':
                element.indeterminate = true;
            // no break
            case 'dead':
            default:
                element.checked = false;
        }
    }

};
},{}],2:[function(require,module,exports){
(function () {

    const Game = require('./Game.js');

    const elements = {
        game: document.getElementById('game'),

        // Create
        height: document.getElementById('height'),
        width: document.getElementById('width'),
        createButton: document.getElementById('create'),

        // Play
        startButton: document.getElementById('start'),
        stopButton: document.getElementById('stop'),

        clearButton: document.getElementById('clear'),
        resetButton: document.getElementById('reset'),

        // Other
        import: document.getElementById('import'),
        export: document.getElementById('export'),
        exportButton: document.getElementById('exportButton')
    };

    let game;

    function init() {
        elements.createButton.addEventListener('click', create);
        elements.resetButton.addEventListener('click', reset);

        elements.startButton.addEventListener('click', start);
        elements.stopButton.addEventListener('click', stop);

        elements.exportButton.addEventListener('click', exportState);

        create();
    }

    function create() {
        stop();

        let importTiles = elements.import.value.split(',').map(Number);

        // todo: customize dimensions
        game = new Game(elements.game, 40, 40, importTiles);

        game.onStopped(stop);

        enable(elements.startButton);
    }

    function start() {
        enable(elements.stopButton);

        disable(elements.createButton);
        disable(elements.startButton);
        disable(elements.exportButton);

        game.start();
    }

    function stop() {
        game && game.stop();

        disable(elements.stopButton);
        enable(elements.createButton);
        enable(elements.startButton);
        enable(elements.resetButton);
        enable(elements.exportButton);
    }

    function reset() {
        disable(elements.resetButton);

        game && game.reset();
    }

    function exportState() {
        let tiles = game && game.exportTiles() || '';

        elements.export.value = tiles;
    }

    function disable(element) {
        element.setAttribute('disabled', 'disabled');
    }

    function enable(element) {
        element.removeAttribute('disabled');
    }

    init();
}());
},{"./Game.js":1}]},{},[2]);
